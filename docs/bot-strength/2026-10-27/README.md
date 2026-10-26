# NPC difficulty training — 2026-10-27

Work in progress. Release and final benchmark results are added after validation.

## Scope

Card balance is v68, from source `b8f9e1b3f25f0e25d85b1ab9fcb49f13461dce4a`.
Card definitions/effects are unchanged. Only explicitly created NPC challenges
receive the new market distribution. Ranked/PvP and unbiased games retain the
original random sequence and transitions.

| Difficulty | Decks | Target human win rate for NPC | Favorable market branch |
| --- | ---: | ---: | ---: |
| Easy | 1 | Usually loses to humans | 0% |
| Normal | 4 | 50% | 0% |
| Hard | 7 | 80% | 50% |
| Hell | 7 | 99% | 90% |

These human win rates are **targets, not measured results**. Existing completed
production NPC matches were too few and cannot establish representative human
performance. Scripted opponents, self-play, training accuracy, and public worker
fixtures do not establish human win rates or professional playing strength.

## Market and deck variety

Every generated fixed/presented offer in an explicit Hard/Hell NPC challenge
first draws the configured probability. The favored branch samples 32 legal
candidates, evaluates NPC inventory and public opposing evidence, penalizes recent
offers and redundant ownership, and samples from eight top alternatives. The
other branch remains uniform. Fixed-market depletion and Market Crisis use the
same director. Both players still see and buy from the same market; card effects,
prices, die outcomes, and human draws are not separately manipulated.

The probabilities describe a **sampling branch per generated card**, not the
fraction of all cards guaranteed to benefit the NPC, and not a win probability.
The preferred choices depend on the current inventory, public board and history.
Random sampling and recent-offer penalties avoid a scripted repeating combo.
Cards may still recur naturally. A shuffled deck bag uses every strategy once
before repeating and prevents a repeat across cycle boundaries. Server bags are
persisted per user/difficulty, with idempotent request receipts. Offline bags last
for the current application session.

## Reproduction

`ml/bot-strength/train-difficulty.cjs` supports `select`, `train`, and `holdout`.
`BOT_LAB` selects the artifact directory; `JOBS` controls worker threads.
`FAMILIES_FILE` supplies an optional alternative family search space. Every output
requires a fresh directory/file, so prior evidence is not silently replaced.
The engine/policy module is frozen before a run. Selection seeds, finalist seeds,
value-training seeds, and holdout seeds occupy distinct ranges. Each game uses the
actual reducer, legal actions, and public-information observations. The value
model's validation split is by whole game, never randomly separated positions
from the same game. Human target rates are not training labels.

`ml/bot-strength/benchmark-difficulty.cjs` compares actual before/after policies
against public-information scripted opponents on paired seats. Both versions use
the same current engine. The before version has its original deck roster and
unbiased markets; the after version has its complete difficulty configuration.
This is a product comparison, not an isolated attribution of improvement to the
value model. `PAIRS=49` covers the complete seven-deck/seven-opponent grid for the
seven-deck rosters. Smaller runs have the coverage shown in their raw records.

## Verification boundaries

- Card catalog equality and 20 games / 2,400 unbiased actions matched the frozen
  pre-change engine exactly. The catalog contained 378 definitions including
  non-collectible/generated cards.
- Local market tests cover branch probabilities, determinism, legal pools,
  diversity, shared offers, immutable reducer transitions, and hidden-information
  independence.
- The real workerd SQLite Durable Object test covers concurrent reservations,
  idempotent retries, restart persistence, and user isolation.
- Local GameRoom and authenticated HTTP-handler fixtures cover deck reservation,
  provisioning, difficulty persistence, restoration, and authoritative BOT moves.
  Local fixtures are not authenticated production play.
