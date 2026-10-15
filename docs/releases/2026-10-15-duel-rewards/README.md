# Duel Shards and daily quests

- BOT first clears: Easy 300, Normal 500, Hard 1,000, Hell 2,000, once per account and difficulty. Authenticated BOT games run in GameRoom using the existing botDecide difficulty policy and NPC decks; local guest games have no rewards.
- Normal win/loss: 10/5, daily cap 100. Ranked: 20/10, cap 300. Caps are independent, the last payout is clipped to the remaining allowance, and draws have no match payout. Daily and BOT first-clear rewards are outside these caps.
- One daily quest, 3 replacements, UTC+9 midnight reset. All 13 requested templates and rewards are defined in shared/progression.ts. Card-specific tasks use playable catalogs; starter-win tasks select from the account's owned starters.
- Successful actions update server engine state, including rollbacks/rerolls. Shield gained, actual healing, opponent HP damage (excluding self-damage/prevention/overkill), extra draws (excluding normal turn draws), Decay destruction, Counter destruction, and additions to the owner's Rift are counted. Printed purchase cost is used for cost-5+ plays. Spell/Quest cards, including persistent spells, count as magic; basic starter actions do not.
- Progress is applied when a match ends, from the daily assignment captured at match creation. Changing a quest cancels progress from matches started with the old assignment. A game crossing midnight does not transfer old quest progress to the new day. Match payout uses its completion day. UI explains replacement and end-of-match progress.
- Completed daily quests automatically pay once and cannot be replaced. Receipt, capped payout, quest update, and currency increment share a D1 transaction. Retry after disconnect/hibernation or a D1 failure does not duplicate rewards. Voided unjoined rooms do not settle.

## Validation

`tests/duel-rewards.mjs` covers 15 scenario groups: exact catalog amounts, per-account first clears, independent caps/clipping/reset, concurrent replacements, automatic daily claims, stale assignments, transaction rollback/retry, real reducer activity, forged claim rejection, a complete server-controlled BOT duel, and owned starter selection. Existing room fixtures now provide a real SQLite-backed reward database.

`tests/duel-rewards-browser.mjs` verifies reward/quest/claim labels, 3 replacements and disabled completion state, and overflow at 1280×900, 1280×720, 390×844, 320×568, 844×390. Browser fixtures validate presentation separately from authenticated staging verification.

Staging migration: `server/migrations/0020_duel_rewards.sql` (additive/idempotent). Deployment uses `scripts/deploy-guard.mjs staging` and current `gh/main`; production is outside this release.

## Staging verification — 2026-10-15

Source `c296c8fe55a7cd32e86cafbdf32088749959e985` deployed by the guard as Worker version `a62fb117-f6a6-42dd-8e97-f5b41b4f04cb`, 100% traffic. Typecheck and **165/165** production suites passed. All **99** built HTML/JS/CSS files matched their served SHA-256 hashes. An earlier validation run passed 164/164 but correctly stopped when main advanced; the final release includes those concurrent updates. Immediate post-deploy probes briefly reached the prior version; verification was repeated with fresh isolated accounts after propagation.

Authenticated staging checks used three temporary QA accounts and real WebSockets:
- Normal winner/loser received 10/5; Ranked received 20/10. Reconnecting to settled matches did not add currency.
- Three daily replacements succeeded; the fourth returned 409.
- Playing Cull in a real BOT duel completed the assigned card-play quest and automatically paid 350; surrender gave no BOT first-clear reward. A completed quest could not be replaced.
- A complete Easy BOT match ended in a human-side win after 13 turns / 31 client actions and paid exactly 300 first-clear Shards. This exercised real server AI, actions, settlement and the authenticated receipt API. Other difficulty amounts and lifetime duplicate protection are covered by the SQLite-backed settlement tests.
- Live authenticated quest UI passed at 1280×900, 390×844 and 320×568, with no horizontal overflow or page errors. The mobile screenshot is included.

Detailed checks: `staging-verification.json`. Temporary QA accounts, sessions, currency ledgers, quests, ratings and match rows were removed after validation.
