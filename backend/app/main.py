from __future__ import annotations

from fastapi import FastAPI

from app.auth.routes import router as auth_router
from app.config import Settings, load_settings
from app.db.connection import create_database
from app.profile.routes import router as profile_router


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or load_settings()
    app = FastAPI(title="AI PrepInterviewer API")
    app.state.settings = settings
    app.state.db = create_database(settings)
    app.include_router(auth_router)
    app.include_router(profile_router)

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app
