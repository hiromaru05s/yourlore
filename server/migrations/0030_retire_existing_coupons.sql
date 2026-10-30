-- 2026-10-30: daily login gifts replace the currently issued coupon codes.
-- Expire all existing definitions, including repeatable LORE30000. Preserve
-- amounts, uses and claim history; do not revoke previously granted Shards.
-- A fixed past timestamp makes this operation idempotent.
UPDATE coupons SET expires_at = 1 WHERE expires_at IS NULL OR expires_at > 1;
