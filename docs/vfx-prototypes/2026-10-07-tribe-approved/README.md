# FIX: tribe stage 1 and Origin victory

User selection, 2026-10-07: adopt stage 1 and the Origin victory circle from `codex/tribe-summon-fifteen` at c9de81b0. Other summons and ordinary stages 2/3 are not adopted.

- Frozen approved painter: original stage 1, 1.4 s, 8 px lift at canonical 180 px card width, orange face wash and engraved border. Old stage 3 is used solely for the already-approved victory's source-card illumination.
- Frozen victory: original 4.8 s bronze/gold three-layer engraved circle. No change to design or timing.
- `tribeSynergy` carries public field UIDs, owner, tribe and actual fired threshold. It precedes the reward; no gameplay rule changes. The controller waits after summon, finds current cards and arrival ghosts, then continues reward/outcome.
- Threshold 2 -> approved stage 1. Origin threshold 6 + actual matching win event -> victory. Other thresholds keep existing presentation until selection.
- Same projected card anchors on both sides. Capture canonical faces; no hidden hand data. Lower motion retains tint/seal without floating, rotation or light column.
- Fast-forward, destroy, pagehide, hidden tab, detached card, timeout and texture failures clean up overlays and restore visibility.

Validation: `node tests/tribe-synergy-rules.mjs` (28 fixtures), typecheck, production suite via deployment guard. Browser-only QA: `/tribe-approved.html` runs real engine fixtures through `BaseController`, records max simultaneous rigs and cleanup counts. This dev HTML is excluded from production build inputs.

Local browser observed stage 1 on 2 participants and victory on 6 participants, with overlays/hidden originals returning to zero. Staging delivery and authenticated-game verification must be recorded separately in the release report.

## Release result

- Staging deployed using `scripts/deploy-guard.mjs staging`: source `4803fcf33685737e8c8bb21c1484a438fa8a8259`, Worker version `52a99c14-ae1d-4d32-b085-5800f2958f5f`, 2026-10-07. Included concurrent Brand seal changes before publishing.
- Guard: typecheck, production suite **62/62**, build and latest-source/version checks passed.
- `staging-parity.json`: **45/45** built HTML/JS/CSS files match SHA-256 after normal HTML redirects. Worker version and gh/main were rechecked after deployment.
- `browser-runtime.json`: real `BaseController` + real reducer fixtures, both owners × stage1/victory. Correct participant maxima 2/6, no victory modal during FX, no hidden originals after completion. Timings record overlay lifetime including capture preparation, not just the effect clock.
- Fast-forward during capture/first frame tested separately: overlays and hidden cards returned to zero; no late orphan overlay.
- Approved painter functions were compared against c9de81b0 and are identical (only victory's import path changed).
- Staging browser reached the login screen. **Authenticated staging match replay has not been verified**; the four runtime cases above are local real-controller evidence, separate from deployed bundle parity.

Subsequent commits containing only local QA/reset tools and evidence do not change this deployed runtime source. Revised summons and ordinary stages 2/3 remain solely on the separate preview branch.
