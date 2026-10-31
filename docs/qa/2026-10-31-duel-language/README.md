# Duel language and Habit of the Rich — 2026-10-31

Source reference: `4ab5832675238de99a60c4ceb1a152555c4e2856`, then integrate latest `gh/main` before release. Preview started from `/Users/hiromaru05s/.codex/worktrees/tutorial-onboarding/LORE_TCG`, at `http://127.0.0.1:5249`. Real `BaseController`, `GameView`, `cardPicker`, `GameLog`, styles and card assets are used, with isolated deterministic game states. This is not a live player match.

## Changes

- Choice instructions now use independently authored Japanese, Korean and English keyed by the actual effect reason and remaining target counts. They no longer run through the battle-log translator. Destruction, return to hand, return from graveyard and Rift movement have distinct instructions.
- Armorer mode choices state the exact Shield/ATK/HP amounts. All three Armorer tiers and both branches are covered. Existing saved choices receive the new locale copy as well.
- Missing English engine messages/rejections now have authored English carried through events to the log, blocked-action toast and effect-result popup. Existing translated legacy logs remain supported. Fixed Korean fields that contained Japanese and inaccurate conditions for Beginner's Mind, Meditation and Mind Burst.
- Reviewed the full 381-card English catalog, with 3-language text/terminology checks (1,143 texts). `card-text-changes.json` records 40 cards / 48 localized texts changed. Corrections include complete maximum-mana sentences, random selection wording, automatic Assassin selection for Nightlord's Secret, Horde excluding itself and Divine's set-trap targets. Non-text card definitions remain unchanged except balance version v72; rules change is Habit of the Rich.
- Habit of the Rich: only destruction by an opponent's card effect sets the owner's base maximum mana to exactly 3. No old turn-start healing/mana gain. Own destruction, expiry and pure exile do not trigger. Destruction followed by exile does trigger. Existing mana caps still apply; this effect does not refill current mana.

## Verification

- `tests/duel-language-rich-habit.mjs`: choice locales, all Armorer modes, Elf destruction vs return, Rich Habit for either owner, own destruction, exile distinctions, defending trap source attribution, removed old turn-start effect and catalog/rejection language checks.
- `tests/duel-language-source.mjs`: 2,168 static engine message variants and 54 directly declared choice reasons; dynamic choice copy is also covered in the behavior test.
- `tests/duel-language-server.mjs`: actual GameRoom with two socket fixtures; unauthorized choice rejected, Armorer choice survives reconnect, Rich Habit mana/log events reach both sockets and persist across hibernation.
- `check.mjs` / `browser-report.json`: actual controller/DOM in JA/KO/EN at 1280 and 390 px; select Shield and check actual amount, inspect strengthening and Elf destruction, distinct recall text, render authored English log. Screenshots wait for the turn banner to finish.
- Typecheck, text check, card-rule glossary (including hover/tap/focus), target-choice UI/engine, Dew/Shield and Goblin regression checks passed before release.

Text hashes and language-script checks guard against regression; they do not prove every possible game interaction or native-speaker comprehension. Full guarded production-suite and deployed-source evidence are recorded after deployment separately.
