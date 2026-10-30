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
