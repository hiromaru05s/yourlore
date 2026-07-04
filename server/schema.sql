-- LORE — D1 schema (users, sessions, match records)
-- Apply: `npm run db:init` (local) / `npm run db:init:remote` (production)

CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,           -- uuid
  email       TEXT NOT NULL UNIQUE,
  password    TEXT NOT NULL,              -- PBKDF2 hash (salt:hash), never plaintext
  display     TEXT NOT NULL,              -- shown name (defaults to email local-part)
  created_at  INTEGER NOT NULL,
  wins        INTEGER NOT NULL DEFAULT 0,
  losses      INTEGER NOT NULL DEFAULT 0,
  credits     INTEGER NOT NULL DEFAULT 0  -- 단일 소프트 커런시 (docs/monetization.md)
);

-- 1회성 보상 지급 로그 (튜토리얼 단계 보상 등). PK가 중복 지급을 막는다.
-- 보상 금액은 서버의 REWARDS 테이블(rewards.ts)이 유일한 진실 — 클라는 key만 보낸다.
CREATE TABLE IF NOT EXISTS rewards (
  user_id     TEXT NOT NULL REFERENCES users(id),
  key         TEXT NOT NULL,              -- e.g. 'tut:1'
  amount      INTEGER NOT NULL,
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (user_id, key)
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
