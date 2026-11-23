"""Interview session routes. The user is always the signed-in user; no user id is taken from the URL or body."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, Response
from pydantic import BaseModel, Field

from app.auth import verification
from app.auth.deps import CurrentUser
from app.logging_setup import get_logger, log_event
from app.services import interview_report_service as reports
from app.services import interview_session_service as service
from app.services.resume_service import ResumeRejected

router = APIRouter(prefix="/api/interview-sessions", tags=["interview-sessions"])
logger = get_logger("interview")


class AnswerIn(BaseModel):
    answer: str = ""


class DeleteIn(BaseModel):
    # The candidate's current password: deletion is verified, not just signed in (WI-060).
    password: str = Field(min_length=1, max_length=256)


def _reject(exc: ResumeRejected) -> HTTPException:
    return HTTPException(status_code=exc.status_code, detail=exc.detail)


def _report_reject(exc: reports.ReportError) -> HTTPException:
    return HTTPException(status_code=exc.status_code, detail=exc.detail)


def _schedule_report(background: BackgroundTasks, request: Request, user_id: str, view: dict[str, Any] | None) -> None:
    """A completed interview gets its report after the response is sent, so the candidate is not kept waiting on Gemini."""
    if view is None or view["status"] != service.COMPLETED:
        return
    background.add_task(
        reports.generate_quietly,
        request.app.state.db,
        request.app.state.gemini,
        user_id=user_id,
        session_id=view["id"],
    )


@router.get("/current")
def current(request: Request, user: CurrentUser, background: BackgroundTasks) -> dict[str, Any] | None:
    view = service.current(request.app.state.db, user_id=user["id"])
    _schedule_report(background, request, user["id"], view)
    return view


@router.post("", status_code=201)
def start(request: Request, user: CurrentUser) -> dict[str, Any]:
    try:
        return service.start(request.app.state.db, request.app.state.gemini, user_id=user["id"])
    except ResumeRejected as exc:
        raise _reject(exc) from exc


@router.post("/{session_id}/answers")
def submit_answer(
    session_id: str, body: AnswerIn, request: Request, user: CurrentUser, background: BackgroundTasks
) -> dict[str, Any]:
    try:
        view = service.submit_answer(
            request.app.state.db,
            request.app.state.gemini,
            user_id=user["id"],
            session_id=session_id,
            answer=body.answer,
        )
    except ResumeRejected as exc:
        raise _reject(exc) from exc
    _schedule_report(background, request, user["id"], view)
    return view


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


@router.delete("/{session_id}", status_code=204)
def delete_interview(session_id: str, body: DeleteIn, request: Request, user: CurrentUser) -> Response:
    db = request.app.state.db
    if not verification.password_matches(db, user["id"], body.password):
        log_event(logger, logging.WARNING, "interview_delete_refused", user_id=user["id"], reason="password")
        raise HTTPException(status_code=403, detail="Enter your current password to delete this interview.")
    try:
        service.delete_finished(db, user_id=user["id"], session_id=session_id)
    except ResumeRejected as exc:
        raise _reject(exc) from exc
    log_event(logger, logging.INFO, "interview_deleted", user_id=user["id"])
    return Response(status_code=204)


@router.get("/{session_id}/report")
def get_report(session_id: str, request: Request, user: CurrentUser) -> dict[str, Any]:
    try:
        return reports.get_for_user(request.app.state.db, user_id=user["id"], session_id=session_id)
    except reports.ReportError as exc:
        raise _report_reject(exc) from exc


@router.post("/{session_id}/report")
def create_report(session_id: str, request: Request, user: CurrentUser) -> dict[str, Any]:
    """Creates the report when it is missing, for example after an AI failure. Returns the saved report otherwise."""
    try:
        return reports.generate(
            request.app.state.db,
            request.app.state.gemini,
            user_id=user["id"],
            session_id=session_id,
        )
    except reports.ReportError as exc:
        raise _report_reject(exc) from exc
