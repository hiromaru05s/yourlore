-- 005: 덱 프리셋 5슬롯 + 덱별 마켓 알림이 — JSON {sel, list:[{cards[8], watch[]}x5]}.
-- 기존 deck 컬럼(csv)은 "활성 덱" 캐시로 유지 (매치메이커/친선전이 그대로 읽음).
ALTER TABLE users ADD COLUMN decks TEXT;
