# Aligned identity rail — local preview

The user clarified that the **grave tray**, not the deck, was too large. The requested screen-space line is the self portrait's top: persistent-icon tops, deck/grave bottoms, nameplate top and rank/medal-frame top meet that line. Both players receive the compact grave, outward-shifted mana tray, larger nameplate and larger insignia frame. The opponent nameplate stays above its mana tray, retaining the previously requested pitch.

## Verified reference and origin

- Reviewed preview source: `96eb9dd47` on `codex/seven-spell-nameplate-1119`; source was clean before this adjustment.
- Adopted board/material baseline remains `d3ca461a7`, previously merged into this preview branch.
- Real source assets: `client/public/models/reading-board/v2-shared/{mana-tray,shelf,deck-place}.glb`. Existing characters, card art, board, lighting and common UI remain in use.
- Worktree: `/Users/hiromaru05s/.codex/worktrees/nameplate-board-1119/LORE_TCG`.
- Vite origin: the worktree's `client` directory, `http://127.0.0.1:5473/identity-furniture-preview.html`.
- Direct fixture: `http://127.0.0.1:5473/identity-furniture-board.html`.
- Opt-in: `data-aligned-rail=true`. This is local preview work, not a production deployment.

## Model and layout changes

- The grave's base footprint changes from .166 × .232 m to the deck's .136 × .198 m. Its .009 m card contact height is preserved. The tall outer wall is lowered to .014 m so it clears the center card row, and the handle is tucked toward the front fascia. Actual cards retain their normal size.
- Mana anchors move from X=-.345 to X=-.405. Both nameplates retain their .263 m width and the reviewed pitches (self 8°, opponent 28°), but their depth expands to about .060 m at 16:9. Text grows from a 15 px cap to 23 px.
- The insignia frame grows from .064 × .075 m to a .106 × .135 m authored frame, with larger independent rank/medal sockets. Its upper edge follows the nameplate's actual projected upper edge. Rank and medal remain placement samples.
- `identityRailLayout.ts` solves against the existing perspective camera. In taller windows it moves the mana assembly slightly toward the rim to keep at least .050 m of nameplate depth. The visible 3D edges and DOM text use the same poses.
- The counter labels sit inside deck/grave frames, avoiding overlap with the nameplate along the shared line.
- `boardLens.ts` extracts the existing camera math without changing its formulas; old imports from `boardProjection.ts` remain valid.

Authored assets and editable source:

- `client/public/models/reading-board/identity-aligned-1120/identity-addon.glb` → `identity-furniture.blend` here. Regenerate with `scripts/blender/build_identity_furniture.py -- --aligned` in an isolated Blender background process.
- `client/public/models/reading-board/identity-aligned-1120/shelf.glb` → `compact-grave.blend` here. Regenerate with `scripts/blender/build_compact_identity_shelf.py`.
- Material/model dimensions are recorded in `model-report.json` and `compact-grave-report.json`.

## Verification

- Client TypeScript check and `git diff --check` passed.
- Real board and both new GLBs loaded; no browser page errors.
- Native 1920×1080, 1280×720 and 1440×900 visually inspected.
- `projection-check.json` measures actual exported mesh vertices through the real camera, rather than only CSS boxes. All six self-side edges and the opponent name/insignia top-edge pair are within 0.5 px of their respective reference lines; at 16:9 the largest discrepancy is below 0.3 px.
- Deck/grave base widths match within floating-point export precision. Persistent icons remain seven slots and stay before the deck column.
- Review-page guide/sample toggles work. A populated grave was rendered on both sides and inspected: cards remain seated inside the compact tray.
- These are fixture, geometry and browser checks. Live PvP and complete animation continuity were not tested, and visual adoption remains the user's decision.

## Visible artwork and folded insignia correction

The next review identified the transparent margin in the portrait artwork and requested a folded insignia unit plus opponent-side lower-edge alignment. See [the folded revision](folded/README.md). Its visible-art reference lines supersede the CSS-box reference lines measured above.
