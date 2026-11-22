from __future__ import annotations

from typing import Annotated, Any

from fastapi import Depends, HTTPException, Request

from app.auth import sessions
from app.auth.security import hash_token
from app.auth.sessions import SESSION_COOKIE
from app.timeutil import iso, utc_now


def current_session_hash(request: Request) -> str | None:
    token = request.cookies.get(SESSION_COOKIE)
    return hash_token(token) if token else None


def current_user(request: Request) -> dict[str, Any]:
    token_hash = current_session_hash(request)
    user = (
        sessions.find_session_user(request.app.state.db, token_hash, iso(utc_now()))
        if token_hash
        else None
    )
    if user is None:
        raise HTTPException(status_code=401, detail="Sign in to continue.")
    return user


CurrentUser = Annotated[dict[str, Any], Depends(current_user)]
