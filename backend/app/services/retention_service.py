"""Automatic retention (WI-060): what is deleted by itself, and when.

Rules agreed with the product owner:
- Resumes are kept one year after the candidate's last activity (their analysis and role recommendations go with them).
- Interview transcripts and reports are kept one year after the interview date (their answers and report go with them).

Each run deletes what is past its period and nothing else, so running it twice in a row deletes nothing the second time.
Only counts are logged, never the content.
"""

from __future__ import annotations

import logging
from datetime import datetime

from app.db import activity_repo, analyses_repo, resumes_repo, role_recommendations_repo
from app.db import interview_sessions_repo as sessions_repo
from app.db.connection import Database
from app.logging_setup import get_logger, log_event
from app.storage.resume_store import ResumeFileStore
from app.timeutil import iso

logger = get_logger("retention")


def cutoff_one_year_before(now: datetime) -> datetime:
    """The same date one calendar year earlier; 29 February falls back to 28 February."""
    try:
        return now.replace(year=now.year - 1)
    except ValueError:
        return now.replace(year=now.year - 1, day=28)


def run(db: Database, store: ResumeFileStore, *, now: datetime) -> dict[str, int]:
    cutoff = iso(cutoff_one_year_before(now))

    resumes = resumes_repo.list_for_inactive_users(db, cutoff)
    for row in resumes:
        store.delete(row["storage_key"])  # file first, so no row is left pointing at nothing
        analyses_repo.delete_for_user(db, row["user_id"])
        role_recommendations_repo.delete_for_user(db, row["user_id"])
        resumes_repo.delete_row(db, row["id"])

    interviews = sessions_repo.list_started_before(db, cutoff)
    for row in interviews:
        sessions_repo.delete_session_data(db, row["id"])

    counts = {"resumes_deleted": len(resumes), "interviews_deleted": len(interviews)}
    log_event(logger, logging.INFO, "retention_run", cutoff=cutoff, **counts)
    return counts
