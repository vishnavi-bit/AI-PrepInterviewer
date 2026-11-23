CREATE TABLE IF NOT EXISTS interview_reports (
  session_id TEXT PRIMARY KEY REFERENCES interview_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interview_type TEXT NOT NULL,
  overall_score INTEGER NOT NULL,
  category_scores TEXT NOT NULL,
  strengths TEXT NOT NULL,
  improvements TEXT NOT NULL,
  suggestions TEXT NOT NULL,
  created_at TEXT NOT NULL
);
