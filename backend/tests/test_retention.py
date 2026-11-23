from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.db import activity_repo
from app.db import interview_sessions_repo as sessions_repo
from app.services import retention_service
from app.timeutil import iso, utc_now
from tests.conftest import delete_verified, login, register
from tests.test_dashboard import _completed_session, _report
from tests.test_resumes import make_pdf, sign_in, upload

LONG_AGO = "2000-01-01T00:00:00+00:00"


def _set_activity(app, user_id: str, moment: str) -> None:
    activity_repo.touch(app.state.db, user_id, moment)


def _run(app, now: datetime | None = None) -> dict[str, int]:
    return retention_service.run(app.state.db, app.state.resume_store, now=now or utc_now())


def test_the_cutoff_is_one_calendar_year_back() -> None:
    assert retention_service.cutoff_one_year_before(datetime(2026, 11, 23, 9, 0, tzinfo=timezone.utc)) == datetime(
        2025, 11, 23, 9, 0, tzinfo=timezone.utc
    )
    # 29 February one year earlier is not a real date, so the rule uses 28 February.
    assert retention_service.cutoff_one_year_before(datetime(2028, 2, 29, tzinfo=timezone.utc)) == datetime(
        2027, 2, 28, tzinfo=timezone.utc
    )


def test_a_resume_of_a_candidate_inactive_for_a_year_is_deleted_with_its_analysis(app, settings) -> None:
    with TestClient(app) as client:
        sign_in(client)
        upload(client, make_pdf("old resume"), "old.pdf")
        user_id = app.state.db.execute("SELECT id FROM users")[0]["id"]
    _set_activity(app, user_id, LONG_AGO)

    counts = _run(app)

    assert counts["resumes_deleted"] == 1
    assert app.state.db.execute("SELECT id FROM resumes") == []
    assert list((settings.resumes_dir or settings.uploads_dir / "resumes").rglob("*.pdf")) == []


def test_an_active_candidates_resume_is_kept(app, settings) -> None:
    with TestClient(app) as client:
        sign_in(client)
        upload(client, make_pdf("current resume"), "current.pdf")

    counts = _run(app)

    assert counts["resumes_deleted"] == 0
    assert len(app.state.db.execute("SELECT id FROM resumes")) == 1


def test_interviews_older_than_a_year_are_deleted_with_answers_and_reports(app) -> None:
    with TestClient(app) as client:
        sign_in(client)
    user_id = app.state.db.execute("SELECT id FROM users")[0]["id"]
    old = _completed_session(app, user_id, role="Backend", day=1)
    _report(app, user_id, old, 70)
    recent = _completed_session(app, user_id, role="Backend", day=2)
    app.state.db.execute("UPDATE interview_sessions SET started_at = ? WHERE id = ?", (LONG_AGO, old))

    counts = _run(app)

    assert counts["interviews_deleted"] == 1
    assert [row["id"] for row in app.state.db.execute("SELECT id FROM interview_sessions")] == [recent]
    assert app.state.db.execute("SELECT session_id FROM interview_reports WHERE session_id = ?", (old,)) == []


def test_running_the_retention_twice_deletes_nothing_the_second_time(app) -> None:
    with TestClient(app) as client:
        sign_in(client)
        upload(client, make_pdf("resume"), "cv.pdf")
    user_id = app.state.db.execute("SELECT id FROM users")[0]["id"]
    _set_activity(app, user_id, LONG_AGO)

    first = _run(app)
    second = _run(app)

    assert first["resumes_deleted"] == 1
    assert second == {"resumes_deleted": 0, "interviews_deleted": 0}


def test_a_candidate_can_delete_a_finished_interview_with_their_password(app) -> None:
    with TestClient(app) as client:
        sign_in(client)
        user_id = app.state.db.execute("SELECT id FROM users")[0]["id"]
        session_id = _completed_session(app, user_id, role="Backend", day=3)
        _report(app, user_id, session_id, 80)

        response = delete_verified(client, f"/api/interview-sessions/{session_id}")

        assert response.status_code == 204
        assert app.state.db.execute("SELECT id FROM interview_sessions WHERE id = ?", (session_id,)) == []
        assert app.state.db.execute("SELECT session_id FROM interview_reports WHERE session_id = ?", (session_id,)) == []


def test_an_interview_is_not_deleted_without_the_password(app) -> None:
    with TestClient(app) as client:
        sign_in(client)
        user_id = app.state.db.execute("SELECT id FROM users")[0]["id"]
        session_id = _completed_session(app, user_id, role="Backend", day=4)

        response = delete_verified(client, f"/api/interview-sessions/{session_id}", password="wrong-password")

        assert response.status_code == 403
        assert len(app.state.db.execute("SELECT id FROM interview_sessions WHERE id = ?", (session_id,))) == 1


def test_an_interview_still_in_progress_cannot_be_deleted(app) -> None:
    with TestClient(app) as client:
        sign_in(client)
        user_id = app.state.db.execute("SELECT id FROM users")[0]["id"]
        session_id = _completed_session(app, user_id, role="Backend", day=5, status="in_progress")

        response = delete_verified(client, f"/api/interview-sessions/{session_id}")

        assert response.status_code == 409
        assert len(app.state.db.execute("SELECT id FROM interview_sessions WHERE id = ?", (session_id,))) == 1


def test_another_candidate_cannot_delete_someone_elses_interview(app) -> None:
    with TestClient(app) as ada:
        sign_in(ada, email="ada@example.com", name="Ada")
    ada_id = app.state.db.execute("SELECT id FROM users WHERE email = 'ada@example.com'")[0]["id"]
    session_id = _completed_session(app, ada_id, role="Backend", day=6)

    with TestClient(app) as grace:
        register(grace, email="grace@example.com", name="Grace")
        assert login(grace, email="grace@example.com").status_code == 200

        response = delete_verified(grace, f"/api/interview-sessions/{session_id}")

    assert response.status_code == 404
    assert len(app.state.db.execute("SELECT id FROM interview_sessions WHERE id = ?", (session_id,))) == 1
