# Daily starter shop and Biblion gacha table

## Requested behavior

- Three tabs: Gacha, Starters, Accessories (Coming soon).
- The gacha surface defines one shared frame. Tabs retain exactly the same dimensions; starter cards scroll inside it.
- Five starter types are shared by all users and rotate at 00:00 KST, whether purchased or not. Each account may buy two of each daily, for 100 Shards per card. The existing eight-copy ownership cap remains.
- Gacha still draws from the full starter pool, with its existing rates and refunds.
- Retire the 28 non-gacha sleeve/furniture catalog entries. Default appearance and all gacha cosmetics remain. Retired IDs are rejected for acquisition, filtered from ownership responses, and normalize to default equipment. Historical receipts and source-art archives are retained.
- Screenshot-directed gacha tableau within the adopted azure chamfer panel, using real current card-back/chest/reward assets. Existing cinematic and purchase endpoints remain connected.

## Source verification

Started from remote main `96329cc5b660e4b1c070d5868d837c7db60e70b4`, which was also the production source at inspection (`a3ecb00b-3659-431a-b467-5764244cc0df`).

Adopted sources: `client/src/screens/shop.ts`, `client/src/ui/shopGacha.ts`, `client/src/styles/defaultUI.css`, `client/src/styles/defaultButtons.css`, `client/public/frames/sleeve_default.webp`, `client/public/art/cards/STARTER_CHEST.webp`, `client/src/shared/cosmetics.ts`.

Workspace: `/Users/hiromaru05s/.codex/worktrees/shop-daily-starters/LORE_TCG`. Preview: built `client/dist` served at `http://127.0.0.1:5518/`. API fixtures use the actual application and asset files. The original working checkout was left untouched.

## Purchase authority

The server derives the KST day from UTC time. A fixed shuffled catalog cycle selects five cards independently of account state. Stock comes from committed purchase receipts for the same KST day; gacha rewards never consume it. A conditional SQL update checks the daily limit inside the transaction, in addition to the existing balance/inventory compare-and-swap. Ledger insertion and spending remain a single D1 batch. Request IDs replay the original receipt even across midnight. Stale new purchases are rejected. No database migration is required.

The browser receives the lineup, remaining stock, server time and next reset; a monotonic deadline refreshes an open shop, with focus/visibility refresh for sleeping tabs. Purchase requests include the displayed shop day.

## Background asset

Built-in ImageGen was used for `client/public/art/shop/biblion-draw-table-v1.webp` (WebP encoding of generated PNG). The user reference is retained as `reference.png`. Cards and controls are DOM content, not baked into the background.

Prompt: Use case: stylized-concept. Asset type: background-only art for LORE dark fantasy card game's gacha screen. Create a wide landscape 1536x864 overhead slightly oblique view of a magical library's intimate card drawing table. A midnight blue velvet cloth covers most of the table, delicate worn gold compass and celestial cartography embroidery, rich blue folds, warm slanting lamplight entering from upper right and cool blue shadows. Along extreme edges only: a cropped open aged folio at top right, a restrained brass quill at lower right, a little ivy at far left, dark wood edges. Central 75 percent must stay unobstructed blue cloth, with softly lit golden embroidery at center-right, to later place a wide fan of actual game cards. Top left stays dark for small white title text, bottom 25 percent darker for game controls. Hand-painted dark fantasy game illustration with shaped brushwork, controlled shading, clear material silhouettes, atmospheric and exciting but restrained, not photographic or glossy 3D. No cards, no chest, no characters, no text, no letters, no UI buttons, no border frame, no floating particles. Full bleed background composition.

## Validation

- Client/server typecheck and production build passed.
- Real Worker routes with SQLite: shared five-card lineup, KST midnight, stale day rejection, two-copy limits, parallel purchase, all-or-nothing spend, rollback, idempotent replay across days, inventory caps, full gacha catalog and rewards passed.
- Catalog/equipment tests: retired IDs excluded/defaulted; every active gacha item remains independently owned and equipable.
- Chrome with API fixtures: 1440×900, 1024×600, 390×844, 320×640, 844×390; identical frame width/height across all three tabs, in-view draw buttons, no horizontal overflow, intact 0.64 starter card ratio, purchases/sold-out/recovery, normal one-draw cinematic, reduced-motion ten-draw result, history and open-page date rollover passed. Zero page errors. See `qa/report.json`.
- Visual inspection: desktop fan/table composition, current card assets, default chamfer panel/buttons, compact portrait and landscape layouts. This is implementer review, not a claim of separate user visual approval.
- Initial full regression run: 227/228; the old `menu-selected` test expected deleted cosmetic tabs. Updated it to exercise the three tabs, inert hidden content and teardown; its standalone rerun passed. The guarded release reruns the complete suite. Browser/API fixtures are separate from real-account purchases; no real account was charged during verification.
