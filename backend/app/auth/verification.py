"""Verification for deletion requests (WI-060): the candidate must re-enter their current password.

The same password check as sign-in and password change is used. Nothing about the password is logged.
"""

from __future__ import annotations

from app.auth.security import verify_password
from app.db import users
from app.db.connection import Database


def password_matches(db: Database, user_id: str, password: str) -> bool:
    stored_hash = users.get_password_hash(db, user_id)
    return stored_hash is not None and verify_password(stored_hash, password)
