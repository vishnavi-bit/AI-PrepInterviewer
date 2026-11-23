"""Structured JSON logging for the backend (WI-060, F-010).

Every line is one JSON object with a UTC timestamp, a level, the event name and the request ID when there is one.
Event details go in the `fields` of the call. A redaction filter removes sensitive fields by name and masks values
that look like API keys or bearer tokens, so passwords, tokens, cookies, resume text and candidate answers never
reach the log, whatever a caller passes in.
"""

from __future__ import annotations

import contextvars
import json
import logging
import re
import sys
from datetime import datetime, timezone
from typing import Any

REQUEST_ID: contextvars.ContextVar[str | None] = contextvars.ContextVar("request_id", default=None)

REDACTED = "[redacted]"

# Field names whose values are never written, whatever the caller passes in.
SENSITIVE_KEYS = frozenset(
    {
        "password",
        "current_password",
        "new_password",
        "password_hash",
        "token",
        "token_hash",
        "authorization",
        "cookie",
        "set-cookie",
        "session",
        "api_key",
        "gemini_api_key",
        "turso_token",
        "extracted_text",
        "resume_text",
        "answer",
        "answer_text",
        "question",
        "question_text",
        "content",
        "body",
    }
)

# Values shaped like a Google API key or a bearer/JWT token are masked even under an innocent field name.
_SECRET_VALUE = re.compile(r"(AIza[0-9A-Za-z_\-]{20,}|Bearer\s+[A-Za-z0-9._\-]+|eyJ[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+)")

_HANDLER_MARK = "_ai_prepinterviewer_handler"


def mask_value(value: Any) -> Any:
    if isinstance(value, str):
        return _SECRET_VALUE.sub(REDACTED, value)
    return value


def redact_fields(fields: dict[str, Any]) -> dict[str, Any]:
    clean: dict[str, Any] = {}
    for key, value in fields.items():
        if key.lower() in SENSITIVE_KEYS:
            clean[key] = REDACTED
        elif isinstance(value, dict):
            clean[key] = redact_fields(value)
        else:
            clean[key] = mask_value(value)
    return clean


def record_to_dict(record: logging.LogRecord) -> dict[str, Any]:
    fields = getattr(record, "fields", None) or {}
    entry: dict[str, Any] = {
        "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(timespec="milliseconds"),
        "level": record.levelname,
        "logger": record.name,
        "event": mask_value(record.getMessage()),
    }
    request_id = REQUEST_ID.get()
    if request_id:
        entry["request_id"] = request_id
    entry.update(redact_fields(fields))
    if record.exc_info and record.exc_info[0] is not None:
        # The exception type and message only; traceback text is not written, because it can hold local values.
        entry["error_type"] = record.exc_info[0].__name__
    return entry


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        return json.dumps(record_to_dict(record), ensure_ascii=False, default=str)


def setup_logging(level: str = "INFO") -> None:
    """Idempotent: calling it again replaces the handler it installed earlier."""
    root = logging.getLogger()
    for handler in list(root.handlers):
        if getattr(handler, _HANDLER_MARK, False):
            root.removeHandler(handler)
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    setattr(handler, _HANDLER_MARK, True)
    root.addHandler(handler)
    root.setLevel(level)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(f"app.{name}")


def log_event(logger: logging.Logger, level: int, event: str, **fields: Any) -> None:
    logger.log(level, event, extra={"fields": fields})
