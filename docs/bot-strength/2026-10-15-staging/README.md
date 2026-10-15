# Hard / Hell staging integration

## Scope

The staging deployment inspected at the start of this work was source `14647025ab69f1a40aee65f2d25cfafacbdca8ee`, Worker version `b41ab69d-fdc6-4a1c-9bec-09ca4ccaa556`. It did not contain the adaptive BUY policy and selected Hard 5 / Hell 7 rosters from `f31d9730`. Those changes are integrated with current main, preserving the current card balance and unrelated changes.

The earlier selection experiments, rejected candidates, actual-difficulty comparisons and their limitations are recorded in [the adaptive study](../2026-10-14-adaptive/README.md). They are not measurements of human win rate.

## Additional tactical corrections

- Rollouts check a bounded, complete winning sequence for both seats once per simulated turn. A greedy opponent that buffs the wrong attacker must not be mistaken for a safe reply. This uses sampled observations, not real hidden hand/deck identities.
- The same-turn proof search no longer prunes pending spells using a hand-only pressure estimate: a buff or damage spell has already left the hand while awaiting its target.
- Completed comparisons are published during search, including each complete finalist sample. If the browser worker reaches its existing deadline, its controller can retain a searched move rather than only the initial greedy fallback. Final move selection and the deadline are unchanged by publication.

`tests/bot-tactics.mjs` covers the missed opponent lethal, complete own continuation through a pending buff target, and progress recommendations. Existing unknown-draw, dice and hidden-trap proof boundaries remain tested. `tests/bot-staging.mjs` also checks the pending-buff choice in the deployed worker, every NPC roster's opening actions, asset hashes and browser errors.

## Holdout protocol

`ml/bot-strength/reply-holdout.cjs` freezes the pre-correction policy after the main merge and compares it with the new policy on the same current engine. Each of the five Hard and seven Hell builds plays from both seats with both policies: 48 games / 24 paired results. Opponents use the frozen actual Hard policy. Counter-builds and the selected Hell builds are included; the natural, recovery, control, elf and curse markets rotate across cases. Seeds and all match conditions are recorded per row. Decks are not reselected from these results.

Incomplete or illegal games fail the run and are not silently counted as losses. This small holdout checks regressions and integration; it cannot establish a 70% win rate against advanced humans or an unbeatable Hell. The machine was under memory pressure during part of the run, so wall-clock maxima must be separated from normal browser performance.

## Release evidence

Validation and deployment evidence will be recorded after the fixed holdout and guarded staging release complete.
