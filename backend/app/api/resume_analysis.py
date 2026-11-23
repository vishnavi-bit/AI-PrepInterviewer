"""Resume analysis routes. The user is always the signed-in user; no user id is taken from the URL or body."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, HTTPException, Request
from pydantic import BaseModel

from app.auth.deps import CurrentUser
from app.services import resume_analysis_service
from app.services.resume_service import ResumeRejected

router = APIRouter(prefix="/api/resume/analysis", tags=["resume-analysis"])


class AnalysisOut(BaseModel):
    ai_output: dict[str, Any]
    corrections: dict[str, Any] | None
    corrected: bool


def _reject(exc: ResumeRejected) -> HTTPException:
    return HTTPException(status_code=exc.status_code, detail=exc.detail)


@router.post("", response_model=AnalysisOut)
def analyze_resume(request: Request, user: CurrentUser) -> AnalysisOut:
    try:
        resume_analysis_service.analyze(request.app.state.db, request.app.state.gemini, user_id=user["id"])
    except ResumeRejected as exc:
        raise _reject(exc) from exc
    return AnalysisOut(**resume_analysis_service.current(request.app.state.db, user["id"]))


@router.get("", response_model=AnalysisOut)
def get_analysis(request: Request, user: CurrentUser) -> AnalysisOut:
    result = resume_analysis_service.current(request.app.state.db, user["id"])
    if result is None:
        raise HTTPException(status_code=404, detail="No analysis yet. Analyze your resume first.")
    return AnalysisOut(**result)


@router.put("/corrections", response_model=AnalysisOut)
def save_corrections(request: Request, user: CurrentUser, payload: Any = Body(...)) -> AnalysisOut:
    try:
        result = resume_analysis_service.save_corrections(request.app.state.db, user_id=user["id"], payload=payload)
    except ResumeRejected as exc:
        raise _reject(exc) from exc
    return AnalysisOut(**result)
