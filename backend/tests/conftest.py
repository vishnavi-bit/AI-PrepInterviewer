from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.db.migrate import apply_migrations
from app.main import create_app

PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
PASSWORD = "correct-horse-battery"


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    return Settings(
        turso_url=None,
        turso_token=None,
        sqlite_path=str(tmp_path / "test.db"),
        uploads_dir=tmp_path / "uploads",
        session_days=7,
        cookie_secure=False,  # the test client talks plain http
        max_avatar_bytes=2 * 1024 * 1024,
    )


@pytest.fixture
def app(settings: Settings):
    application = create_app(settings)
    apply_migrations(application.state.db)
    return application


@pytest.fixture
def client(app) -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


def register(client: TestClient, email: str = "ada@example.com", name: str = "Ada") -> dict:
    response = client.post("/api/auth/register", json={"name": name, "email": email, "password": PASSWORD})
    assert response.status_code == 201, response.text
    return response.json()


def login(client: TestClient, email: str = "ada@example.com", password: str = PASSWORD):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def delete_verified(client: TestClient, url: str, password: str = PASSWORD):
    """A deletion request: the candidate re-enters their password (WI-060)."""
    return client.request("DELETE", url, json={"password": password})
