from __future__ import annotations

import json

import httpx
import pytest

from app.config import Settings
from app.db.connection import DatabaseError, IntegrityError, TursoDatabase, create_database


def _db(handler) -> TursoDatabase:
    client = httpx.Client(transport=httpx.MockTransport(handler))
    return TursoDatabase("libsql://example-db.turso.io", "secret-token", client=client)


def test_sends_parameterised_pipeline_request_over_https() -> None:
    seen: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["url"] = str(request.url)
        seen["auth"] = request.headers["Authorization"]
        seen["body"] = json.loads(request.content)
        return httpx.Response(
            200,
            json={
                "results": [
                    {
                        "type": "ok",
                        "response": {
                            "type": "execute",
                            "result": {
                                "cols": [{"name": "id"}, {"name": "email"}],
                                "rows": [[{"type": "text", "value": "abc"}, {"type": "null"}]],
                            },
                        },
                    },
                    {"type": "ok", "response": {"type": "close"}},
                ]
            },
        )

    rows = _db(handler).execute("SELECT id, email FROM users WHERE id = ?", ("abc",))

    assert seen["url"] == "https://example-db.turso.io/v2/pipeline"
    assert seen["auth"] == "Bearer secret-token"
    stmt = seen["body"]["requests"][0]["stmt"]
    assert stmt["sql"] == "SELECT id, email FROM users WHERE id = ?"
    assert stmt["args"] == [{"type": "text", "value": "abc"}]
    assert rows == [{"id": "abc", "email": None}]


def test_unique_violation_maps_to_integrity_error() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "results": [
                    {"type": "error", "error": {"message": "SQLITE_CONSTRAINT: UNIQUE constraint failed: users.email"}},
                    {"type": "ok", "response": {"type": "close"}},
                ]
            },
        )

    with pytest.raises(IntegrityError):
        _db(handler).execute("INSERT INTO users (email) VALUES (?)", ("a@b.co",))


def test_http_failure_is_a_database_error_without_leaking_the_token() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(503)

    with pytest.raises(DatabaseError) as info:
        _db(handler).execute("SELECT 1")
    assert "secret-token" not in str(info.value)


def test_turso_mode_requires_a_token() -> None:
    settings = Settings(
        turso_url="libsql://example-db.turso.io",
        turso_token=None,
        sqlite_path="unused.db",
        uploads_dir=None,  # type: ignore[arg-type]
        session_days=7,
        cookie_secure=True,
        max_avatar_bytes=1,
    )
    with pytest.raises(RuntimeError):
        create_database(settings)
