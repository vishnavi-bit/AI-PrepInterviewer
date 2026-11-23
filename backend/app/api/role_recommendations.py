"""Role recommendation routes. The user is always the signed-in user; no user id is taken from the URL or body."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.auth.deps import CurrentUser
from app.services import role_recommendation_service
from app.services.resume_service import ResumeRejected

router = APIRouter(prefix="/api/role-recommendations", tags=["role-recommendations"])


class RoleOut(BaseModel):
    position: int
    name: str
    reason: str


class RecommendationsOut(BaseModel):
    roles: list[RoleOut]
    selected_role: str | None


class SelectionIn(BaseModel):
    position: int = Field(ge=1, le=role_recommendation_service.ROLE_COUNT)


def _reject(exc: ResumeRejected) -> HTTPException:
    return HTTPException(status_code=exc.status_code, detail=exc.detail)


@router.get("", response_model=RecommendationsOut)
def get_recommendations(request: Request, user: CurrentUser) -> RecommendationsOut:
    try:
        result = role_recommendation_service.get_or_generate(request.app.state.db, request.app.state.gemini, user_id=user["id"])
    except ResumeRejected as exc:
        raise _reject(exc) from exc
    return RecommendationsOut(**result)


@router.post("/selection", response_model=RecommendationsOut)
def select_role(request: Request, user: CurrentUser, body: SelectionIn) -> RecommendationsOut:
    try:
        result = role_recommendation_service.select_role(request.app.state.db, user_id=user["id"], position=body.position)
    except ResumeRejected as exc:
        raise _reject(exc) from exc
    return RecommendationsOut(**result)
