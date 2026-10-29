# Deck drag removal — 2026-10-29

Deck cards can be dragged back into the card-list panel to remove one copy. Fixed Attune remains protected. Removal clears a pending replacement, supports Undo and uses the existing deck confirmation/save flow. Outside drops, Escape, pointer cancellation, blur, render/slot changes and screen teardown cancel the gesture. Mouse/pen behavior matches existing drag addition; touch retains native scrolling and the existing +/− controls.

## Source and preview

- Adopted main and deployed source before this change: `5839a8bd39128f80f1453a82e8ccc1ffbafdf7bc` (remote `gh/main`, production version `efab21c0-2b79-4700-8143-c8294bbc5a21`).
- Behavior: `client/src/screens/deck.ts`, `client/src/ui/deckDrag.ts`.
- Existing visuals: `client/src/styles/deckLayout.css`, `client/src/ui/deckMasterArt.ts`, `client/src/ui/deckCardQuality.ts`, common default UI and lounge assets.
- Build/preview root: `/Users/hiromaru05s/.codex/worktrees/deck-drag-remove/LORE_TCG`.
- Built preview: `http://127.0.0.1:5192`; desktop and narrow screenshots inspected in `/tmp/lore-deck-drag-browser/`. Current backgrounds, card art/frame and layout retained.

## Validation

- Client/server typecheck and production build passed.
- `tests/deck-drag.mjs`: add/replace/remove, fixed card, outside/Escape/pointercancel/blur/render cancellation, save gate, click suppression, native touch scrolling, teardown.
- `tests/deck-hand-editor.mjs`: removal integration, pending replacement reset, incomplete deck save gate, undo and existing editor regression checks.
- `tests/deck-drag-browser.mjs`: actual mouse gestures at 1280 and 390 CSS pixels, remove/undo/outside/Escape/fixed card/add/replace and fixture save. No browser errors. See `browser.json`.
- Browser API responses are fixtures; this does not establish real-account persistence or physical touchscreen validation.
- Production release uses `npm run deploy` (committed main snapshot, deployment lock/source/schema guards, full production suite, typecheck and build). Final deployed version is reported after release.
