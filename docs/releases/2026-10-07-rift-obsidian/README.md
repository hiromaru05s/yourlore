# 銀刻の黒曜 — selected 01 adoption

User selected rich preview 01 from `bca1550a` on 2026-10-07 for staging.

- `playMonster(...,'destroy',{variant:'B'})` now uses the selected six-piece GPU fracture. The controller already routes destroyed public cards found in the removed zone here, including tokens. Ordinary destruction, decay and hand/quick-card Rift transfers retain their own routes.
- The source is captured from the live card and projected using its board matrix. The same 2.40s black material contracts into a transfer ribbon. GLSL geometry/material and glyph timing retain the approved preview; 39 deterministic pixel comparisons at three sizes and 13 times are exact.
- Shared GPU mesh; independent face textures are released per job. Idle material releases after 30s. Abort, skip, resize, pagehide, hidden page, disconnection and controller disposal clean overlays and restore source visibility. Concurrent jobs reference-count the receiver state together with ordinary hand-to-Rift transfers (`riftActivity.ts`). The mixed-route abort case preserves the remaining receiver until both finish. Reduced motion exits immediately; capture/WebGL preparation failure uses a short DOM fallback.

Validation: `tests/rift-obsidian-browser.mjs` executes real engine reduction through controller playback, for both owners at 1280px and 390px, plus simultaneous jobs, abort, skip, reduced motion and resize. `tests/rift-obsidian-fallback-browser.mjs` verifies WebGL unavailable and controller disposal during playback. `qa/runtime-continuous.webm` is a real-time browser recording; screenshots show the effect on the board. Functional pass and selected visual parity are separate from authenticated online gameplay verification.

The parity test requires the frozen reference checkout or `LORE_RIFT_REFERENCE`; it is intentionally not part of the portable production suite. The local fixture runs on port 5398 and is not a production build entry.
