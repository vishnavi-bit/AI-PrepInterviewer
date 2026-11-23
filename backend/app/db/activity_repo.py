"""Last-activity queries used by the retention rules (WI-060). Every write takes the id of the signed-in user."""

from __future__ import annotations

from app.db.connection import Database


def touch(db: Database, user_id: str, now: str) -> None:
    """Records that the candidate did something: signed in, changed their data, or took part in an interview."""
    db.execute(
        "INSERT INTO user_activity (user_id, last_activity_at) VALUES (?, ?) "
        "ON CONFLICT(user_id) DO UPDATE SET last_activity_at = excluded.last_activity_at",
        (user_id, now),
    )


def inactive_user_ids(db: Database, cutoff: str) -> list[str]:
    """Candidates whose last activity is before the cutoff. For the retention job only."""
    rows = db.execute("SELECT user_id FROM user_activity WHERE last_activity_at < ?", (cutoff,))
    return [row["user_id"] for row in rows]
