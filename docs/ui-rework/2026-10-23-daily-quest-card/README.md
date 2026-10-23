# Adopted Daily Quest card

User selected comparison 01 and requested integration into HOME, a slightly smaller UI, and production delivery on 2026-10-23.

- Desktop width is 276px (comparison: 306px); artwork is 80px high (comparison: 112px). Reduced padding keeps the title at 17px and the progress/reward numbers at 23/25px.
- The card remains directly below sound. Portrait and compact landscape layouts use a horizontal art strip. Portrait HOME reserves the measured quest height, including translated and longer names. Zeno remains visible beside the sound row.
- Existing progression fetches, account guards, refresh after settlement, daily reset timer, detail dialog and revision-checked reroll are retained. Rewards remain server-settled and automatic. Guest and unavailable-data cards do not invent progress or rewards.
- `tests/daily-quest-card-browser.mjs` exercises the actual HOME/router with fixture APIs at 1440×900, 1280×720, 1024×600, 390×844, 320×640 and 844×390, plus progress, completion, reroll, a long name, keyboard close and HOME remount. Fixture evidence is distinct from authenticated live account evidence.

Source: `client/src/ui/dailyRewards.ts`, `client/src/styles/dailyQuestCard.css`, `client/src/ui/lounge.ts`.

The release uses the existing committed-main deployment guard. Deployment success and live verification are reported separately after they complete.
