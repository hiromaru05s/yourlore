# Quiet luxury gacha release

Approved: 黒漆の一閃 / 白磁の余白 / 翠硝子の封印. Each set grants two independent items, a sleeve and a combined deck holder/graveyard. IDs use `sleeve:quiet-*` and `furniture:quiet-*`.

The existing 92.5% starter / 7% cosmetic / 0.5% card-effect category rates remain unchanged, as explicitly requested. Cosmetics use the existing unbiased, equal item draw. New items participate in server inventory CAS, account-scoped request replay protection, 100-Shard duplicate refunds and ownership-gated per-deck equipment. No database migration is required.

The approved geometry and Canvas sleeve artwork are promoted from the local comparison. A cached-board overlay follows the real pile transforms and depth buffer, preserves contact shadows and paints at 24Hz without invalidating the whole board every frame. DOM hand backs and native draw copies select by their actual sleeve URL; face-up cards and the other player's different sleeve are untouched. Reduced motion, hidden-page handling and disposal follow the existing cosmetic adapter lifecycle.

`/gacha-minimal-three.html` now uses the production equipped-cosmetic adapter. It retains opponent empty deck/grave, draw, hand, zoom and pause controls. Close-up raster density follows parent zoom with a bounded budget and MSAA. The clipping container cannot acquire an internal scroll offset.

Validation before staging:

- `tests/gacha-cosmetics.mjs`: unique IDs, all assets/locales, equipment kinds and cross-set combinations.
- `tests/starter-collection.mjs`: actual Worker handlers with SQLite, each new reward, duplicate refunds, independent ownership and saved equipment, replay/rollback/concurrency checks.
- In-app browser: three real-adapter furniture variants, empty opponent piles, animated hand backs and three-card native draw ending at deck 6 / hand 7; no leftover native draw layer or browser errors.

These browser observations use a real renderer with fixture game state, not an authenticated online match. Deployment source/version and final checks are recorded separately after release.
