# HELL bot — value network

The `hell` difficulty tier plays the greedy heuristic **plus a value-net-guided
rollout search**. This folder is the offline training pipeline. Nothing here ships
in the client bundle — only the generated `client/src/shared/botNetWeights.ts` does.

## Why a value net

The old rollout search scored leaf positions with a stale 11-feature logistic
regression, and in the current card meta it was a coin-flip vs the greedy policy
(it actually *lost* ~39% when wired as "hell"). Replacing the leaf evaluator with
a small MLP trained on self-play outcomes makes the search genuinely stronger.

Measured (bot-vs-bot, first player alternated):

| matchup | winrate of stronger tier |
|---|---|
| normal › easy | ~68% |
| hard › normal | ~64% |
| **hell › hard** | **~55%** (net search vs pure greedy) |
| hell › easy | ~81% |

The tiers below `hell` are separated purely by **blunder rate** (easy .45 /
normal .22 / hard .08 / hell .00) — see `client/src/shared/bot.ts`.

## Pipeline

Requires `esbuild` + `node` (no Python, no GPU).

```bash
# 1) self-play data  →  ml/nn/data.bin
npx esbuild ml/nn/gen.ts --bundle --platform=node --format=cjs --outfile=ml/nn/gen.cjs
node ml/nn/gen.cjs 3500 ml/nn/data.bin

# 2) train the MLP  →  ml/nn/weights.json   (args: data out epochs)
node ml/nn/train.cjs ml/nn/data.bin ml/nn/weights.json 12

# 3) export to the shipped TS module
node ml/nn/export-weights.cjs ml/nn/weights.json client/src/shared/botNetWeights.ts

# 4) typecheck
npm --workspace client run typecheck
```

Feature extraction (`client/src/shared/botFeatures.ts`) is shared by training and
in-browser inference, so they never drift. Inference (`botNet.ts`) is a few hundred
multiply-adds — microseconds, zero dependencies.

## Toward "near-perfect" (self-play improvement loop)

The current net was trained on **greedy** self-play. The standard way to push
strength further (AlphaZero-style) is to iterate:

1. Generate self-play data using the **current best bot** (net-guided hell), not
   greedy — edit `gen.ts` to decide with the search policy.
2. Retrain the value net on the stronger data.
3. Confirm the new net beats the old (A/B), then repeat.

Optionally add a **policy head** (predict which action to take) and replace the
flat rollout with **PUCT / ISMCTS** guided by policy+value. That is where the
largest gains are, at the cost of much more self-play compute per iteration.

Note: this is a stochastic, imperfect-information game, so "perfect" (Nash-optimal)
play isn't well-defined or reachable — the realistic target is "wins decisively vs
the heuristic and humans," measured by winrate.
