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
