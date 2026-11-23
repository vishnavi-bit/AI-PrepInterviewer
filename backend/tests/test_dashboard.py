from __future__ import annotations

import json
import uuid
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.db import interview_reports_repo as reports_repo
from app.db import interview_sessions_repo as sessions_repo
from app.timeutil import iso
from tests.conftest import login, register

TECHNICAL = {"Technical Knowledge": 80, "Problem-solving": 70, "Answer Accuracy": 60, "Answer Clarity": 50}


def _completed_session(app, user_id: str, *, role: str, day: int, status: str = "completed") -> str:
    session_id = uuid.uuid4().hex
    started = datetime(2026, 11, day, 9, 0, tzinfo=timezone.utc)
    sessions_repo.create_session(
        app.state.db,
        {
            "id": session_id,
            "user_id": user_id,
            "status": "in_progress",
            "role": role,
            "interview_type": "Technical",
            "difficulty": "Medium",
            "duration_minutes": 30,
            "plan": json.dumps(["q"] * 10),
            "started_at": iso(started),
            "deadline_at": iso(started + timedelta(minutes=30)),
        },
    )
    if status != "in_progress":
        sessions_repo.close_session(app.state.db, session_id, status=status, ended_at=iso(started + timedelta(minutes=20)))
    return session_id


def _report(app, user_id: str, session_id: str, overall: int, categories: dict[str, int] = TECHNICAL) -> None:
    reports_repo.save(
        app.state.db,
        {
            "session_id": session_id,
            "user_id": user_id,
            "interview_type": "Technical",
            "overall_score": overall,
            "category_scores": json.dumps(categories),
            "strengths": json.dumps(["Clear"]),
            "improvements": json.dumps(["More detail"]),
            "suggestions": json.dumps(["Practise"]),
            "created_at": iso(datetime(2026, 11, 1, tzinfo=timezone.utc)),
        },
    )


def _signed_in(client: TestClient, email: str) -> dict:
    user = register(client, email=email, name=email.split("@")[0])
    assert login(client, email=email).status_code == 200
    return user


def _dashboard(client: TestClient) -> dict:
    response = client.get("/api/dashboard")
    assert response.status_code == 200, response.text
    return response.json()


def test_a_candidate_with_no_interviews_gets_an_empty_dashboard(client: TestClient) -> None:
    _signed_in(client, "new@example.com")

    body = _dashboard(client)

    assert body["has_history"] is False
    assert body["completed_count"] == 0
    assert body["most_recent_score"] is None
    assert body["average_score"] is None
    assert body["trend"] is None
    assert body["recent"] == []
    assert body["weak_topics"] == []
    assert body["role_performance"] == []


def test_only_completed_interviews_are_counted(client: TestClient, app) -> None:
    user = _signed_in(client, "counts@example.com")
    _completed_session(app, user["id"], role="Backend", day=1)
    _completed_session(app, user["id"], role="Backend", day=2, status="interrupted")
    _completed_session(app, user["id"], role="Backend", day=3, status="in_progress")

    body = _dashboard(client)

    assert body["completed_count"] == 1
    assert len(body["recent"]) == 1


def test_average_and_trend_need_saved_reports_and_two_of_them(client: TestClient, app) -> None:
    user = _signed_in(client, "trend@example.com")
    older = _completed_session(app, user["id"], role="Backend", day=1)
    newer = _completed_session(app, user["id"], role="Backend", day=2)
    _report(app, user["id"], older, 60)

    one = _dashboard(client)
    assert one["most_recent_score"] == 60
    assert one["average_score"] is None
    assert one["trend"] is None

    _report(app, user["id"], newer, 80)
    two = _dashboard(client)
    assert two["most_recent_score"] == 80
    assert two["average_score"] == 70
    assert two["trend"] == {"change": 20, "direction": "improved"}


def test_an_interview_without_a_saved_report_has_no_score(client: TestClient, app) -> None:
    user = _signed_in(client, "noscore@example.com")
    scored = _completed_session(app, user["id"], role="Backend", day=1)
    unscored = _completed_session(app, user["id"], role="Backend", day=2)
    _report(app, user["id"], scored, 70)

    body = _dashboard(client)
    by_id = {row["session_id"]: row for row in body["recent"]}

    assert by_id[unscored]["overall_score"] is None
    assert by_id[scored]["overall_score"] == 70
    assert body["average_score"] is None  # only one saved report
    assert body["completed_count"] == 2


def test_weak_topics_are_categories_whose_average_is_below_sixty(client: TestClient, app) -> None:
    user = _signed_in(client, "weak@example.com")
    first = _completed_session(app, user["id"], role="Backend", day=1)
    second = _completed_session(app, user["id"], role="Backend", day=2)
    _report(app, user["id"], first, 60, {"Technical Knowledge": 90, "Problem-solving": 70, "Answer Accuracy": 60, "Answer Clarity": 40})
    _report(app, user["id"], second, 60, {"Technical Knowledge": 80, "Problem-solving": 70, "Answer Accuracy": 60, "Answer Clarity": 50})

    body = _dashboard(client)

    assert body["weak_topics"] == [{"name": "Answer Clarity", "average_score": 45}]
    assert body["suggested_practice"] == ["Practise Answer Clarity"]


def test_one_candidate_never_sees_another_candidates_interviews(client: TestClient, app) -> None:
    alice = _signed_in(client, "alice@example.com")
    alice_session = _completed_session(app, alice["id"], role="Data Analyst", day=1)
    _report(app, alice["id"], alice_session, 55)
    client.post("/api/auth/logout")

    bob = _signed_in(client, "bob@example.com")
    bob_session = _completed_session(app, bob["id"], role="Backend", day=2)
    _report(app, bob["id"], bob_session, 90)

    body = _dashboard(client)

    assert [row["session_id"] for row in body["recent"]] == [bob_session]
    assert body["role_performance"] == [{"role": "Backend", "interviews": 1, "average_score": 90}]
    assert all(row["role"] != "Data Analyst" for row in body["role_performance"])


def test_a_dashboard_entry_opens_its_own_report_and_another_users_report_is_not_found(client: TestClient, app) -> None:
    alice = _signed_in(client, "open-alice@example.com")
    alice_session = _completed_session(app, alice["id"], role="Data Analyst", day=1)
    _report(app, alice["id"], alice_session, 55)
    client.post("/api/auth/logout")

    bob = _signed_in(client, "open-bob@example.com")
    bob_session = _completed_session(app, bob["id"], role="Backend", day=2)
    _report(app, bob["id"], bob_session, 90)

    [row] = _dashboard(client)["recent"]
    opened = client.get(f"/api/interview-sessions/{row['session_id']}/report")

    assert row["session_id"] == bob_session
    assert opened.status_code == 200
    assert opened.json()["overall_score"] == 90
    assert client.get(f"/api/interview-sessions/{alice_session}/report").status_code == 404


def test_the_dashboard_requires_sign_in(client: TestClient) -> None:
    response = client.get("/api/dashboard")

    assert response.status_code == 401
