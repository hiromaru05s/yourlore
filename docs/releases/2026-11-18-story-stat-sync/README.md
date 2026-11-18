# Elite Goblin, story bots and stat presentation — 2026-11-18

- Elite Goblin prevents lethal battle destruction on 5–6 instead of 3–6. The existing two player damage and one remaining monster HP are unchanged. Japanese, Korean and English prints and logs agree. Active persisted rooms refresh only its text, preserving damage, modifiers, counters and granted passives. Balance version: v100.
- Luca keeps three Elite Goblins and now runs three Mini Spirits and two Nourishing Rains. This supports Attune growth and sustained attacks without suppressing his own small attackers. Luca and Aries use more selective purchases. Aries keeps all eight signature cards. The common policy now uses Goblin Party, avoids redundant passive grants, and values available double attacks when choosing buff targets.
- The presentation layer holds old ATK/current HP synchronously before field actors are created and while a multi-target selection is pending. Values commit at the adopted material animation's beat. Current-HP recovery also receives feedback. Combat damage uses the value actually printed at contact, so it is not replayed as a debuff. Initial/restored/skipped snapshots settle immediately; interruption releases the held values.

## Source and verification

Starting adopted source: `ea3152936`; integrated newer main `fe4200486` (NPC idle faces). Existing board `client/src/ui/boardView.ts`, material `client/src/ui/cardMaterial/effect.ts`, monster runtime `client/src/ui/monster/runtime.ts` and controller `client/src/game/controller.ts` are used directly. No replacement art or board design was introduced.

Preview launched from `/Users/hiromaru05s/.codex/worktrees/goblin-bot-stat-sync-1118/LORE_TCG` at `http://127.0.0.1:5438`. `tests/stat-sync-browser.mjs` mounts the actual controller and board renderer. Browser evidence covers both sides at 1280px/390px, increase/decrease, repeated selection snapshots, partial cancellation, contact damage, current-HP recovery, skip, resize, hidden-tab and reduced motion. Screenshots and continuous recording: `/tmp/lore-stat-sync/`.

Functional checks and visual review are distinct: frame-value assertions passed and PC/mobile screenshots were reviewed. The adopted material choreography is preserved; this is a synchronization fix, not approval of a new VFX design. No authenticated human PvP match was played.

`tests/story-bot-update.mjs` exercises all six die faces, persisted-card text preservation, Goblin Party, nonredundant Icarus grants, and buffing an available dual attacker. Existing tactics tests verify the improved fallback can now see a previously missed lethal reply.

The 64-game proxy in `bot-proxy.json` uses current rules, paired seats and the same seeds. Luca changed from 9/16 to 14/16 wins and Aries stayed at 15/16, without invalid actions. This is a greedy screening result, not a measured human difficulty or a statistically established win-rate improvement. The nine-roster, 288-game selection screen is in `bot-screen.json` (selected roster 31/32, old roster 24/32). The 64-game proxy uses different seeds from selection. Full search smoke evidence is recorded separately when complete.

An initial mixed Luca roster was rejected after a full-search pilot lost the matched first-seat case that the old roster won. `bot-initial-smoke.json` preserves that evidence; its supplemental second-seed baseline has no paired candidate and is not a comparison. The first deployment was interrupted during tests, before upload, to revise this roster.
