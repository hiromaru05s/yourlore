# Three daily quests and concise HOME rewards

Daily quests are now three distinct assignments per account and UTC+9 day, with a shared three-change allowance. HOME shows only each objective, reward and progress. Clicking an eligible row opens a YES/NO replacement confirmation. The former reward-detail page is removed. Casual/ranked modes show earned daily Shards against their respective caps.

Existing slot-zero assignments, progress, revisions and reward keys remain intact. Migration `0029_three_daily_quests.sql` adds only the two extra slots. Match setup snapshots all three quests; transactional settlement pays each once. Already-running legacy rooms keep their original single-quest snapshot. Replacing a quest invalidates its prior snapshot without resetting the other two. Existing match rewards and first-clear amounts are unchanged.

Source reference: `b7bdb6bb`, then current main including `99a13930` draw-sleeve fix. Adopted components/assets: `client/src/screens/home.ts`, `ui/lounge.ts`, `ui/homeDuelButton.ts`, `styles/defaultUI.css`, `styles/defaultButtons.css`, `art/ui/lore-panel-azure-cut.png`; existing HOME environment and Zeno remain in use.

Preview origin: `/Users/hiromaru05s/.codex/worktrees/daily-quests-simple/LORE_TCG/client`, `http://127.0.0.1:5331`. Browser fixtures exercise the real HOME/assets with controlled account/API values at 1440×900, 1280×720, 1024×600, 390×844, 320×640, 844×390 and three languages. Reward tests cover existing assignments, day rollover, cross-slot concurrent changes, stale snapshots, legacy rooms, atomic rollback and idempotent three-reward settlement. Functional checks do not constitute user visual approval or authenticated live PvP verification.

Production verification: `scripts/check-daily-quests-deployed.mjs` uses a disposable preverified account to check real assignments, NO/YES changes, shared budget, rejection of a fourth change, reload persistence and HOME progress bars; it removes the account afterward.
