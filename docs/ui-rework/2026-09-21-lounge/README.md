# Biblion Lounge implementation

Approved direction: HOME concept 07 and the 24 page/state mockups from 2026-09-21. This implementation uses the live player APIs and actual card data. The generated mock text and sample accounts are not production data.

## Screens and UX

- Shared navy navigation, account/shards header and warm library workspace across HOME, deck, cards, ranking, friends, profile, shop and guide.
- HOME: ranked main action, casual/BOT actions, current deck preview and live friends/challenges. Mobile friends open as a bottom panel; navigation becomes a menu.
- Login/register, email verification/resend, password recovery and reset use a separately generated entrance environment. Existing Google/email authentication remains connected.
- Deck: five presets, fixed Attune + eight editable cards, separate market watch tab, save/use states, incomplete-save prevention and unsaved-exit confirmation. Failed use/save cannot change the active deck.
- Cards: real catalog and art, existing type/cost/language/search, keyboard-accessible inspection, ivory rules panel.
- Ranked/casual waiting: live socket lifecycle, elapsed time, reconnect and cancellation. BOT difficulty and friend challenge dialogs use the shared modal styling.
- Profile: overview, mode filter, recent matches, opponent records, sleeves and settings. Avatar, rename, private profiles, logout and friend removal retain their server contracts.
- Shop shows its actual empty catalog. Guide keeps the nine tutorial steps and adds a rules contents navigation. Invite/referral and inquiry dialogs preserve the existing limits and errors.
- Modal keyboard focus/Tab/Escape and mobile layouts are included. Gameplay/admin screens keep their existing layout.

## Images

Two original environment assets were generated with the built-in image generator: `client/public/art/lounge/v1/library.png` and `entrance.png`. Prompts/references are in `asset-prompts.json`, and dimensions/hashes in `asset-manifest.json`. Existing approved LORE logo, character portraits and card art are reused as canonical assets.

## Provisional MMR

The server already had an Elo ladder and MMR matchmaking. This release retains start 1000, K=32, +2 winner bonus, nonnegative floor, monthly UTC seasons and a halfway soft reset toward 1000. Equal MMR gives +18/-16; equal draws do not move. Casual, BOT, friend and no-contest matches do not change ranked MMR. Match search expands its range with waiting time.

`ranked_results` records each room once. A D1 transaction commits the ledger and both ratings together; optimistic version checks retry competing room results. Match totals are independently idempotent. Failed settlement is retried by the room alarm, and final rating changes are retained for reconnects. Ranking and profiles share the same MMR/date/user-id tie break, including Grandmaster.

Migration: `server/migrations/0014_ranked_results.sql` (additive). Existing ratings are preserved.

## Integration

Base: `bb77ab3` (latest staged v50 expansion and viewport-fill board). The previously unmerged six-card balance pass `bc175a3` was integrated in `7f261c2`, retaining expansion/Counter mechanics and updating the combined balance version to **v51**. Both behavior suites were run; the Ancient Civilization UI duration regression was updated from 13 to its approved 9 turns.

## Validation

- Typecheck, production build and Wrangler staging dry run.
- Browser fixtures: desktop/mobile navigation, all main pages, card details, auth states, modals, deck save/exit, errors and horizontal overflow. `checks/report.json` and PNGs record the checked states. These screenshots use explicit local QA fixtures.
- `tests/lounge-rank.mjs`: Elo, draw/floor, duplicate and concurrent settlement, rollback/retry, stable ties and month reset.
- `tests/lounge-settlement.mjs`: actual GameRoom settlement with injected partial outage, retry, concurrent calls, repeated room, casual and no-contest exclusions.
- Integrated balance: v47, Half Elf v48, six-card v49 and 36 expansion v50 behavior suites.
- Staging deployed to https://test.yourlore.xyz, Worker version `0bd3a2ca-dfdd-464b-a54f-85c6ed754e1c`, implementation commit `7ce433c`. `deployment.json` and `staging-online.json` record an authenticated ranked match with 16 actions, +18/-16 settlement, profile/leaderboard updates and reconnect/duplicate protection. All temporary QA accounts, ratings and ledger entries were removed and verified absent.
- `checks/staging-report.json` records 13 screens against the real staging APIs at desktop and mobile sizes, with no page errors, failed same-origin requests or horizontal overflow. Generated backgrounds and built asset hashes match the deployment. Staging screenshots use isolated temporary QA accounts with deliberately extreme ratings to avoid ordinary matchmaking; those are test data, not balance examples.
- OAuth consent and actual mail delivery were not newly exercised; their existing server flows remain connected. Production was not deployed.

All 11 existing worktrees were fast-forwarded to the implementation, followed by this verification-only commit. `worktree-integration.json` records the original integration. Older uncommitted tracked work was preserved in archive branches `codex/archive-pre-lounge-main-20260921` and `codex/archive-pre-lounge-legacy-ui-rework-20260921`. Conflicting untracked files were preserved with hashes under the main repository's `.git/lore-backups/2026-09-21-pre-lounge/`; unrelated untracked files remain in place. Prunable worktrees whose directories no longer exist were left alone.

Implementation choices beyond the mock: real card faces and names replace placeholders; long catalogs/records scroll; incomplete drafts can be discarded with explicit confirmation; no invented products, rewards or card rarities were added.
