"""Apply the SQL migrations in app/db/migrations, in name order. Safe to run more than once.

Usage (from the backend folder): python -m app.db.migrate
"""

from __future__ import annotations

import logging
from pathlib import Path

from app.config import load_settings
from app.db.connection import Database, create_database
from app.logging_setup import get_logger, log_event, setup_logging

MIGRATIONS_DIR = Path(__file__).resolve().parent / "migrations"
logger = get_logger("migrate")


def apply_migrations(db: Database) -> list[str]:
    applied: list[str] = []
    for path in sorted(MIGRATIONS_DIR.glob("*.sql")):
        db.executescript(path.read_text(encoding="utf-8"))
        applied.append(path.name)
    return applied


if __name__ == "__main__":
    setup_logging()
    names = apply_migrations(create_database(load_settings()))
    log_event(logger, logging.INFO, "migrations_applied", count=len(names), names=", ".join(names) or "none")
