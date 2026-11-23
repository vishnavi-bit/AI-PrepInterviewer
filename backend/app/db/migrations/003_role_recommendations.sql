CREATE TABLE IF NOT EXISTS role_recommendations (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resume_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  role_name TEXT NOT NULL,
  reason TEXT NOT NULL,
  PRIMARY KEY (user_id, position)
);
CREATE TABLE IF NOT EXISTS interview_configurations (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  selected_role TEXT NOT NULL,
  selected_at TEXT NOT NULL
);
