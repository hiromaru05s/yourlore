-- Gifts are addressed at issuance; a later account does not inherit an old apology.
CREATE TABLE IF NOT EXISTS gift_messages (
 id TEXT PRIMARY KEY,
 title TEXT NOT NULL,
 body TEXT NOT NULL,
 amount INTEGER NOT NULL CHECK(amount BETWEEN 1 AND 100000),
 created_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL,
 created_by TEXT NOT NULL,
 audience TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS gift_deliveries (
 gift_id TEXT NOT NULL REFERENCES gift_messages(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 read_at INTEGER,
 claimed_at INTEGER,
 claim_token TEXT,
 PRIMARY KEY(gift_id,user_id)
);
CREATE INDEX IF NOT EXISTS idx_gift_recipient ON gift_deliveries(user_id,claimed_at);
CREATE INDEX IF NOT EXISTS idx_gift_claim_token ON gift_deliveries(claim_token,user_id);
