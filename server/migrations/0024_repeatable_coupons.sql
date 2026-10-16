-- Existing coupons remain once per account; only explicitly marked codes repeat.
ALTER TABLE coupons ADD COLUMN repeatable INTEGER NOT NULL DEFAULT 0;
ALTER TABLE coupon_claims ADD COLUMN claim_count INTEGER NOT NULL DEFAULT 1;
