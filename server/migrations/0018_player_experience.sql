-- EXP starts at zero; historical W/L is deliberately not converted.
CREATE TABLE IF NOT EXISTS player_experience (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  exp INTEGER NOT NULL DEFAULT 0 CHECK(exp >= 0 AND exp <= 4900)
);
CREATE TABLE IF NOT EXISTS experience_events (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  before_exp INTEGER NOT NULL,
  after_exp INTEGER NOT NULL,
  shards INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY(user_id, key)
);
