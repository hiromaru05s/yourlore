# LORE reading board 01–06

Runtime exports of the delivered Blender components:

- 01: `docs/3d-assets/2026-09-15-blender-reading-board/`
- 02: `docs/3d-assets/2026-09-20-blender-mana-ui/`
- 03: `docs/3d-assets/2026-09-20-blender-deck-place/`
- 04: `docs/3d-assets/2026-09-21-blender-shelf/`
- 05: `docs/3d-assets/2026-09-21-blender-turn-button/`
- 06: `docs/3d-assets/2026-09-21-blender-reroll-button/`

Meters, glTF Y up. Shared card width 0.110 m. Board eye tilt 18 degrees from the top. Component 01 is split into board/market/supply for the existing opening drop animation; source geometry/materials remain in the delivered editable Blender file. Re-export with `scripts/blender/export_reading_board_runtime.py`.

`readingBoardLayout.ts` owns positions and height conversions. `duelScene.ts`, `duelTable.ts`, `pileModels.ts`, and `readingBoardWidgets.ts` own the shared renderers and resources. Native card faces/buttons keep game state, accessibility, and full resolution. Model resources are disposed when the duel is destroyed.

Mana optics reproduce the 57-plane cut authored for component 02; the game uses up to 30 instanced gems without altering the current mana rule. Text and timer state are live, not baked into the model. Font licensing is included in `fonts/`.
