# Portrait tray and raised supply plinth

Built by `scripts/blender/build_lore_release_furniture.py` using Blender 5.2.1. Source `.blend`, preview PNGs and GLB geometry checks accompany this file. Runtime GLBs are under `client/public/models/library-furniture/v2/`.

The tray references the user-supplied dark wood / navy cloth / brass holder image from September 8 at 21:11:06. It is a low portrait tray with separate corner guards, enamel insets, brass rails and a lightly woven floor. One full-size 1×1.5625 U card fits inside the protected cavity. Its mounting surface is Y=0 and the foot reaches Y=-0.12 U. Runtime adds a 0.12 U mounting offset. U=64 mm; glTF +Y is up.

The supply insert has a 4.5×1.94 U authored footprint and 0.08 U thickness. It scales around its actual card layout, independently of card size. Its runtime top is 0.30 U above the table, above the main market top at 0.22 U.

Standard tray: 10,596 triangles / 3 material draws / 541 KB. Mobile tray: 1,244 triangles / 1 draw / 116 KB. Supply: 372 or 172 triangles, 36 / 17 KB. GLBs contain no studio cameras or lights. The shared game scene owns the camera, lighting and shadows.
