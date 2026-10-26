# Gacha collection presentation refinement

Requested refinement of the adopted shop: remove the permanent banner/subtitle and duplicate balance, give the title a translucent backing, fit the illustration to the actual chamfered frame, align featured tiles and draw buttons, and show live category-specific previews.

Reference implementation: remote main `1838e812`, `client/src/ui/shopGacha.ts`, `client/src/styles/defaultUI.css`, `client/src/styles/defaultButtons.css`, and the existing table illustration at `client/public/art/shop/biblion-draw-table-v1.webp`. Work/preview source: `/Users/hiromaru05s/.codex/worktrees/shop-daily-starters/LORE_TCG`, built `client/dist` at `http://127.0.0.1:5518`.

The common panel now owns the background; its original silver rim is clipped to a narrow perimeter so its opaque inset no longer creates an inner rectangle. Starter and sleeve samples are three-card hands. All three sleeve samples reuse equipped surface animations. Effect previews use actual Attune cards. Category dialogs show only the selected category, with framed starters, standalone sleeves/sculptures and live Attune finishes. The top-right close remains available while scrolling and restores the selected tile's focus.

The shared sleeve inspector also now retains the trio artwork before shader creation and mounts the existing Goldfault light mask. This fixes black trio previews and static Goldfault previews without inventing substitute effects. Visibility, reduced motion, async cancellation and disposal are handled by the preview owner. Purchase rules, daily rotation, odds and cinematic outcomes remain unchanged.

## Verification

`tests/shop-gacha-preview-browser.mjs` exercises actual application/assets with synthetic API responses: each of three sleeve canvas images changes over time, the Attune finish changes, categories filter correctly, starter frames and Attune models are present, close/focus and reduced-motion behavior work, draw controls fit in five viewports, desktop button/tile edges align, and all shop tabs retain the same outer dimensions. Browser evidence is separate from real-account purchases.

Visual review: desktop, 390/320 portrait and 844 landscape, translucent title, full panel illustration/rim, three-card hands, standalone cosmetic shapes, Attune effect gallery. This reuses existing approved animations; it is not a new animation-art approval. No real account was charged and no physical-device verification is claimed.

Release status and exact production evidence are recorded after guarded deployment below.
