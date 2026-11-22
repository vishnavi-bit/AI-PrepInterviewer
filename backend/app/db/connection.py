"""Database access: Turso (libSQL) over its HTTP API when configured, local SQLite otherwise.

Both backends run each call as its own autocommit statement, so the rest of the
code stays the same whichever one is used.
"""

from __future__ import annotations

import base64
import sqlite3
from pathlib import Path
from typing import Any, Protocol, Sequence

import httpx

from app.config import Settings


class DatabaseError(Exception):
    """The database could not run a statement."""


class IntegrityError(DatabaseError):
    """A constraint such as UNIQUE was violated."""


class Database(Protocol):
    def execute(self, sql: str, params: Sequence[Any] = ()) -> list[dict[str, Any]]: ...

    def executescript(self, sql: str) -> None: ...


class SqliteDatabase:
    """Local file database for development and tests."""

    def __init__(self, path: str) -> None:
        self._path = path
        Path(path).parent.mkdir(parents=True, exist_ok=True)

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    def execute(self, sql: str, params: Sequence[Any] = ()) -> list[dict[str, Any]]:
        conn = self._connect()
        try:
            cursor = conn.execute(sql, tuple(params))
            rows = [dict(row) for row in cursor.fetchall()] if cursor.description else []
            conn.commit()
            return rows
        except sqlite3.IntegrityError as exc:
            conn.rollback()
            raise IntegrityError(str(exc)) from exc
        except sqlite3.Error as exc:
            conn.rollback()
            raise DatabaseError(str(exc)) from exc
        finally:
            conn.close()

    def executescript(self, sql: str) -> None:
        conn = self._connect()
        try:
            conn.executescript(sql)
        except sqlite3.Error as exc:
            raise DatabaseError(str(exc)) from exc
        finally:
            conn.close()


class TursoDatabase:
    """Turso (libSQL) through the HTTP pipeline API: one request per call, autocommit."""

    def __init__(self, url: str, token: str, client: httpx.Client | None = None) -> None:
        base = url.strip().rstrip("/")
        if base.startswith("libsql://"):
            base = "https://" + base[len("libsql://") :]
        self._endpoint = f"{base}/v2/pipeline"
        self._headers = {"Authorization": f"Bearer {token}"}
        self._client = client or httpx.Client(timeout=15.0)

    def execute(self, sql: str, params: Sequence[Any] = ()) -> list[dict[str, Any]]:
        return self._pipeline([(sql, params)])[0]

    def executescript(self, sql: str) -> None:
        # Migrations in this project contain no semicolons inside string literals.
        statements = [part.strip() for part in sql.split(";") if part.strip()]
        self._pipeline([(statement, ()) for statement in statements])

    def _pipeline(self, statements: list[tuple[str, Sequence[Any]]]) -> list[list[dict[str, Any]]]:
        requests: list[dict[str, Any]] = [
            {
                "type": "execute",
                "stmt": {
                    "sql": sql,
                    "args": [_encode(value) for value in params],
                    "want_rows": True,
                },
            }
            for sql, params in statements
        ]
        requests.append({"type": "close"})
        try:
            response = self._client.post(self._endpoint, headers=self._headers, json={"requests": requests})
        except httpx.HTTPError as exc:
            raise DatabaseError("Could not reach the database.") from exc
        if response.status_code != 200:
            raise DatabaseError(f"Database returned HTTP {response.status_code}.")

        outputs: list[list[dict[str, Any]]] = []
        for result in response.json()["results"][: len(statements)]:
            if result["type"] == "error":
                message = result.get("error", {}).get("message", "Database error.")
                if "UNIQUE constraint failed" in message:
                    raise IntegrityError(message)
                raise DatabaseError(message)
            outputs.append(_decode_rows(result["response"]["result"]))
        return outputs


def _encode(value: Any) -> dict[str, Any]:
    if value is None:
        return {"type": "null"}
    if isinstance(value, bool):
        return {"type": "integer", "value": str(int(value))}
    if isinstance(value, int):
        return {"type": "integer", "value": str(value)}
    if isinstance(value, float):
        return {"type": "float", "value": value}
    if isinstance(value, bytes):
        return {"type": "blob", "base64": base64.b64encode(value).decode("ascii")}
    return {"type": "text", "value": str(value)}


def _decode(value: dict[str, Any]) -> Any:
    kind = value["type"]
    if kind == "null":
        return None
    if kind == "integer":
        return int(value["value"])
    if kind == "float":
        return float(value["value"])
    if kind == "text":
        return value["value"]
    if kind == "blob":
        return base64.b64decode(value["base64"])
    raise DatabaseError(f"Unsupported value type from database: {kind}")


def _decode_rows(result: dict[str, Any]) -> list[dict[str, Any]]:
    names = [column["name"] for column in result.get("cols", [])]
    return [dict(zip(names, [_decode(value) for value in row])) for row in result.get("rows", [])]


def create_database(settings: Settings) -> Database:
    if settings.turso_url:
        if not settings.turso_token:
            raise RuntimeError("TURSO_AUTH_TOKEN must be set when TURSO_DATABASE_URL is set.")
        return TursoDatabase(settings.turso_url, settings.turso_token)
    return SqliteDatabase(settings.sqlite_path)
