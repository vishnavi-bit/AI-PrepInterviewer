from __future__ import annotations

from datetime import timedelta

from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import JSONResponse

from app.auth import sessions
from app.auth.deps import current_session_hash
from app.auth.schemas import LoginIn, RegisterIn, UserOut, to_user_out
from app.auth.security import DUMMY_HASH, hash_password, hash_token, new_session_token, verify_password
from app.db import users
from app.db.connection import IntegrityError
from app.timeutil import iso, utc_now

router = APIRouter(prefix="/api/auth", tags=["auth"])

INVALID_LOGIN = "Email or password is incorrect."
DUPLICATE_EMAIL = "An account with this email already exists."


@router.post("/register", status_code=201, response_model=UserOut)
def register(body: RegisterIn, request: Request) -> UserOut:
    db = request.app.state.db
    if users.get_user_by_email(db, body.email) is not None:
        raise HTTPException(status_code=409, detail=DUPLICATE_EMAIL)
    try:
        user = users.create_user(
            db,
            name=body.name,
            email=body.email,
            password_hash=hash_password(body.password),
            now=iso(utc_now()),
        )
    except IntegrityError as exc:  # two registrations with the same email at the same time
        raise HTTPException(status_code=409, detail=DUPLICATE_EMAIL) from exc
    return to_user_out(user)


@router.post("/login", response_model=UserOut)
def login(body: LoginIn, request: Request) -> JSONResponse:
    db = request.app.state.db
    settings = request.app.state.settings
    user = users.get_user_by_email(db, body.email.strip().lower())
    password_ok = verify_password(user["password_hash"] if user else DUMMY_HASH, body.password)
    if user is None or not password_ok:
        raise HTTPException(status_code=401, detail=INVALID_LOGIN)

    token, token_hash = new_session_token()
    now = utc_now()
    sessions.create_session(
        db,
        user_id=user["id"],
        token_hash=token_hash,
        now=iso(now),
        expires_at=iso(now + timedelta(days=settings.session_days)),
    )
    response = JSONResponse(content=to_user_out(user).model_dump())
    sessions.set_session_cookie(response, token, settings)
    return response


@router.post("/logout", status_code=204)
def logout(request: Request) -> Response:
    settings = request.app.state.settings
    token_hash = current_session_hash(request)
    if token_hash:
        sessions.delete_session(request.app.state.db, token_hash)
    response = Response(status_code=204)
    sessions.clear_session_cookie(response, settings)
    return response
