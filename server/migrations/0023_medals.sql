-- Permanent text medals. Existing users.badge remains the single equipped key.
CREATE TABLE IF NOT EXISTS medal_progress (
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 metric TEXT NOT NULL, value INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(user_id,metric)
);
CREATE TABLE IF NOT EXISTS earned_medals (
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 medal_id TEXT NOT NULL, earned_at INTEGER NOT NULL,
 PRIMARY KEY(user_id,medal_id)
);
CREATE TABLE IF NOT EXISTS medal_duel_receipts (
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 match_id TEXT NOT NULL, created_at INTEGER NOT NULL,
 PRIMARY KEY(user_id,match_id)
);
