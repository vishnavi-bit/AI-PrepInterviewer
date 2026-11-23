"""Request context and error handling (WI-060, F-010).

Each request gets a request ID (the caller's X-Request-ID when it is a short, safe token, otherwise a new one). The ID
is returned in the X-Request-ID header and written to every log line for the request. One line is logged per request:
method, path and status, never the query string, headers or body. An unhandled error returns a generic message with
the request ID and logs the error type; it never returns or logs a traceback to the client.
"""

from __future__ import annotations

import logging
import re
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response

from app.logging_setup import REQUEST_ID, get_logger, log_event

REQUEST_ID_HEADER = "X-Request-ID"
GENERIC_ERROR = "Something went wrong. Please try again."
_SAFE_REQUEST_ID = re.compile(r"^[A-Za-z0-9\-]{8,64}$")

logger = get_logger("http")


def install(app: FastAPI) -> None:
    @app.middleware("http")
    async def request_context(request: Request, call_next) -> Response:
        incoming = request.headers.get(REQUEST_ID_HEADER, "")
        request_id = incoming if _SAFE_REQUEST_ID.match(incoming) else uuid.uuid4().hex
        token = REQUEST_ID.set(request_id)
        started = time.perf_counter()
        path = request.url.path  # the path only: no query string, headers or body
        try:
            response = await call_next(request)
        except Exception as exc:  # noqa: BLE001 - the last line of defence; the client gets no details
            logger.error(
                "unhandled_error",
                exc_info=True,
                extra={"fields": {"method": request.method, "path": path, "error_type": type(exc).__name__}},
            )
            response = JSONResponse(status_code=500, content={"detail": GENERIC_ERROR})
        duration_ms = round((time.perf_counter() - started) * 1000, 1)
        response.headers[REQUEST_ID_HEADER] = request_id
        log_event(
            logger,
            logging.INFO,
            "request",
            method=request.method,
            path=path,
            status=response.status_code,
            duration_ms=duration_ms,
        )
        REQUEST_ID.reset(token)
        return response
