# Fixed ENEMY TURN label — 2026-11-04

Follow-up to the in-game card-controls release: the opponent-turn button now uses
`ENEMY TURN` in Korean, Japanese, and English, preserving the existing two-line
layout and disabled state. Player turns continue to show `END TURN`.

Implementation: `f80c87d2`, `client/src/i18n.ts` (`duel.enemyLabel`). Both
`client/src/ui/boardView.ts` and `client/src/ui/readingBoardWidgets.ts` consume
this key, including the immediate end-turn transition.

Validation before deployment:
- Existing duel DOM regression passes for all three languages: player label,
  opponent label/disabled state, and immediate end-turn label.
- Existing real-browser board fixture passes in all three languages, including
  a stable ENEMY TURN label after the physical button animation settles.
- Existing hand inspection/drag/play checks in the same browser run also pass.
- Preview source: task worktree at
  `/Users/hiromaru05s/.codex/worktrees/ingame-card-controls/LORE_TCG`,
  `http://127.0.0.1:5207`, based on latest adopted main `0e459488` plus `f80c87d2`.
- `local-ko-enemy.png` was visually inspected; existing board/assets were used.

Production verification:
- Source `a41a503ab925d7a8152abd45ef18e6cf9e8ea589` deployed at
  2026-11-04 18:50 KST, version `7e5e22ee-0086-47fe-b504-4a79454e7733`,
  100% traffic. This includes the requested `f80c87d2` implementation.
- All 267 required regression files, client/server typecheck, database schema
  preflight, design guard, and production build passed.
- Production browser smoke passed in Korean, Japanese, and English. Each run
  started the actual app, entered local single-player, clicked END TURN, and
  observed ENEMY TURN with the button disabled. No page errors.
- `production-browser.json` records observed labels and loaded production bundle
  URLs; `production-ko.png` was visually inspected.
- Browser smoke uses a fixture local guest API with real production application/
  assets. No real accounts, server game records, or authenticated PvP were used.
- An initial task-local deploy attempt inherited sparse-checkout exclusions and
  failed typecheck on a legacy prototype import. The task worktree was restored
  to a full checkout; the successful integrated release used a complete snapshot.
