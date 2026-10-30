# Turn timer after draw — 2026-10-29

Ranked turns now last 65 seconds (50 × 1.3). Casual/local turns remain 90 seconds; hand-cap choices retain the existing 10-second extension.

The client invalidates the previous turn's interval immediately but starts a new interval only after the latest turn-start playback finishes. The first opening also waits for its native card deal and input unlock. Online clients announce `turnReadyVersion:1` and send a turn/side-specific `turnReady` after playback. The server persists the waiting state and starts its authoritative clock once the active player is ready, then sends a clock-only message to both sides. Duplicate, stale-turn and opponent acknowledgements cannot reset it. Reconnects preserve an already-running clock and cannot extend the pending readiness window. Bots and old clients retain their existing immediate-start behavior.

A nonresponsive client has a 45-second maximum readiness wait, after which the server starts its regular timeout; disconnected clients retain the existing 30-second forfeit rule. This prevents a missing acknowledgement from freezing a match indefinitely. No animation assets or choreography changed.

## Source and browser verification

- Base: remote main and deployed source `5839a8bd39128f80f1453a82e8ccc1ffbafdf7bc`.
- Implementation: `client/src/game/controller.ts`, `client/src/game/online.ts`, `client/src/shared/protocol.ts`, `server/src/gameRoom.ts`, `server/src/gameInput.ts`.
- Adopted board/draw presentation: `client/src/ui/boardView.ts`, `client/src/ui/anim.ts`, existing assets from the same base. Actual fetched assets are recorded in `browser-report.json`.
- Preview origin: `http://127.0.0.1:5537`, started from `/Users/hiromaru05s/.codex/worktrees/turn-timer-ready/LORE_TCG`.
- Browser integration uses the real bundled GameRoom and two OnlineControllers with an in-process storage/WebSocket fixture. A delayed playback holds all 65 seconds; the native three-card draw finishes before the active player's acknowledgement; both clients receive the running clock. The real first-turn opening releases inert input and finishes its draw before acknowledgement. Screenshots inspected: `waiting.png`, `playable.png`.
- Targeted checks: typecheck, turn-clock, turn-ready-server, duel-opening-server, match-bots, production-security, seeker-book all passed.
- This is automated functional coverage, not a claim of authenticated live PvP or physical-device verification. Full production suite (251/251), typecheck and build passed. `verification.json` records the result and deployment blocker. GitHub rejected the configured push credentials; main and production remain on the base revision. Resume with authenticated main integration and the existing guarded deploy; no deployment guard was bypassed.
