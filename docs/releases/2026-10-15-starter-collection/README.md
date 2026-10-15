# Starter collection and shop

2026-10-15 user instruction: initial ownership is Cull ×8, Attune ×1, Treasure Chest ×2. Other starters are collectible. The existing nine-card battle deck remains eight chosen cards plus fixed Attune.

- All 36 collectible starters, including Treasure Chest and excluding Cull / Attune, cost 200 Shards per copy. Purchases stop at eight owned.
- Gacha costs 100 per draw or 1,000 per ten. The user explicitly selected temporary starter-only 100% drops while cosmetic/effect rewards are prepared. Each collectible starter has independent equal odds (1/36).
- An eight-copy duplicate refunds 50 Shards. Ten-draw grants update counts sequentially before deciding each refund.
- Planned categories are stored as 90% starters / 9.5% sleeves and deck holder & graveyard / 0.5% effects, with 50 / 100 / 500 duplicate refunds. The latter two pools remain unavailable and are not silently substituted with existing cosmetics. These future rates are not active.
- Removed visible N/R/SR/SSR tiers and the old ten-draw tier guarantee. Existing Azure Wake motion receives the actual server-confirmed reward art; skipping, closing or replaying cannot repeat a transaction.
- Collection ownership constrains all saved deck slots and server-side normal/ranked/friendly entry. Existing saved choices remain stored; reads replace currently unowned copies with Cull. Market cards and tutorial/BOT fixtures keep their existing rules.
- D1 compare-and-swap plus an atomic transaction ledger prevent overdrafts, partial grants and repeat spending. Request IDs survive a lost response in session storage; the shop exposes a recovery action and server-backed history.

## Validation

- `tests/starter-collection.mjs`: real Worker routes with transactional SQLite; initial ownership, catalog exclusions, prices, concurrent/idempotent spending, rollback, cap boundary, ten-draw refunds, invalid input, insufficient balance, deck save/queue restrictions, history.
- `tests/starter-collection-browser.mjs`: actual menu components with API fixture; 1440×900, 1024×600, 390×844, 320×740, 844×390; purchases, lost-response recovery, deck ownership, actual reward presentation, reduced-motion ten draw, history. No page errors or horizontal overflow. These browser fixtures do not claim an authenticated live purchase.
- Existing animation choreography is retained. The screenshots verify reward art and UI composition, not new motion approval.

## Deployment

Before deploying the Worker, apply only `server/migrations/0017_starter_collection.sql` to staging. Older schema migrations must not be replayed from an incomplete migration ledger. Production requires this migration separately before any future rollout.
