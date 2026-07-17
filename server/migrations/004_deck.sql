-- 004: 초기 덱 빌딩 — 유저별 스타팅 덱 8장 (csv). null = 기본덱(컬6+상자2). 어튠 1장은 항상 고정.
ALTER TABLE users ADD COLUMN deck TEXT;
