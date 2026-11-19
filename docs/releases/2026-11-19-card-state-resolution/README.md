# Card state print consistency

Base: `0b2397b97ba45c3e79a6fe32e268a4cdfe5f5aaa` (fetched `gh/main`).
Owning implementation: `client/src/styles/game.css`, `client/src/styles/card.css`, `client/src/ui/cardView.ts`, `client/src/ui/summon/appearance.ts`.

Live field, market and hand already request the same full-resolution artwork in either state. The remaining state-dependent paths were CSS compositor groups and silhouette shadows: unfiltered text/art became filtered groups, and dim market/hand frames lost their two fine edge shadows. Keep bounded game-print layers prepared for filtering in both states; retain the same frame/cost contour while changing its tone. Gallery grids are excluded. Existing 2x art/frame sampling and native text layout remain.

Preview origin: `/Users/hiromaru05s/.codex/worktrees/card-dim-resolution-1119/LORE_TCG`, Vite `http://127.0.0.1:5591/cosmetic-studio.html?board=1&runtime=1&set=default&tempo=1`.

Validation:
- Typecheck and production build passed.
- The same Chrome/WebKit checks also passed against the built files served from this worktree at `http://127.0.0.1:5592` (Vite preview), including a live attack-ready field actor becoming exhausted.
- `tests/card-state-resolution-browser.mjs`: Chrome and WebKit, 1280px/DPR2 and 390px/DPR3. Actual GameView/controller fixture: ready → mana-blocked/exhausted → ready, field, fixed market, offer market and hand. Assert original art URL and natural width, layout/sampling density, prepared compositor layers, preserved frame shadows and no page errors.
- Screenshots inspected for grayscale indication, print detail and contour continuity. This is a static-state rendering fix, not a newly approved animation design.
- Local screenshots/reports: `/tmp/lore-card-state-resolution/`.
- These are browser-emulated viewports and synthetic game states, not physical-device or authenticated PvP verification. The user's exact display/browser was not available, so the compositor stabilization should not be described as a measured resolution gain on that device.

Release uses the repository's production deployment guard; record the resulting commit/version and deployed asset checks after it completes.
