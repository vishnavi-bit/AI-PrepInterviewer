// Database schema, applied once and in order by the migration runner. Every private table carries user_id, and every
// query filters on it, so one user can never read another user's rows.
import { Migration } from './migrate';

export const migrations: Migration[] = [
  {
    id: '001-core',
    sql: `
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE resumes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        filename TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        storage_path TEXT NOT NULL,
        extracted_text TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE resume_analyses (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        analysis_json TEXT NOT NULL,
        confirmed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE role_recommendations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        roles_json TEXT NOT NULL,
        selected_role TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE interview_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        interview_type TEXT NOT NULL,
        difficulty TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        ends_at TEXT NOT NULL,
        ended_at TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX interview_sessions_user ON interview_sessions(user_id, created_at);
      CREATE TABLE interview_questions (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        position REAL NOT NULL,
        kind TEXT NOT NULL,
        parent_id TEXT,
        text TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX interview_questions_session ON interview_questions(session_id, position);
      CREATE TABLE interview_answers (
        id TEXT PRIMARY KEY,
        question_id TEXT NOT NULL UNIQUE REFERENCES interview_questions(id) ON DELETE CASCADE,
        session_id TEXT NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        answer_text TEXT NOT NULL,
        source TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE interview_reports (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL UNIQUE REFERENCES interview_sessions(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        overall_score INTEGER NOT NULL,
        category_scores_json TEXT NOT NULL,
        strengths_json TEXT NOT NULL,
        weaknesses_json TEXT NOT NULL,
        suggestions_json TEXT NOT NULL,
        question_feedback_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `,
  },
  {
    id: '002-password-reset',
    sql: `
      CREATE TABLE password_reset_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TEXT NOT NULL,
        used_at TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX password_reset_tokens_user ON password_reset_tokens(user_id, created_at);
    `,
  },
];
