# Rift hover 01 — ivory frame highlight

User approved comparison 01 on 2026-10-26, including numeral positioning and 1.25× hover scale.

Baseline: `b2373586` (latest `gh/main` checked before integration). Authored board geometry and existing Rift surface remain unchanged. Implementation: `client/src/ui/riftFrameHighlight.ts`, `duelTable.ts`, `duelScene.ts`, `riftRecordCount.ts`, and `riftRecordCount.css`.

Only the authored WarmSilver / ChampagneBrass rail regions receive the ivory shader highlight. Both sides are independently driven by the existing Rift button hover/focus state. The existing scene clock redraws during easing; settled frames do not add ongoing redraw work. Disposal restores original materials before ordinary model cleanup. Reduced-motion users receive an immediate state change.

Numeral anchors: own x .712 → .718; opponent x .715 → .718 and z .308 → .305. Glyphs enlarge around their own centers by 25%.

Preview source: `/Users/hiromaru05s/.codex/worktrees/rift-hover-three/LORE_TCG`; comparison URL `http://127.0.0.1:5266/rift-hover-three.html`. Runtime verification server uses unmodified `client/vite.config.ts` on port 5267. Comparison fixtures and alternate effects are excluded from this release.

Regression: `node tests/rift-frame-highlight.mjs` verifies independent sides, easing and settled state, reduced motion, final redraw, unchanged unrelated materials, and idempotent disposal. Production release uses `scripts/deploy-guard.mjs production` for isolated committed build, typecheck, complete production suite, remote-main and deployed-version checks.

Visual comparison approval is distinct from runtime/browser verification; no authenticated PvP or device-performance claim is made here.
