-- LORE — D1 schema (users, sessions, match records)
-- Apply: `npm run db:init` (local) / `npm run db:init:remote` (production)

CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,           -- uuid
  email       TEXT NOT NULL UNIQUE,
  password    TEXT NOT NULL,              -- PBKDF2 hash (salt:hash) / 'oauth:google', never plaintext
  display     TEXT NOT NULL,              -- shown name (defaults to email local-part)
  created_at  INTEGER NOT NULL,
  wins        INTEGER NOT NULL DEFAULT 0,
  losses      INTEGER NOT NULL DEFAULT 0,
  verified    INTEGER NOT NULL DEFAULT 0  -- 이메일 인증 여부 (OAuth 가입은 1)
);

-- 이메일 인증/비밀번호 재설정 토큰 (유저+종류당 1개 활성)
CREATE TABLE IF NOT EXISTS email_tokens (
  token       TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  kind        TEXT NOT NULL,              -- 'verify' | 'reset'
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_email_tokens_user ON email_tokens(user_id, kind);

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
  mode        TEXT NOT NULL,              -- 'online' | 'ranked' | 'bot'
  created_at  INTEGER NOT NULL,
  ended_at    INTEGER
);

-- 랭크: 월간 시즌(YYYY-MM)별 레이팅. 시즌 이월은 lazy soft-reset
-- (새 시즌 첫 랭크 활동 시 이전 시즌 MMR 기준 (mmr+1000)/2 로 생성).
-- 과거 시즌 행은 그 자체가 시즌 종료 스냅샷(이력)이다.
CREATE TABLE IF NOT EXISTS ratings (
  user_id     TEXT NOT NULL REFERENCES users(id),
  season      TEXT NOT NULL,              -- 'YYYY-MM'
  mmr         INTEGER NOT NULL DEFAULT 1000,
  wins        INTEGER NOT NULL DEFAULT 0,
  losses      INTEGER NOT NULL DEFAULT 0,
  peak_mmr    INTEGER NOT NULL DEFAULT 1000,
  updated_at  INTEGER NOT NULL,
  final_rank  INTEGER,                    -- 시즌 확정(finalize) 후 최종 순위 스냅샷
  final_tier  TEXT,                       -- 시즌 확정 후 최종 티어 (gm 포함)
  PRIMARY KEY (user_id, season)
);
CREATE INDEX IF NOT EXISTS idx_ratings_season_mmr ON ratings(season, mmr DESC);
