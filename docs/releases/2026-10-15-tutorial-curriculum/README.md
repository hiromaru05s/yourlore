# Zeno tutorial curriculum

8 chapters, 36 lessons and 66 prepared scenes replace the old 12 lessons. The existing Zeno model, library atmosphere, card tiles and navigation remain. Each lesson uses real card definitions and the reducer, with deterministic practice boards and the same replay on the server. Prepared progress and controlled opponent behavior are explicitly explained to the learner.

## Learning and rewards

- Basic controls and combat; mana, purchases, deck cycle and Rift; normal/Quick/persistent spells and quests; Spirit, Dew, Shield, Brand/Bleed/Curse; triggers, requirements, limits, eggs and transformation; all 11 passives; all five tribes, Origin/Chosen Area wins and exceptional endings; independent defense and a short duel.
- Zeno waits for board presentation, explains the next action, checks understanding, then explains the outcome. Wrong answers remain retryable. Evasion and Taunt each include successful and unsuccessful seeded rolls. Target choices needed for a demonstration cannot be skipped.
- The notebook follows the same eight chapters, supports search and links back to lessons. Current passive/tribe/quest definitions come from shared card data. Japanese, English and Korean are provided.
- Each chapter is selectable; the recommended unfinished lesson is prominent. Normal play does not require clearing all lessons. On the same browser/account, unfinished action transcripts resume after leaving.
- Total **5,000 Shards**: first eight lessons × 100, remaining 28 × 150. v2 receipts carry their paid budget forward, but do not mark expanded lessons learned. A former 3,000-Shard graduate receives the remaining 2,000 across the new lessons (40/60 each). All partial balances sum exactly to 5,000. Earlier unrelated `tut:` / `tuto:` receipts remain separate.
- D1 batches atomically create the receipt and credit payment. SQL enforces the global cap; duplicate/retried claims grant no additional currency. Completed transcripts survive a failed payment. Guest practice records completion locally and pays no currency.

## Verification

- `tests/tutorial-academy.mjs`: all 36 lessons / 66 scenes, independently asserted rule outcomes, all passive/tribe mappings, premature/wrong answers, required target selection, authoritative transcript rejection, 13 migration budgets, authenticated account isolation, concurrent duplicate claims, payment rollback and exact totals.
- `tests/trap-removal-tutorial.mjs`: three-language DOM, onboarding skip confirmation, payment retry, notebook cleanup and existing gallery filters.
- `tests/tutorial-academy-browser.mjs`: real Chrome/WebGL Zeno; physical drag, attack and target selection; wrong-answer gate, resume and payment retry; nine additional multi-scene controller runs; four window sizes and three languages. APIs are fixtures in this local suite.
- `tests/home-tutorial-browser.mjs`: actual lounge integration, chapter navigation, replay, all-clear state, progress failure/retry, reduced motion, no-WebGL fallback and resize geometry.

These checks establish rule outcomes, reachable UI and payment behavior. They are not a study of first-time player comprehension. Live staging and authenticated payment evidence are recorded separately after deployment.

## Deployment

Apply additive `server/migrations/0022_tutorial_curriculum.sql` to **staging only**, then use `scripts/deploy-guard.mjs staging` from current `gh/main`. Production is outside this release. Preserve the guard build for deployed HTML/JS/CSS hash comparison. Do not conflate asset parity with authenticated play.
