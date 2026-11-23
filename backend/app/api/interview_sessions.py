"""Interview session routes. The user is always the signed-in user; no user id is taken from the URL or body."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.auth.deps import CurrentUser
from app.services import interview_session_service as service
from app.services.resume_service import ResumeRejected

router = APIRouter(prefix="/api/interview-sessions", tags=["interview-sessions"])


class AnswerIn(BaseModel):
    answer: str = ""


def _reject(exc: ResumeRejected) -> HTTPException:
    return HTTPException(status_code=exc.status_code, detail=exc.detail)


@router.get("/current")
def current(request: Request, user: CurrentUser) -> dict[str, Any] | None:
    return service.current(request.app.state.db, user_id=user["id"])


@router.post("", status_code=201)
def start(request: Request, user: CurrentUser) -> dict[str, Any]:
    try:
        return service.start(request.app.state.db, request.app.state.gemini, user_id=user["id"])
    except ResumeRejected as exc:
        raise _reject(exc) from exc


@router.post("/{session_id}/answers")
def submit_answer(session_id: str, body: AnswerIn, request: Request, user: CurrentUser) -> dict[str, Any]:
    try:
        return service.submit_answer(
            request.app.state.db,
            request.app.state.gemini,
            user_id=user["id"],
            session_id=session_id,
            answer=body.answer,
        )
    except ResumeRejected as exc:
        raise _reject(exc) from exc


@router.post("/{session_id}/end")
def end_interview(session_id: str, request: Request, user: CurrentUser, body: AnswerIn | None = None) -> dict[str, Any]:
    try:
        return service.end_interview(
            request.app.state.db,
            user_id=user["id"],
            session_id=session_id,
            answer=body.answer if body else "",
        )
    except ResumeRejected as exc:
        raise _reject(exc) from exc
