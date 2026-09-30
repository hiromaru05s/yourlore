# Startup and battle rendering optimization — 2026-09-30

Baseline: `9d6221f7` (includes the completed menu, shard, portrait layering and Shield/Dew requests).

## Measured result

Cold production HOME, Chrome at 390×844 / DPR 2, CPU 4× slowdown, 10 Mbps, 40 ms latency. Two fresh-context runs per version, local gzip static server, fixture account/API. Ready time includes the complete opening animation.

| Measurement | Before | After |
|---|---:|---:|
| Mean HOME ready time | 25.83 s | 7.99 s (−69%) |
| Mean encoded response bodies | 26.74 MB | 4.23 MB (−84%) |
| Mean request count | 796 | 52 (−93%) |
| Initial main JS, gzip | 432.96 KB | 313.11 KB (−28%) |
| 15 UI raster files | 20.51 MB | 2.32 MB (−89%) |

Five-second battle samples at 1280×900:

| Main-thread task time | Before | Final after |
|---|---:|---:|
| 14 blocked cards | 0.535 s | 0.220 s (−59%) |
| 7 ready cards plus auras | 0.731 s | 0.615 s (−16%) |
| Same scene, CPU 4× | 2.749 s | 2.122 s (−23%) |

The 14-card sample previously made 4,228 geometry reads, 4,228 computed-style reads and 4,228 stat-canvas clears; each is now zero while idle. Main-thread times vary with host load; the final conservative sample is reported, rather than the faster intermediate run. Frame p95 remained approximately 16.7–16.8 ms on this desktop. These are controlled browser measurements, not actual-phone or WAN performance claims.

## Changes and coverage

| Area | Change | Verification |
|---|---|---|
| Startup artwork | Load shared chrome and visible destination assets; remove all-card/all-cosmetic preload | Two production cold comparisons; 33 menu interactions and entrance regression |
| Initial JavaScript | Load game/controllers/BOT weights at battle entry; isolate tutorial metadata | Production HOME/rules do not fetch game chunk; tutorial advances; BOT plays opening and finishes surrender |
| Load failure/lifecycle | Pending screen can be destroyed; failed module fetch offers full reload | Production failed-download recovery |
| Card frames and seals | Resized lossless WebP derivatives (512px frames, 256px seals) | All originals retained; full-art zoom uses original frame; browser board/menu inspection |
| Persistent card states | Cache geometry until projection/resize/scroll/source mutation, sleep static states and hidden tabs | Static counters zero; resize alignment; highlight invalidation; removal/disposal |
| Actor transforms | Reuse DOM references and matrix operations; avoid repeated style-string setup and empty stat clears | 720 supported pose cases; matching canvas pixels/filters/fragment styles; matrix serialization difference ≤ 1e−7 |
| Animation layers | Allocate full-size canvases only for passes that actually draw | Summon/attack/stat/destruction/drag, reduced motion, interruption and disposal |
| Existing appearance | Preserve pose/timing/filter/effect definitions | Continuous desktop/mobile draw, shuffle, mana and Rift playback; silver-ink production-path regression |

Client/server typecheck and production build/design guard pass. Health/cosmetic regression passes. `art:check` finds all 357 masters; its mtime-based thumbnail warning is expected after worktree checkout (no card art or thumbnail content was changed). The old Node-only `trap-removal-tutorial.mjs` harness fails because its DOM globals omit `HTMLImageElement`; the production-browser tutorial flow is covered separately and passes.

Functional tests and visual checks are separate: transform/effect parity and lifecycle assertions pass; inspected board, menu, resized seals and Rift captures remain readable with the approved art. Raster derivatives are resized, not pixel-identical full-resolution masters.

## Evidence and reproduction

- `summary.json`: compact measurements; `before.json`, `after-final.json`, `startup-comparison.json`: raw metrics and resource list.
- `renderer-regression.json`, `entrance/browser-report.json`, `menu/report.json`, `monster-final/browser-report.json`, `playback/report.json`, `rift/browser-report.json`, `lazy-game/report.json`: regression outcomes.
- `tests/performance-audit-browser.mjs`: source-path profiling. Separate Vite cache prevents another worktree's dependency optimization invalidating the fixture. One earlier run timed out after a concurrent shared-cache restart; the isolated-cache final run passed without browser errors.
- `tests/startup-performance-browser.mjs`: gzip production comparison; configure baseline build path in the script when reproducing.
- `tests/monster-performance-regression.mjs`: baseline/current actor comparison and state lifecycle.
- `tests/lazy-game-browser.mjs`: production navigation, tutorial, BOT and load-failure recovery.
- `scripts/build-ui-rasters.py`: regenerate UI derivatives with Pillow.

Raw profiles, additional PNGs and playback video are retained in the isolated worktree; selected screenshots and JSON evidence are committed. Account/API responses in browser checks are fixtures. Authenticated online/network/security coverage belongs to the separately integrated production audit.

No production deployment or database migration is included. Staging verification is recorded after integration and deployment.
