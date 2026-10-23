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

Production deployment and public asset parity are recorded separately after the guarded release.
