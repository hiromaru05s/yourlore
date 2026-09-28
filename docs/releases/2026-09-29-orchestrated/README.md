# 2026-09-29 staging integration

Coordinator: `01a0e9ed-c169-7b33-9251-2c7173f0fd51`.
Base: `e79d6a7f93d9e6b69e935be6c80d3464205501b3`.
Target: `https://test.yourlore.xyz` (`lore-server-staging`).

## Included approved changes

| Change | Source task / commit |
| --- | --- |
| Passive v2 icons, localized names and frost highlight 3 | `01a0e9a7-81d7-74c0-827c-b8b798886c30` |
| Turn light 1, porcelain | `01a0e9a7-bc9e-7203-a1cf-e9baa839b1c4` |
| Quest fold 2, final reveal capped at 240px / 44vh | `01a0e997-19f4-77e0-8eb0-2f57fd65b608` |
| Mana facet-swift 1 | `01a0e26a-9dfe-7650-88a8-99acf59176d3` |
| Full-color discard hand and graveyard shelf guide | `57db203` |
| Shelf return 3, portal-echo | `7a97dd2` |
| Dew / temporary Shield, 16 new cards and 11 reworks, 48 revised art files | `68c8251` |

Existing recessed board and silver inscription Rift are preserved. Unselected
result-screen / monster variants and comparison tools stay in the shared worktree.
The release was assembled in an isolated worktree. Shared imports, render passes,
disposal and styles were merged to retain all seven approved changes. The local
shared worktree's independent work is preserved separately from the release.

## Validation

Client/server typecheck and production build pass. Text validation covers 360
cards in three languages with zero violations. All card masters are present;
checkout mtimes produce thumbnail-staleness warnings, not missing art. The 48
new art files retain the handoff manifest hashes.

`regression/results.json` records 14 passing regression scripts, including Dew /
Shield engine scenarios, real GameRoom with two simulated sockets, quest/quick
playback, hand/board UI and both shelf-return trajectory tests. The old maximum
HP-bar test was corrected to assert current HP and absence of the retired bar.

`quest-integration-qa/` records normal-clock playback, concurrent folds and hidden
cancellation with zero browser errors. Its continuous frame sheet was inspected;
this early recording preceded the final reveal-size correction. Source-task QA
is retained separately and is not represented as new integration testing.

`production-local-final/` and `staging/` contain final production-build smoke tests
and asset hash checks when complete. Browser login/BOT tests use account API
fixtures. Real GameRoom tests are local; no authenticated online staging match is
claimed. Functional checks and visual approval are separate; the selected designs
retain their source-task approvals.

Published successfully from source commit `1157300` to staging only. Worker version
`366ec090-a02a-4b9e-b3fb-b1092746a3e8`; see `deployment.json`.
Remote main contains the integrated release. Subsequent commits only record QA.
Integrated mana playback also passes both sides, actual skip-button cancellation,
reduced motion, and DEV comparison/default restoration (`mana-integration-report.json`).


All seven source owners independently verified their public assets/source against
the combined release; reports are under `independent-verification/`. Dew artwork
matches all 48 manifest hashes and the public main bundle contains all 16 new IDs.
The coordinator's live staging test passed 27 hashes, anonymous login, BOT startup
with account API fixtures, both desktop/mobile viewports, and zero page/server
errors (`staging/browser.json`). Its deployed screenshots were inspected.

Local main was advanced while preserving uncommitted comparison work. Before/after
hashes and backups are stored locally at
`/tmp/lore-orchestrator-20260929/main-before-sync/`. Shared files were merged with
both runtime changes and existing DEV hooks retained; no broad add/reset was used.


## Latest follow-up: portrait resource icons

The additional shield/Dew icon request is included in source commit `480612a`.
Both generated transparent PNGs match the existing health badge. Full-board
integration found and fixed a projection-transform discrepancy that was absent
from the isolated portrait fixture. Production BOT tests cover both sides at four
viewport sizes. See `resource-icons/README.md` for the fix and test boundaries.

Latest staging Worker: `b30bccdc-c32c-4bf7-ab42-f678a771191e`.
The seven earlier changes remain included. The earlier Worker version above is
historical deployment evidence. `resource-icons/deployment.json` is the latest receipt.
