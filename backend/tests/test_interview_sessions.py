from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app.services import interview_session_service as service
from app.services.gemini_client import AnalysisUnavailable
from tests.test_interview_configuration import with_durations, with_selected_role
from tests.test_resumes import sign_in

START = datetime(2026, 11, 23, 10, 0, 0, tzinfo=timezone.utc)
PLAN = [f"Question {number}?" for number in range(1, 11)]
SETUP = {"interview_type": "Technical", "difficulty": "Medium", "duration_minutes": 30}


def iso(moment: datetime) -> str:
    return moment.isoformat(timespec="seconds")


class Clock:
    def __init__(self) -> None:
        self.now = START

    def __call__(self) -> datetime:
        return self.now

    def advance(self, **kwargs: float) -> None:
        self.now += timedelta(**kwargs)


@pytest.fixture
def clock(monkeypatch) -> Clock:
    fake = Clock()
    monkeypatch.setattr(service, "utc_now", fake)
    return fake


class Gemini:
    """Answers the plan request with the plan, and each follow-up decision from a queue (null when the queue is empty)."""

    def __init__(
        self,
        *,
        plans: list[str] | None = None,
        follow_ups: list[str | None] | None = None,
        fail: bool = False,
        follow_up_fail: bool = False,
        on_follow_up=None,
    ) -> None:
        self.plans = list(plans or [json.dumps({"questions": PLAN})])
        self.follow_ups = list(follow_ups or [])
        self.fail = fail
        self.follow_up_fail = follow_up_fail
        self.on_follow_up = on_follow_up
        self.plan_calls = 0
        self.follow_up_calls = 0

    def generate_json(self, prompt: str) -> str:
        if self.fail:
            raise AnalysisUnavailable("Gemini is down.")
        if "Write exactly" in prompt:
            self.plan_calls += 1
            return self.plans.pop(0) if len(self.plans) > 1 else self.plans[0]
        self.follow_up_calls += 1
        if self.follow_up_fail:
            raise AnalysisUnavailable("Gemini is down.")
        if self.on_follow_up:
            self.on_follow_up()
        return json.dumps({"follow_up": self.follow_ups.pop(0) if self.follow_ups else None})


def set_up(app, client: TestClient, gemini: Gemini) -> None:
    with_durations(app)
    with_selected_role(app, client)
    assert client.put("/api/interview-configuration", json=SETUP).status_code == 200
    app.state.gemini = gemini


def start(client: TestClient):
    return client.post("/api/interview-sessions")


def answer(client: TestClient, session_id: str, text: str = "My answer"):
    return client.post(f"/api/interview-sessions/{session_id}/answers", json={"answer": text})


def rows(app) -> list[dict]:
    return app.state.db.execute("SELECT seq, kind, main_number, state, answer_text FROM interview_answers ORDER BY seq")


def session_row(app) -> dict:
    return app.state.db.execute("SELECT status, ended_at FROM interview_sessions")[0]


def test_start_creates_a_session_with_the_first_main_question_and_a_countdown_of_duration_over_ten(
    app, client: TestClient, clock: Clock
) -> None:
    gemini = Gemini()
    set_up(app, client, gemini)

    response = start(client)

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["status"] == "in_progress"
    assert body["deadline_at"] == iso(START + timedelta(minutes=30))
    assert body["main_number"] == 1
    assert body["plan_size"] == 10
    assert body["current"] == {
        "kind": "main",
        "main_number": 1,
        "text": PLAN[0],
        "question_deadline_at": iso(START + timedelta(minutes=3)),
        "follow_ups_used": 0,
    }
    assert gemini.plan_calls == 1


def test_the_current_interview_is_empty_until_one_is_started(app, client: TestClient, clock: Clock) -> None:
    set_up(app, client, Gemini())

    assert client.get("/api/interview-sessions/current").json() is None

    start(client)
    assert client.get("/api/interview-sessions/current").json()["status"] == "in_progress"


def test_a_session_needs_a_selected_role(app, client: TestClient, clock: Clock) -> None:
    with_durations(app)
    sign_in(client)

    response = start(client)

    assert response.status_code == 409


def test_a_session_needs_a_saved_setup_and_only_one_may_run(app, client: TestClient, clock: Clock) -> None:
    with_durations(app)
    with_selected_role(app, client)
    app.state.gemini = Gemini()
    assert start(client).status_code == 409  # no setup saved yet

    assert client.put("/api/interview-configuration", json=SETUP).status_code == 200
    assert start(client).status_code == 201
    assert start(client).status_code == 409  # one is already in progress


def test_a_malformed_plan_is_retried_once_then_refused(app, client: TestClient, clock: Clock) -> None:
    nine = json.dumps({"questions": PLAN[:9]})
    set_up(app, client, Gemini(plans=["not json", nine]))

    assert start(client).status_code == 502
    assert client.get("/api/interview-sessions/current").json() is None


def test_a_plan_that_is_fixed_on_the_retry_is_used(app, client: TestClient, clock: Clock) -> None:
    gemini = Gemini(plans=["not json", json.dumps({"questions": PLAN})])
    set_up(app, client, gemini)

    assert start(client).status_code == 201
    assert gemini.plan_calls == 2


def test_gemini_being_unavailable_at_start_creates_no_session(app, client: TestClient, clock: Clock) -> None:
    set_up(app, client, Gemini(fail=True))

    assert start(client).status_code == 503
    assert client.get("/api/interview-sessions/current").json() is None


def test_an_answer_moves_on_to_the_next_question_when_no_follow_up_is_needed(
    app, client: TestClient, clock: Clock
) -> None:
    gemini = Gemini()
    set_up(app, client, gemini)
    session_id = start(client).json()["id"]

    body = answer(client, session_id, "I built REST APIs.").json()

    assert body["main_number"] == 2
    assert body["current"]["text"] == PLAN[1]
    assert gemini.follow_up_calls == 1
    assert rows(app)[0]["state"] == "answered"
    assert rows(app)[0]["answer_text"] == "I built REST APIs."


def test_follow_ups_are_asked_and_at_most_two_are_asked_per_main_question(
    app, client: TestClient, clock: Clock
) -> None:
    gemini = Gemini(follow_ups=["Why?", "How exactly?", "Anything else?"])
    set_up(app, client, gemini)
    session_id = start(client).json()["id"]

    first = answer(client, session_id).json()
    assert first["current"] == {
        "kind": "follow_up",
        "main_number": 1,
        "text": "Why?",
        "question_deadline_at": None,
        "follow_ups_used": 1,
    }
    second = answer(client, session_id).json()
    assert second["current"]["text"] == "How exactly?"
    assert second["current"]["follow_ups_used"] == 2

    third = answer(client, session_id).json()

    assert third["current"]["kind"] == "main"
    assert third["main_number"] == 2
    assert gemini.follow_up_calls == 2  # no decision is asked once the two follow-ups are used


def test_an_empty_answer_is_saved_as_unanswered_and_needs_no_follow_up_decision(
    app, client: TestClient, clock: Clock
) -> None:
    gemini = Gemini()
    set_up(app, client, gemini)
    session_id = start(client).json()["id"]

    body = answer(client, session_id, "   ").json()

    assert body["main_number"] == 2
    assert gemini.follow_up_calls == 0
    assert rows(app)[0]["state"] == "unanswered"


def test_a_failed_follow_up_decision_moves_on_to_the_next_question(app, client: TestClient, clock: Clock) -> None:
    set_up(app, client, Gemini(follow_up_fail=True))
    session_id = start(client).json()["id"]

    body = answer(client, session_id).json()

    assert body["main_number"] == 2
    assert body["current"]["kind"] == "main"


def test_when_the_question_countdown_ends_without_an_answer_the_question_is_unanswered_and_the_next_one_is_asked(
    app, client: TestClient, clock: Clock
) -> None:
    set_up(app, client, Gemini())
    start(client)
    clock.advance(minutes=3, seconds=1)

    body = client.get("/api/interview-sessions/current").json()

    assert body["main_number"] == 2
    assert body["current"]["text"] == PLAN[1]
    assert rows(app)[0]["state"] == "unanswered"


def test_an_answer_that_arrives_after_the_countdown_is_saved_as_timed_out(app, client: TestClient, clock: Clock) -> None:
    set_up(app, client, Gemini())
    session_id = start(client).json()["id"]
    clock.advance(minutes=3, seconds=5)

    body = answer(client, session_id, "partial").json()

    assert body["main_number"] == 2
    assert rows(app)[0]["state"] == "timed_out"
    assert rows(app)[0]["answer_text"] == "partial"


def test_the_overall_time_ends_the_interview_at_once_and_keeps_the_partial_answer(
    app, client: TestClient, clock: Clock
) -> None:
    set_up(app, client, Gemini())
    session_id = start(client).json()["id"]
    clock.advance(minutes=31)

    body = answer(client, session_id, "partial").json()

    assert body["status"] == "interrupted"
    assert body["current"] is None
    assert rows(app) == [{"seq": 1, "kind": "main", "main_number": 1, "state": "timed_out", "answer_text": "partial"}]
    assert session_row(app)["ended_at"] is not None


def test_a_follow_up_cannot_extend_the_overall_time(app, client: TestClient, clock: Clock) -> None:
    # The follow-up decision takes the rest of the interview's time: no follow-up may be asked after the deadline.
    set_up(app, client, Gemini(follow_ups=["Why?"], on_follow_up=lambda: clock.advance(minutes=30)))
    session_id = start(client).json()["id"]

    body = answer(client, session_id).json()

    assert body["status"] == "interrupted"
    assert all(row["kind"] == "main" for row in rows(app))


def test_the_interview_completes_after_the_tenth_main_question(app, client: TestClient, clock: Clock) -> None:
    set_up(app, client, Gemini())
    session_id = start(client).json()["id"]

    for _ in range(10):
        body = answer(client, session_id).json()

    assert body["status"] == "completed"
    assert body["current"] is None
    assert session_row(app)["ended_at"] is not None
    assert len([row for row in rows(app) if row["kind"] == "main"]) == 10


def test_ending_early_keeps_the_text_and_closes_the_interview(app, client: TestClient, clock: Clock) -> None:
    set_up(app, client, Gemini())
    session_id = start(client).json()["id"]

    body = client.post(f"/api/interview-sessions/{session_id}/end", json={"answer": "half"}).json()

    assert body["status"] == "ended_early"
    assert rows(app)[0]["state"] == "answered"
    assert rows(app)[0]["answer_text"] == "half"
    assert answer(client, session_id).status_code == 409


def test_another_users_interview_is_not_visible_or_answerable(app, client: TestClient, clock: Clock) -> None:
    set_up(app, client, Gemini())
    session_id = start(client).json()["id"]

    with TestClient(app) as grace_client:
        sign_in(grace_client, email="grace@example.com", name="Grace")
        assert grace_client.get("/api/interview-sessions/current").json() is None
        assert answer(grace_client, session_id).status_code == 404


def test_an_answer_over_the_length_limit_is_refused(app, client: TestClient, clock: Clock) -> None:
    set_up(app, client, Gemini())
    session_id = start(client).json()["id"]

    assert answer(client, session_id, "x" * (service.MAX_ANSWER_LENGTH + 1)).status_code == 422


def test_interview_routes_require_sign_in(app, client: TestClient) -> None:
    assert client.get("/api/interview-sessions/current").status_code == 401
    assert client.post("/api/interview-sessions").status_code == 401
    assert client.post("/api/interview-sessions/x/answers", json={"answer": "a"}).status_code == 401
