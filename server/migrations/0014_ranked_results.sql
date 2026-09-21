-- Exactly-once ranked settlement, separate from match telemetry.
CREATE TABLE IF NOT EXISTS ranked_results (
  match_id TEXT PRIMARY KEY,
  season TEXT NOT NULL,
  a_id TEXT NOT NULL,
  b_id TEXT NOT NULL,
  winner TEXT,
  a_before INTEGER NOT NULL,
  b_before INTEGER NOT NULL,
  a_after INTEGER NOT NULL,
  b_after INTEGER NOT NULL,
  applied INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ratings_order ON ratings(season, mmr DESC, updated_at ASC, user_id ASC);
