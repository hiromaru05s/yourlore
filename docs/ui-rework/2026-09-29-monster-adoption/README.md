# Monster animation adoption — 2026-09-29

User selection: summon B (revision 4 motion + revision 5 dust B), ongoing green C. Earlier approvals remain attack A → exhausted B, destruction A with shelf/rift transport, activation B, all buffs B, ready C plus existing red pulse. Debuffs use the paired B direction.

| Request | Runtime integration | Verification |
| --- | --- | --- |
| Summon B + dust B | `ghostSummon`/`flyIntoSlot`, flat projected card, contact at 506 ms | Real controller summon, including same-batch activation |
| Attack A → gray B | `attackStrike`, contact at 270 ms, 820 ms return, held exhaustion | Single callback, multi-attack remains ready |
| Destruction A | Same 16 fragments move to shelf, or dissolve into rift | Controller destroy event for both destinations |
| Activation B | Source UID `monsterActivate` event for summon, turnFx and per-attack effects | Reducer source identity + controller playback |
| ATK / HP / both buffs B | Signed effective stat snapshots; actual numeric values | +3/+4 fixture, ordinary combat damage excluded |
| ATK / HP / both debuffs B | Downward chevrons and compression; mixed signs serialize | Paired decrease fixture |
| Ongoing C | Soft green silhouette, no additional icon | Persistent foreground state on both board sides |
| Ready C + red | Approved chevron/anticipation and 1.1 s red highlight | Hit testing and reorder drag remain usable |
| Cannot attack | Immediate final gray for state restrictions | Exhaustion, hatch, no-attack, no-high, no-direct, low-cost and elite-guard tests |
| Layer ownership | One body-level compositor, z 2147483647; rear/card/front passes | No clipping by board parents; pointer events pass through |

Approved drawing/pose functions were ported from the frozen local comparison directories into `client/src/ui/monster/`. Production does not import prototype sources. Statistics do not mutate authoritative game state. Continuous auras remain a state indicator; triggered presentation events currently come from the common summon, turn and attack pipelines, not text parsing or an exhaustive per-card special-effect catalog.

Lifecycle coverage: cancellation, fast-forward, resize, source removal, reduced motion, view destruction; desktop 1280 and mobile 390. Continuous playback and the saved actual-board screenshots were reviewed separately from these functional assertions. No new artistic variant replaces the selected prototypes.

Build checkout: `/Users/hiromaru05s/.codex/worktrees/monster-animation-staging/LORE_TCG`. The previously deployed menu release `8cc5c974-8378-48fc-b95d-d490a28e4d7a` is preserved. Its 145 source-map entries were compared; only the five intended existing runtime modules differ, and bundled CSS is identical (`baseline-check.json`). Previously published overlay dependencies are retained in the release checkout, separately from this patch's commit (`preserved-staging-sources.json`).

Validation: `npm run typecheck`, `npm run build`, `node tests/monster-animation-rules.mjs`, `node tests/monster-adoption-browser.mjs`. Build retains the existing large-chunk advisory. Staging deployment and deployed-browser results are recorded separately. No production deployment or database migration is part of this change.
