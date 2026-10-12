# Four-tier BOT calibration

The card definitions and rules stay unchanged. Easy/normal use verified greedy
choices with 45%/18% alternate-action chances. Hard/hell use 8/12 root candidates,
2/3 shared hidden-information samples, then 3/4 finalists with 2/8 deeper samples
(the greedy baseline is retained even when it adds another finalist). All
finalists in a round use the same horizon: two half-turns initially, four later.
Hell first obtains Hard's decision, retains it through both rounds, and changes
that decision only when its deeper average is at least 0.02 higher. This prevents
extra breadth from replacing a strong move with a marginal sampled advantage.
Upper tiers have no intentional mistakes. Hard uses three ordinary legal decks
selected by a separate deck study; Hell uses the anti-enchantment Counter engine. Neither tier receives extra HP, mana or cards.

The evaluator blends a material estimate with a 27-feature logistic value model
trained on 4,000 current-rule games. Observations infer unknown opponent cards
from public history; they never inspect the actual hidden inventory or live RNG.
A final reducer acceptance check prevents a hypothesis from causing a rejected
play. It does not score the authoritative hidden outcome. Recycling draw/tutor
plays are limited to 12 per card ID per turn **only by BOT policy**.

`BotThinker` runs decisions in a cancellable Web Worker. Navigation terminates
work; stale decisions cannot apply. If the worker fails or exceeds 15 seconds,
the controller uses a verified greedy fallback. Search uses an alias-preserving
plain-state clone; a 1,000-transition test compares it with native structuredClone.

## Reproduce current comparisons

```sh
node ml/bot-strength/build.mjs
node ml/bot-strength/evaluate.cjs new:normal new:easy 300 27000 normal-easy
ROSTER_A=elite node ml/bot-strength/evaluate.cjs new:hard new:normal 100 26000 hard-normal
node ml/bot-strength/evaluate.cjs new:hard old:hell 100 25000 hard-oldhell
ROSTER_A=hell ROSTER_B=elite node ml/bot-strength/evaluate.cjs new:hell new:hard 48 28602 hell-hard
ROSTER_A=hell node ml/bot-strength/evaluate.cjs new:hell old:hell 60 29000 hell-oldhell
```

Each adjacent pair shares the game seed and swaps A's seat. With no ROSTER
setting, deck assignment stays fixed while policies swap; this isolates decision
quality. With ROSTER settings, each policy keeps its designated roster as seats
swap; this measures the shipped matchup. `elite` is the three Hard decks and `hell` the selected Hell deck;
the other roster is the five original decks. Every result records module hashes,
parameters, per-game rows, invalid decisions, complete pairs and a paired
bootstrap interval. Invalid/unfinished games are not losses; their entire pairs
are excluded from the paired score. Draws score 0.5. Wilson intervals refer only
to raw win fraction and are secondary because legs share seeds. Use a new output
name for each run. There is a 1,600-action harness limit, separate from game rules.

`BOT_LAB` changes the output directory. `BOT_MODULE` and `BOT_BASELINE` select
frozen bundles. `VALUE`/`BASELINE_VALUE` set evaluation parameters; `SEARCH` sets
complete search profiles. For an ablation, use two different bundle paths so
Node does not share the mutated module object. No global clone override is used
in final acceptance runs. Earlier exploratory runs used a faster offline clone.

## Deck exploration and model training

```sh
node ml/bot-strength/screen-decks.cjs
node ml/bot-strength/evolve-decks.cjs
node ml/bot-strength/validate-decks.cjs
node ml/bot-strength/train-value.cjs
node ml/bot-strength/export-value.cjs
```

Screening uses 26 constructed decks / 520 games. Evolution evaluates 80 entries
across six generations / 5,760 games (elites repeat; these are not 480 unique
genomes). Holdout uses 20 candidates × 30 opponents × two seeds × two seats =
2,400 games. Both sides use the same verified greedy policy. These are deck
selection measurements, not human win rates or current-tier acceptance rates.
Training uses 4,000 additional games with 8% legal exploration and a whole-game
validation split. Validation positions never enter training or normalization.

Frozen historical bundles and results are in `docs/bot-strength/2026-10-13`.
The original screen/evolution used `deck-exploration.cjs.gz`, holdout used
`deck-holdout-policy.cjs.gz`, and training used `training-policy.cjs.gz`. Extract a
bundle and set BOT_MODULE to reproduce that stage exactly. Copy the saved screen
result to `.bot-strength/results/deck-screen.json` and the saved evolution result
to `.bot-strength/results/evolution.json` to skip those stages. Rerunning the
pipeline with current code is a new experiment and may produce different results.
The existing weights are adopted as a complete policy candidate, not on the basis
of training accuracy alone; the small material-only ablation is inconclusive.

## Checks

```sh
node ml/bot-strength/verify-cards.cjs
node tests/bot-strength.mjs
npm run typecheck
npm run build
# Start Vite client on 127.0.0.1:5276, then with Playwright + Chrome available:
node tests/bot-worker-browser.mjs
node tests/bot-gameplay-browser.mjs
```

The browser suite verifies four real workers, event-loop responsiveness, a
synthetic resource-rich long-game state, cancellation, stale/disposed controller
results, normal result application, mandatory turn-budget choices, worker-unavailable
fallback, timeout termination and defender-owned choices. It does not claim
live production gameplay or visual approval. The gameplay suite additionally runs
two actual LocalController BOT turns per upper tier with board rendering and
playback; the opening cinematic is bypassed because it is outside this BOT test.
See the dated report for measured
results and release status.

Independent contiguous pair ranges can run as separate processes; merge their completed JSON results with `summarize.cjs output.json shard1.json ...`. It rejects overlapping pairs and mixed source hashes or parameters.

The original logistic validation split used game index modulo 10, which puts its validation games in starting seat 0. Treat that accuracy as a diagnostic, not proof of strength; tier acceptance uses paired seats and independent seeds.
