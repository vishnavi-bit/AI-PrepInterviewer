"""Resume routes. The user is always the signed-in user; no user id is taken from the URL or body.

A resume that belongs to another user is never returned here: every lookup is scoped to the
signed-in user, so another user's resume simply looks like "no resume" (404).
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, File, HTTPException, Request, Response, UploadFile
from pydantic import BaseModel

from app.auth.deps import CurrentUser
from app.services import resume_service
from app.services.resume_service import ResumeRejected

router = APIRouter(prefix="/api/resume", tags=["resume"])


class ResumeOut(BaseModel):
    # Metadata only. The file contents and the extracted text are never returned.
    original_filename: str
    content_type: str
    size_bytes: int
    uploaded_at: str


def _to_out(row: dict[str, Any]) -> ResumeOut:
    return ResumeOut(
        original_filename=row["original_filename"],
        content_type=row["content_type"],
        size_bytes=row["size_bytes"],
        uploaded_at=row["uploaded_at"],
    )


def _size_label(max_bytes: int) -> str:
    return f"{max_bytes / (1024 * 1024):g} MB"


@router.post("", response_model=ResumeOut)
def upload_resume(request: Request, user: CurrentUser, file: UploadFile = File(...)) -> ResumeOut:
    settings = request.app.state.settings
    # Read at most one byte past the limit, so an oversized file is refused without being read in full.
    data = file.file.read(settings.max_resume_bytes + 1)
    if len(data) > settings.max_resume_bytes:
        raise HTTPException(status_code=413, detail=f"The resume must be {_size_label(settings.max_resume_bytes)} or smaller.")
    try:
        row = resume_service.upload_resume(
            request.app.state.db,
            request.app.state.resume_store,
            user_id=user["id"],
            filename=file.filename or "",
            data=data,
        )
    except ResumeRejected as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    return _to_out(row)


@router.get("", response_model=ResumeOut)
def get_resume(request: Request, user: CurrentUser) -> ResumeOut:
    row = resume_service.current_resume(request.app.state.db, user["id"])
    if row is None:
        raise HTTPException(status_code=404, detail="No resume uploaded.")
    return _to_out(row)


@router.delete("", status_code=204)
def delete_resume(request: Request, user: CurrentUser) -> Response:
    if not resume_service.request_delete(request.app.state.db, user_id=user["id"]):
        raise HTTPException(status_code=404, detail="No resume uploaded.")
    return Response(status_code=204)
