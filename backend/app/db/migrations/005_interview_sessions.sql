CREATE TABLE IF NOT EXISTS interview_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  role TEXT NOT NULL,
  interview_type TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  plan TEXT NOT NULL,
  started_at TEXT NOT NULL,
  deadline_at TEXT NOT NULL,
  ended_at TEXT
);

CREATE TABLE IF NOT EXISTS interview_answers (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  main_number INTEGER NOT NULL,
  kind TEXT NOT NULL,
  question_text TEXT NOT NULL,
  question_deadline_at TEXT,
  answer_text TEXT,
  state TEXT,
  asked_at TEXT NOT NULL,
  answered_at TEXT,
  UNIQUE (session_id, seq)
);
