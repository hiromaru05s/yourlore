# Hand, dice and frame continuity — 2026-09-10

This staging pass addresses the seven requests in the 17:29 screenshot feedback.

- The leftmost held card is foremost. During a draw, native copies of existing held cards occlude the incoming rightmost card, so it slips underneath instead of changing layers at the last frame. The established right-edge reveal direction is retained. Cancellation, resizing and GPU loss restore the native hand.
- Both portrait frames extend farther beyond the viewport. The board solver reserves less portrait height, returning space to the field and market. The opponent's head stays visible, its image keeps its original proportions, and the lower aperture is clipped within the frame. The own player name stays below HP, within the viewport.
- Mana now uses ivory/gold-set lapis diamonds with distinct filled/empty facets, a restrained raised counter and a short gain pulse. These are scalable native SVG assets; no raster stretching or square-button gems.
- Dice events carry an explicit public source card ID and owner from every engine roll site. The source card stays on the left of the dice through the result. Blue/red labels distinguish ownership; a separate dice label handles spells that make the opponent roll. Brand and solitude are identified as persistent statuses, because their state has no single source card. No inferred last-played card or private hand data is used.
- The preparation cover uses the current `/art/brand/lore-logo-transparent.png`, a loading label and an indeterminate progress track. Board content remains covered until asset decoding and the first scene render complete.
- Resting shelf stacks render inset paper edges only. They no longer render sleeve planes below the native public face. A two-card Soldier Golem shelf shows one public face, with no phantom card behind it. Private deck sleeves remain unchanged.
- Purchase selection highlights the alpha contour of the ornamental frame and stat seals. The rectangular outline and box shadow are removed. Cards also sit 1 CSS pixel above the market plane to prevent Chromium from retargeting clicks to the coplanar counter.

## Validation

- Client/server typecheck, production build with design guard, and `git diff --check`.
- `tests/dice-source.mjs`: 3,203 action comparisons with source commit `a0bfc93`, 728 dice events, identical state/RNG/other events; explicit opposite-roller ND3 and persistent-status assertions. Required source arguments cover all remaining legacy roll sites at typecheck time.
- `tests/pile-stock.mjs`: 0/1/2/12/40-card shelves contain no front/back sleeve planes; paper edges remain inset; deck sleeves are preserved.
- `tests/duel-hand-dice-browser.mjs`: held-model loading cover, four viewport sizes, visible character head/name, left-front overlap, actual purchase contour, two-card public shelf, incoming-card occlusion, dice source ownership/status, mobile layout and interruption.
- `tests/duel-render-audit-browser.mjs`: native shelf face resolution, front purchase flight, exactly matching touchdown/committed bounds, synchronous affordability change, transparent card capture, three spell-drag gestures, cancellation and animated end-turn discard.
- `tests/paper-card-browser.mjs`: draw lifecycle, hidden opponent faces, six-card batches, reduced motion, resize/GPU-loss/texture-load cancellation and actual LocalController opening draw.
- `tests/paper-card.mjs`, `tests/stagecraft-models.mjs`, `tests/opening-hands.mjs`: flat draw endpoints, private reverse, physical coin support, shared play restrictions, simultaneous starting hands and no duplicate initial draw.

Browser tests use the actual local controller and renderer with deterministic fixtures. Deployment checks cover published asset hashes and unauthenticated staging startup; remote matchmaking and a two-user online duel are not part of this verification.

The final build/deploy uses an isolated worktree on `codex/duel-hand-dice-staging-20260910`, based on `4c27ff3`. Concurrent stat-rise implementation in the original checkout is preserved and excluded from this release.

Deployment details are recorded in `deployment.json` after publication. Staging only; production and main are not changed by this pass.
