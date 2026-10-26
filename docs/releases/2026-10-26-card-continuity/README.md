# Card print continuity and resolution

## Source

Implementation started from adopted remote `gh/main` `e4ba31f5`. Worktree: `/Users/hiromaru05s/.codex/worktrees/card-continuity/LORE_TCG`; branch `codex/card-continuity`. The original Desktop checkout and its uncommitted work were preserved. Latest main is integrated before release. Preview/actual-board fixture served from this worktree, initially port 5576 and final verification port 5577 (HMR disabled).

Owning implementation: `client/src/ui/{cardView,cardPrintCapture,cardContinuity,cardClone,boardView,paperDraw,sceneMotion}.ts`, `ui/summon/`, `ui/monster/`, `ui/manaDestruction/`, `styles/{card,game,reading-board}.css`. Existing adopted artwork, board and special choreography remain the reference. Quality benchmark read: `docs/animation-quality-benchmark.md`, `docs/vfx-art-direction.md` (銀紋の流墨 v2). The benchmark video in the Desktop checkout is a frozen reference, not the current board.

## Changes

- Native card print ownership through ordinary summon, draw and purchase. Idle field presentation uses the real source rather than an opaque cloned replacement. Unchanged decoded print nodes survive controller snapshots.
- Pre-baked celestial alpha at source resolution, high-quality WebP with lossless alpha. Art and frame layers sample at twice their local layout size; native lettering remains separate. Full inspection sampling stays unchanged. Spell and quest plates share the bounded sampling.
- Dedicated deformations capture the actual browser print, including fonts, status seals and cosmetic canvases, rather than reconstructing an approximate face. Capture sizes are tiered 768–1536 pixels before padding. WebKit subimage decode and filtered-layer resolution are handled before publishing the image.
- Generic rectangular backing, catcher or shadow removed on board-rendered mage, golem and dragon fusion; draw underside glow follows alpha. Normal summon sheen follows the actual art/frame shape.
- Destruction retains a sharp source and reformed print; only fragments and lighting maps use small textures. Public graveyard exits survive authoritative board replacement. The final hidden landing cannot be consumed prematurely by snapshot reuse.
- Persistent spell and quest texture buffers adapt to projected size/DPR, capped at 2048. Rebirth/ritual no longer force a 384px card crop.

## Resource bounds

Normal summon and purchase no longer allocate a separate captured card texture. Static blocked cards have no duplicate `.duet-card` and no idle style mutations in the regression probe. Captured asset promises are bounded to 48 entries. Small field captures use 768px content rather than unconditional 1536px. Fragment source remains 512px, lighting maps 192px. Pre-baked frame assets are about 2.6MB total; this is an asset-pack measure, not a per-match transfer or GPU-memory claim. Browser timing depends on load and is recorded in the raw reports; physical iPad/Windows GPU frame rate is not established.

## Frame-skin integration contract

For the separate frame-material work, attach `canvas.card-frame-material` inside the existing `.card-frame`/seal layer without changing root geometry. `cloneCardNode` preserves all canvas pixels. `captureNativePrint` embeds all source canvases and accepts a live source when capturing a clone. Regular draws borrow the actual children; temporary owners remove `data-card-frame` and carry `data-borrowed-card-print=true` and `data-card-frame-borrowed=true`, so a skin MutationObserver must not reinitialize these borrowed canvases. The original owner remains connected and is restored atomically. Persistent runtime owners must dispose only their own canvases.

`retainCardPrint` deliberately avoids moving `.card-frame` when either owner has `data-card-frame`; the new skin owner must initialize its material from the UID equipment context. Purchase landing also keeps a new cosmetic owner in that case. Frame module APIs should provide UID context synchronization before card construction, attach, dispose and async readiness; add `await ensureCardFrameReady(source)` before specialized texture capture at final integration. Proposed module APIs `attachCardFrame`, `syncCardFrames`, `frameForCard`, `rememberCardFrame`, `disposeCardFrames` align with this ownership contract. That module, equipment persistence and its full path validation are owned by the separate frame-skin change and are not claimed implemented here.

## Verification / release

Final verification and deployment identifiers are appended after completion. Local fixtures exercise real reducer/controller/GameView and continuous rendered animation, but do not establish authenticated PvP or physical-device results.

### Integration follow-up (after e6e795b4)

The shared capture normalizes the native `200% / scale(.5)` art/frame layers when laying out in output pixels. It avoids a 4800px filtered intermediate in WebKit and redundant 4x raster work. Embedded WebP is converted losslessly to cached PNG pixels for SVG-image decode stability. Inner SVG viewBox lengths are not scaled twice. Quest runtime sets renderer pixelRatio=1 before applying its explicit DPR budget (otherwise the supposed 2048 bound doubled again). Persistent cleanup now targets only `.persistent-flight-canvas,.persistent-flight-trail` and `.quest-fold-canvas`, preserving nested material canvases. Frame owners retain their cost/attack/health seals as well as the frame. Frame-skin integration must include these follow-up changes before investigating duplicate symptoms.

Cloned public counters now copy their WeakMap presentation identity/sample. This prevents a Guts result on a transient actor from updating an unregistered badge. Native presentation-node lists are deduplicated. The counter material is painted before replacing its native face, including asynchronous preparation.

### Final local verification (source b2ccdded)

- Chrome and WebKit: desktop DPR 2 / mobile DPR 3 actual controller paths for draw, purchase, lethal exit, capture quality and idle ownership passed, without runtime/capture fallback errors.
- 288 appearance combinations, 20 summon families plus interruption/reduced-motion/resize paths passed. Fourteen special entry cases (both owners) passed.
- Persistent spell/quest paths (E3, WORLD_SEED, Q_RIFT), both owners and viewport sizes, preserved nested cosmetic materials with bounded buffers; Chromium and WebKit passed. Counter/Guts, Rift and draw-hand-tone regressions passed.
- Continuous playback and board images were inspected separately from assertions. Normal/mage timelines are retained in qa; alpha-shaped print edges and same-source landings replace the extraneous rectangular backing. Browser emulation does not establish physical-device FPS or authenticated online play.
- Frame-pack measurement: transfer 7,572,102 → 2,652,924 bytes (old unique UI pack plus old four lossless base frames vs replacement pack); decoded RGBA 38,273,024 → 41,396,224 bytes, approximately +3 MiB. These exclude illustrations, compositor surfaces and GPU memory. No per-device FPS increase/decrease is claimed.
- Latest full production suite before final focused follow-ups: 229/229 passed. Guarded releases rerun the full suite against the exact committed snapshot.
