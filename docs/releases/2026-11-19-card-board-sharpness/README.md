# Board card print sharpness

Base: `fd0e65230a6882e845275d15c9c70e136d071e00`, verified against fetched `gh/main`.

The reported browser is Chrome. At 1746 × 921 / DPR 1, native board card titles and numeric seals were visibly softer than a high-resolution capture of the same print projected at the same size. The original illustration URL already matched the zoomed card. The preceding compositor-state change did not address the typography's low raster density.

## Change

- Sample board/market/hand image, frame, title and numeric seal layers above their layout size, then reduce them into the unchanged card interaction box. Use 4× at DPR < 2 and 2× at DPR ≥ 2. Zoom retains its own native layout. No illustration, frame design, board geometry or character assets changed.
- Apply dim/exhausted tone to the sampled seal print, preserving the numeric parent boxes used by stat animations. Scale contour shadows to maintain their physical size.
- Normalize these local sampling scales when capturing a card for material effects. Preserve custom frame attachment for detached seals and include nested seals in the hand condition outline.

Owning paths: `client/src/styles/{card,game}.css`, `client/src/ui/{cardView,cardPrintCapture,cardSurface,cardFrameMaterial,handConditionOutline}.ts`, `client/src/ui/summon/appearance.ts`.

Preview source: `/Users/hiromaru05s/.codex/worktrees/card-dim-resolution-1119/LORE_TCG`.
Dev URL: `http://127.0.0.1:5591/cosmetic-studio.html?board=1&runtime=1&set=default&tempo=1`.
Built preview: same worktree, Vite preview at `http://127.0.0.1:5592`.

## Verification

- Before/after screenshots use the same Chrome viewport, DPR, fixture, card and projected size. Titles, numeric seals and image detail visibly improve. Nearest-neighbor enlarged crops are inspection evidence, not a change in game card size.
- `tests/card-state-resolution-browser.mjs`: Chrome and WebKit, 1746/DPR1, 1280/DPR2, 390/DPR3; ready → blocked/exhausted → ready for field, both markets and hand. Checks full art, stable geometry/sampling, nested seal tone, shadows and page errors.
- `tests/card-resolution-browser.mjs`: Chrome 1746×921/DPR1, RUST_SHROOM summon; hand open/closed, zoom, live canvas capture, all monster appearance states, single application of grayscale, interrupted/resize/reduced-motion cleanup.
- `tests/card-frame-continuity-browser.mjs`: Chrome 1746/DPR1 and 390/DPR2 with mirror-silver; actual live frame retained during draw, purchase, capture and summon. Updated its stale draw selector to the adopted native-card owner.
- `tests/hand-condition-contour-browser.mjs`: 15 states, including monster/spell, fan positions, custom frames, resize, hover, mana and reduced motion. Updated fixed 2× assumption to use the actual layer scale.
- Typecheck and production build passed. Deployment uses the repository guard and full production suite.
- The older `card-continuity-browser.mjs` reaches its destruction-event assertion with no event although the expected card is already in the graveyard. Reproduced unchanged against base `fd0e65230` using a Vite server serving the original owning files. This is not counted as a passing end-to-end test; the separate frame/summon tests above passed.

Local evidence: `/tmp/lore-resolution-qa/sharp-*` and `before-after.png`; persisted release evidence is under the current Codex visualization directory.
Browser-emulated viewports and real controller with synthetic states; not authenticated PvP or physical-device verification. Small cards still have fewer final display pixels than the enlarged inspector.
