CREATE TABLE IF NOT EXISTS daily_challenges (
 user_id TEXT NOT NULL REFERENCES users(id), day TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0,
 quest TEXT NOT NULL, progress INTEGER NOT NULL DEFAULT 0, claimed INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(user_id,day)
);
CREATE TABLE IF NOT EXISTS duel_reward_receipts (
 user_id TEXT NOT NULL REFERENCES users(id), match_id TEXT NOT NULL, day TEXT NOT NULL,
 mode TEXT NOT NULL, amount INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL,
 PRIMARY KEY(user_id,match_id)
);
CREATE INDEX IF NOT EXISTS duel_reward_daily ON duel_reward_receipts(user_id,day,mode);
