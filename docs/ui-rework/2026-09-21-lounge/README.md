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
- Staging deployment and authenticated verification are recorded separately in `deployment.json` and `staging-online.json` once completed. Production is not part of this release.

Implementation choices beyond the mock: real card faces and names replace placeholders; long catalogs/records scroll; incomplete drafts can be discarded with explicit confirmation; no invented products, rewards or card rarities were added.
