"""Runs the automatic retention rules once (WI-060). Safe to run repeatedly.

Usage (from the backend folder): python -m app.jobs.retention
"""

from __future__ import annotations

from app.config import Settings, load_settings
from app.db.connection import create_database
from app.logging_setup import setup_logging
from app.services import retention_service
from app.storage.resume_store import LocalResumeStore
from app.timeutil import utc_now


def run(settings: Settings) -> dict[str, int]:
    store = LocalResumeStore(settings.resumes_dir or settings.uploads_dir / "resumes")
    return retention_service.run(create_database(settings), store, now=utc_now())


if __name__ == "__main__":
    setup_logging()
    run(load_settings())
