"""Re-size the adopted grave tray while preserving the .009 m card contact plane."""
import bpy,json
from pathlib import Path
BASE=Path(__file__).resolve().parents[2]
DEST=BASE/'client/public/models/reading-board/identity-aligned-1120'
DOC=BASE/'docs/3d-assets/2026-11-20-identity-furniture/aligned'
DEST.mkdir(parents=True,exist_ok=True);DOC.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(BASE/'client/public/models/reading-board/v2-shared/shelf.glb'))
for obj in bpy.context.scene.objects:
 if obj.type!='MESH':continue
 inverse=obj.matrix_world.inverted()
 for vertex in obj.data.vertices:
  p=obj.matrix_world@vertex.co
  p.x*=.136/.166
  # The handle remains a small inset pull rather than extending below the aligned base.
  if p.y<-.116:p.y=-.116+(p.y+.116)*.25
  p.y*=.198/.232
  if p.z>.009:p.z=.009+(p.z-.009)*(.005/.029)
  vertex.co=inverse@p
 obj.data.update()
bpy.ops.export_scene.gltf(filepath=str(DEST/'shelf.glb'),export_format='GLB',export_apply=True,export_animations=False)
bpy.ops.wm.save_as_mainfile(filepath=str(DOC/'compact-grave.blend'))
(DOC/'compact-grave-report.json').write_text(json.dumps({'reference':'v2-shared/shelf.glb','base_footprint_m':[.136,.198],'card_contact_m':.009,'wall_top_m':.014,'deck_reference_footprint_m':[.136,.198]},indent=2))
