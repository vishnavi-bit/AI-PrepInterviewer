CREATE TABLE IF NOT EXISTS interview_settings (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  interview_type TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);
