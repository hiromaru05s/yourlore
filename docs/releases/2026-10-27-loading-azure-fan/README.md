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

Deployment result and served-asset verification are recorded separately after release.

The initial guarded run exposed absolute public-art URLs in three Node-only UI test bundles. Those bundles now treat `/art/*` as external static-server resources; assertions are unchanged. The 1,143-inspection card-effect UI test also receives the same 300-second host-load allowance as the existing card-reference test. All three corrected tests passed individually before rerunning the complete deployment guard.
