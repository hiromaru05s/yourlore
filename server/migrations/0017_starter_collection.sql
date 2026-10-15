-- Existing accounts receive the same default collection; saved presets are
-- constrained on read without deleting their stored card choices.
ALTER TABLE users ADD COLUMN starter_cards TEXT;
CREATE TABLE IF NOT EXISTS collection_transactions (
 user_id TEXT NOT NULL REFERENCES users(id),
 request_id TEXT NOT NULL,
 operation TEXT NOT NULL,
 receipt TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 PRIMARY KEY(user_id, request_id)
);
CREATE INDEX IF NOT EXISTS idx_collection_history ON collection_transactions(user_id,created_at DESC);
