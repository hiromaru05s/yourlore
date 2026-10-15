-- Freeze v2 payments without treating the new learning material as completed.
CREATE TABLE IF NOT EXISTS tutorial_accounts (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  legacy_paid INTEGER NOT NULL CHECK (legacy_paid BETWEEN 0 AND 3000),
  created_at INTEGER NOT NULL
);
