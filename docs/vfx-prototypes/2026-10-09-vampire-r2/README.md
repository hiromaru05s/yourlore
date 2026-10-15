# Vampire summon comparison — revision 02

Local comparison of six directions, each supporting VAMP1–VAMP5 and VAMP_BUTLER. User rejected revision 01 as visually weak on 2026-10-09. No direction has been selected, adopted in normal gameplay, or deployed.

Preview: http://127.0.0.1:5436/vampire-six.html

Start: `node node_modules/vite/bin/vite.js --config client/src/dev/vampire-six/vite.config.mjs`

## References reviewed before rebuilding

- `docs/animation-quality-benchmark.md`: approved 銀紋の流墨; material continuity from the card, legible shape, physical face contact, no particle-only substitutes.
- Adopted tribe summons: `gh/main:client/src/ui/tribePresentation/selection.ts`, `renderer.ts`, `approved.ts`. These use one main card action, clipped material response and controlled sheen. Their value is restraint and a readable completion, not prop count.
- Adopted 絡根の解放 04: release worktree `verdant-roots-04-staging`, continuous board recording `docs/releases/2026-10-08-verdant-04/qa/normal-speed/selected-five.webm`. Inspect actual card-scale behavior and handoff to the native board.
- Adopted 選ばれし領域 01: `gh/main:client/src/ui/chosenVictory/material.ts`, `renderer.ts`, release worktree `chosen-crown-staging`, revision 2 continuous comparison. Dedicated art, independent branch timing and spatial dissolve provide detail and a definite formation moment.
- Read the user feedback in those three chats. Earlier objections include cheap procedural props, repurposed card illustrations, disconnected decoration, and previews without real hand/board flow.

## Reconstruction

Revision 01 (commit 517fe4ca) used procedural panels and ribbons that read like shutters. Revision 02 replaces that active renderer with six dedicated transparent materials, generated separately by built-in image_gen. Images and exact prompts are in `client/public/vfx/vampire-r2/01.png` through `06.png` and `prompts.md`. Original alpha is preserved.

1. 緋流の凝結 — liquid ribbon, vertical flow, torsion and inward contraction.
2. 夜翼の帰還 — membrane spreads from its root; distal wing follows and folds inward.
3. 荊薔薇の覚醒 — radius-dependent petal delay, rotation, then erosion from outer petals to heart.
4. 黒衣の顕現 — collar-to-hem formation, traveling cloth wave and upward dissolution.
5. 血晶の解放 — radial facet convergence, compression and fracture release.
6. 銀血の戴冠 — seven branches assemble at independent times, press inward, and leave a foil sheen.

These are 2.5D textured meshes with spatial deformation and material erosion, not full volumetric simulations. Card-face shading follows the same directional reveal. Normal card content remains readable at arrival; the original native tile returns at the end. Rank changes material extent; the butler has quieter displacement and a silver edge response. Geometry cannot sink below the card face (fixed during visual review).

## Verification and boundaries

- Vite build passed; client TypeScript passed; `git diff --check` passed.
- Browser QA passed on 1304×984 and 390×844: 117 state/lifecycle checks each. Both sides × all six cards × all six directions, real hand source, three simultaneous summons, reduced motion, native restoration and iframe cleanup.
- Functional checks do not establish artistic acceptance. Visual review caught and fixed petals occluded by the card and a shader reserved-word compilation error. All six rendered after the fix.
- `qa/six-continuous.mp4` is the complete authored 3.4-second timeline sampled at 30 fps, not a real-time device-performance measurement. `qa/frame-record.json` records the export basis.
- `qa/sequence-*.png` and `qa/*-six.png` capture formation, release and contact for comparison. Browser screenshots show the actual UI/board.
- The board is a local public-card GameView fixture, not an authenticated match. Production animation routing is untouched.

Use the card buttons, 6案を比較 / 拡大 / 実盤面, seek, loop, side and 3枚同時 controls. The real-board summon can also be started by clicking/dragging the hand card.
