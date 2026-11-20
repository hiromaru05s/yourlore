# Two standard sleeves — 2026-11-20

The user requested an eye-only indigo sleeve, a slimmer frame on the existing default, both freely selectable from deck editing for every player, and production deployment.

## Source and art

Baseline/fetched main: `2c842f16722f468062e4e596d3404b3bff9fce93`, whose runtime is deployed source `60ddcb996143f76f4a68191839b75f8273f762e3`. Preserved the adopted card contour, board/furniture and existing menu design. References: `docs/world-bible.md`, `docs/default-ui-design.md`, `docs/menu-design-insights.md`.

Built-in imagegen outputs and exact prompts are in `imagegen.json`. Masters: `client/public/frames/sleeve_default.png` and `sleeve_indigo_eye.png`. WebP copies use quality 94 with full-quality alpha. The default keeps its original ornate eye/lattice artwork with a narrow perimeter; Indigo Eye keeps the indigo field and isolated eye/compass emblem, without LORE lettering. Physical paper outline regenerated with `scripts/build-card-stock-outline.mjs`.

## Availability and persistence

- `client/src/shared/freeSleeves.ts` defines exactly `default` and `sleeve:indigo-eye` in JA/EN/KO.
- Both are implicit initial inventory for existing and new accounts, including null, empty and malformed historical inventory. No grant migration, spending or purchase required.
- Shared normalization, profile equip, deck saving, auth, queue and friendly matches preserve both valid IDs. Every other sleeve stays disabled; owned retired items remain stored. Gacha and sale pools remain unchanged.
- The deck picker shows both options and a live selected sleeve preview. Local guest behavior matches availability.

## Validation

- Real Worker and SQLite: empty/null inventory, zero credits, equip, save/reload, queue and friendly appearance propagation, retained owned cosmetics, and rejected retired sleeves.
- Gacha catalog/collection and physical pile checks passed.
- `tests/free-sleeves-browser.mjs`: actual current deck editor, empty starting inventory and zero credits, both selections, preview changes, save/reload (`picker-check.json`). Local account fixture; not production authentication.
- `tests/free-sleeves-board-browser.mjs`: actual GameView at 1920×1080, swapping the two real sleeve IDs between players without texture routing; no page errors (`board-check.json`).
- Visuals inspected: `eye-picker.png`, `default-self-eye-opponent.png` and `eye-self-default-opponent.png`.
- Preview cwd: `/Users/hiromaru05s/.codex/worktrees/nameplate-board-1119/LORE_TCG/client`, port 5473; `/sleeve-indigo-preview.html` and `/nameplate-board.html` use the current sources.

## Production release

Released source: `74ebbe2d3065a00fd5078c7edc36f73d50e47f75`. The standard guard completed client/server typecheck, database schema validation, 308/308 production tests and build. Worker version `33b92e32-a22d-465e-b49d-44bd09871a64` serves 100% of traffic, deployed at 2026-11-20 04:35 UTC (`deployment.json`).

- Nine live art/model assets, including both sleeve WebPs, match the committed source hashes (`served-assets.json`).
- Eleven live main/game/board/card surface/CSS chunks match the exact guarded build (`served-build.json`).
- Public login page returns 200 and renders without page errors (`live-smoke.json`).
- Default sleeve draw checks pass at 1280px and 390px for both sides, privacy, cancellation, normal timing and cleanup (`draw-check.json`). That regression fixture uses its historical board; the current board visuals are the screenshots above.

Fixture checks and served assets are not authenticated live PvP verification. No inventory migration, deletion or user balance changes were needed.
