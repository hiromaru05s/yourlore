-- LORE — D1 schema (users, sessions, match records)
-- Apply: `npm run db:init` (local) / `npm run db:init:remote` (production)

CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,           -- uuid
  email       TEXT NOT NULL UNIQUE,
  password    TEXT NOT NULL,              -- PBKDF2 hash (salt:hash), never plaintext
  display     TEXT NOT NULL,              -- shown name (defaults to email local-part)
  created_at  INTEGER NOT NULL,
  wins        INTEGER NOT NULL DEFAULT 0,
  losses      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT PRIMARY KEY,           -- opaque random token (sent as cookie)
  user_id     TEXT NOT NULL REFERENCES users(id),
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS matches (
  id          TEXT PRIMARY KEY,
  player_a    TEXT NOT NULL,
  player_b    TEXT NOT NULL,
  winner      TEXT,
  mode        TEXT NOT NULL,              -- 'online' | 'bot'
  created_at  INTEGER NOT NULL,
  ended_at    INTEGER
);
