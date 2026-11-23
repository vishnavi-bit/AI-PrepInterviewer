from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient

from app.services import interview_report_service as reports
from app.services.gemini_client import AnalysisUnavailable
from tests.test_interview_sessions import SETUP, Gemini, answer, clock, set_up, start  # noqa: F401  (clock is a fixture)
from tests.test_resumes import sign_in

REPORT_PROMPT_MARKER = "evaluate a candidate's answers"

# Technical Knowledge 80, Problem-solving 70, Answer Accuracy 60, Answer Clarity 50.
# Weighted: 80*30 + 70*25 + 60*25 + 50*20 = 6650, /100 = 66.5, rounded up = 67.
TECHNICAL_SCORES = {"Technical Knowledge": 80, "Problem-solving": 70, "Answer Accuracy": 60, "Answer Clarity": 50}


def report_reply(**overrides) -> str:
    data = {
        "category_scores": dict(TECHNICAL_SCORES),
        "strengths": ["Clear structure"],
        "improvements": ["Give more examples"],
        "suggestions": ["Practise explaining trade-offs"],
        # Gemini's own total is ignored: the app computes the overall score from the weights.
        "overall_score": 12,
    }
    data.update(overrides)
    return json.dumps(data)


class ReportGemini(Gemini):
    """Interview questions as in the session tests. Report replies come from a queue; the last reply repeats."""

    def __init__(self, replies: list[str], *, report_unavailable: bool = False, **kwargs) -> None:
        super().__init__(**kwargs)
        self.replies = list(replies)
        self.report_unavailable = report_unavailable
        self.report_calls = 0

    def generate_json(self, prompt: str) -> str:
        if REPORT_PROMPT_MARKER in prompt:
            self.report_calls += 1
            if self.report_unavailable:
                raise AnalysisUnavailable("Gemini is down.")
            return self.replies.pop(0) if len(self.replies) > 1 else self.replies[0]
        return super().generate_json(prompt)


def complete(client: TestClient, session_id: str, text: str = "My answer") -> dict:
    body = {}
    for _ in range(10):
        body = answer(client, session_id, text).json()
    assert body["status"] == "completed"
    return body


def stored_reports(app) -> list[dict]:
    return app.state.db.execute("SELECT session_id, overall_score FROM interview_reports")


def test_each_interview_type_has_weights_that_total_one_hundred() -> None:
    assert set(reports.CATEGORY_WEIGHTS) == {"Technical", "HR", "Behavioral", "Project-based"}
    for weights in reports.CATEGORY_WEIGHTS.values():
        assert sum(weights.values()) == 100


def test_the_overall_score_is_the_weighted_average_of_the_category_scores() -> None:
    assert reports.overall_score(TECHNICAL_SCORES, "Technical") == 67


def test_a_valid_reply_is_accepted_with_only_the_categories_of_its_type() -> None:
    result = reports.parse_and_validate(report_reply(), "Technical")
    assert result["category_scores"] == TECHNICAL_SCORES
    assert result["strengths"] == ["Clear structure"]


@pytest.mark.parametrize(
    "raw",
    [
        "not json",
        json.dumps(["a list"]),
        report_reply(category_scores={"Technical Knowledge": 80}),  # missing categories
        report_reply(category_scores={**TECHNICAL_SCORES, "Confidence": 40}),  # an extra category
        report_reply(category_scores={**TECHNICAL_SCORES, "Answer Clarity": 101}),  # out of range
        report_reply(category_scores={**TECHNICAL_SCORES, "Answer Clarity": -1}),
        report_reply(category_scores={**TECHNICAL_SCORES, "Answer Clarity": "high"}),
        report_reply(category_scores={**TECHNICAL_SCORES, "Answer Clarity": True}),  # a bool is not a score
        report_reply(strengths=[]),  # empty lists are not useful feedback
        report_reply(suggestions=["  "]),
        report_reply(improvements="one long string"),
    ],
)
def test_malformed_output_is_rejected(raw: str) -> None:
    with pytest.raises(reports.InvalidReport):
        reports.parse_and_validate(raw, "Technical")


def test_categories_are_checked_against_the_interview_type() -> None:
    # Technical categories are not valid for an HR interview.
    with pytest.raises(reports.InvalidReport):
        reports.parse_and_validate(report_reply(), "HR")


def test_a_completed_interview_gets_its_report_when_the_interview_finishes(app, client: TestClient, clock) -> None:
    gemini = ReportGemini([report_reply()])
    set_up(app, client, gemini)
    session_id = start(client).json()["id"]

    complete(client, session_id)

    assert gemini.report_calls == 1
    assert stored_reports(app) == [{"session_id": session_id, "overall_score": 67}]
    body = client.get(f"/api/interview-sessions/{session_id}/report").json()
    assert body["overall_score"] == 67
    assert body["interview_type"] == "Technical"
    assert body["categories"][0] == {"name": "Technical Knowledge", "score": 80, "weight": 30}
    assert body["strengths"] == ["Clear structure"]
    assert body["disclaimer"] == reports.DISCLAIMER


def test_an_invalid_first_reply_is_retried_once(app, client: TestClient, clock) -> None:
    gemini = ReportGemini(["not json", report_reply()])
    set_up(app, client, gemini)
    session_id = start(client).json()["id"]

    complete(client, session_id)

    assert gemini.report_calls == 2
    assert len(stored_reports(app)) == 1


def test_invalid_output_twice_saves_no_report_and_the_interview_stays_completed(
    app, client: TestClient, clock
) -> None:
    gemini = ReportGemini([report_reply(category_scores={"Technical Knowledge": 80})])
    set_up(app, client, gemini)
    session_id = start(client).json()["id"]

    complete(client, session_id)

    assert gemini.report_calls == 2
    assert stored_reports(app) == []
    assert app.state.db.execute("SELECT status FROM interview_sessions")[0]["status"] == "completed"
    assert client.get(f"/api/interview-sessions/{session_id}/report").status_code == 404


def test_the_report_can_be_created_again_after_a_failure(app, client: TestClient, clock) -> None:
    gemini = ReportGemini(["not json"])
    set_up(app, client, gemini)
    session_id = start(client).json()["id"]
    complete(client, session_id)
    assert stored_reports(app) == []

    gemini.replies = [report_reply()]
    gemini.report_calls = 0
    response = client.post(f"/api/interview-sessions/{session_id}/report")

    assert response.status_code == 200, response.text
    assert response.json()["overall_score"] == 67
    assert len(stored_reports(app)) == 1


def test_gemini_being_unavailable_saves_nothing_and_the_interview_stays_completed(
    app, client: TestClient, clock
) -> None:
    gemini = ReportGemini([report_reply()], report_unavailable=True)
    set_up(app, client, gemini)
    session_id = start(client).json()["id"]

    complete(client, session_id)

    assert gemini.report_calls == 1  # unavailable is not retried
    assert stored_reports(app) == []
    assert app.state.db.execute("SELECT status FROM interview_sessions")[0]["status"] == "completed"
    assert client.get(f"/api/interview-sessions/{session_id}/report").status_code == 404

    gemini.report_unavailable = False
    response = client.post(f"/api/interview-sessions/{session_id}/report")

    assert response.status_code == 200, response.text
    assert response.json()["overall_score"] == 67


def test_an_existing_report_is_not_regenerated(app, client: TestClient, clock) -> None:
    gemini = ReportGemini([report_reply()])
    set_up(app, client, gemini)
    session_id = start(client).json()["id"]
    complete(client, session_id)

    gemini.replies = [report_reply(category_scores={**TECHNICAL_SCORES, "Answer Clarity": 0})]
    response = client.post(f"/api/interview-sessions/{session_id}/report")

    assert response.json()["overall_score"] == 67
    assert gemini.report_calls == 1


def test_a_report_is_not_created_while_the_interview_is_running(app, client: TestClient, clock) -> None:
    gemini = ReportGemini([report_reply()])
    set_up(app, client, gemini)
    session_id = start(client).json()["id"]

    assert client.post(f"/api/interview-sessions/{session_id}/report").status_code == 409
    assert client.get(f"/api/interview-sessions/{session_id}/report").status_code == 404
    assert gemini.report_calls == 0


def test_an_interview_without_any_answer_has_no_report(app, client: TestClient, clock) -> None:
    gemini = ReportGemini([report_reply()])
    set_up(app, client, gemini)
    session_id = start(client).json()["id"]

    complete(client, session_id, text="")

    assert gemini.report_calls == 0
    assert client.post(f"/api/interview-sessions/{session_id}/report").status_code == 422


def test_another_users_report_is_not_visible(app, client: TestClient, clock) -> None:
    gemini = ReportGemini([report_reply()])
    set_up(app, client, gemini)
    session_id = start(client).json()["id"]
    complete(client, session_id)

    with TestClient(app) as grace_client:
        sign_in(grace_client, email="grace@example.com", name="Grace")
        assert grace_client.get(f"/api/interview-sessions/{session_id}/report").status_code == 404
        assert grace_client.post(f"/api/interview-sessions/{session_id}/report").status_code == 404


def test_report_routes_require_sign_in(app, client: TestClient) -> None:
    with TestClient(app) as anonymous:
        assert anonymous.get("/api/interview-sessions/abc/report").status_code == 401
        assert anonymous.post("/api/interview-sessions/abc/report").status_code == 401


def run_interview(app, client: TestClient, reply: str, interview_type: str = "Technical") -> dict:
    """Completes one interview of the given type with Gemini answering `reply`; returns the saved report."""
    set_up(app, client, ReportGemini([reply]))
    if interview_type != SETUP["interview_type"]:
        assert client.put("/api/interview-configuration", json={**SETUP, "interview_type": interview_type}).status_code == 200
    session_id = start(client).json()["id"]
    complete(client, session_id)
    response = client.get(f"/api/interview-sessions/{session_id}/report")
    assert response.status_code == 200, response.text
    return response.json()


def test_technical_worked_example_scores_79(app, client: TestClient, clock) -> None:
    # 80*30 + 60*25 + 80*25 + 100*20 = 7900, /100 = 79.
    body = run_interview(
        app,
        client,
        report_reply(
            category_scores={"Technical Knowledge": 80, "Problem-solving": 60, "Answer Accuracy": 80, "Answer Clarity": 100}
        ),
    )

    assert body["interview_type"] == "Technical"
    assert [c["name"] for c in body["categories"]] == [
        "Technical Knowledge",
        "Problem-solving",
        "Answer Accuracy",
        "Answer Clarity",
    ]
    assert body["overall_score"] == 79


def test_hr_interview_uses_hr_criteria_and_weights(app, client: TestClient, clock) -> None:
    # 80*30 + 70*20 + 60*20 + 90*30 = 7700, /100 = 77.
    body = run_interview(
        app,
        client,
        report_reply(
            category_scores={"Communication": 80, "Confidence": 70, "Professionalism": 60, "Answer Relevance": 90}
        ),
        interview_type="HR",
    )

    assert body["interview_type"] == "HR"
    assert [(c["name"], c["weight"]) for c in body["categories"]] == [
        ("Communication", 30),
        ("Confidence", 20),
        ("Professionalism", 20),
        ("Answer Relevance", 30),
    ]
    assert body["overall_score"] == 77


@pytest.mark.parametrize(
    ("interview_type", "scores", "expected_weights", "expected_score"),
    [
        (
            "Behavioral",
            {"Communication": 80, "Situation Analysis": 60, "Decision-making": 80, "Answer Relevance": 70},
            [20, 25, 25, 30],
            72,  # 80*20 + 60*25 + 80*25 + 70*30 = 7200
        ),
        (
            "Project-based",
            {"Project Knowledge": 80, "Technical Understanding": 60, "Problem-solving": 80, "Answer Clarity": 50},
            [30, 25, 25, 20],
            69,  # 80*30 + 60*25 + 80*25 + 50*20 = 6900
        ),
    ],
)
def test_behavioral_and_project_based_interviews_use_their_own_criteria(
    app, client: TestClient, clock, interview_type: str, scores: dict[str, int], expected_weights: list[int], expected_score: int
) -> None:
    body = run_interview(app, client, report_reply(category_scores=scores), interview_type=interview_type)

    assert body["interview_type"] == interview_type
    assert [c["name"] for c in body["categories"]] == list(scores)
    assert [c["weight"] for c in body["categories"]] == expected_weights
    assert body["overall_score"] == expected_score


def test_gemini_overall_score_is_ignored(app, client: TestClient, clock) -> None:
    # Gemini says 95; the category scores give 79 under Technical weights. The saved total must be 79.
    body = run_interview(
        app,
        client,
        report_reply(
            overall_score=95,
            category_scores={"Technical Knowledge": 80, "Problem-solving": 60, "Answer Accuracy": 80, "Answer Clarity": 100},
        ),
    )

    assert body["overall_score"] == 79
    assert [row["overall_score"] for row in app.state.db.execute("SELECT overall_score FROM interview_reports")] == [79]
