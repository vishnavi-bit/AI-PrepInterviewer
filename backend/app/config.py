"""Runtime settings, read from environment variables. No secrets are stored in code."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent


@dataclass(frozen=True)
class Settings:
    turso_url: str | None
    turso_token: str | None
    sqlite_path: str
    uploads_dir: Path
    session_days: int
    cookie_secure: bool
    max_avatar_bytes: int


def load_settings() -> Settings:
    return Settings(
        turso_url=os.getenv("TURSO_DATABASE_URL") or None,
        turso_token=os.getenv("TURSO_AUTH_TOKEN") or None,
        sqlite_path=os.getenv("LOCAL_DB_PATH", str(BACKEND_DIR / "data" / "app.db")),
        uploads_dir=Path(os.getenv("UPLOADS_DIR", str(BACKEND_DIR / "uploads"))),
        session_days=int(os.getenv("SESSION_DAYS", "7")),
        cookie_secure=os.getenv("COOKIE_SECURE", "true").lower() == "true",
        max_avatar_bytes=2 * 1024 * 1024,
    )
