"""Where original resume files live. The database holds only the storage key, never the bytes.

Keys are built here from the user id and a generated name. They never come from the client.
"""

from __future__ import annotations

from pathlib import Path
from typing import Protocol
from uuid import uuid4


class ResumeFileStore(Protocol):
    def save(self, user_id: str, data: bytes, extension: str) -> str: ...

    def read(self, storage_key: str) -> bytes: ...

    def delete(self, storage_key: str) -> None: ...


class LocalResumeStore:
    """Controlled local storage on the server. Object storage can replace it behind the same interface."""

    def __init__(self, root: Path) -> None:
        self._root = root.resolve()

    def save(self, user_id: str, data: bytes, extension: str) -> str:
        storage_key = f"{user_id}/{uuid4().hex}{extension}"
        path = self._path(storage_key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return storage_key

    def read(self, storage_key: str) -> bytes:
        return self._path(storage_key).read_bytes()

    def delete(self, storage_key: str) -> None:
        self._path(storage_key).unlink(missing_ok=True)

    def _path(self, storage_key: str) -> Path:
        path = (self._root / storage_key).resolve()
        if self._root not in path.parents:
            raise ValueError("Storage key points outside the resume directory.")
        return path
