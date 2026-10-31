# Daily quest explicit claims — 2026-10-31

## Behavior
- Active quests use a blue surface/left rule and an explicit status label, even when replacements are exhausted.
- Completed quests remain unclaimed until the player presses the reward-amount claim button. The response updates the header balance and displays the amount received.
- Received quests use muted gray text/meter and a check-mark label. Existing automatic payouts keep their reward keys and cannot be paid again.
- The three-quest assignment and shared three-replacement allowance are preserved. Daily assignments/claims still use the existing UTC+9 day boundary.
- No schema migration. Quest progress remains server-authoritative. Claim receipt, credits and claimed flag share one D1 batch transaction.

## Source verification
- Base: remote main `2a43f1f1` (fetched before implementation); production inspected as `b0ce51c253132265cd363debabd7ef4041f8e421`, an ancestor of this base.
- Adopted HOME: `client/src/screens/home.ts`, `client/src/ui/lounge.ts`, `client/src/styles/homeTier.css` (portrait quests follow the play panel).
- Existing art/UI: `client/src/ui/homeAtmosphere.ts` with `/art/lounge/toon-balanced-20261026/`, existing Zeno, `client/src/styles/defaultUI.css`, `client/src/styles/defaultButtons.css`. Screenshots visually inspected; no replacement art.
- Changed quest UI: `client/src/ui/dailyRewards.ts`, `client/src/styles/dailyQuestCard.css`.
- Preview origin: `/Users/hiromaru05s/.codex/worktrees/daily-quest-claim/LORE_TCG`, Vite `http://127.0.0.1:5331`.

## Validation before release
- Typecheck and production client build passed.
- 22 reward scenario groups passed: completion without payment, explicit claim, eight simultaneous requests, three independent slots, rollback/retry, legacy receipts, invalid day/revision/slot, authentication and server-owned amount.
- Actual HOME with fixture API: six viewport sizes, Japanese/English/Korean, three distinct states, all quests ready, replacement NO/YES, exhausted replacements, failed request/retry, double click, balance update and reload persistence. Representative screenshots in `qa/`.
- Browser tests were updated to the adopted portrait layout and onboarding route; these fixtures do not prove live match completion, real authentication providers or physical-device performance.

## Production
Pending guarded deployment and disposable-account smoke. The verification script seeds only its own QA quest progress and removes that account afterward.
