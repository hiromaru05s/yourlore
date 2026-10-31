# Duel languages / Habit of the Rich — production release

- Runtime source: `b0ce51c253132265cd363debabd7ef4041f8e421` (includes the NPC reward update `6d631f62`).
- Production: https://yourlore.xyz
- Worker version: `2f791f20-28b9-4076-8c27-0d7e507bb555`, 100%.
- Deployment: `af3f7c59-5e36-464d-9918-9d3a20fc8d34`.
- Guarded committed snapshot: schema check, client/server typecheck, **261/261 production-suite scripts**, design guard, build and Wrangler deployment completed.

Choice instructions are explicitly localized by effect, instead of translating logs. Authored English travels with engine events to results, logs and rejection messages. Reviewed all 381 cards / 1,143 localized texts; changed 40 cards / 46 texts, including English grammar and automatic vs manual target selection. Habit of the Rich is reworked at balance v72: opponent card-effect destruction sets its owner's maximum mana to exactly 3; own destruction and pure exile do not trigger; its old turn-start effects are removed.

The full suite caught old text assertions and frozen VFX comparisons that included choice wording/log language fields. Those comparisons still assert gameplay state, choice reason/data/owner, damage, targets and RNG; the new language tests cover the presentation fields separately. Retired traps remain absent from the live catalog.

## Evidence

- [Change list and local verification](../../qa/2026-10-31-duel-language/README.md)
- [261-script report](../../qa/2026-10-31-duel-language/production/production-suite.json)
- [Deployment metadata](../../qa/2026-10-31-duel-language/production/deployment.json)
- [Production browser report](../../qa/2026-10-31-duel-language/production/report.json)
- [Served asset hashes](../../qa/2026-10-31-duel-language/production/served-hashes.json)
- [English Armorer](../../qa/2026-10-31-duel-language/production/armorer-en.png), [Japanese](../../qa/2026-10-31-duel-language/production/armorer-ja.png), [Korean](../../qa/2026-10-31-duel-language/production/armorer-ko.png)

Production browser verification uses the actual shipped OnlineController, catalog, JavaScript/CSS/assets with isolated WebSocket/API fixtures. All three locales show correct Armorer amounts and Elf destruction text, and emit the intended Shield action. The shipped Rich Habit text matches the new rule in every locale. The main entry, modules and styles used by the browser match hashes captured from the committed release build. Actual authoritative action processing and hibernation are verified by GameRoom tests with two sockets; no real player account or live PvP match was modified during this verification.

The local controller fixture loads a subset of styles for isolated functional checks. The production screenshots load the shipped global styles and are the final visual reference. Preview worktree: `/Users/hiromaru05s/.codex/worktrees/tutorial-onboarding/LORE_TCG`, local URL `http://127.0.0.1:5249`, base `4ab58326` with final integration of `6d631f62`.
