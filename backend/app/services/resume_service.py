"""Resume rules: validation, one resume per user, replace order, and delete-marking.

Every function takes the user id of the signed-in user. Nothing here reads a user id from the request.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any
from uuid import uuid4

from app.db import analyses_repo, resumes_repo
from app.db.connection import Database, DatabaseError
from app.services.text_extraction import UnreadableResume, extract_text
from app.storage.resume_store import ResumeFileStore
from app.timeutil import iso, utc_now

# suffix -> (detected kind, content type)
ALLOWED_TYPES = {
    ".pdf": ("pdf", "application/pdf"),
    ".docx": ("docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
}
MAX_FILENAME_LENGTH = 255


class ResumeRejected(Exception):
    """A user-facing rejection. The route turns it into an HTTP error with this status and message."""

    def __init__(self, status_code: int, detail: str) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def detect_kind(data: bytes) -> str | None:
    """Check the content signature, not only the extension."""
    if data.startswith(b"%PDF-"):
        return "pdf"
    if data.startswith(b"PK\x03\x04"):  # DOCX is a zip package; extraction confirms it is a Word document
        return "docx"
    return None


def current_resume(db: Database, user_id: str) -> dict[str, Any] | None:
    return resumes_repo.get_active_for_user(db, user_id)


def upload_resume(
    db: Database,
    store: ResumeFileStore,
    *,
    user_id: str,
    filename: str,
    data: bytes,
) -> dict[str, Any]:
    """Validate, store and record a resume. Replaces the user's existing resume if there is one.

    Order: write the new file, update the row, then delete the old file. If a step fails,
    the old resume stays in place.
    """
    suffix = Path(filename.replace("\\", "/")).suffix.lower()
    kind = detect_kind(data)
    if suffix not in ALLOWED_TYPES or kind is None or ALLOWED_TYPES[suffix][0] != kind:
        raise ResumeRejected(415, "Upload a PDF or DOCX resume.")

    try:
        text = extract_text(kind, data)
    except UnreadableResume as exc:
        raise ResumeRejected(
            422,
            "We could not read text from this file. Upload a PDF or DOCX that has selectable text.",
        ) from exc

    previous = resumes_repo.get_any_for_user(db, user_id)
    storage_key = store.save(user_id, data, suffix)
    try:
        resumes_repo.upsert_resume(
            db,
            resume_id=uuid4().hex,
            user_id=user_id,
            original_filename=Path(filename.replace("\\", "/")).name[:MAX_FILENAME_LENGTH],
            content_type=ALLOWED_TYPES[suffix][1],
            size_bytes=len(data),
            storage_key=storage_key,
            extracted_text=text,
            now=iso(utc_now()),
        )
    except DatabaseError:
        store.delete(storage_key)  # do not leave an orphan file behind; the old resume is untouched
        raise

    # The analysis was made from the old resume's text; remove it so the old text is not kept.
    analyses_repo.delete_for_user(db, user_id)
    if previous is not None:
        store.delete(previous["storage_key"])

    current = resumes_repo.get_active_for_user(db, user_id)
    assert current is not None
    return current


def request_delete(db: Database, *, user_id: str) -> bool:
    """Hide the resume now; the purge job removes the file and text after the retention period."""
    if resumes_repo.get_active_for_user(db, user_id) is None:
        return False
    resumes_repo.mark_delete_requested(db, user_id, iso(utc_now()))
    return True
