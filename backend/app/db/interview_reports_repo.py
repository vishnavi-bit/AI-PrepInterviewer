"""Interview report queries. A report is saved once per session; callers check that the session belongs to the user."""

from __future__ import annotations

from typing import Any

from app.db.connection import Database

REPORT_COLUMNS = (
    "session_id, user_id, interview_type, overall_score, category_scores, strengths, improvements, suggestions, created_at"
)


def get_for_session(db: Database, session_id: str, user_id: str) -> dict[str, Any] | None:
    """The report for the session, only when it belongs to the user (WI-060: ownership in the query)."""
    rows = db.execute(
        f"SELECT {REPORT_COLUMNS} FROM interview_reports WHERE session_id = ? AND user_id = ?",
        (session_id, user_id),
    )
    return rows[0] if rows else None


def list_for_user(db: Database, user_id: str) -> list[dict[str, Any]]:
    return db.execute(f"SELECT {REPORT_COLUMNS} FROM interview_reports WHERE user_id = ?", (user_id,))


def save(db: Database, row: dict[str, Any]) -> None:
    """Keeps the first report saved for a session; a second save for the same session changes nothing."""
    db.execute(
        "INSERT INTO interview_reports (session_id, user_id, interview_type, overall_score, category_scores, "
        "strengths, improvements, suggestions, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) "
        "ON CONFLICT(session_id) DO NOTHING",
        (
            row["session_id"],
            row["user_id"],
            row["interview_type"],
            row["overall_score"],
            row["category_scores"],
            row["strengths"],
            row["improvements"],
            row["suggestions"],
            row["created_at"],
        ),
    )
