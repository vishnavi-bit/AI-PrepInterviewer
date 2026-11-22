"""Server-side sessions. The browser holds an HTTP-only cookie with the token; the database holds its hash."""

from __future__ import annotations

from typing import Any

from fastapi import Response

from app.config import Settings
from app.db.connection import Database

SESSION_COOKIE = "session"


def create_session(db: Database, *, user_id: str, token_hash: str, now: str, expires_at: str) -> None:
    db.execute(
        "INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
        (token_hash, user_id, now, expires_at),
    )


def find_session_user(db: Database, token_hash: str, now: str) -> dict[str, Any] | None:
    rows = db.execute(
        "SELECT u.id, u.name, u.email, u.target_role, u.avatar_path, u.created_at, u.updated_at "
        "FROM sessions s JOIN users u ON u.id = s.user_id "
        "WHERE s.token_hash = ? AND s.expires_at > ?",
        (token_hash, now),
    )
    return rows[0] if rows else None


def delete_session(db: Database, token_hash: str) -> None:
    db.execute("DELETE FROM sessions WHERE token_hash = ?", (token_hash,))


def delete_other_sessions(db: Database, user_id: str, keep_token_hash: str) -> None:
    db.execute(
        "DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?",
        (user_id, keep_token_hash),
    )


def set_session_cookie(response: Response, token: str, settings: Settings) -> None:
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=settings.session_days * 24 * 60 * 60,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )


def clear_session_cookie(response: Response, settings: Settings) -> None:
    response.delete_cookie(
        SESSION_COOKIE,
        path="/",
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
    )
