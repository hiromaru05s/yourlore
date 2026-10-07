# Selected persistent spell 02 — staging integration

User selection: persistent-five **02「すっと飛ばす」** (2026-10-07), from preview commit `63dada48`. Rejected seven-study variants are not integrated.

The live `revealSpell` field branch now carries the revealed card along the approved short arc, with the narrow trailing light and one quiet contact outline. The 240–880ms travel, tilt, surface sweep, morph, contact and 2200ms full timeline are retained. Source texture height follows the actual revealed card; destination textures capture the actual localized native tile. The native tile replaces the raster surface after the contact tail, before the controller's authoritative render. Persistent spells no longer play the unrelated spell frame and duplicate enchant-place effect. Quick spells and quests retain their existing paths.

Local runtime checks use actual `GameView` and `revealSpell`, not the proposal renderer. Reproduction: `node node_modules/vite/bin/vite.js --config client/src/dev/persistent-flight/vite.config.mjs`, then `/persistent-flight.html?qa=run`. The fixture is excluded from the production Vite build.

- Desktop 1280×720 and mobile 390×844: both sides, countdown and permanent cards; active skip, resize cancellation, pre-skipped playback. See runtime-qa-desktop.json and runtime-qa-mobile.json. Every ending retained the native ghost and left zero temporary canvases, zero source flights and zero hidden native faces.
- Reduced-motion fixture (`?qa=run&reduced=1`): 7 paths completed with no flight WebGL canvas.
- `tests/persistent-flight.mjs`: cancellation before start and during asynchronous capture, late capture resolution, normal native handoff, active abort, render failure, disconnected target, RAF/GPU/source cleanup.
- Existing spell-frame and quest lifecycle tests passed, and client/server typecheck passed.
- Visual checks: native board at both widths; identity remains legible, no extra full-screen impact, square native landing. Selection approval is the user's 02 choice. Automated checks do not constitute an independent artistic quality score.

Staging deployment and asset verification are recorded separately after the guarded release. Local fixture checks do not claim an authenticated staging match.
