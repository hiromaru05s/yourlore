# Folded insignia and visible-portrait alignment

Local preview revision based on the user-reviewed `57bcbe841`. The Vite cwd in the dedicated preview worktree remains `/Users/hiromaru05s/.codex/worktrees/nameplate-board-1119/LORE_TCG/client`; review URL is `http://127.0.0.1:5473/identity-furniture-preview.html`.

The adopted references are the existing `v2-shared/mana-tray.glb` and `art/biblion/refined/portrait-{self,opp}.webp`, with the board baseline from `d3ca461a7`. No background, character or shared card-art substitutions were made.

## Changes

- The insignia assembly now has `RANK_HALF` and `MEDAL_HALF`. The upper rank half uses the exact same rotation and pose as the nameplate (self 8°, opponent 28°); the lower medal half shares the mana tray's horizontal plane. Their common edge forms the fold.
- Both upper panels pivot at the actual .010 m bezel height, not at the bottom of the model. Their lower bezel edges therefore meet the mana/medal upper bezel edges without an exposed gap.
- The insignia assembly moves .010 m toward the main tray. Upper/name and lower/mana outer bezels meet at X=-.232 m; their shared lower plinths overlap by .002 m to avoid a white seam.
- The name text and rank artwork share the corresponding physical plane transforms.
- Self-side alignment uses the visible portrait artwork tip. Pixel inspection of the 1254×1254 source found the self frame begins at row 12, so the baseline moves down 2.01 px at 1920×1080 and 1.34 px at 1280×720.
- Opponent alignment uses the visible bottom of its frame (alpha ends at row 1243). The opponent mana and medal lower edges, plus persistent-icon lower edges, meet this line. The guide toggle now draws both reference lines.

## Assets and checks

Runtime model: `client/public/models/reading-board/identity-folded-1120/identity-addon.glb`. Editable source: `identity-furniture.blend` in this directory. Rebuild via the existing script with `-- --folded` in a separate Blender background process. Materials come directly from the actual mana tray. `model-report.json` records the authored dimensions.

- TypeScript and diff whitespace checks passed.
- Native 1920×1080 and 1280×720 boards visually inspected, including both guide lines; no browser page errors.
- Exported GLB vertex checks at 1920×1080, 1280×720 and 1440×900: self name/rank/icon tops and opponent mana/medal/icon bottoms match the visible portrait reference within 0.1 px. See `projection-check.json`.
- Both upper hinge coordinates coincide with their corresponding lower bezels to floating-point precision; physical left/right bounds verify no gap at the two side joins.
- Placement icons remain samples. This is fixture/browser/model validation, not live PvP or full animation-continuity validation. No deployment or production adoption.
