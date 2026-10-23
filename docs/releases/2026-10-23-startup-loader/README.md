# First-document loading screen

Opening the site previously displayed a separate static English `Opening the library…` shell until the application graph and session lookup completed. The approved silver-card loader appeared only afterward.

- Vite now embeds the existing `loadingScreen.css` and `loadingRitual()` SVG directly in the initial HTML. Development and release builds share the same source as the runtime loader. No external JavaScript or CSS is needed to paint the cards.
- A small inline initializer applies saved ja/ko/en preferences (then browser language) before first paint. The recovery entry uses the same initial language.
- The initial progress stays at 0 until the application has actual preparation progress. The runtime loader inherits the running CSS animation clock before the initial shell is removed.
- The native reload link, startup failure/timeout handling, and reduced-motion styling remain available.

## Validation

- Client typecheck and production build passed.
- `node tests/startup-recovery.mjs` passed.
- `node tests/startup-loader-browser.mjs`: desktop, 390px and 320px phones, landscape, ja/ko/en saved preferences, blocked external scripts/styles, JavaScript disabled, reduced motion, unchanged progress during two full animation cycles, and identical animation start time through runtime handoff. All six cases passed; login reached with no runtime errors.
- Desktop/mobile screenshots and a six-frame contact sheet from continuous playback are in `qa/`. The artwork and choreography are reused unchanged; this is startup delivery/handoff work, not a new VFX design or gameplay validation.
- Raw HTML grew from 1,580 to 21,244 bytes; gzip from 944 to 4,897 bytes, in the locally compared builds. This replaces a dependency on loading the application graph for the approved visual.

Browser recovery passed all nine cases (normal desktop/mobile, geo timeout, saved language, auth failure/reload, auth timeout, failed module, failed entry scripts, and optional background timeout). Failure injection was updated for the shared module-preload helper, WebP textures, and service-worker interception. `qa/recovery-local.json` records the results. Deployment evidence is recorded separately. Test scripts accept `LORE_TEST_ORIGIN`, `LORE_TEST_OUT`, and `PLAYWRIGHT_MODULE` for release verification.
