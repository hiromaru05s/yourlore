"""Export board and market runtime parts; portraits are separate 2D UI layers.
The editable board source and all geometry/materials remain the source of truth.
"""
import bpy,bmesh,math,json,sys,struct,ast,types,shutil
from pathlib import Path
from mathutils import Vector,Matrix
BASE=Path(__file__).resolve().parents[2];OUT=BASE/'docs/3d-assets/2026-09-15-blender-reading-board';DEST=BASE/'client/public/models/reading-board/v1';DEST.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(OUT/'lore-reading-board-source.blend'));S=bpy.context.scene;deps=bpy.context.evaluated_depsgraph_get();original=list(bpy.data.collections['01_BOARD_SOURCE'].objects)
# Reuse the validated UV/tangent/simplification pipeline without running its renders.
text=(BASE/'scripts/blender/package_reading_board.py').read_text();tree=ast.parse(text)
for node in tree.body:
 if isinstance(node,ast.FunctionDef) and node.name in ('repair_export_tangents','export_level'):
  function=ast.get_source_segment(text,node).replace("path=OUT/'web'/('lore-board-'+level+'.glb')","path=DEST/(EXPORT_NAME+('-low' if level=='lod1' else '')+'.glb')")
  exec(compile(function,'<validated export>','exec'))
report={'levels':[]}
for part,include,center,target in [
 ('board',lambda o:o.parent is None or o.parent.name not in ('MARKET_BASE','MARKET_SUPPLY_INSERT','PORTRAIT_PLAYER_FRAME','PORTRAIT_OPPONENT_FRAME'),(0,0,0),72000),
 ('market',lambda o:o.parent is not None and o.parent.name=='MARKET_BASE',(-.062,0,.015),4200),
 ('supply',lambda o:o.parent is not None and o.parent.name=='MARKET_SUPPLY_INSERT',(-.472,0,.021),1800)]:
 if '--board-only' in sys.argv and part!='board':continue
 source=types.SimpleNamespace(objects=[o for o in original if include(o)])
 # Copy source nodes for export pipeline so runtime origins do not alter source file.
 saved=[(o,o.matrix_world.copy()) for o in source.objects if o.type in ('MESH','CURVE')]
 for o,m in saved:o.matrix_world=Matrix.Translation(Vector(center)*-1)@m
 bpy.context.view_layer.update()
 for level,budget in [('lod0',target),('lod1',int(target*.32))]:
  EXPORT_NAME=part;export_level(level,budget)
 for o,m in saved:o.matrix_world=m
 bpy.context.view_layer.update()
(DEST/'board-export-report.json').write_text(json.dumps(report,indent=2))
