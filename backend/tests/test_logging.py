from __future__ import annotations

import io
import json
import logging
from collections.abc import Callable

from fastapi.testclient import TestClient

from app.logging_setup import JsonFormatter, get_logger, log_event
from app.services import dashboard_service
from tests.conftest import PASSWORD, register
from tests.test_resumes import sign_in

SECRET_PASSWORD = "hunter2-very-secret"


def capture(action: Callable[[], None]) -> tuple[list[dict], str]:
    """Runs the action and returns the JSON log entries it wrote, and the raw text."""
    stream = io.StringIO()
    handler = logging.StreamHandler(stream)
    handler.setFormatter(JsonFormatter())
    logger = logging.getLogger("app")
    previous_level = logger.level
    logger.addHandler(handler)
    logger.setLevel(logging.DEBUG)
    try:
        action()
    finally:
        logger.removeHandler(handler)
        logger.setLevel(previous_level)
    raw = stream.getvalue()
    return [json.loads(line) for line in raw.splitlines() if line.strip()], raw


def test_each_line_is_json_with_a_timestamp_level_and_event() -> None:
    entries, _ = capture(lambda: log_event(get_logger("test"), logging.INFO, "sample", count=2))

    entry = next(item for item in entries if item["event"] == "sample")
    assert entry["level"] == "INFO"
    assert entry["count"] == 2
    assert entry["timestamp"].endswith("+00:00")


def test_sensitive_fields_are_never_written() -> None:
    _, raw = capture(
        lambda: log_event(
            get_logger("test"),
            logging.INFO,
            "sample",
            password=SECRET_PASSWORD,
            token="session-token-value",
            answer="my private answer",
            extracted_text="cv contents",
            safe="visible",
        )
    )

    assert SECRET_PASSWORD not in raw
    assert "session-token-value" not in raw
    assert "my private answer" not in raw
    assert "cv contents" not in raw
    assert '"safe": "visible"' in raw


def test_api_keys_and_bearer_tokens_are_masked_inside_values() -> None:
    _, raw = capture(
        lambda: log_event(
            get_logger("test"),
            logging.INFO,
            "sample",
            note="key AIzaSyA1234567890abcdefghijklmnop and Bearer abc.def-ghi",
        )
    )

    assert "AIzaSyA1234567890abcdefghijklmnop" not in raw
    assert "abc.def-ghi" not in raw
    assert "[redacted]" in raw


def test_every_request_has_an_id_returned_and_logged(client: TestClient) -> None:
    entries, _ = capture(lambda: client.get("/api/health", headers={"X-Request-ID": "trace-12345678"}))

    response = client.get("/api/health", headers={"X-Request-ID": "trace-12345678"})
    assert response.headers["X-Request-ID"] == "trace-12345678"
    request_line = next(item for item in entries if item["event"] == "request" and item["path"] == "/api/health")
    assert request_line["request_id"] == "trace-12345678"
    assert request_line["status"] == 200
    assert "?" not in request_line["path"]


def test_an_unsafe_request_id_is_replaced_with_a_new_one(client: TestClient) -> None:
    response = client.get("/api/health", headers={"X-Request-ID": "bad id with spaces!"})
    assert response.headers["X-Request-ID"] != "bad id with spaces!"
    assert len(response.headers["X-Request-ID"]) >= 8


def test_an_unhandled_error_returns_a_generic_message_and_no_details(client: TestClient, monkeypatch) -> None:
    sign_in(client)

    def broken(*args, **kwargs):
        raise RuntimeError("internal detail that must not leak")

    monkeypatch.setattr(dashboard_service, "summary", broken)
    entries, raw = capture(lambda: client.get("/api/dashboard"))
    response = client.get("/api/dashboard")

    assert response.status_code == 500
    assert response.json() == {"detail": "Something went wrong. Please try again."}
    assert "internal detail" not in response.text
    assert response.headers["X-Request-ID"]
    assert any(item["event"] == "unhandled_error" and item["error_type"] == "RuntimeError" for item in entries)
    assert "internal detail that must not leak" not in raw


def test_sign_in_is_logged_without_the_email_or_password(client: TestClient) -> None:
    register(client, email="secret.person@example.com", name="Ada")

    entries, raw = capture(
        lambda: client.post("/api/auth/login", json={"email": "secret.person@example.com", "password": SECRET_PASSWORD})
    )

    assert any(item["event"] == "sign_in_failed" for item in entries)
    assert SECRET_PASSWORD not in raw
    assert "secret.person@example.com" not in raw
    assert PASSWORD not in raw
