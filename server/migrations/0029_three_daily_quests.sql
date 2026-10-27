-- Preserve slot 0 and all existing progress/claims. Additional slots are additive.
CREATE TABLE IF NOT EXISTS daily_challenge_extras (
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, day TEXT NOT NULL,
 slot INTEGER NOT NULL CHECK(slot IN (1,2)), revision INTEGER NOT NULL DEFAULT 0,
 quest TEXT NOT NULL, progress INTEGER NOT NULL DEFAULT 0, claimed INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(user_id,day,slot)
);
