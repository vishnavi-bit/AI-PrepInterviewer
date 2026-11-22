"""Apply the SQL migrations in app/db/migrations, in name order. Safe to run more than once.

Usage (from the backend folder): python -m app.db.migrate
"""

from __future__ import annotations

from pathlib import Path

from app.config import load_settings
from app.db.connection import Database, create_database

MIGRATIONS_DIR = Path(__file__).resolve().parent / "migrations"


def apply_migrations(db: Database) -> list[str]:
    applied: list[str] = []
    for path in sorted(MIGRATIONS_DIR.glob("*.sql")):
        db.executescript(path.read_text(encoding="utf-8"))
        applied.append(path.name)
    return applied


if __name__ == "__main__":
    names = apply_migrations(create_database(load_settings()))
    print("Applied:", ", ".join(names) or "none")
