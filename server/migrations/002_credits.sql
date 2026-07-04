-- Migration 002 — credits (soft currency) + one-shot reward log.
-- Apply to the EXISTING production D1 before deploying this branch:
--   via Cloudflare MCP d1_database_query, or:
--   wrangler d1 execute lore-db --remote --file server/migrations/002_credits.sql
ALTER TABLE users ADD COLUMN credits INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS rewards (
  user_id     TEXT NOT NULL REFERENCES users(id),
  key         TEXT NOT NULL,
  amount      INTEGER NOT NULL,
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (user_id, key)
);
