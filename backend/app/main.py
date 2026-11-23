from __future__ import annotations

from fastapi import FastAPI

from app.auth.routes import router as auth_router
from app.api.dashboard import router as dashboard_router
from app.api.interview_configuration import router as interview_configuration_router
from app.api.interview_sessions import router as interview_sessions_router
from app.api.resume_analysis import router as resume_analysis_router
from app.api.resumes import router as resumes_router
from app.api.role_recommendations import router as role_recommendations_router
from app import middleware
from app.config import Settings, load_settings
from app.db.connection import create_database
from app.logging_setup import setup_logging
from app.profile.routes import router as profile_router
from app.services.gemini_client import GeminiClient
from app.storage.resume_store import LocalResumeStore


class InsecureProductionConfig(RuntimeError):
    """Raised at start-up when production would send session cookies over plain HTTP."""


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or load_settings()
    if settings.app_env == "production" and not settings.cookie_secure:
        raise InsecureProductionConfig("APP_ENV=production requires COOKIE_SECURE=true (HTTPS only).")
    setup_logging()
    app = FastAPI(title="AI PrepInterviewer API")
    middleware.install(app)
    app.state.settings = settings
    app.state.db = create_database(settings)
    app.state.resume_store = LocalResumeStore(settings.resumes_dir or settings.uploads_dir / "resumes")
    app.state.gemini = GeminiClient(settings)
    app.include_router(auth_router)
    app.include_router(profile_router)
    app.include_router(resumes_router)
    app.include_router(resume_analysis_router)
    app.include_router(role_recommendations_router)
    app.include_router(interview_configuration_router)
    app.include_router(interview_sessions_router)
    app.include_router(dashboard_router)

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app
