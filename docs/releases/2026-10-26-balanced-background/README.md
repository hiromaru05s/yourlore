# Balanced background and 15-second bird flights

User approved the 75-target line treatment in `balanced-background-preview.html` and requested production plus a flock about every 15 seconds.

## Implementation

- Current source verified against `gh/main` at `b39a1f63`. HOME/shared menu background, preload and readiness references use `client/public/art/lounge/toon-balanced-20261026/library-wide.webp` and `ivy.webp` exactly as approved. Prompt targets are artistic instructions, not measured uniform pixel contrast percentages.
- Natural clouds remain `toon-soft-20261026/clouds.webp`, with their existing size and motion. Zeno, ivy deformation, daylight, current shared UI, gifts/friends badges are unchanged.
- `client/src/ui/homeDistantBirds.ts`: period 54 → 15 seconds, flight 19 → 11 seconds. First group starts after 4 seconds; subsequent groups start at 19, 34, 49 seconds of active HOME animation. Four birds stagger by 0.34 seconds and fully exit by 12.02 seconds into each period, so resets cannot truncate a visible flight. Alternating direction, flutter/glide, renderOrder 2.5 behind the castle and reduced-motion/hidden-page clock behavior are retained.
- Preview source and generation prompts: [design record](../../ui-rework/2026-10-26-background-balanced/README.md). Local server: `/Users/hiromaru05s/.codex/worktrees/zeno-material-three/LORE_TCG/client`, port 5549.

## Validation

- `tests/home-distant-birds.mjs`: passes consecutive 15-second departures, full exit before reset, alternating direction, paused clock, finite continuous wing geometry and transparent layer order.
- `tests/zeno-toon.mjs`: passes existing toon material/deformation/disposal checks.
- `tests/home-atmosphere-browser.mjs`: passes actual HOME rendering at four viewport sizes, changing clouds/daylight, frozen reduced motion, hidden document, repeated HOME reentry, context loss, no-WebGL and delayed asset lifecycle.
- `check-home.mjs` records actual HOME using synthetic API responses, verifies loaded architecture/ivy/cloud paths, captures 36 seconds of motion and desktop/mobile screenshots. No real account mutations.
- Full guarded release and production evidence to be appended after deployment.

## Production confirmed

- Deployed 2026-10-26 19:47 Asia/Seoul: source `ecadb50edab44fc50488fa52a65e2f3f01f0c529`, containing this feature commit `70a4b4a732330f868cb207a05c5a0ebb72075e29`.
- Shared guarded release completed from the concurrent Goblin release worktree after integrating current main. Validation: client/server typecheck, 228/228 production checks, design guard and clean build. Earlier attempts stopped on a stale cache test expectation (fixed upstream in `8dc968b4`) or changing main, and were not deployed.
- Independent read-only Wrangler verification: deployment `b19d78bf-141e-4e7d-bbf4-20f6801c1197`, Worker version `1ff4d48f-2bb7-4e9b-a28d-9e1ce0457fe0`, 100% traffic. See [deployment.json](deployment.json).
- Captured the exact committed release build before snapshot cleanup. Production parity: **152/152** HTML/JS/CSS/JSON/background files match SHA-256, including the unchanged cloud image. See [asset-parity.json](asset-parity.json).
- Production HOME browser checks pass with actual public assets and synthetic API fixtures, including 36 seconds of animation, loaded art paths/hashes, desktop/mobile sizing and zero page errors. [Browser results](qa/production/checks.json), [desktop](qa/production/home-desktop.png), [next flock](qa/production/birds-next-flock.png), [motion recording](qa/production/home-motion.webm).
- Visual review confirms the approved stronger outlines and small birds visible against the sky while architecture occludes them. Flight interval/exit/wing continuity is also covered by the behavioral test; production timing code is identical to the validated release build.
- Scope limit: synthetic account responses; no real user-account or real-device interaction claim. This release changes HOME art/cadence, not online battle behavior.
