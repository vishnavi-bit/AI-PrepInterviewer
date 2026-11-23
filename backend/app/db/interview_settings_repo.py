"""The interview type, difficulty and duration the candidate reviewed and started with.

Every query takes an explicit user id; callers pass the id of the signed-in user.
"""

from __future__ import annotations

from typing import Any

from app.db.connection import Database


def get_for_user(db: Database, user_id: str) -> dict[str, Any] | None:
    rows = db.execute(
        "SELECT interview_type, difficulty, duration_minutes FROM interview_settings WHERE user_id = ?",
        (user_id,),
    )
    return rows[0] if rows else None


def save_for_user(
    db: Database, *, user_id: str, interview_type: str, difficulty: str, duration_minutes: int, now: str
) -> None:
    db.execute(
        "INSERT INTO interview_settings (user_id, interview_type, difficulty, duration_minutes, updated_at) "
        "VALUES (?, ?, ?, ?, ?) "
        "ON CONFLICT(user_id) DO UPDATE SET interview_type = excluded.interview_type, "
        "difficulty = excluded.difficulty, duration_minutes = excluded.duration_minutes, updated_at = excluded.updated_at",
        (user_id, interview_type, difficulty, duration_minutes, now),
    )
