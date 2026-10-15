# Loading and gameplay performance — 2026-10-15

## Scope

Preserve original image bytes, fonts, model geometry, shader materials, render density, antialiasing, animation timing and BOT decisions. Front-load gameplay resources so visible cards and effects do not wait for downloads. No rule or BOT strength changes.

- 1,971 public resource URLs are indexed into 62 immutable packs (approximately 4 MiB each); identical bytes are deduplicated. Every extracted entry is length/SHA-256 verified. Sparse updates fetch individual originals. Cache keys are scanned once, with old/new live-client isolation, bounded work, quota fallback and retry retained.
- Include missing duel images and control icons, all public CSS backgrounds/cursors, dynamic game/VFX code and styles, Worker scripts, imported images, responsive board models, 42 original sound effects, music and fonts. Vendor the exact 619 original WOFF2 subsets (20,842,096 bytes), with provenance and original OFL licenses, eliminating the external font dependency. Warm localized glyphs before gameplay.
- Persist exact 640×400 furniture catalog previews and encode asynchronously; invalidate on source/material/model revisions.
- Move spell stencil and full-resolution celestial matte pixels to an OffscreenCanvas worker, retaining the exact main-thread fallback. Reuse one idle spell renderer, compile before the duel cover opens, and independently own simultaneous casts.
- Precompile the original draw-stock materials under the opaque duel cover and reuse one renderer during the match. Simultaneous draws share it, viewport/density changes invalidate it, and idle resources are disposed after leaving the match or on pagehide. No per-draw context recreation; original geometry, shadows and shading are retained.
- Recover a delayed service-worker activation with a retryable timeout instead of permanently falling back to hundreds of individual image requests. A retry test verifies activation recovery.
- Limit HDR board invalidation to furniture/structure changes. Skip occluded HOME ambient ticks and redundant progress writes. Preserve all renderer options while avoiding production-only synchronous GPU diagnostic readbacks; development diagnostics remain enabled.
- Do not decode hidden lazy tutorial chapter images during visible-screen admission. This removed a reproducible 20-second wait (final measured tutorial admission: 286 ms desktop, 288 ms narrow); visible images still load/decode before admission.

## Comparable local measurements (60-pack iteration)

Chrome headless, DPR 1, 900 px height, 40 ms simulated network latency, unlimited bandwidth, no CPU throttle; actual production bundles, assets and normal guest BOT route, API fixture only. Baseline source `14647025`. Each result is a single controlled run, not a statistical device/network guarantee. A shared-host overload run was excluded and no baseline timing from that run is used.

| Metric | Before, 1280 px | After, 1280 px | Change |
| --- | ---: | ---: | ---: |
| Initial HOME ready | 19,027 ms | 9,159 ms | 51.9% shorter |
| Reload HOME ready | 7,863 ms | 5,186 ms | 34.0% shorter |
| Cold network transfers | 1,326 | 212 | 84.0% fewer |
| Transfers on duel entry | 11 | 0 | Ready before entry |
| Transfers after duel readiness | 2 | 0 | No late transfer in sample |

390 px: initial HOME 8,441 ms, reload 4,879 ms, cold transfers 191. Both widths: no broken images, page errors or HTTP errors; game asset transfers after entry were zero in page CDP, service-worker-originated requests **and the local HTTP server log** (excluding the browser's mandatory service-worker update check). All sampled p95 frame intervals were ≤16.8 ms. Desktop BOT activity still recorded 51/53 ms main-thread tasks; do not claim universal zero dropped frames.

Cold transfer bytes increase because more original-quality gameplay assets, CSS fallback artwork and fonts are prepared up front. This is request/latency/CPU optimization and earlier readiness, not an 84% reduction in bytes. The initial byte cost is paid once per content version and persistent cache reuse is verified. Bandwidth-constrained cold starts can therefore differ substantially from these latency-focused local results. Random opening state/BOT first turn changes cinematic duration; `duelMs` and cross-run GPU draw counts are not like-for-like speed comparisons.

`local-before.json` / `local-after.json` contain the raw comparable traces. `intermediate-local-after.json` preserves the earlier iteration: its page-only network counter could not see service-worker fallback requests. The stricter check found and fixed 14 CSS/control requests, late effect CSS and Worker loads. Final local checks observe both the service worker and the actual server. `menus.json` separately records the hidden-lazy tutorial fix (286/288 ms) and menu navigation.


## Quality and regression evidence

- `draw-stock-parity.json`: all 8 original/current stock poses at 1280/390 px have zero differing RGBA channels. Warm-up is invisible; stage reuse, simultaneous owners, double-release safety and pagehide disposal pass. Same-run first draw/render setup: original 44–74 ms, warmed 1.2–3.0 ms (shared-host timing, not a universal latency guarantee).
- `build-inventory.json`: 1,971 resources, 62 packs, 84 preloaded modules, 6 styles and 3 workers; no missing literal public asset or emitted worker in the duel graph.
- `raster-parity.json`: original vs worker stencil and 1536 px matte have zero differing channels; rendered spell frames at 0, 800, 1600, 2600 and 3200 ms are pixel-identical. Idle renderer reuse, independent simultaneous casts, cleanup and no page errors verified.
- `playback.json`: draw, shuffle, mana and rift on both sides; simultaneous mana, desktop/mobile, reduced motion and renderer disposal passed. Visual playback reviewed separately from functional assertions.
- `cache-upgrade.json`: old live tab remains usable when the v3 worker takes control; new cache binding and furniture previews survive reload; repeat preload transfers are zero.
- `menus.json`: HOME/BOT selection/cards/page/zoom/deck/shop/furniture/ranking/friends/profile/tutorial/HOME/reload on both widths. No visible image defects or post-admission network image bytes. HOME canvas reused.
- Deterministic production tests include pack integrity/corruption/sparse repair/404 fallback, exact font SHA/license checks, renderer policy, furniture mutation filtering and hidden lazy chapter admission.

Final staging source, suite and live verification will be recorded after the final release. The runtime includes concurrent v58 BOT changes from current main; the optimization itself does not alter BOT decisions. Fixture gameplay is not an authenticated online multiplayer claim.

## Live slow-network correction

The first staging browser run exposed four 4 MiB pack requests cancelled at the original 60-second image deadline; completed packs on that browser connection took roughly 45–51 seconds. That is recorded in `staging/initial-slow-network.json`. The final runtime allows bounded 180-second pack transfers, so a slow larger transfer is not prematurely discarded and restarted as dozens of originals. Individual-file requests retain their 60-second deadline. Final staging browser checks reuse one browser cache across desktop and narrow pages; narrow cold behavior is covered by the separate local run.

The subsequent live check also found large imported images hitting a 60-second deadline, optional sound effects still downloading individually, 14 CSS/control image fallbacks and one late effect stylesheet. `staging/intermediate-gameplay.json` / `intermediate-asset-timeout.json` preserve those failed intermediate checks (including one manual retry; their elapsed times are not unattended load benchmarks). The final implementation includes all of those resources before admission and gives large imported images a bounded 180-second transfer window.
