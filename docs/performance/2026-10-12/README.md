# BOT startup and responsiveness — 2026-10-12

Baseline source: f5531ec3. Preserve all authored resolution, geometry, materials,
particles, timelines and BOT search budgets. This work is isolated from the
uncommitted changes in the primary checkout.

## Changes

- Local BOT decisions execute in a persistent module Worker. The shared
  `botDecide` implementation and difficulty/search parameters are unchanged.
  Supersession, surrender and screen destruction cancel obsolete work; a state
  identity check rejects late replies. Unsupported Workers retain the old policy.
- The 24-frame purchase air density/light calculation executes in a short-lived
  Worker and transfers its Float32 buffers. One immutable 1.67 MiB field cache
  avoids rebuilding on rematches. Canvases remain independently owned and released.
  Cancellation stops the worker; unsupported Workers yield between exact frames.
- Readiness no longer explicitly downloads/decompresses backgrounds on elements
  with no layout boxes (hidden legacy furniture/atlases). Actual reveal frames,
  masks, portraits, visible card art and board completion remain gated.
- Six full-resolution PNG delivery assets use lossless WebP. Originals remain
  available. Visible RGB and alpha compare exactly at every pixel (RGB beneath
  alpha zero is immaterial). 11,308,632 → 8,870,254 bytes: 2,438,378 bytes / 21.56%.
  Coin-frame conversion was rejected after Chrome canvas comparison detected
  different RGBA output; those PNGs remain unchanged.
- Replacement board materials register before retired materials are disposed,
  retaining shared GPU programs across deck/shelf count changes. Retired geometry
  and materials are released after the same render, or at scene disposal.
- Dice and spell-frame shader/bloom preparation waits for asynchronous compilation
  before starting the authored animation clock.
- Production board, flight, opening, coin, dice and spell renderers skip Three's synchronous
  shader diagnostic log queries. Development retains the checks. Shader source,
  lighting, antialiasing, raster density and effects are unchanged.

## Evidence

- `bot-worker.json`: 24 decisions across four difficulties and twelve decks,
  identical seeded actions and unmodified input; cancellation, supersession,
  worker reuse and fallback verified. Worst synchronous decision in this run:
  2993 ms. Worker execution allowed the caller event loop to keep progressing.
- `air-parity.json`: all 437,760 density/light floats exactly match the original
  implementation, across all 24 frames.
- `air-worker.json`: transfer parity, cancellation, rematch cache and fallback.
- `lossless-assets.json`: per-file dimensions, byte savings and pixel comparison.
- `worker-first-startup.json`: before loading optimizations, already with BOT
  worker; cold local Chrome, 1280×900/DPR 2, API fixture, real controller and board.
  HOME 8.67 s, 3D scene 20.38 s, playable 34.36 s, 47.74 MB encoded resources.
  This run's third skipped turn required hand-cap discards; it is not a passed
  three-turn scenario. The final browser harness deliberately exercises two turns
  and then surrender/return home.

This host was running several simultaneous builds. Wall-clock/frame comparisons
are diagnostic samples, not device-independent promises. API-fixture BOT coverage
is separate from authenticated online match proof.

## Local browser verification

- Production Chrome: two complete HELL BOT turns, surrender, HOME return, no page
  errors and no remaining match workers. `final-turns.json` records p95 16.8 ms,
  maximum 1966.6 ms (first-use GPU work still exists); this does not mean every
  effect/frame is stall-free. Different random BOT choices and host load prevent
  treating turn timing as a controlled percentage comparison.
- Final readiness-only rerun: HOME 4.96 s, scene 2.05 s, playable 9.95 s. The earlier
  sample was taken under much higher host contention, so the wall-time delta is
  not an isolated causal benchmark. Opening choreography was not shortened.
- Unique artwork resources fell **34,235,272 → 28,146,800 bytes (17.78%)**.
  No legacy deck/shelf/rift atlas or original seeker PNG requests remained.
  All-resource encoded sizes must be deduplicated: Resource Timing includes
  cached resource bytes and music completion varies with sampling time.
- `browser-pixels.json`: Chrome canvas confirms identical rendered RGBA for all
  six adopted PNG/WebP pairs. The two coin PNGs are deliberately retained.
- Spell lifecycle tests retain the full 640 ms shader playback, reduced motion,
  cancellation during loading/playback, replacement, resize and disconnection.
- Client and server typecheck passed; production Vite build passed.
- 390×844/DPR 2: complete HELL BOT turn, surrender and HOME return also passed,
  no page errors or remaining workers (`mobile-startup.json`, `mobile-turns.json`).
- The final quiet-host BOT parity rerun (`bot-worker-final.json`) measured a maximum
  synchronous decision of 111.9 ms versus 2993 ms under earlier host contention;
  both runs verify identical decisions. This illustrates why the CPU occupancy
  removal and asset bytes, rather than the wall-time ratio, are the firm claims.

## Slow-network correction found on staging

The first deployed build passed all 93 tests and 62 exact asset hashes, but a
real-network browser run stopped at HOME `43 / 47` images with a manual retry
button. No JavaScript exception occurred. Four image loads had not completed. The original 20-second decode deadline and
immediate manual-retry gate made a slow/transient response sufficient to strand
the screen; that first run did not record per-image error URLs. This is a separate startup blocker from
GPU/AI work, not a successful staging gameplay check.

Shared image transfers now allow 60 seconds. A caller's 20-second readiness
window does not cancel that transfer; it rejoins the same in-flight decode. Two
automatic recovery rounds precede the explicit retry button, so genuine failures
remain bounded and cancellable. `asset-readiness-retry.mjs` verifies transient
recovery, bounded persistent failure, cancellation, and no restarted slow transfer.

## Final staging release

- Source `1189fad9ef61365a90c8ea60ee3059667878665d`, Worker version
  `e465bed4-3f4c-4d54-9b02-d7a13aa3d6ab`, 100% traffic at https://test.yourlore.xyz.
- Guarded clean-snapshot client/server typecheck, **94/94** production tests,
  design guard and production build all passed.
- All **62** captured release-snapshot HTML/JS/CSS/Worker/image SHA-256 hashes
  match the live deployment (`staging-assets.json`).
- On the slow real-network run, HOME recovered without any manual retry
  (70.9 s). BOT scene preparation exceeded the browser test's 120-second limit
  at `40 / 70` images, with no page exceptions or image decode failures recorded.
  A longer attempt also showed very slow resource progress; it was stopped.
  **Staging BOT gameplay is not claimed verified.** Local production-bundle BOT
  progression on desktop/mobile passed as described above; authenticated online
  play is outside this evidence.
- `deployment.json` records exact versions and these verification boundaries.
