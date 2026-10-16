-- User-authorized production-only wipe, 2026-10-16.
-- Run ONLY after the production Durable Object reset migration has deployed.
-- Clears accounts, sessions, all progression/history and gifts; keeps coupon definitions.
DELETE FROM "medal_duel_receipts";
DELETE FROM "earned_medals";
DELETE FROM "medal_progress";
DELETE FROM "tutorial_accounts";
DELETE FROM "gift_deliveries";
DELETE FROM "gift_messages";
DELETE FROM "duel_reward_receipts";
DELETE FROM "daily_challenges";
DELETE FROM "experience_events";
DELETE FROM "player_experience";
DELETE FROM "collection_transactions";
DELETE FROM "ranked_results";
DELETE FROM "ratings";
DELETE FROM "matches";
DELETE FROM "sessions";
DELETE FROM "email_tokens";
DELETE FROM "presence";
DELETE FROM "inquiries";
DELETE FROM "coupon_claims";
DELETE FROM "challenges";
DELETE FROM "friends";
DELETE FROM "invite_rewards";
DELETE FROM "user_days";
DELETE FROM "rewards";
DELETE FROM "users";
UPDATE coupons SET uses=0;
INSERT INTO coupons(code,amount,max_uses,expires_at,repeatable)
VALUES('LORE30000',30000,NULL,NULL,1)
ON CONFLICT(code) DO UPDATE SET amount=30000,max_uses=NULL,expires_at=NULL,repeatable=1;
