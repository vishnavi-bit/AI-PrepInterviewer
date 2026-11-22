"""Profile routes. The user is always the signed-in user; no user id is taken from the URL or body."""

from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, Request, Response, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.auth import sessions
from app.auth.deps import CurrentUser, current_session_hash
from app.auth.schemas import UserOut, to_user_out
from app.auth.security import hash_password, verify_password
from app.db import users
from app.timeutil import iso, utc_now

router = APIRouter(prefix="/api/profile", tags=["profile"])

MEDIA_TYPES = {".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp"}


class ProfileUpdateIn(BaseModel):
    # Email is deliberately absent: it cannot be changed, and extra fields are rejected.
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, max_length=100)
    target_role: str | None = Field(default=None, max_length=100)

    @field_validator("name")
    @classmethod
    def _name(cls, value: str | None) -> str:
        value = (value or "").strip()
        if not value:
            raise ValueError("Name cannot be empty.")
        return value

    @field_validator("target_role")
    @classmethod
    def _target_role(cls, value: str | None) -> str | None:
        return value.strip() or None if value is not None else None


class PasswordChangeIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    current_password: str = Field(min_length=1, max_length=256)
    new_password: str = Field(min_length=8, max_length=256)


def _detect_image(data: bytes) -> tuple[str, str] | None:
    """Return (extension, content type) from the file's first bytes, or None if it is not PNG, JPEG or WebP."""
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png", "image/png"
    if data.startswith(b"\xff\xd8\xff"):
        return ".jpg", "image/jpeg"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return ".webp", "image/webp"
    return None


@router.get("", response_model=UserOut)
def get_profile(user: CurrentUser) -> UserOut:
    return to_user_out(user)


@router.patch("", response_model=UserOut)
def update_profile(body: ProfileUpdateIn, user: CurrentUser, request: Request) -> UserOut:
    db = request.app.state.db
    name = body.name if "name" in body.model_fields_set else user["name"]
    target_role = body.target_role if "target_role" in body.model_fields_set else user["target_role"]
    users.update_profile(db, user["id"], name=name, target_role=target_role, now=iso(utc_now()))
    updated = users.get_user_by_id(db, user["id"])
    assert updated is not None
    return to_user_out(updated)


@router.post("/password", status_code=204)
def change_password(body: PasswordChangeIn, user: CurrentUser, request: Request) -> Response:
    db = request.app.state.db
    stored_hash = users.get_password_hash(db, user["id"])
    if stored_hash is None or not verify_password(stored_hash, body.current_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    users.set_password_hash(db, user["id"], hash_password(body.new_password), iso(utc_now()))
    # Sign out every other device; this browser stays signed in.
    sessions.delete_other_sessions(db, user["id"], keep_token_hash=current_session_hash(request) or "")
    return Response(status_code=204)


@router.put("/avatar", response_model=UserOut)
def upload_avatar(
    request: Request,
    user: CurrentUser,
    file: UploadFile = File(...),
) -> UserOut:
    settings = request.app.state.settings
    db = request.app.state.db
    data = file.file.read(settings.max_avatar_bytes + 1)
    if len(data) > settings.max_avatar_bytes:
        raise HTTPException(status_code=413, detail="The image must be 2 MB or smaller.")
    detected = _detect_image(data)
    if detected is None:
        raise HTTPException(status_code=415, detail="Upload a PNG, JPEG or WebP image.")

    extension, _ = detected
    avatar_dir = settings.uploads_dir / "avatars"
    avatar_dir.mkdir(parents=True, exist_ok=True)
    # The stored name comes from the user id, never from the uploaded file name.
    for previous in avatar_dir.glob(f"{user['id']}.*"):
        previous.unlink()
    relative_path = f"avatars/{user['id']}{extension}"
    (settings.uploads_dir / relative_path).write_bytes(data)
    users.set_avatar_path(db, user["id"], relative_path, iso(utc_now()))

    updated = users.get_user_by_id(db, user["id"])
    assert updated is not None
    return to_user_out(updated)


@router.get("/avatar")
def get_avatar(user: CurrentUser, request: Request) -> FileResponse:
    avatar_path = user["avatar_path"]
    if not avatar_path:
        raise HTTPException(status_code=404, detail="No avatar uploaded.")
    settings = request.app.state.settings
    path = settings.uploads_dir / avatar_path
    if not path.is_file():
        raise HTTPException(status_code=404, detail="No avatar uploaded.")
    media_type = MEDIA_TYPES.get(path.suffix.lower(), "application/octet-stream")
    return FileResponse(path, media_type=media_type, headers={"Cache-Control": "private, no-cache"})
