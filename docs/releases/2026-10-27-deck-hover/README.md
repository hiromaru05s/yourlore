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
- Chromium: all 128 boundaries passed, with zero hover changes and stationary card/action hit areas. WebKit: all 32 desktop boundaries passed, plus keyboard, replacement and emulated mobile touch checks. Both final runs reported zero page errors. Summaries: `chromium.json`, `webkit.json`; representative screenshots: `deck-1440.png`, `deck-390.png`.
- `tests/deck-hand-editor.mjs` and `tests/deck-drag.mjs` passed. The full build and design guard passed.
- Visual inspection checks the preserved art/layout and card lift separately from automated assertions. Browser viewport/touch emulation is not physical-device verification. Fixture interaction does not modify real account decks.

## Production

- Fix commits: `07e9a807`, `05238782`; included in integrated release `c6fdc343799c67abd5dce3cc2ed2c81dd0304112`. The three owning deck files have no further diff between the tested fix and this integration. The integrated build also passed locally from the same preview root.
- Published at **2026-10-27 00:25:20 JST/KST** to `https://yourlore.xyz` by the concurrent guarded production deployment. Our initial attempts stopped safely on the shared lock / advancing main; no duplicate release was issued.
- Worker version: `9b93c38f-fa5a-4dee-affc-cb474f3877ab`, at 100%; deployment `12c6c9e9-75c2-4237-9d3e-6e555e4076f8`.
- `production-deployment.json` records the source annotation. `production-assets.json` confirms the production HTML, entry JavaScript, and both applicable CSS assets exactly match the verified integrated build.
- On the deployed application, all 64 boundaries at 1440×900 and 390×844 passed, followed by successful keyboard removal/undo and replacement at both widths; no page errors were recorded. `production-browser.json` and `production-*.png` preserve that evidence.
- The subsequent fresh mobile touch context timed out after 120 seconds while waiting for the screen loader to disappear, before the tap assertion. A separate touch-only retry also timed out in that loading stage; `production-touch.log` records the limit. Production touch interaction is therefore **unverified**, while local Chromium/WebKit touch and reduced-motion checks passed. The cause of that production loading delay was not established by this scoped hover fix. No real account deck was modified.
