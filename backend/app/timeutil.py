from __future__ import annotations

from datetime import datetime, timezone


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def iso(moment: datetime) -> str:
    """Fixed-format UTC timestamp. Same format everywhere, so string comparison orders correctly."""
    return moment.astimezone(timezone.utc).isoformat(timespec="seconds")
