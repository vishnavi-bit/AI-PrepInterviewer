"""User queries. Every query takes an explicit user id; callers pass the id of the signed-in user."""

from __future__ import annotations

from typing import Any
from uuid import uuid4

from app.db.connection import Database

PUBLIC_COLUMNS = "id, name, email, target_role, avatar_path, created_at, updated_at"


def create_user(db: Database, *, name: str, email: str, password_hash: str, now: str) -> dict[str, Any]:
    user_id = uuid4().hex
    db.execute(
        "INSERT INTO users (id, name, email, password_hash, target_role, avatar_path, created_at, updated_at) "
        "VALUES (?, ?, ?, ?, NULL, NULL, ?, ?)",
        (user_id, name, email, password_hash, now, now),
    )
    user = get_user_by_id(db, user_id)
    assert user is not None
    return user


def get_user_by_id(db: Database, user_id: str) -> dict[str, Any] | None:
    rows = db.execute(f"SELECT {PUBLIC_COLUMNS} FROM users WHERE id = ?", (user_id,))
    return rows[0] if rows else None


def get_user_by_email(db: Database, email: str) -> dict[str, Any] | None:
    """Includes password_hash. Used only for login and the duplicate check at registration."""
    rows = db.execute(
        "SELECT id, name, email, password_hash, target_role, avatar_path, created_at, updated_at "
        "FROM users WHERE email = ?",
        (email,),
    )
    return rows[0] if rows else None


def get_password_hash(db: Database, user_id: str) -> str | None:
    rows = db.execute("SELECT password_hash FROM users WHERE id = ?", (user_id,))
    return rows[0]["password_hash"] if rows else None


def update_profile(db: Database, user_id: str, *, name: str, target_role: str | None, now: str) -> None:
    db.execute(
        "UPDATE users SET name = ?, target_role = ?, updated_at = ? WHERE id = ?",
        (name, target_role, now, user_id),
    )


def set_password_hash(db: Database, user_id: str, password_hash: str, now: str) -> None:
    db.execute(
        "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
        (password_hash, now, user_id),
    )


def set_avatar_path(db: Database, user_id: str, avatar_path: str, now: str) -> None:
    db.execute(
        "UPDATE users SET avatar_path = ?, updated_at = ? WHERE id = ?",
        (avatar_path, now, user_id),
    )
