# Loading and gameplay performance — 2026-10-15

## Scope

Preserve original image bytes, fonts, model geometry, shader materials, render density, antialiasing, animation timing and BOT decisions. Front-load gameplay resources so visible cards and effects do not wait for downloads. No rule or BOT strength changes.

- 1,889 public resource URLs are indexed into 54 immutable packs (approximately 4 MiB each); identical bytes are deduplicated. Every extracted entry is length/SHA-256 verified. Sparse updates fetch individual originals. Cache keys are scanned once, with old/new live-client isolation, bounded work, quota fallback and retry retained.
- Include missing duel images, dynamic game/VFX code, imported images, responsive board models, music and fonts. Vendor the exact 619 original WOFF2 subsets (20,842,096 bytes), with provenance and original OFL licenses, eliminating the external font dependency. Warm localized glyphs before gameplay.
- Persist exact 640×400 furniture catalog previews and encode asynchronously; invalidate on source/material/model revisions.
- Move spell stencil and full-resolution celestial matte pixels to an OffscreenCanvas worker, retaining the exact main-thread fallback. Reuse one idle spell renderer, compile before the duel cover opens, and independently own simultaneous casts.
- Limit HDR board invalidation to furniture/structure changes. Skip occluded HOME ambient ticks and redundant progress writes. Preserve all renderer options while avoiding production-only synchronous GPU diagnostic readbacks; development diagnostics remain enabled.
- Do not decode hidden lazy tutorial chapter images during visible-screen admission. This removed a reproducible 20-second wait (final measured tutorial admission: 286 ms desktop, 288 ms narrow); visible images still load/decode before admission.

## Comparable local measurements

Chrome headless, DPR 1, 900 px height, 40 ms simulated network latency, unlimited bandwidth, no CPU throttle; actual production bundles, assets and normal guest BOT route, API fixture only. Baseline source `14647025`. Each result is a single controlled run, not a statistical device/network guarantee. A shared-host overload run was excluded and no baseline timing from that run is used.

| Metric | Before, 1280 px | After, 1280 px | Change |
| --- | ---: | ---: | ---: |
| Initial HOME ready | 19,027 ms | 11,627 ms | 38.9% shorter |
| Reload HOME ready | 7,863 ms | 5,794 ms | 26.3% shorter |
| Cold network transfers | 1,326 | 244 | 81.6% fewer |
| Transfers on duel entry | 11 | 0 | Ready before entry |
| Transfers after duel readiness | 2 | 0 | No late transfer in sample |

390 px: initial HOME 10,069 ms, reload 5,549 ms, cold transfers 224, duel-entry/post-readiness transfers 0. Both widths: no broken images, page errors or HTTP errors; idle/play/BOT 5-second samples had p95 frame intervals ≤16.8 ms and no main-thread long tasks. One desktop BOT frame exceeded 50 ms; do not claim universal zero dropped frames.

Cold transfer bytes increased from 160.1 MB to 219.0 MB (desktop), because more original-quality gameplay assets and fonts are prepared up front. This is request/latency/CPU optimization and earlier readiness, not a claim of an 82% reduction in bytes. The initial byte cost is paid once per content version and persistent cache reuse is verified. Cold loading on bandwidth-constrained networks can therefore differ from these latency-focused results. Random opening state/BOT first turn changes cinematic duration; `duelMs` and cross-run GPU draw counts are not like-for-like speed comparisons.

`local-before.json` / `local-after.json` contain raw resource traces and sample details. The final hidden-lazy-image fix was applied after that measured build; `menus.json` records the final menu build separately.

## Quality and regression evidence

- `raster-parity.json`: original vs worker stencil and 1536 px matte have zero differing channels; rendered spell frames at 0, 800, 1600, 2600 and 3200 ms are pixel-identical. Idle renderer reuse, independent simultaneous casts, cleanup and no page errors verified.
- `playback.json`: draw, shuffle, mana and rift on both sides; simultaneous mana, desktop/mobile, reduced motion and renderer disposal passed. Visual playback reviewed separately from functional assertions.
- `cache-upgrade.json`: old live tab remains usable when the v2 worker takes control; new cache binding and furniture previews survive reload; repeat preload transfers are zero.
- `menus.json`: HOME/BOT selection/cards/page/zoom/deck/shop/furniture/ranking/friends/profile/tutorial/HOME/reload on both widths. No visible image defects or post-admission network image bytes. HOME canvas reused.
- Deterministic production tests include pack integrity/corruption/sparse repair/404 fallback, exact font SHA/license checks, renderer policy, furniture mutation filtering and hidden lazy chapter admission.

Staging deployment, exact guarded-build parity and live smoke evidence will be appended after release. Local fixture gameplay is not an authenticated online multiplayer claim.

## Live slow-network correction

The first staging browser run exposed four 4 MiB pack requests cancelled at the original 60-second image deadline; completed packs on that browser connection took roughly 45–51 seconds. That is recorded in `staging/initial-slow-network.json`. The final runtime allows bounded 180-second pack transfers, so a slow larger transfer is not prematurely discarded and restarted as dozens of originals. Individual-file requests retain their 60-second deadline. Final staging browser checks reuse one browser cache across desktop and narrow pages; narrow cold behavior is covered by the separate local run.
