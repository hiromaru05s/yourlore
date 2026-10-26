# 2026-10-27 HOME loading — selected 01

The user selected revision II, variant 01, requested a simpler LORE card face, retained the faint HOME background, removed the preview label “01 / ロード中”, and authorized production deployment.

## Change

- One painted blue card, a narrow ivory/gold edge and a central eye/compass; no elaborate carved frame or extra ornament. `azure-card-v1.webp`, 640 × 941, 94,474 bytes including transparency. ImageGen original: `exec-7d5c57ae-9507-47e0-97dc-fe473e68207c.png`; the reproduction prompt is adjacent.
- The same artwork is preloaded in first paint, used for the three waiting cards, and carried into seven cards that fan out and leave upward. HOME architecture remains visible through a blue translucent blur; menu chrome returns after the fan opens. The adopted sequence takes four seconds after actual readiness, or 250 ms with reduced motion.
- Actual image/font/atmosphere readiness controls admission and progress. The new artwork joins the retryable image gate. No mock progress or fixture APIs in the production path.
- HOME actors change opacity only; their renderer/layout transforms are preserved. Cancellation restores original opacity, removes actors and releases the readiness cover.
- No numbered phase badge exists in the runtime. The old comparison preview badge was also hidden locally.

## Local verification

- Client/server typecheck and production build passed.
- Readiness regression checks: image retries, shared transfers, cancellation, hidden lazy images, first HOME atmosphere frame, original companion styles restored on cancel.
- New lifecycle test: completion, abort, pre-abort, reduced motion and preference change; cleanup of RAF/stage and preservation of HOME renderer transforms.
- Actual production `coverScreen` / `playHomeEntrance` on actual HOME components with synthetic API responses: 1280 × 720, 390 × 844 and 844 × 390 browser layouts, repeated completion, mid-entrance cancellation, seven-card fan, cleanup and menu/Zeno visibility. Screenshots are in `qa/`. These are browser fixtures, not authenticated production accounts or physical-device tests.
- Local fixture: `/loading-azure.html`, mobile wrapper `/loading-azure-mobile.html`. Not part of production Vite entry points. All `/api/` calls in the fixture are synthetic.

## Release

Production is deployed only through `scripts/deploy-guard.mjs production`: common deployment lock, current-main/source ancestry checks, clean committed snapshot, typecheck, full production suite, build, final main/version recheck.

Deployed 2026-10-27 02:22 JST from `b5295ad0fbb91ad4296f5a7ad31bb48278616c31` (includes the approved HOME frame and loading changes). Worker version `0e3685d8-9fca-4057-b785-e696a26a178c`, 100% traffic. The shared guarded release passed client/server typechecks, **238/238** production tests and the production build. See `deployment.json`.

Post-release verification (`served-assets.json`):
- The live page preloads the chosen card and includes the painted first-paint ritual; no numbered loading badge.
- Live card bytes match the source SHA-256 exactly: `c8edc164c945787867646438720720c121136696a30c0e807017a16c21c682f8`.
- The active page's module graph includes the selected `azure-fan` entrance.
- A fresh production browser boot progressed from startup to the login screen with no remaining startup/readiness cover. This browser was signed out; authenticated HOME entry and physical devices were not tested in production.
- Final actual-HOME fixture after integrating the new duel frame: frame ready, zero remaining cover/stage/busy elements, Zeno and menu present. See `qa/latest-home-after-entry.png`. `qa/adopted-loading.png` omits fixture controls for a clean view of the adopted screen.

The initial guarded runs exposed absolute public-art URLs in four Node-only UI test bundles. Three now treat `/art/*` as external static-server resources; the quick-playback behavior test ignores browser CSS. Assertions are unchanged. The 1,143-inspection card-effect UI test also receives the same 300-second host-load allowance as the existing card-reference test. The corrected tests all passed in the final complete deployment guard.

Integration with the concurrently approved HOME duel frame adds external SVG `<image>` artwork to the existing readiness gate. This prevents the new frame/pigment from appearing only after HOME is admitted on a slow connection; local fragment references are excluded. The readiness regression test covers this alongside HTML images and CSS backgrounds.
