# Duel result finale

Adopts selected round-two direction 01, the horizontal verdict banner over the final board. Removes the normal defeat-cause/HP copy, prior-to-new MMR history, season date and ranked-match heading. Native RankPresentation continues to own animated MMR, delta, progress, articulated tier emblems and promotion/demotion. Exceptional disconnect/contract reasons and earned EXP remain visible. Review, rematch and home callbacks are unchanged.

## Validation before release

- Client/server typecheck and production build passed.
- `tests/outcome-finale.mjs`: real modal and rank integration; victory/defeat/draw, count interpolation, removed metadata, EXP, all navigation callbacks, restored focus and animation cleanup.
- Existing `rank-emblem.mjs`, `rank-sound.mjs`, `duel-ui.mjs` passed, including seven tier promotions, reduced motion, settlement/deduplication and sound cancellation.
- CUA browser: native result/presenter at 390x844 (defeat/demotion), 844x390 (GM promotion), draw and casual-capable fixture. Review → result returns immediately settled.
- Real local board/controller: prepared board → victory → native gold promotion → review board → reopen settled result. Screenshot `qa/board-victory.png` is the real board fixture, not an authenticated online match.
- Visual review: full-width headline, readable original emblem, clean score block, mobile/landscape actions without overlap. This review is separate from functional test success.

`rankLab` now waits for the board and reuses its initially prepared controller before its first outcome, avoiding screenshots over the preparation overlay.

## Production release

- Guarded source: `204cfb5e05574cc24a3001be2104531e96b53ed8`.
- `209/209` current production checks passed; client/server typecheck and clean snapshot build passed.
- Worker version: `4a995e08-a536-46c0-8844-0f6d68ada06d`, 100% traffic, verified through deployment status.
- Deployed at `2026-10-23T08:51:55Z` to `https://yourlore.xyz`.
- Public SHA-256 parity: `141/141` HTML/JS/CSS/JSON files match the exact temporary committed snapshot built by the guard. The manifest was captured before guard cleanup, avoiding local preview source contamination.
- Evidence: `production-status.json` and `production-parity.json`.
- Authenticated online match completion was not exercised in this release check. Local real-board/presenter checks and production asset parity are separate evidence.
