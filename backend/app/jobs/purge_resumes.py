"""Purge resumes whose delete was requested more than 30 days ago.

Removes the original file and the row (which holds the extracted text).

Usage (from the backend folder): python -m app.jobs.purge_resumes
"""

from __future__ import annotations

from datetime import datetime, timedelta

from app.config import Settings, load_settings
from app.db import analyses_repo, resumes_repo, role_recommendations_repo
from app.db.connection import Database, create_database
from app.storage.resume_store import LocalResumeStore, ResumeFileStore
from app.timeutil import iso, utc_now

PURGE_AFTER = timedelta(days=30)


def purge_due(db: Database, store: ResumeFileStore, *, now: datetime) -> int:
    rows = resumes_repo.list_delete_requested_before(db, iso(now - PURGE_AFTER))
    for row in rows:
        store.delete(row["storage_key"])  # file first; the row (and its text) goes only after the file is gone
        analyses_repo.delete_for_user(db, row["user_id"])  # the AI analysis and corrections are personal data too
        role_recommendations_repo.delete_for_user(db, row["user_id"])  # roles are generated from the resume
        resumes_repo.delete_row(db, row["id"])
    return len(rows)


def run(settings: Settings) -> int:
    store = LocalResumeStore(settings.resumes_dir or settings.uploads_dir / "resumes")
    return purge_due(create_database(settings), store, now=utc_now())


if __name__ == "__main__":
    print("Purged:", run(load_settings()))
