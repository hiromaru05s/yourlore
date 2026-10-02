import bpy, math, json
from pathlib import Path
from mathutils import Vector
OUT=Path(__file__).resolve().parents[2]/'docs/3d-assets/2026-09-15-blender-reading-board'
if (Path(__file__).parent/'layout-spec.json').exists():OUT=Path(__file__).resolve().parent.parent
bpy.ops.wm.open_mainfile(filepath=str(OUT/'lore-reading-board-source.blend'))
bpy.data.collections['01_BOARD_SOURCE'].hide_render=True
bpy.ops.import_scene.gltf(filepath=str(OUT/'web/lore-board-lod0.glb'))
S=bpy.context.scene;S.cycles.samples=48;S.render.resolution_x=1920;S.render.resolution_y=1080
S.render.filepath=str(OUT/'renders'/'12-glb-reimport.png');bpy.ops.render.render(write_still=True)
cam=S.camera;cam.data.type='ORTHO';cam.data.ortho_scale=.61;cam.location=(1.35,-.80,1.15);cam.rotation_euler=(Vector((.707,-.11,.008))-cam.location).to_track_quat('-Z','Y').to_euler()
S.render.resolution_x=1600;S.render.resolution_y=1000;S.render.filepath=str(OUT/'renders'/'13-glb-rift-detail.png');bpy.ops.render.render(write_still=True)
