"""Append editable component 06 to the delivered 01–05 assembly."""
import bpy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'docs/3d-assets/2026-09-21-blender-reroll-button'
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'docs/3d-assets/2026-09-21-blender-turn-button/lore-board-01-to-05-assembly.blend'))
with bpy.data.libraries.load(str(OUT/'lore-reroll-button-source.blend'),link=False) as (src,dst):dst.collections=['06_REROLL_EDITABLE']
for col in dst.collections:bpy.context.scene.collection.children.link(col)
r=bpy.data.objects['REROLL_BUTTON'];r.location=(-.694,0,.016)
S=bpy.context.scene;S.render.engine='CYCLES';S.cycles.device='CPU';S.cycles.samples=32;S.cycles.use_denoising=True;S.render.resolution_x=1920;S.render.resolution_y=1080;S.render.resolution_percentage=100
bpy.context.preferences.filepaths.save_version=0;bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'lore-board-01-to-06-assembly.blend'))
S.render.filepath=str(OUT/'renders/02-board-01-to-06.png');bpy.ops.render.render(write_still=True)
print('ASSEMBLY_06_COMPLETE')
