# Duel board recovery

User reported the table, deck furniture, mana crystals and physical controls disappearing while cards and the match remained visible.

Reference: latest adopted remote main `c6abd89e955aa6be5b0e919dfa7512ec59946182`, including the deployed `ed86e67c94336abd165c4fc4bb55d41260bc8e31`. Owning files: `client/src/ui/duelScene.ts`, `duelTable.ts`, `readingBoardWidgets.ts`, `styles/reading-board.css`. Existing approved board models and materials are unchanged. The original Desktop checkout's unrelated changes were preserved.

The production board/controller fixture reproduced the missing table and furniture after `WEBGL_lose_context`. The old loss handler permanently disposed both renderers while the controller continued, leaving the projected layout without its 3D presentation. The user's original GPU-loss trigger cannot be established from the screenshot alone.

The scene now rebuilds its two renderers, cached targets, model instances and equipment presentation after loss, preserving the existing controller and DOM. Readiness is invalidated before rebuilding. Initialization failures also retry; retries are deduplicated and limited to three within a 30-second window. Destroying or disconnecting the view cancels pending recovery. Final disposal explicitly restores fallback flags after child cleanup instead of leaving stale ready state.

## Verification

- Typecheck and recovery lifecycle test passed.
- Actual board/controller Chromium fixture at 1902×950 and 390×844: board context loss and flight context loss recover; unchanged serialized game state; exactly one board canvas and one flight canvas; deck/mana/table restored; subsequent lethal combat succeeds; destroy during pending recovery does not resurrect the scene.
- Restored desktop and mobile images inspected separately from functional assertions. Source preview: `/Users/hiromaru05s/.codex/worktrees/duel-board-restore/LORE_TCG/client`, `http://127.0.0.1:5589`.
- These are synthetic GPU-loss and controller fixture checks, not authenticated PvP or physical-device GPU verification.

Guarded production deployment and deployed verification are recorded below after completion.
