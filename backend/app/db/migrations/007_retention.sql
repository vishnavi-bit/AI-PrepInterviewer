-- Last activity per candidate, used by the retention rules (WI-060).
-- A separate table, not a column on users: migrations run on every start, and ALTER TABLE ... ADD COLUMN cannot
-- be repeated. Existing users start with their account creation time as their last activity.
CREATE TABLE IF NOT EXISTS user_activity (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  last_activity_at TEXT NOT NULL
);

INSERT OR IGNORE INTO user_activity (user_id, last_activity_at)
SELECT id, created_at FROM users;
