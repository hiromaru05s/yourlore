# Tutorial gacha guidance, deck ownership and fixed HOME position

- Tutorial ten-draw results highlight and focus the actual Starter Shop button. The result dialog's X/Escape route still advances the account-backed journey.
- During the tutorial cinematic, Skip and the cinematic X/Escape cannot bypass the animation. Hover/focus explains why in a shared azure tooltip. Normal draws retain their skip/close controls. Reduced motion and failed WebGL/loading retain the result fallback; a tutorial loading deadline avoids trapping saved rewards.
- All deck-editor candidate cards now show available-to-add / owned. The badge is larger and remains readable outside the dimmed card face. Only zero ownership dims/grays the face: 0/0 is dimmed, while all eight owned copies already in a deck show 0/8 in full color. Remove/add updates the count immediately. Zoom and existing add/replace constraints remain.
- Single mode keeps the same hidden reward-row geometry as Ranked/Casual, so the duel button does not move or resize when switching modes. The hidden row is also hidden from accessibility APIs.

## Source and preview

Reference: fetched main `4df820ff` (including runtime `feed223a7ada72438f05ab39fa06575a57630d41`). Work/preview root: `/Users/hiromaru05s/.codex/worktrees/tutorial-onboarding/LORE_TCG`. Current `shopGacha.ts`, `gachaCinematic.ts`, `deck.ts`, `dailyRewards.ts` and their existing styles own the change. Adopted gacha scene, card art, Zeno, library background, shared azure panels/buttons and HOME duel button are preserved. No new animation or artwork was introduced.

## Validation

- `docs/qa/2026-10-30-shop-deck-home/check.mjs`: actual rendered application with isolated Worker/SQLite account fixtures. Repeated Ranked/Casual/Single switches keep button x/y/width/height within 1px at 1461×790, 1280×720 and 1024×600. All-eight-used Cull remains full color at 0/8, unowned cards are gray at 0/0, and remove/add changes 0/8 → 1/8 → 0/8. Normal ten-draw skip still reaches the normal result dialog.
- `tests/onboarding-browser.mjs`: valid basic-completion fixture starts the post-duel journey. Tutorial skip/close/Escape guards, hover message, automatic cinematic completion, highlighted next action, free purchase, remove/add/save and mid-edit reload, Companion and Single recommendation. 1280px uses the highlighted button; 1024px uses the result X to verify continuation. It stops at the easy-Single start request.
- Typechecks and existing deck-drag regression passed; the guarded release runs the complete production suite.
- Screenshots were inspected separately from behavior assertions. Browser API traffic is isolated fixture data; this UI verification does not alter real accounts or prove live multiplayer or physical-device performance.

## Production release

- Runtime `7dea0f2a1a35123d0d1378c844837a3f7d260c1f` released at 2026-10-30 08:09 UTC. Version `8d10810a-d5c9-422e-9d8d-bb77f8bc3049` receives 100%; deployment `ba129cec-a3ca-47b9-8d06-93ea8893099a`.
- Both TypeScript projects and 256/256 production checks passed. An earlier gate caught the existing deck test's adjacent card/plus-button contract; the count badge now follows the action in the DOM, preserving that contract while staying outside the dimmed face. The superseded failed run was stopped and did not deploy.
- Production-served UI checks passed: fixed HOME geometry at all three desktop viewports, 0/0 gray versus 0/8 full-color, live remove/add count changes, normal gacha skip, and the guided ten-draw journey through the highlighted next action, free starter purchase, saved deck, Companion and Single recommendation. Page errors were empty. These used isolated API fixtures, not real-user balances.
- Production screenshots/reports: `production-browser/` and `production-onboarding/`. Result-button and deck screenshots were visually inspected after release. `production-assets.json` verifies the public entry, application module and stylesheet by URL/hash and checks the requested copy/behavior markers in the fetched module. `production.json` and `production-suite.json` record version and gate evidence.
- Follow-up evidence-only commits do not change the deployed runtime.
