-- Per-match starting decks, separate from the legacy distinct-composition list.
-- Historical games cannot be reconstructed from card-use counts: leave them unknown.
CREATE TABLE IF NOT EXISTS ranked_match_decks (
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cards TEXT NOT NULL,
  PRIMARY KEY(match_id,user_id)
);
CREATE INDEX IF NOT EXISTS idx_matches_ranked_a ON matches(player_a,mode,ended_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS idx_matches_ranked_b ON matches(player_b,mode,ended_at DESC,id DESC);
