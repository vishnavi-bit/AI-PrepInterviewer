"""Interview session queries. Every query takes an explicit user id; callers pass the id of the signed-in user."""

from __future__ import annotations

from typing import Any

from app.db.connection import Database

SESSION_COLUMNS = (
    "id, user_id, status, role, interview_type, difficulty, duration_minutes, plan, started_at, deadline_at, ended_at"
)
QUESTION_COLUMNS = (
    "id, session_id, seq, main_number, kind, question_text, question_deadline_at, answer_text, state, asked_at, answered_at"
)


def get_for_user(db: Database, session_id: str, user_id: str) -> dict[str, Any] | None:
    rows = db.execute(
        f"SELECT {SESSION_COLUMNS} FROM interview_sessions WHERE id = ? AND user_id = ?",
        (session_id, user_id),
    )
    return rows[0] if rows else None


def get_in_progress_for_user(db: Database, user_id: str) -> dict[str, Any] | None:
    rows = db.execute(
        f"SELECT {SESSION_COLUMNS} FROM interview_sessions WHERE user_id = ? AND status = 'in_progress'",
        (user_id,),
    )
    return rows[0] if rows else None


def get_latest_for_user(db: Database, user_id: str) -> dict[str, Any] | None:
    rows = db.execute(
        f"SELECT {SESSION_COLUMNS} FROM interview_sessions WHERE user_id = ? ORDER BY started_at DESC LIMIT 1",
        (user_id,),
    )
    return rows[0] if rows else None


def create_session(db: Database, row: dict[str, Any]) -> None:
    db.execute(
        "INSERT INTO interview_sessions (id, user_id, status, role, interview_type, difficulty, duration_minutes, "
        "plan, started_at, deadline_at, ended_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)",
        (
            row["id"],
            row["user_id"],
            row["status"],
            row["role"],
            row["interview_type"],
            row["difficulty"],
            row["duration_minutes"],
            row["plan"],
            row["started_at"],
            row["deadline_at"],
        ),
    )


def close_session(db: Database, session_id: str, *, status: str, ended_at: str) -> None:
    db.execute(
        "UPDATE interview_sessions SET status = ?, ended_at = ? WHERE id = ?",
        (status, ended_at, session_id),
    )


def list_questions(db: Database, session_id: str) -> list[dict[str, Any]]:
    return db.execute(
        f"SELECT {QUESTION_COLUMNS} FROM interview_answers WHERE session_id = ? ORDER BY seq",
        (session_id,),
    )


def add_question(
    db: Database,
    *,
    question_id: str,
    session_id: str,
    seq: int,
    main_number: int,
    kind: str,
    text: str,
    question_deadline_at: str | None,
    asked_at: str,
) -> None:
    db.execute(
        "INSERT INTO interview_answers (id, session_id, seq, main_number, kind, question_text, "
        "question_deadline_at, answer_text, state, asked_at, answered_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, NULL)",
        (question_id, session_id, seq, main_number, kind, text, question_deadline_at, asked_at),
    )


def record_answer(db: Database, question_id: str, *, text: str | None, state: str, answered_at: str) -> None:
    db.execute(
        "UPDATE interview_answers SET answer_text = ?, state = ?, answered_at = ? WHERE id = ?",
        (text, state, answered_at, question_id),
    )
