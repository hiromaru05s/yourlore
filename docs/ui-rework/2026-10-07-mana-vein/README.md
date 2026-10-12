# Mana destruction 01 — runtime adoption

User selected **01 脈光の覚醒** from the 2026-10-07 five-option study (preview source d7c1ab06).

Normal monsters and publicly visible persistent spells/quests that enter their owner's Shelf now use the selected 1510 ms sequence: card-bound veins and pressure, luminous fracture, one traveling light, then the original card face at the Shelf. Rift routing remains separate. The controller also detects spell/quest exits that emit logs without a destroy event, and excludes hand returns, exile, ownership transfers and duplicate destroy events.

The adapter uses the actual DOM surface and board projection, with cancellation on skip, teardown, resize and hidden pages. Only option 01 is generated. Static illumination coefficients are cached and the return surface builds only its final illuminated frame. A temporary pixel parity comparison against the selected preview at 192×300 and 192×192 found zero changed channels across all 29 frames; the final-only frame was identical.

## Validation before deployment

- Client/server typecheck; quick playback regression; public persistent Shelf-exit tests passed.
- Actual GameView and `ghostDie` path in `client/mana-adoption.html`: monster, persistent spell, both board sides, two simultaneous monsters, empty Shelf, skip cleanup, completion and no console errors.
- Final measured preparation: 619 ms for a cold monster capture, 187 ms for a spell; the selected animation itself remains 1510 ms. These are observations on the current loaded desktop, not a performance SLA.
- `qa/runtime-monster.webm`: runtime effect canvas recording. `qa/runtime-board.jpg`: actual board context. The dev fixture is excluded from the production Vite entrypoints.
- These checks prove local runtime integration, not an authenticated staging match. Deployment guard results and deployed asset checks are recorded separately at release time.
