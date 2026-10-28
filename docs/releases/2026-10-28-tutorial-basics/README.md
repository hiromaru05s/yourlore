# Concise basic tutorial — production evidence

- Production: https://yourlore.xyz
- Released source: `13a16712db9c16244da817d0a9a72c6c05aefb6c`
- Worker version: `1f92e254-3577-43d2-a433-658e031670b1`
- Deployment: `e6c42a2f-257c-4c98-b0c1-3af9d17046e7`, 100%, 2026-10-28 07:29 UTC
- Served entry observed after reload: `/assets/main-BINLt2XL.js`

The guarded production release passed 249/249 tests, client/server typechecks, design guard, build, schema and source/version checks. The release source matched current `gh/main` before deployment. This evidence-only documentation commit does not change deployed application code.

## Production browser verification

A signed-in production browser completed the continuous 47-checkpoint tutorial using visible controls and actual game actions. No hidden lesson-controller or game-state injection was used. Verified hand opening, right-click inspection, individually highlighted mana cost/attack/health, summon and direct attack, Attune, two normal three-card draws, both shared markets, fixed stock decrease, both purchases, reshuffling and purchased-card draw, targeted spell selection, monster combat/overflow, market refresh and Cull/Rift. The completion page exposes replay and Easy Single.

Back/forward navigation was checked inside inspection and late in the lesson. Completed actions were not replayed; vanished enemy targets were skipped safely. The actual stock marker under the card was highlighted and its ring followed current DOM geometry (see `stock-tracking.json`). No browser console errors were recorded at completion (`production-ui.json`). Production screenshots are 1410×817.

The 3–5 minute label is a design estimate, not a measured first-time-user study. Automated elapsed time includes inspection and screenshot pauses and is not novice timing evidence. This walkthrough verifies the production tutorial, not live PvP. Persistent-spell counter readability was checked separately on a local real-board fixture; see the local QA record. New advanced Single lessons are outside this change.

## Files

- `production-walkthrough.jsonl`: visible UI progression and actions.
- `production-menu.png`, `production-complete.png`: entry and completed route.
- `production-cost.png`, `production-atk.png`, `production-hp.png`: separate statistic highlights in the normal inspector.
- `production-stock.png`, `stock-tracking.json`: exact stock marker highlight.
- `production-spell-resolution.png`, `production-attack-guide.png`: actual spell/combat UI.
- `deploy.log`, `deployment.json`: guarded release and deployed version evidence. Account identifiers removed from release log/metadata.
- Local checks and coverage: [QA record](../../qa/2026-10-28-tutorial-basics/coverage.md).
