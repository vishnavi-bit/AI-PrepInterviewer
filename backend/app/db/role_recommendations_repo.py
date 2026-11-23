"""Role recommendation queries and the saved interview configuration (selected role).

Every query takes an explicit user id; callers pass the id of the signed-in user.
"""

from __future__ import annotations

from typing import Any

from app.db.connection import Database


def list_for_user(db: Database, user_id: str) -> list[dict[str, Any]]:
    return db.execute(
        "SELECT resume_id, position, role_name, reason FROM role_recommendations WHERE user_id = ? ORDER BY position",
        (user_id,),
    )


def replace_for_user(db: Database, *, user_id: str, resume_id: str, roles: list[dict[str, str]]) -> None:
    """A new generation replaces the user's previous list."""
    db.execute("DELETE FROM role_recommendations WHERE user_id = ?", (user_id,))
    for position, role in enumerate(roles, start=1):
        db.execute(
            "INSERT INTO role_recommendations (user_id, resume_id, position, role_name, reason) VALUES (?, ?, ?, ?, ?)",
            (user_id, resume_id, position, role["name"], role["reason"]),
        )


def delete_for_user(db: Database, user_id: str) -> None:
    """Removes the generated roles, which are derived from the resume, when that resume is purged."""
    db.execute("DELETE FROM role_recommendations WHERE user_id = ?", (user_id,))


def get_selected_role(db: Database, user_id: str) -> str | None:
    rows = db.execute("SELECT selected_role FROM interview_configurations WHERE user_id = ?", (user_id,))
    return rows[0]["selected_role"] if rows else None


def save_selected_role(db: Database, *, user_id: str, role_name: str, now: str) -> None:
    db.execute(
        "INSERT INTO interview_configurations (user_id, selected_role, selected_at) VALUES (?, ?, ?) "
        "ON CONFLICT(user_id) DO UPDATE SET selected_role = excluded.selected_role, selected_at = excluded.selected_at",
        (user_id, role_name, now),
    )
