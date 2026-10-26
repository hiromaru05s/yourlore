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

## Production release, 2026-10-27 KST

- Integrated source: `c6fdc343799c67abd5dce3cc2ed2c81dd0304112` (fix `a0126f0b`). The preceding production deployment lock was respected; no deployment lock was removed or bypassed.
- Guarded committed-snapshot release passed typecheck, **237/237** production suite checks and build. Worker version `9b93c38f-fa5a-4dee-affc-cb474f3877ab`, deployment `12c6c9e9-75c2-4237-9d3e-6e555e4076f8`, 100% production traffic. Release log: `/tmp/lore-board-deploy.log`.
- Production `https://yourlore.xyz/cosmetic-studio.html?board=1&runtime=1&set=default&tempo=1`: **both desktop and mobile widths passed** table/flight context-loss recovery, unchanged serialized match state, restored mana and piles, combat after recovery and disposal cancellation. No page errors. See `qa/production.json` and production screenshots.
- The compiled local build also passed the desktop recovery test. A separate cold-initialization probe denied the first board WebGL context; one automatic retry restored the table with one canvas.
- Original user-device trigger remains unconfirmed. Verification deliberately injects GPU context loss; authenticated online matches and physical-device behavior were not tested. An already open older client needs one reload to load the fix.
