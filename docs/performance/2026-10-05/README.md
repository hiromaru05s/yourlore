# Animation rendering optimization — 2026-10-05

Baseline: `8b58cffe`, including the selected twin-script Rift, slate summon and
blue spell-frame resonance. This work continues the October 2 optimization;
those earlier mimic/board changes remain intact. No resolution, shader noise
layers, geometry detail, color, bloom, playback cadence or timeline was reduced.

## Changes

- Summon dust skips procedural noise only outside its mathematically zero-density
  boundary (`r >= 1.85`). Uniform locations are resolved once.
- Concurrent/repeated summons share one dust GPU context and shader, copying each
  result into the caller's own canvas. Reference-counted release retains it for
  30 seconds, then frees it. Lost contexts are replaced on the next acquisition.
- The adopted summon no longer constructs the unused legacy dust texture and
  tinted copies. The comparison preview constructs them only if requested.
- Rift skips card-material noise at zero card alpha, and skips folded flow before
  its exact zero-opacity onset. Its contour halo, folded laminae and glint remain.
- Spell-frame masks reuse an immutable CPU canvas keyed by the frame URL, exact
  art stencil and exact cost-seal geometry. Four-entry LRU/30-second idle limits
  bound retention. Each scene still owns and releases its own GPU texture.

## Measurements

Chrome on this machine, repository lockfile dependencies. Eight alternating
before/after batches; identical sizes/times. Each material frame ends with a
synchronous 1-pixel GPU readback so queued draws cannot be discarded/coalesced.
These are completed draw + synchronization timings, not pure GPU timer-query
results, full-game FPS, or universal device guarantees.

| Operation | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| Selected summon dust, 60 frames at 450×450 | 83.45 ms | 29.65 ms | 64.5% |
| Rift material, 60 frames at 640×777 | 134.60 ms | 62.75 ms | 53.4% |
| Repeated spell mask preparation, per call | 22.75 ms | 0.15 ms | 99.3% |

The mask figure is a warm-cache result; the first mask with new stencil geometry
still performs the original full-resolution construction. Two batches of three
simultaneous summons on the real board allocated one dust context instead of six.

Raw samples: `materials.json`, `spell-mask.json`, `summon-resources.json`.
Timing varies with unrelated host activity; repeated alternating measurements
consistently favored the optimized materials. The idle board's code was not
changed here, so the lower idle CPU time in `after.json` is not credited to this
patch. Its 14-card / seven-ready-card / 4× CPU checks had p95 <=16.8 ms, no layout
reads per idle frame and no page errors.

## Visual and lifecycle evidence

- 432 shader image comparisons: all six dust variants, three resolutions, two
  Rift aspect ratios, sampled phases, white and dark backgrounds. At most 1/255
  channel rounding difference at a few boundary pixels (maximum mean difference
  0.00000411 on a 0–255 scale). This is not bit-exact shader rasterization; no
  detail or quality parameter was reduced.
- 32 complete summon-renderer frames, including legacy comparisons: exact pixels.
- Five spell-mask transform cases: exact pixels. Distinct GPU textures, stencil
  invalidation, LRU eviction and idle expiry verified.
- Shared dust remains valid while another user exists; repeated release, idle
  disposal and replacement after context loss verified.
- Real board continuous playback: three simultaneous summons on both sides,
  one impact callback each, abort/skip/resize/hidden cleanup, both-side Rift,
  390px summons, reduced motion, normal/quick spells on both sides. No page errors.
  Recorded runs had p95 16.7–16.8 ms; these recordings are functional playback
  evidence, not a controlled before/after FPS comparison.
- Screenshots and continuous video are retained in this worktree's `playback/`.
  The recorded contact shadow, slate fragments, twin glyph rings and sharp blue
  frame remain registered to the actual cards. User visual approval of a new
  design is not being claimed; this preserves the existing selected designs.

Commands: `node tests/material-performance-browser.mjs`,
`node tests/animation-material-playback-browser.mjs`, and
`LORE_PERF_BOARD_ONLY=1 LORE_TEST_OUTPUT=docs/performance/2026-10-05 node tests/animation-performance-browser.mjs after`.

## Release verification

Local typecheck, production suite (54/54), and build passed. Source SHA and
deployed asset verification are recorded below after upload. Staging uses the existing guarded snapshot
release; production is outside this request. Browser checks use fixture API/game
state and do not claim an authenticated online match.
