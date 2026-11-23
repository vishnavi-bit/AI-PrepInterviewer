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
    # Defaults keep existing callers (and test fixtures) working without naming the resume settings.
    max_resume_bytes: int = 5 * 1024 * 1024
    resumes_dir: Path | None = None
    # Gemini is used only by the backend. Without a key, analysis reports itself unavailable.
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.5-flash"
    gemini_timeout_seconds: float = 30.0
    # Interview durations the candidate can choose, in minutes. Empty until the product owner sets them.
    interview_duration_options: tuple[int, ...] = ()
    # "development" or "production". Production refuses to start without secure (HTTPS-only) cookies.
    app_env: str = "development"


def _parse_minutes(raw: str) -> tuple[int, ...]:
    return tuple(int(part) for part in (p.strip() for p in raw.split(",")) if part)


def load_settings() -> Settings:
    uploads_dir = Path(os.getenv("UPLOADS_DIR", str(BACKEND_DIR / "uploads")))
    return Settings(
        turso_url=os.getenv("TURSO_DATABASE_URL") or None,
        turso_token=os.getenv("TURSO_AUTH_TOKEN") or None,
        sqlite_path=os.getenv("LOCAL_DB_PATH", str(BACKEND_DIR / "data" / "app.db")),
        uploads_dir=uploads_dir,
        session_days=int(os.getenv("SESSION_DAYS", "7")),
        cookie_secure=os.getenv("COOKIE_SECURE", "true").lower() == "true",
        max_avatar_bytes=2 * 1024 * 1024,
        max_resume_bytes=int(os.getenv("RESUME_MAX_BYTES", str(5 * 1024 * 1024))),
        resumes_dir=Path(os.getenv("RESUMES_DIR", str(uploads_dir / "resumes"))),
        gemini_api_key=os.getenv("GEMINI_API_KEY") or None,
        gemini_model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
        gemini_timeout_seconds=float(os.getenv("GEMINI_TIMEOUT_SECONDS", "30")),
        interview_duration_options=_parse_minutes(os.getenv("INTERVIEW_DURATION_OPTIONS_MINUTES", "")),
        app_env=os.getenv("APP_ENV", "development").strip().lower(),
    )
