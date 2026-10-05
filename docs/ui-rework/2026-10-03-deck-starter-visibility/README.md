# Starter candidate visibility

The staging build clipped the deck starter pool to 15.125px at 1280×720. All 36 candidates existed; the deck screen had an automatic height and its panel collapsed to 316px.

With the cosmetic studio as a second Vite entry, `presentation.css` is emitted into shared CSS loaded before the main entry's lounge styles. The equally specific `.lounge-content > .screen { height:auto }` overrides `.lounge-content > .deck-screen { height:100% }`. Size containment then prevents the candidate pool from establishing the missing height. The development server's CSS order does not reproduce this regression.

`menuWorkspace.css` now owns the deck screen height with a deck-scoped selector. It also explicitly resets the hand tray's inherited bottom margin and the save message's spacing, and lets the short-desktop candidate width shrink below its previous 50px floor so a save result can coexist with two complete rows. The approved hand layout, fixed Attune, card art, filters and navigation remain intact.

Regression check (against the complete multi-entry build):

```sh
npm run build
npm --workspace client run preview -- --host 127.0.0.1 --port 5189
LORE_PLAYWRIGHT=/path/to/playwright/index.mjs node tests/deck-starter-visibility-browser.mjs
```

The browser check uses API fixtures, including save responses; it does not write to real accounts. It checks at least two fully visible candidate rows at 1280×720, 1024×600, 390×844 and 375×667, with a save status present, plus tab return, search and scrolling. This is layout/interaction evidence, not authenticated account testing.

## Verified release

- Source: `fd5ddc3f160996d2193234d361edb4ba488ebd14`.
- Staging: https://test.yourlore.xyz ; version `008c0fce-f7ab-4dc6-9573-4fdbbd7d4afc`.
- Guarded clean-snapshot release: client/server typecheck, 52/52 production-suite checks, full build succeeded.
- All seven JS/CSS files referenced by the deployed index returned 200 and matched the local build's SHA-256. Fixed main CSS: `/assets/main-BwM0mywb.css`, SHA-256 `c6882582b0d7e6bc161cd7587e5fffe5ee8370a5fd45a7766d8baa2c689781e2`.
- The same browser regression passed against staging at all four sizes. `staging-report.json` records two complete rows and 36 candidates at each size, with a save status displayed; search, tab return and scrolling passed. No browser runtime errors.
- API responses are fixtures; this confirms deployed static assets and browser behavior, not a real account save. Production was not deployed. Existing changes in the canonical checkout were left intact; implementation and release were isolated in a worktree based on current remote main.
