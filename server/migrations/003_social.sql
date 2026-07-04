-- 003: profiles (avatar/badge/privacy) + friends + friendly challenges + coupons

ALTER TABLE users ADD COLUMN avatar TEXT;
ALTER TABLE users ADD COLUMN badge TEXT;
ALTER TABLE users ADD COLUMN stats_public INTEGER NOT NULL DEFAULT 1;

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
  amount      INTEGER NOT NULL,               -- 지급 크레딧
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
