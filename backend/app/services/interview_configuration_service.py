"""Interview configuration: role (from F-004), interview type, difficulty and duration.

The saved configuration is what the interview session reads when it starts. Every function takes the id of
the signed-in user; nothing here reads a user id from the request.
"""

from __future__ import annotations

from typing import Any

from app.config import Settings
from app.db import interview_settings_repo, role_recommendations_repo
from app.db.connection import Database
from app.services.resume_service import ResumeRejected
from app.timeutil import iso, utc_now

INTERVIEW_TYPES = ("Technical", "HR", "Behavioral", "Project-based")
DIFFICULTIES = ("Easy", "Medium", "Hard")

NO_ROLE = "Choose a role first. Pick one of your suggested roles, then set up the interview."
NO_DURATIONS = "No interview durations are set up yet. Please try again later."
DURATION_INVALID = "Choose one of the available durations."


def get_configuration(db: Database, settings: Settings, *, user_id: str) -> dict[str, Any]:
    saved = interview_settings_repo.get_for_user(db, user_id)
    return {
        "role": role_recommendations_repo.get_selected_role(db, user_id),
        "duration_options": list(settings.interview_duration_options),
        "settings": saved,
    }


def save_configuration(
    db: Database,
    settings: Settings,
    *,
    user_id: str,
    interview_type: str,
    difficulty: str,
    duration_minutes: int,
) -> dict[str, Any]:
    if role_recommendations_repo.get_selected_role(db, user_id) is None:
        raise ResumeRejected(409, NO_ROLE)
    if not settings.interview_duration_options:
        raise ResumeRejected(409, NO_DURATIONS)
    if duration_minutes not in settings.interview_duration_options:
        raise ResumeRejected(422, DURATION_INVALID)

    interview_settings_repo.save_for_user(
        db,
        user_id=user_id,
        interview_type=interview_type,
        difficulty=difficulty,
        duration_minutes=duration_minutes,
        now=iso(utc_now()),
    )
    return get_configuration(db, settings, user_id=user_id)
