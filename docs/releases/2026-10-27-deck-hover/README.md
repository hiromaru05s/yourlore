# Deck removal hover stability

The user reported rapid lifting/returning at the edge of the removal control in the deck editor and requested production deployment.

## Cause and fix

`deckLayout.css` moved `.deck-entry` up 8px on hover while the earlier `menuApproved.css` also replaced its rotation with a 6px translation. This moved the element supplying the hover hit area, including its removal/replacement button, away from the pointer. The button added its own one-pixel hover/press translation.

Keep the entry's position and rotation fixed across hover/focus and keep removal/replacement controls stationary across hover/press. Only the rendered card rises 8px, with a 140ms transition. Narrow layouts retain their existing non-lifting presentation; reduced motion disables the transition. Deck state handling, artwork, shared UI and candidate controls are unchanged.

## Source and preview

- Initial verified remote main: `ed86e67c94336abd165c4fc4bb55d41260bc8e31`; integrated main: `c6abd89e` (includes `f79189dc` profile update).
- Owning implementation: `client/src/screens/deck.ts`, `client/src/styles/deckLayout.css`, `client/src/styles/deckActions.css`. CSS ordering checked through `client/src/main.ts`, `menuApproved.css`, and the full Vite build.
- Preview root: `/Users/hiromaru05s/.codex/worktrees/deck-hover-fix/LORE_TCG`; built application: `http://127.0.0.1:5193`.
- Compared actual card art, background and shared frames in built-app screenshots against the current adopted implementation; no old preview was reused.

## Verification

- Before fix, the browser regression failed: the first card hit area's x position changed from 339.112px to 344px, y from 142.494px to 130px, and the removal button moved from y=315.113px to 301.5px. `before.json` preserves this observation. This measures geometry, not the user's exact pointer trajectory.
- `tests/deck-hover-browser.mjs` exercises the built application with API-only fixtures: four edges on all eight editable cards at 1440×900, 1024×768, 844×390 and 390×844; frame-by-frame hover stability, fixed hit areas, keyboard removal/undo, replacement and touch with reduced motion.
- `tests/deck-hand-editor.mjs` and `tests/deck-drag.mjs` passed. The full build and design guard passed.
- Visual inspection checks the preserved art/layout and card lift separately from automated assertions. Browser viewport/touch emulation is not physical-device verification. Fixture interaction does not modify real account decks.

Production identifiers and final verification are appended after deployment.
