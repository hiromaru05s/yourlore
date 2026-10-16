# HOME and shop cleanup — 2026-10-16

Requested changes:
- Daily quest below the sound bar. HOME fits its viewport; catalog/dialog scrolling remains available.
- Remove the lone 01 / STANDARD edition selector and its layout column.
- Full starter card faces (width / height 0.64), quantity selector, total cost, YES / NO confirmation.
- Remove sleeve/furniture selected-preview aside and duplicate shop balance.
- Staging coupon `LORE30000`: 30,000 Shards per redemption, unlimited total and per-account uses, no expiry.

Purchases remain server-authoritative and idempotent. Bulk buys are one transaction, capped at eight owned copies; over-cap and insufficient-balance requests reject the whole purchase. Old requests without count still buy one copy.

Existing coupons remain once per account. Only codes explicitly marked `repeatable=1` can repeat; claim_count preserves payout accounting. Deploy schema migration `server/migrations/0024_repeatable_coupons.sql` before deploying the Worker. The code provision in `scripts/sql/staging-shard-coupon.sql` is staging-only and is not a production migration.

Validation:
- Typecheck and production build.
- `tests/starter-collection.mjs`: bulk cost/count, replay, concurrent requests, cap, invalid quantities, insufficient balance and rollback.
- `tests/production-security.mjs`: repeat redemption, concurrent issuance, rollback, expiry/cap and ordinary once-per-user codes.
- `tests/starter-collection-browser.mjs`: five viewports, full frame geometry, banner width, NO / Escape / YES, lost-response recovery, gacha and history.
- `tests/home-shop-browser.mjs`: six viewports with populated rank and quest, no HOME/document overflow, visible duel/deck, cosmetic lists without an aside, HOME remount.

Browser checks use fixture accounts with real local assets. Live staging API and deployment verification are recorded separately after release.
