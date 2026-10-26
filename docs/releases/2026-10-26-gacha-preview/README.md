# Gacha collection presentation refinement

Requested refinement of the adopted shop: remove the permanent banner/subtitle and duplicate balance, give the title a translucent backing, fit the illustration to the actual chamfered frame, align featured tiles and draw buttons, and show live category-specific previews.

Reference implementation: remote main `1838e812`, `client/src/ui/shopGacha.ts`, `client/src/styles/defaultUI.css`, `client/src/styles/defaultButtons.css`, and the existing table illustration at `client/public/art/shop/biblion-draw-table-v1.webp`. Work/preview source: `/Users/hiromaru05s/.codex/worktrees/shop-daily-starters/LORE_TCG`, built `client/dist` at `http://127.0.0.1:5518`.

The common panel now owns the background; its original silver rim is clipped to a narrow perimeter so its opaque inset no longer creates an inner rectangle. Starter and sleeve samples are three-card hands. All three sleeve samples reuse equipped surface animations. Effect previews use actual Attune cards. Category dialogs show only the selected category, with framed starters, standalone sleeves/sculptures and live Attune finishes. The top-right close remains available while scrolling and restores the selected tile's focus.

The shared sleeve inspector also now retains the trio artwork before shader creation and mounts the existing Goldfault light mask. This fixes black trio previews and static Goldfault previews without inventing substitute effects. Visibility, reduced motion, async cancellation and disposal are handled by the preview owner. Purchase rules, daily rotation, odds and cinematic outcomes remain unchanged.

## Verification

`tests/shop-gacha-preview-browser.mjs` exercises actual application/assets with synthetic API responses: each of three sleeve canvas images changes over time, the Attune finish changes, categories filter correctly, starter frames and Attune models are present, close/focus and reduced-motion behavior work, draw controls fit in five viewports, desktop button/tile edges align, and all shop tabs retain the same outer dimensions. Browser evidence is separate from real-account purchases.

Visual review: desktop, 390/320 portrait and 844 landscape, translucent title, full panel illustration/rim, three-card hands, standalone cosmetic shapes, Attune effect gallery. This reuses existing approved animations; it is not a new animation-art approval. No real account was charged and no physical-device verification is claimed.

Release status and exact production evidence are recorded after guarded deployment below.

The final browser pass also covers temporary page-navigation inertness: surface preparation must not wait for interaction to be enabled, since IntersectionObserver may not fire again when inertness clears. Playback still pauses while inert. The initial guarded attempt was stopped during tests before publishing to correct this timing case. The final visual/interaction suite passed after the correction; the purchase regression suite also passed. See `qa/`.

## Production

Released source `64902739c23c1d3884ee83ed44eadda9d16ac68e` via `npm run deploy` and the committed-snapshot guard. Worker version `b4a44389-2233-41ed-a391-46827a4abbb0`, deployment `52cfaca1-3546-4189-8efc-a3cd7c1fe3e2`, 100% traffic at https://yourlore.xyz.

- Client/server typecheck, all 229 production regression tests, and production build passed.
- All 135 built HTML/JS/CSS/JSON files match published bytes. An initial comparison used the build from before a final explanatory source comment; `clientSourceRevision` hashes raw source text, so the manifest name differed. Rebuilding the exact released source resolved the mismatch without changing production.
- The published app passed the five-viewport preview test with synthetic API data: all three sleeves animate, effect playback uses Attune, categories are isolated, close/focus survives scrolling, reduced motion remains static, desktop edges align, and tab dimensions remain equal. Zero page errors.
- Production desktop and cosmetic gallery screenshots were inspected against the local result. No real-account purchase or physical-device test was performed.

Evidence: `production/deployment.json`, `production/suite.json`, `production/bundle-parity.json`, `production/report.json`, and the screenshots alongside them.
