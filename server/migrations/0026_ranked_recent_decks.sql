-- Only authoritative, completed ranked starting decks. Keep three distinct compositions.
CREATE TABLE IF NOT EXISTS ranked_recent_decks (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cards TEXT NOT NULL,
  last_used_at INTEGER NOT NULL,
  PRIMARY KEY(user_id, cards)
);
CREATE INDEX IF NOT EXISTS idx_ranked_recent_decks_order ON ranked_recent_decks(user_id, last_used_at DESC, cards ASC);
