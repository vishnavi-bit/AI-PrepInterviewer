"""Resume analysis queries. The AI output and the candidate's corrections are stored in separate columns.

Every query takes an explicit user id; callers pass the id of the signed-in user.
"""

from __future__ import annotations

from typing import Any

from app.db.connection import Database


def get_for_user(db: Database, user_id: str) -> dict[str, Any] | None:
    rows = db.execute(
        "SELECT user_id, resume_id, ai_output, corrections, analyzed_at, corrected_at "
        "FROM resume_analyses WHERE user_id = ?",
        (user_id,),
    )
    return rows[0] if rows else None


def save_ai_output(db: Database, *, user_id: str, resume_id: str, ai_output: str, now: str) -> None:
    """A new analysis replaces the old one, and any corrections made to the old output are cleared."""
    db.execute(
        "INSERT INTO resume_analyses (user_id, resume_id, ai_output, corrections, analyzed_at, corrected_at) "
        "VALUES (?, ?, ?, NULL, ?, NULL) "
        "ON CONFLICT(user_id) DO UPDATE SET resume_id = excluded.resume_id, ai_output = excluded.ai_output, "
        "corrections = NULL, analyzed_at = excluded.analyzed_at, corrected_at = NULL",
        (user_id, resume_id, ai_output, now),
    )


def save_corrections(db: Database, *, user_id: str, corrections: str, now: str) -> None:
    db.execute(
        "UPDATE resume_analyses SET corrections = ?, corrected_at = ? WHERE user_id = ?",
        (corrections, now, user_id),
    )


def delete_for_user(db: Database, user_id: str) -> None:
    db.execute("DELETE FROM resume_analyses WHERE user_id = ?", (user_id,))
