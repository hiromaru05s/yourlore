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
selected by a separate deck study; Hell uses three evolved decay/pressure decks. Neither tier receives extra HP, mana or cards.

The evaluator blends a material estimate with a 27-feature logistic value model
trained on 4,000 current-rule games. Observations infer unknown opponent cards
from public history; they never inspect the actual hidden inventory or live RNG.
A final reducer acceptance check prevents a hypothesis from causing a rejected
play. It does not score the authoritative hidden outcome. Recycling draw/tutor
plays are limited to 12 per card ID per turn **only by BOT policy**.

`BotThinker` runs decisions in a cancellable Web Worker. Navigation terminates
work; stale decisions cannot apply. If the worker fails or exceeds 15 seconds,
it retains the last completed recommendation (including Hard's result inside Hell).
Only a search with no completed recommendation uses a verified greedy fallback. Search uses an alias-preserving
plain-state clone; a 1,000-transition test compares it with native structuredClone.

## Original comparison commands (historical)

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
swap; this measures the shipped matchup. `elite` is the three Hard decks and `hell` the three selected Hell decks;
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

## Second pass: current staging integration and counter decks

The current follow-up is recorded in `docs/bot-strength/2026-10-13-v2/README.md`.
Use its frozen `previous-integrated.cjs.gz` for the comparison policy: it includes
current engine rules, unlike the original historical baseline. Expand it to
`$BOT_LAB/previous.cjs`; set `BOT_BASELINE` to that absolute path.

Reproduce discovery in order from the repository root:

```sh
export BOT_MODULE="$BOT_BASELINE"
mkdir -p "$BOT_LAB/results"
node ml/bot-strength/evolve-v2.cjs
node ml/bot-strength/holdout-v2.cjs
# Copy the recorded roster.json and counters.json into BOT_LAB.
node ml/bot-strength/evolve-counter-v2.cjs
node ml/bot-strength/holdout-counter-v2.cjs
node ml/bot-strength/train-value-v2.cjs
```

Set `BOT_LAB` to an absolute scratch directory (default discovery directory:
`.bot-strength-v2`). `ROSTER_A_FILE` / `ROSTER_B_FILE` select exact JSON deck arrays
for `evaluate.cjs`, including the NPC decks actually used by LocalController.
`TACTICS` and `VALUE_MODEL` are research-only overrides. The second value model
was tested separately; generating it does not adopt its weights. Validation
splits whole games in two-game blocks, covering both starting seats.


For final acceptance, extract `release-candidate.cjs.gz` to a separate immutable
`candidate.cjs`; the second-pass report identifies subsequent release safeguards
and their conformance checks. Both modules and exact roster files are recorded in
each result. Do not overwrite a bundle while an evaluation is running.
The synchronous evaluator does not impose the browser's 15-second wall-clock
limit; browser lifecycle and retained recommendations are validated separately.

`RESUME_FROM` accepts a checkpoint with `{config, rows}`. The immutable policy
hashes, search/value parameters, exact rosters and original seed range must
match. Always use a **new output name**. Completed rows are preserved in order;
only an unfinished game restarts from its original seed. Resumed results report
`resume.games` and the checkpoint SHA; their timing covers only the new process
and must not be interpreted as a complete latency benchmark. Do not combine an
original prefix and its resumed full result as independent games.
