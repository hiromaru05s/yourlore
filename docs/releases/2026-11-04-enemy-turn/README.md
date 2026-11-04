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

Production verification is recorded after deployment. Browser smoke uses a
fixture local guest API with the real application/assets, not real accounts/PvP.
