"""Resume queries. Every query takes an explicit user id; callers pass the id of the signed-in user."""

from __future__ import annotations

from typing import Any

from app.db.connection import Database

METADATA_COLUMNS = "id, user_id, original_filename, content_type, size_bytes, storage_key, uploaded_at, delete_requested_at"


def get_active_for_user(db: Database, user_id: str) -> dict[str, Any] | None:
    """The user's resume, unless it has been requested for deletion (then it is hidden from the candidate)."""
    rows = db.execute(
        f"SELECT {METADATA_COLUMNS} FROM resumes WHERE user_id = ? AND delete_requested_at IS NULL",
        (user_id,),
    )
    return rows[0] if rows else None


def get_text_for_user(db: Database, user_id: str) -> dict[str, Any] | None:
    """The active resume's id and extracted text. Used by the analysis step only; never returned to the client."""
    rows = db.execute(
        "SELECT id, extracted_text FROM resumes WHERE user_id = ? AND delete_requested_at IS NULL",
        (user_id,),
    )
    return rows[0] if rows else None


def get_any_for_user(db: Database, user_id: str) -> dict[str, Any] | None:
    """Includes a resume already requested for deletion. Used only to find the file a replace must remove."""
    rows = db.execute(f"SELECT {METADATA_COLUMNS} FROM resumes WHERE user_id = ?", (user_id,))
    return rows[0] if rows else None


def upsert_resume(
    db: Database,
    *,
    resume_id: str,
    user_id: str,
    original_filename: str,
    content_type: str,
    size_bytes: int,
    storage_key: str,
    extracted_text: str,
    now: str,
) -> None:
    """One resume per user: a new upload replaces the row for that user."""
    db.execute(
        "INSERT INTO resumes (id, user_id, original_filename, content_type, size_bytes, storage_key, "
        "extracted_text, uploaded_at, delete_requested_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL) "
        "ON CONFLICT(user_id) DO UPDATE SET id = excluded.id, original_filename = excluded.original_filename, "
        "content_type = excluded.content_type, size_bytes = excluded.size_bytes, "
        "storage_key = excluded.storage_key, extracted_text = excluded.extracted_text, "
        "uploaded_at = excluded.uploaded_at, delete_requested_at = NULL",
        (resume_id, user_id, original_filename, content_type, size_bytes, storage_key, extracted_text, now),
    )


def mark_delete_requested(db: Database, user_id: str, now: str) -> None:
    db.execute(
        "UPDATE resumes SET delete_requested_at = ? WHERE user_id = ? AND delete_requested_at IS NULL",
        (now, user_id),
    )


def list_delete_requested_before(db: Database, cutoff: str) -> list[dict[str, Any]]:
    """For the purge job only; not user-facing, so it is not filtered by user id."""
    return db.execute(
        f"SELECT {METADATA_COLUMNS} FROM resumes WHERE delete_requested_at IS NOT NULL AND delete_requested_at < ?",
        (cutoff,),
    )


def delete_row(db: Database, resume_id: str) -> None:
    db.execute("DELETE FROM resumes WHERE id = ?", (resume_id,))
