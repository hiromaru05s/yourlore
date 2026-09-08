"""Render both exported GLBs; invoke Blender with the saved deck-holder .blend."""
from pathlib import Path
import bpy
p=Path(__file__).resolve().parents[2]
s=bpy.context.scene;s.cycles.samples=32
for o in list(bpy.data.objects):
 if o.name in ['cosmetic_root','visual','deck_mount','DeckPedestal']:bpy.data.objects.remove(o,do_unlink=True)
for name,out in [('model','glb-preview.png'),('model-low','glb-low-preview.png')]:
 before=set(bpy.data.objects)
 bpy.ops.import_scene.gltf(filepath=str(p/'client/public/models/cosmetics/deck_holder_biblion_ivory/v1'/f'{name}.glb'))
 s.render.filepath=str(p/'docs/3d-assets/2026-09-09-blender-deck-holder'/out)
 bpy.ops.render.render(write_still=True)
 for o in set(bpy.data.objects)-before:bpy.data.objects.remove(o,do_unlink=True)
