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

## Integration and execution evidence

- Client/server type checks and the product build passed. The full production suite passed **168/168**.
- Current definitions are unchanged: v58, 358 cards, SHA-256 `7d3ac71f7bad5c4d42a419da7d6297ea0d8438dd6c1932d07077ba2f3e8934a4` (definitions and pools).
- The final bundle, including completed-pass publication and the latest main merge, matched the evaluated bundle over 1,200 state transitions, 11,988 purchase evaluations and 40 actual Hard/Hell decisions. `integrity.json` identifies all three bundles; the two baseline/candidate versions and final integration are archived separately.
- Browser worker openings: Hard 222 ms, Hell 510 ms. The long-game and tactical-heavy fixtures took 10,293 ms and 4,296 ms, with live UI heartbeats and legal actions. Cancellation, supersession, deadline fallback, progress retention and state purity passed. These are measured samples, not an upper bound on every device.
- The real controller advanced both Hard and Hell through two turns to turn 5, with no browser errors.
- A state captured from the control-market holdout returned a legal action in 631 ms (Hard) / 1,685 ms (Hell), publishing 4 / 13 completed recommendations. Before correction the same state took 400 / 1,045 ms and only published 1 / 2 recommendations. Both policies chose the same discard in this specific state.
- All 18 NPC decks remain legal and distinct within their difficulty; copied tuning, non-repeating selection and 36 opening simulations passed. The 28 adaptive BUY/action regression groups also passed.

The fixed holdout and guarded staging release are recorded separately after completion. Holdout wall-clock timings include initial memory contention, a deliberate pause of one shard, and a brief debugger capture of the control-market state; use the browser and isolated-state measurements above for execution evidence.
