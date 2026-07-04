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
  verified    INTEGER NOT NULL DEFAULT 0, -- 이메일 인증 여부 (OAuth 가입은 1)
  source      TEXT,                       -- 가입 유입 소스 (utm_source/utm_medium/utm_campaign 또는 'ref:CODE')
  invite_code TEXT,                       -- 내 초대 코드 (lazy 발급, 유니크 인덱스 별도)
  invited_by  TEXT,                       -- 나를 초대한 유저 id
  credits     INTEGER NOT NULL DEFAULT 0, -- 단일 소프트 커런시 (docs/monetization.md)
  avatar      TEXT,                       -- 프리셋 아바타 (카드 id)
  badge       TEXT,                       -- 장착 뱃지 키 (보유 여부는 서버가 계산)
  stats_public INTEGER NOT NULL DEFAULT 1 -- 프로필 전적 공개 여부
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_invite_code ON users(invite_code) WHERE invite_code IS NOT NULL;

-- 1회성 보상 지급 로그 (튜토리얼 단계 보상 등). PK가 중복 지급을 막는다.
-- 보상 금액은 서버의 REWARDS 테이블(rewards.ts)이 유일한 진실 — 클라는 key만 보낸다.
CREATE TABLE IF NOT EXISTS rewards (
  user_id     TEXT NOT NULL REFERENCES users(id),
  key         TEXT NOT NULL,              -- e.g. 'tut:1'
  amount      INTEGER NOT NULL,
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (user_id, key)
);

-- 리텐션: 유저별 활동일 (앱 접속 시 upsert)
CREATE TABLE IF NOT EXISTS user_days (
  user_id  TEXT NOT NULL,
  day      TEXT NOT NULL,                 -- 'YYYY-MM-DD' (UTC)
  PRIMARY KEY (user_id, day)
);

-- 초대 캠페인 보상 장부: pending(가입) → earned(골드 도달) → paid(크레딧 지급, 크레딧 시스템 오픈 후)
CREATE TABLE IF NOT EXISTS invite_rewards (
  invitee_id  TEXT PRIMARY KEY,           -- 초대받은 유저 (1회만 귀속)
  inviter_id  TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',
  created_at  INTEGER NOT NULL,
  earned_at   INTEGER
);
CREATE INDEX IF NOT EXISTS idx_invite_rewards_inviter ON invite_rewards(inviter_id);

-- 친구: user_a = 요청자, user_b = 수신자. status 'pending' | 'accepted'
CREATE TABLE IF NOT EXISTS friends (
  user_a      TEXT NOT NULL REFERENCES users(id),
  user_b      TEXT NOT NULL REFERENCES users(id),
  status      TEXT NOT NULL DEFAULT 'pending',
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (user_a, user_b)
);
CREATE INDEX IF NOT EXISTS idx_friends_b ON friends(user_b, status);

-- 친구 대전 신청 (폴링 기반, 90초 내 응답 없으면 만료 취급)
CREATE TABLE IF NOT EXISTS challenges (
  id          TEXT PRIMARY KEY,
  challenger  TEXT NOT NULL,
  target      TEXT NOT NULL,
  room_id     TEXT,
  status      TEXT NOT NULL DEFAULT 'pending', -- pending|accepted|declined|cancelled
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_challenges_target ON challenges(target, status);
CREATE INDEX IF NOT EXISTS idx_challenges_challenger ON challenges(challenger, status);

-- 쿠폰 코드 (설정 화면에서 입력 → 크레딧 지급)
CREATE TABLE IF NOT EXISTS coupons (
  code        TEXT PRIMARY KEY,               -- 대문자로 저장
  amount      INTEGER NOT NULL,
  max_uses    INTEGER,                        -- NULL = 무제한
  uses        INTEGER NOT NULL DEFAULT 0,
  expires_at  INTEGER                         -- NULL = 무기한
);
CREATE TABLE IF NOT EXISTS coupon_claims (
  code        TEXT NOT NULL,
  user_id     TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (code, user_id)
);

-- 실시간 접속 현황 (하트비트로 갱신, 최근 N초 내 신호만 유효)
CREATE TABLE IF NOT EXISTS presence (
  user_id  TEXT PRIMARY KEY,
  state    TEXT NOT NULL,               -- 'menu' | 'queue' | 'online' | 'bot'
  ts       INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_presence_ts ON presence(ts);

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
  player_b    TEXT NOT NULL,              -- 봇전은 'bot'
  winner      TEXT,
  mode        TEXT NOT NULL,              -- 'online' | 'ranked' | 'bot'
  created_at  INTEGER NOT NULL,
  ended_at    INTEGER,
  cards_a     TEXT,                       -- {cardId: 플레이 횟수} JSON — OP 카드 분석용
  cards_b     TEXT,
  turns       INTEGER,                    -- 게임 종료 시점의 턴 수 (페이싱 분석). player_a=선공(side 0)
  buys_a      TEXT,                       -- {cardId: 구매 횟수} JSON
  buys_b      TEXT,
  bver        TEXT                         -- 밸런스 버전 (카드 수정 시 bump) — 버전별 카드 통계
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
