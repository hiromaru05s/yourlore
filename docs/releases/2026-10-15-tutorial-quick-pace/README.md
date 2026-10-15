# Zeno quick pace — 15-minute design target

The complete curriculum remains 8 chapters, 36 lessons, 66 playable scenes, 35 questions and 5,000 first-clear Shards. All prepared states, required actions, outcomes, server replay, reward IDs and legacy-payment rules are unchanged.

Quick pace is the default. It keeps one board/controller/Zeno alive across lessons, resolves long card effects immediately into the real resulting board, shows actual resource/zone deltas and dice rolls, and places the explanation beside the result. Correct answers also acknowledge the result; successful payment hands off directly to the next lesson, with the receipt shown there. Incorrect answers and payment errors stop progression and allow retry. No player action or required target is completed automatically.

Japanese explanations are shortened from 7,596 to 6,456 meaningful characters while retaining conditions, numeric values and exceptions. Original prose is available within every scene and the completed-scene record. All original notes remain searchable. Full effects can be selected at any point; basic-control slides are available on demand instead of blocking the first action.

## Timing boundary

`budget.json` is a design budget, **not a human study**. It assumes 800 Japanese characters/minute, 1.5 seconds per game action, one second per answer/review, and 60 seconds for system/payment waits. It adds reading and interaction time without assuming overlap. The result is 810 seconds (13m30s). This describes a fluent run without retries, voluntary rereading, or cold asset downloads. A beginner taking time to understand everything can exceed 15 minutes; there is no timer or forced text dismissal.

35 redundant post-answer confirmations and 35 between-lesson buttons are removed in quick pace. All 133 player game actions, 31 non-question result acknowledgements, 35 questions and 35 opponent actions remain in the reference solutions.

## Validation

- `tests/tutorial-academy.mjs`: all 36 lessons / 66 scenes with real reducer outcomes; required targets, wrong answers, replay, all passive/tribe coverage, 5,000 total and legacy rewards.
- `tests/tutorial-pace.mjs`: complete concise text coverage, unchanged scene/question/action counts and explicit timing assumptions.
- `tests/trap-removal-tutorial.mjs`: full-effects controls plus quick-mode reward failure/retry and in-place handoff.
- `TUTORIAL_QA_TARGET=pace node tests/tutorial-academy-browser.mjs`: physical first summon, wrong/correct answer, remaining gameplay through actual controller submissions, all question/review buttons, 35 automatic handoffs without replacing the controller or Zeno canvas, all 66 scene records and 5,000 credits; window geometry and pace toggle.

Browser runtime is automation timing only. It does not measure human comprehension.
## Staging release

- Source `48db6a357ccf5223055a3e8e4c233b6a8e4b80bf`, Worker `77e03f0b-859f-440b-9cb8-1e29a62b7731`, 100% staging traffic. This integrated release includes the tutorial commits and concurrent approved work. No production deployment.
- `staging/production-suite.json`: 179/179 passing groups in the guarded release.
- `staging/assets.json`: all 103 deployed HTML/JS/CSS files match the exact guarded build. An immediate post-upload request returned a transient 404; retry after propagation passed every hash.
- `staging/authenticated.json`: real password login with a disposable preverified account, initial offer/skip confirmation, physical Blade Hare drag, +100 Shards, and automatic handoff to lesson two on the same board. All remaining lessons pass the deployed authoritative replay, ending at 36/36 and 5,000 Shards. Concurrent duplicate grants are `[100, 0]`; reload preserves completion. No browser page errors.
- `staging/d1-balances.json` independently verifies 5,000 credits and 36 receipts; `staging/d1-cleanup.json` verifies removal of the QA account, rewards, session, tutorial ledger and medals. Ephemeral credentials and browser profile are removed.

The live browser test physically plays the first lesson; the other 35 are server replay/payment checks. The local quick-pace browser run drives every lesson through the controller and quiz/review UI. Neither is a beginner human timing study. Email delivery, OAuth and production were not exercised.
