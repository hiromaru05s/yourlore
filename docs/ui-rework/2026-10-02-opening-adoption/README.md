# Approved opening: Caustic → Declaration

2026-10-02: user fixed 03「光膜」for contact/coin reveal and 01「余白の宣告」for the coin result, then authorized push, merge and staging deployment. `selection.json` preserves the approved prototype source hashes.

## Runtime

- `ui/opening/` contains only the adopted rendering paths: Caustic light, minted coin, fine collision edge, Declaration result. Unselected designs are not bundled.
- `duelOpeningDirector` owns the canvas and GPU lifetime, localized names/results, audio, abort/visibility cleanup, and the existing initial hand delivery callback.
- The approved visual remains 5.58 seconds: toss at 1.46, result at 3.22, withdrawal at 5.12, clear at 5.58. Existing initial hand delivery follows for 1.35 seconds. The authoritative playable deadline is 6.93 seconds.
- No BATTLE START, duplicate turn caption or turn SE in the opening. The controller's existing `turnBanner` runs once after completion; its design is unchanged.
- The authoritative first player is never rerolled. The same result, blue/wine coin face, and player-relative presentation are used offline and online.
- Opening protocol v2 prevents older and current clients from using different clocks. Mixed versions use the existing legacy immediate-start path; an already-started room retains its persisted playable deadline. Pre-release pending alarms retain the earlier duration.
- Every playback owns and disposes its two temporary GPU contexts. Artwork failure / unavailable WebGL has a text/Canvas fallback. Reduced motion uses a static result; hidden online tabs retain the server gate.

## Verification

`tests/opening-approved.mjs`: both outcomes, one deal, no duplicated turn/start notice or cue, server and older-room deadlines, visibility skip, abort during asset loading, reduced motion, cleanup. GPU/audio are mocked in this lifecycle test; visual evidence is separate.

`tests/duel-opening-server.mjs`: two-player readiness, full first-turn clock, pre-deadline input rejection, reconnect/hibernation, ranked preparation, alarm ordering, hidden opponent hands, v1/v2 compatibility, persisted deadlines.

Browser: actual runtime light/coin transition and both result states inspected in the GameView lab; natural playback delivers three cards and removes the overlay. 390×844 result layout inspected. The actual BOT controller completes the opening, deals three cards and starts the first-turn clock. Staging verification is recorded separately after deployment.

Typecheck and build passed. The first production-suite run was 48/50: the missing Image.decode fallback was fixed and duel-ui passed on rerun; tutorial timed out under concurrent load and passed separately. The guarded release reruns the entire suite on the committed snapshot.

## Isolation

Implemented in `codex/opening-caustic-declaration`, a dedicated worktree based on `11732bc8`. Shared uncommitted development/prototype files were not staged, reset or stashed. Refresh main and prove ancestry before merge and the guarded staging release.
