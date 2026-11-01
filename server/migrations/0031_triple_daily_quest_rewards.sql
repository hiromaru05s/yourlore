-- Triple existing unclaimed assignments once. Keep progress/revisions, receipts,
-- already paid amounts and user balances intact. New assignments use QUESTS.
UPDATE daily_challenges
SET quest = json_set(quest, '$.reward', json_extract(quest, '$.reward') * 3)
WHERE claimed = 0 AND json_extract(quest, '$.reward') IN (300, 350, 400)
AND NOT EXISTS (
  SELECT 1 FROM rewards WHERE rewards.user_id = daily_challenges.user_id
  AND rewards.key = 'daily:' || daily_challenges.day
);

UPDATE daily_challenge_extras
SET quest = json_set(quest, '$.reward', json_extract(quest, '$.reward') * 3)
WHERE claimed = 0 AND json_extract(quest, '$.reward') IN (300, 350, 400)
AND NOT EXISTS (
  SELECT 1 FROM rewards WHERE rewards.user_id = daily_challenge_extras.user_id
  AND rewards.key = 'daily:' || daily_challenge_extras.day || ':' || daily_challenge_extras.slot
);
