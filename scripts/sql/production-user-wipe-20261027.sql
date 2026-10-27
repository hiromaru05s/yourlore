-- Authorized by the user on 2026-10-27: ALL production game users, no exception.
-- PRECONDITIONS: last active release session; API maintenance enabled;
-- old production MatchmakerLive/GameRoomLive namespaces deleted successfully.
-- Reconcile against the final schema after the parallel BOT changes land.
-- Keep game schema and coupon definitions; clear all usage and user-owned data.
DELETE FROM ranked_match_decks;
DELETE FROM ranked_recent_decks;
DELETE FROM medal_duel_receipts;
DELETE FROM earned_medals;
DELETE FROM medal_progress;
DELETE FROM tutorial_accounts;
DELETE FROM gift_deliveries;
DELETE FROM gift_messages;
DELETE FROM duel_reward_receipts;
DELETE FROM daily_challenge_extras;
DELETE FROM daily_challenges;
DELETE FROM experience_events;
DELETE FROM player_experience;
DELETE FROM collection_transactions;
DELETE FROM ranked_results;
DELETE FROM ratings;
DELETE FROM matches;
DELETE FROM sessions;
DELETE FROM email_tokens;
DELETE FROM presence;
DELETE FROM inquiries;
DELETE FROM coupon_claims;
DELETE FROM challenges;
DELETE FROM friends;
DELETE FROM invite_rewards;
DELETE FROM user_days;
DELETE FROM rewards;
DELETE FROM users;
UPDATE coupons SET uses=0;
