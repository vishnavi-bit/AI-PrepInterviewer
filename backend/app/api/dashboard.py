"""Candidate dashboard route. The user is always the signed-in user; no user id is taken from the URL or body."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request

from app.auth.deps import CurrentUser
from app.services import dashboard_service as service

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("")
def dashboard(request: Request, user: CurrentUser) -> dict[str, Any]:
    return service.summary(request.app.state.db, user_id=user["id"])
