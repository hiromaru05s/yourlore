# Gacha entry and loading — 2026-10-23

The draw controls were below the promotional banner and outside the initial viewport at 320×640 and 844×390. The opening also waited for assets used only by the obsolete sample rewards, even though production now presents confirmed rewards in its separate reward stage.

## Changes

- Desktop places a dedicated purchase area beside the collection artwork. Mobile and short landscape place it first, showing the balance, explicit draw labels, and prices without scrolling. Rates, lineup, and history remain available.
- Collection readiness independently enables purchases. A slow profile no longer blocks draws or rebuilds an active cinematic when it finishes. Server prices, rates, request IDs, pending recovery, and grant authority are unchanged.
- The production opening retains reward pose math for the page/light motion but does not construct or download sample avatar, sleeve, or furniture models. Preview callers retain the sample path by default.
- The shop prepares the opening module and cover after its initial paint, sharing one decoded cover across repeated draws. No WebGL context is allocated by prewarming. Failed preparation is retryable; reduced-motion users skip it.
- Actual book/background geometry, cover image, resolution, lighting, shadows, optical shaders, timeline, and distinct confirmed-reward stages remain unchanged.

Placement considerations: a footer keeps the small-screen problem; a bottom fixed bar competes with the approved navigation; embedding controls over the card obscures artwork; an extra draw modal adds a step. The chosen adjacent desktop / leading mobile arrangement keeps the action visible without another layer. This is the implementation selected for the user's explicit redesign-and-production request, not a claim of a new user-selected visual comparison.

## Evidence

Cold cinematic benchmark, same local server/assets/browser, 10 Mbps downlink and 80 ms latency, fresh browser contexts, without prewarming:

| | Before | After |
|---|---:|---:|
| Opening ready | 14,716 ms | 6,507 ms |
| Opening asset bytes | 11,737,583 | 3,829,514 |

Measured wait decreased 56%; transferred assets decreased 67%. These are lab observations, not a universal device/network guarantee. The cover is still the original full-quality image.

- Actual application route and production build: draw buttons visible at 1280×900, 1280×720, 844×600, 390×844, 320×640, and 844×390; no obsolete model/avatar requests or browser exceptions.
- A held profile response does not block drawing; releasing it during the cinematic does not tear down the result. Entering/prewarming performs no draw; one click yields one receipt.
- Reward fixture regression: all four reward types, all ten furniture and sleeve families, three animated card effects, ten-result navigation, overview, history/inspection, normal intro, skip, Escape, reduced motion, and four viewport sizes.
- Delayed card-frame transport still hides incomplete cards until the full face is ready.
- Visual self-review: mobile and landscape controls are legible and unobstructed; recorded intro/reward playback and sampled sequence frames retain the authored presentation. No new VFX art was created.

API fixtures verify presentation and purchase plumbing, not a real user's balance-consuming purchase. Local videos and full screenshot sets are in `/tmp/lore-gacha-rewards-after`; compact evidence is in `qa/`.

Reproduce: `node tests/gacha-loading-benchmark.mjs` (set `LORE_TEST_ORIGIN` to the Vite server); `node tests/gacha-entry-loading-browser.mjs`; `node tests/gacha-rewards-browser.mjs`. Browser tests accept `LORE_TEST_ORIGIN` and `LORE_TEST_OUTPUT`.

Validation before release: typecheck and production build passed; production suite 201/201 passed. The guarded deployment repeats the required validation on its committed snapshot.
