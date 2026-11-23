"""Candidate dashboard (WI-059): completed interviews, saved scores, progress and weak topics.

Every figure is computed here from the signed-in user's completed interviews and their saved reports (WI-058). Nothing
is read for another user, and nothing is estimated: an interview without a saved report has no score.
"""

from __future__ import annotations

import json
import math
from typing import Any

from app.db import interview_reports_repo as reports
from app.db import interview_sessions_repo as sessions
from app.db.connection import Database

WEAK_TOPIC_BELOW = 60  # a topic whose average score is below this is a weak topic
MIN_SCORED_FOR_AVERAGE = 2  # the average score is shown from this many saved reports
MIN_SCORED_FOR_TREND = 2  # the progress trend compares the two most recent saved reports
RECENT_LIMIT = 10


def _round(value: float) -> int:
    return math.floor(value + 0.5)


def _interview_rows(completed: list[dict[str, Any]], by_session: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "session_id": session["id"],
            "role": session["role"],
            "interview_type": session["interview_type"],
            "started_at": session["started_at"],
            "overall_score": by_session[session["id"]]["overall_score"] if session["id"] in by_session else None,
        }
        for session in completed
    ]


def _trend(scores: list[int]) -> dict[str, Any] | None:
    """scores is most recent first."""
    if len(scores) < MIN_SCORED_FOR_TREND:
        return None
    change = scores[0] - scores[1]
    direction = "improved" if change > 0 else "declined" if change < 0 else "no_change"
    return {"change": change, "direction": direction}


def _weak_topics(by_session: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    totals: dict[str, list[int]] = {}
    for row in by_session.values():
        for name, score in json.loads(row["category_scores"]).items():
            totals.setdefault(name, []).append(score)
    averages = [(name, _round(sum(values) / len(values))) for name, values in totals.items()]
    weak = [(name, average) for name, average in averages if average < WEAK_TOPIC_BELOW]
    weak.sort(key=lambda item: (item[1], item[0]))
    return [{"name": name, "average_score": average} for name, average in weak]


def _role_performance(scored: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_role: dict[str, list[int]] = {}
    for row in scored:
        by_role.setdefault(row["role"], []).append(row["overall_score"])
    return [
        {"role": role, "interviews": len(values), "average_score": _round(sum(values) / len(values))}
        for role, values in sorted(by_role.items())
    ]


def summary(db: Database, *, user_id: str) -> dict[str, Any]:
    completed = sessions.list_completed_for_user(db, user_id)
    by_session = {row["session_id"]: row for row in reports.list_for_user(db, user_id)}
    interviews = _interview_rows(completed, by_session)  # most recent first
    scored = [row for row in interviews if row["overall_score"] is not None]
    scores = [row["overall_score"] for row in scored]

    average = None
    if len(scores) >= MIN_SCORED_FOR_AVERAGE:
        average = _round(sum(scores) / len(scores))

    weak_topics = _weak_topics(by_session)
    return {
        "has_history": bool(completed),
        "completed_count": len(completed),
        "most_recent_score": scores[0] if scores else None,
        "average_score": average,
        "trend": _trend(scores),
        "recent": interviews[:RECENT_LIMIT],
        "role_performance": _role_performance(scored),
        "weak_topics": weak_topics,
        "suggested_practice": [f"Practise {topic['name']}" for topic in weak_topics],
    }
