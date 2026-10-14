# Infinity — adopted 05, turning pages

User selected 05「頁の折り返し」from the October 14 turn-end five-way preview and authorized staging.

The renderer retains the approved source-to-Cull reveal, edge hinge, curved stock, low flight and flat receiving motion. Real card surfaces are captured in the current language. Normal playback is 3.6 seconds. For extreme amplified totals, up to 24 sheets represent the batch; authoritative resources and event amounts remain exact.

## Runtime contract

- Spell prevention still creates Cull immediately, exactly as before. No card text, resource availability, damage, UID generation or balance timing was changed.
- `infinityStored` identifies those new public Cull UIDs so the controller suppresses their generic generated-exile animation only. Other generated Cull still use their own path.
- Public `infinityPresentation` metadata accumulates by enchantment UID. After mandatory turn-end actions, overflow choices and end effects resolve, the engine emits `infinityRelease` before the next turn header, then clears the metadata. This survives serialization/reconnection and does not generate Cull twice.
- BaseController invokes the selected renderer through the shared cancellable animation scope. The source is the real enchantment tile; if it already left, its Infinity face appears at a vacant enchantment slot. Missing targets skip presentation safely.
- Resize, hidden document, controller destruction and fast-forward dispose the canvas, lights, geometries, textures and receiving state. Reduced motion / unavailable WebGL uses the simplified path.

## Local validation

- Client typecheck passed.
- `tests/infinity-cull.mjs`: both players × 0/1/3/5/8/12/50 damage, exact immediate resources, explicit generation UIDs, deferred turn-end amount, redaction/JSON persistence, no repeat on the following turn, accumulated hits, hand-cap pause and removed source.
- `tests/quick-playback.mjs`: actual controller event consumption suppresses only Infinity-generated UIDs and calls 05 once at release. An unrelated generated Cull still plays normally.
- `tests/infinity-cull-browser.mjs`: actual reducer → BaseController → GameView → production renderer. Both sides, 390px/12 cards, source identity, reduced motion, skip/resize/hidden cancellation, removed-source fallback and controller teardown. Browser exceptions: zero. This is not an authenticated multiplayer match.
- Evidence: `local/report.json`, `local/side-0.png`, `local/side-1.png`, `local/mobile.png`, `local/playback.webm`.

## Staging verification

- URL: https://test.yourlore.xyz
- Guarded source: `71994995b37f090d0686df77c7fe0eaa9c7d997a`.
- Worker version: `4e5822f6-ad8a-49f3-837a-a6f3d8a64f5c`, 100% traffic, deployed 2026-10-14 05:42 UTC.
- Clean snapshot: client/server typecheck, **126/126 production tests**, design guard and production build passed. `guard-result.log` and `deployment.json` preserve the result.
- **84/84 served files** match SHA-256 of the exact guarded build plus six unchanged source/Cull art files (`staging-assets.json`).
- The served controller/renderer passed both sides, immediate resources without an early animation, turn-end 05 with the exact source UID, 390px/12 Cull, reduced motion and destruction cleanup. Browser exceptions: **0**. See `staging/report.json`, screenshots and `staging/playback.webm`.
- Visual review of the recorded sequence confirms the selected page reveal, staggered fold/flight and Rift arrival. Screenshots are supplemental: under host contention a screenshot may complete after its requested animation time.
- The first browser attempt stalled during page loading under concurrent host load and was stopped. A fresh browser completed the same assertions without changing time limits.
- Validation uses real reducer/controller/GameView fixtures on deployed assets; an authenticated multiplayer match was not performed.
