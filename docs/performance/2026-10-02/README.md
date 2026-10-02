# Animation performance — 2026-10-02

Baseline: `7cc9ed17` (six adopted mimic reveals, approved opening and turn banner).
Work is isolated from the main checkout's ongoing prototype edits. No animation
selection, timing, resolution, polygon count, lighting, texture or normal-motion
quality setting was reduced. The fixed silver-ink Rift path is unchanged.

## Changes

- Merge rigid opaque crown/claw parts by material before playback. The authored
  mesh detail, UVs, material and parent motion are retained.
- Reuse tongue deformation vectors and fixed ring trigonometry, and calculate
  the spine once per frame. Float32 deformed vertices and normals remain exact.
- Reuse the mouth pose and jaw trigonometry without changing its 90 texture strips.
- Compile mimic shaders asynchronously before the existing warmup/reveal; retain
  readiness, timeout, cancellation, native landing and fallback behavior.
- Stop writing unchanged board widget attributes/custom properties and dust counts;
  reuse the grayscale color temporary. Board shading/refresh cadence is unchanged.

## Measured mimic results

Chrome, locked repository dependencies, same page and warmed renderers. Six
alternating before/after batches of 120 frames, 1000–1952 ms. CPU figures below are
median synchronous frame generation/submission time, not GPU completion or FPS.

| Reveal | Draw calls at 1400 ms, before → after | CPU ms/120 frames, before → after | Reduction |
| --- | --- | --- | --- |
| MIMIC2 | 2 → 2 | 55.25 → 43.10 | 22.0% |
| MIMIC_LORD | 1 → 1 | 20.40 → 16.20 | 20.6% |
| AWAKENED_MIMIC | 21 → 9 | 25.95 → 18.60 | 28.3% |
| MIMIC_KING | 68 → 8 | 32.50 → 18.10 | 44.3% |
| MIMIC_KING2 | 66 → 6 | 37.95 → 22.15 | 41.6% |

The basic MIMIC uses only the mouth/DOM rig, so the 3D table does not apply.
Its mouth optimization is covered by the exact pixel comparisons below.

`mimic-parity.json` records all samples, mesh/triangle equality and image comparison.
The crown/claw bake can change a handful of edge color channels through floating
point transform/rasterization rounding (maximum 7/255 in one channel; maximum
mean error 0.0000062 on the 0–255 channel scale). All comparison images retain the
same detail and coverage; this is not a texture, geometry or resolution reduction.

## Quality and lifecycle validation

- 180 frozen approved movement poses: unchanged.
- 70 3D time/reduced-motion comparisons: deformed vertex and normal errors 0;
  triangle counts unchanged; stringent pixel-difference limits passed.
- 84 mouth/DOM comparisons across all six IDs: exact pixel and pose-style equality.
- 720 existing monster-state comparisons: matrix and surface equality; static
  states do not read layout or clear canvases; resize/highlights/cleanup verified.
- 19 controller/lifecycle checks passed, including all six reveals on both sides,
  hand API, skip/resize/hidden/dispose, reduced motion and WebGL fallback.
- Normal mobile playback on both sides and concurrent awakened/royal reveals
  passed; both sources restored and no effect nodes remained.
- Functional playback report, screenshots and continuous video are saved under
  `playback/`. This is a real board/controller with fixture state, not an
  authenticated online match or new user visual approval.

Full-board 5-second profiling covered idle 14-card and seven-ready-card boards,
including 4× CPU throttling. Final `after-final-board.json` retained p95 16.7 ms
and zero layout passes. CPU wall time varied between runs; no overall-board
speedup is claimed. Candidate monster placement caching/attribute changes were
rejected after slower full-board measurements. Earlier `after*` profiles include
those rejected candidates; `after-final-board.json` is the retained implementation.

The main checkout's installed dependency versions differed from the lockfile.
Only locked-dependency results above are release evidence. Early `before.json`
and `after.json` are exploratory; do not compare them to the final release.

## Reproduce

```sh
npm ci --no-fund
node tests/mimic-performance-browser.mjs
node tests/animation-state-parity-browser.mjs
LORE_PERF_BOARD_ONLY=1 node tests/animation-performance-browser.mjs before-verify
LORE_PERF_BOARD_ONLY=1 node tests/animation-performance-browser.mjs after-current
# Run the client at 127.0.0.1:5396, then:
node tests/animation-playback-browser.mjs
node tests/animation-mobile-concurrency-browser.mjs
```

Browser tests accept `PLAYWRIGHT_MODULE`; the default is the bundled Codex runtime.
Run timing measurements without other test processes. Saved CPU profiles, videos
and PNGs are local QA artifacts; the compact JSON reports are versioned.

## Release

Staging: https://test.yourlore.xyz/

- Deployed source: `49f1b8bc40c63c1546d8bbf137ed61a824987f76`.
- Worker version: `9ebf3c29-de8c-4691-b121-6945355fe417`.
- Guarded committed snapshot passed typecheck, 52/52 production tests and build.
- 21 deployed HTML/JS/CSS files exactly match the verified local build (SHA-256).
- Deployed BOT board passed desktop/mobile cached-draw budget; no page errors.
- Deployed silver-ink source projection, normal completion and cleanup passed.
- Authentication/API responses were fixtures; no authenticated online-match claim.

The staging browser helper was updated for the adopted BOT challenge/start flow.
Its old `--disable-quic` override stalled artwork loading in this environment;
using Chrome's standard transport completed the same live-origin checks.
`staging/initial-network-failure.json` preserves that unsuccessful attempt.

Staging deployment and deployed-asset/BOT verification are recorded in `staging/`.
Production was not deployed.
