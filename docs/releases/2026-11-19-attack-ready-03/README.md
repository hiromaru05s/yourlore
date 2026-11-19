# Attack-ready 03: blue frame light and compact arrow

The adopted 03 study replaces the ordinary attack-ready chevron and red highlight with a blue frame-bound light and wing-shaped arrow. The arrow uses 80% of the original study size. Its canvas is layer 4; the existing mana, attack and health seals remain layer 5, so the light cannot cover their icons or values.

Source: `client/src/ui/monster/attackReady.ts`, integrated in `client/src/ui/monster/runtime.ts`. `client/src/ui/cardClone.ts` excludes this transient ready surface from attack/destruction clones. The actor's native card projection carries the frame, light and arrow together. Target selection and transient actions hide the ready surface; ordinary eligibility resumes it. Existing gold dual-attack readiness remains unchanged and hands off to blue readiness when one attack remains. Reduced motion keeps a static readable shape. State removal disposes the canvas.

Approved reference: local `client/src/dev/attack-ready-three/effect.ts`, study 03 after the layer fix and 0.8 arrow-size correction. Its source remains in the isolated preview worktree. Pixel, pose and shadow parity passed at 5 phases × 2 orientations × normal/reduced motion (20 cases): `parity.json`. This confirms faithful adoption of the selected appearance; it is separate from lifecycle and game-rule validation.

Workspace/preview origin: `/Users/hiromaru05s/.codex/worktrees/attack-ready-three-1119/LORE_TCG`, `http://127.0.0.1:5198/`. The baseline includes `6459c4fd4` and thus the current card-print sampling, mana summon and rift material changes. No account data, game rules or attack eligibility were changed.

Browser tests use the real GameView/controller and synthetic match state; authenticated PvP and physical-device GPU performance are not covered by those fixtures.

## Completed local checks

- Client typecheck passed.
- Accepted-preview parity: 20/20 (exact canvas pixels and shadow string, numerically equal pose).
- `tests/attack-ready-browser.mjs`: 12 check groups passed, no page errors. Covers the shipped controller/native field actor, seal layering, aiming/cancel, interrupted attack clone cleanup, gold dual → blue single → exhausted → ready, repeated rerenders, both directions, landscape resize, reduced motion and destruction. See `qa/report.json`; full-size screenshots are retained locally beside it.
- A fixture initially imported a second Vite HMR-stamped runtime instance, which made its manually created opponent states escape controller cleanup. The test now reuses the exact runtime URL loaded by the controller. The normal runtime disposal passes without any cleanup workaround.

## Production verification

- Implementation: `f429427003ca316e81d0be475e85f67f9110b3b6`. Released source: `9a809bc61518a2642f988e78353d9e9a3ad7850d`, incorporating the prior release verification records.
- Guarded `npm run deploy` completed successfully on 2026-11-19 at 12:16 UTC. Both client/server typechecks, the production suite (304/304), and the production build passed in a clean committed snapshot. See `production-suite.json`.
- Cloudflare version `1c840b91-bc83-41e2-83a3-9366fa1b8500` receives 100% of traffic; the deployment annotation identifies the released source above. See `deployment.json`.
- Fetched the live root entry `/assets/main-Dt1vB_c4.js` and its reachable 113 JavaScript modules, with no fetch failures. The served `/assets/layout-CH-StTkA.js` contains `azure-03` and the ready canvas at `z-index:4`; the served card-surface module removes that canvas from transient clones. Checksums and excerpts are in `production-verification.json`.
- Production verification confirms the live artifact and deployment. Visual/lifecycle checks use the real local GameView fixture described above; authenticated live PvP was not exercised.
