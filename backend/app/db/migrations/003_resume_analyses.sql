CREATE TABLE IF NOT EXISTS resume_analyses (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  resume_id TEXT NOT NULL,
  ai_output TEXT NOT NULL,
  corrections TEXT,
  analyzed_at TEXT NOT NULL,
  corrected_at TEXT
);
