"""Interview configuration routes. The user is always the signed-in user; no user id is taken from the URL or body."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.auth.deps import CurrentUser
from app.services import interview_configuration_service as service
from app.services.resume_service import ResumeRejected

router = APIRouter(prefix="/api/interview-configuration", tags=["interview-configuration"])


class SettingsOut(BaseModel):
    interview_type: str
    difficulty: str
    duration_minutes: int


class ConfigurationOut(BaseModel):
    role: str | None
    duration_options: list[int]
    settings: SettingsOut | None


class ConfigurationIn(BaseModel):
    interview_type: Literal["Technical", "HR", "Behavioral", "Project-based"]
    difficulty: Literal["Easy", "Medium", "Hard"]
    duration_minutes: int = Field(ge=1, le=600)


def _reject(exc: ResumeRejected) -> HTTPException:
    return HTTPException(status_code=exc.status_code, detail=exc.detail)


@router.get("", response_model=ConfigurationOut)
def get_configuration(request: Request, user: CurrentUser) -> ConfigurationOut:
    result = service.get_configuration(request.app.state.db, request.app.state.settings, user_id=user["id"])
    return ConfigurationOut(**result)


@router.put("", response_model=ConfigurationOut)
def save_configuration(request: Request, user: CurrentUser, body: ConfigurationIn) -> ConfigurationOut:
    try:
        result = service.save_configuration(
            request.app.state.db,
            request.app.state.settings,
            user_id=user["id"],
            interview_type=body.interview_type,
            difficulty=body.difficulty,
            duration_minutes=body.duration_minutes,
        )
    except ResumeRejected as exc:
        raise _reject(exc) from exc
    return ConfigurationOut(**result)
