"""Add editable identity mounts using the actual mana-tray materials and tooling.
Run in a separate Blender process: --background --factory-startup --python ...
"""
import bpy,bmesh,math,ast,json
from pathlib import Path
BASE=Path(__file__).resolve().parents[2]
OUT=BASE/'docs/3d-assets/2026-11-20-identity-furniture';OUT.mkdir(parents=True,exist_ok=True)
DEST=BASE/'client/public/models/reading-board/identity-11120';DEST.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.context.scene.unit_settings.system='METRIC'
bpy.ops.import_scene.gltf(filepath=str(BASE/'client/public/models/reading-board/v2-shared/mana-tray.glb'))
reference=list(bpy.context.scene.objects)
# Use the exported production materials, rather than a new approximation.
BRASS=bpy.data.materials['Champagne brass / matches board 01'];SILVER=bpy.data.materials['Warm silver edge']
BODY=bpy.data.materials['Ink blue enamel'];RECESS=bpy.data.materials['Deep navy inset'];GASKET=bpy.data.materials['Soft graphite mounting pad']
ASSET=bpy.data.collections.new('IDENTITY_ADDON_EDITABLE');bpy.context.scene.collection.children.link(ASSET)
source=(BASE/'scripts/blender/build_mana_ui.py').read_text()
for node in ast.parse(source).body:
 if isinstance(node,ast.FunctionDef) and node.name in ['empty','mesh','chamfer','solid','slab','band','frame']:
  exec(compile(ast.get_source_segment(source,node),'<existing mana-frame tooling>','exec'))
ROOT=empty('IDENTITY_ADDON');ROOT['unit']='meters';ROOT['mount']='Existing MANA_ROOT at x=-.345 y=.012 z=±.397'
NAME=empty('NAMEPLATE_FRAME',ROOT);NAME.location=(.0415,.055,0)
frame(NAME,.263,.035,.006)
# Two tenons seat under the existing mana rail; they do not cover the crystals.
for x in [-.092,.092]:
 o=slab('Nameplate mortise bridge',.014,.012,.002,-.004,.001,BRASS,NAME,.0005);o.location=(x,-.018,0)
BADGE=empty('RANK_AND_MEDAL_FRAME',ROOT);BADGE.location=(.210,0,0)
frame(BADGE,.064,.075,.008)
for y in [-.022,.022]:
 o=slab('Tray to insignia tenon',.012,.012,.002,-.004,.001,BRASS,BADGE,.00045);o.location=(-.034,y,0)
# Two shallow wells, with open interiors for actual account emblems.
for label,y in [('RANK_SOCKET',.016),('MEDAL_SOCKET',-.016)]:
 socket=empty(label,BADGE);socket.location=(0,y,0)
 slab(label+' inner bed',.037,.026,.004,.0039,.0044,RECESS,socket,.0002)
 band(label+' incised lip',.038,.027,.004,.0007,.0042,.0052,BRASS,socket,.00016)
rail=slab('Insignia central separator',.040,.0012,.0004,.004,.0056,BRASS,BADGE,.0002)
# A removable generic medal demonstrates the second socket; no player reward is asserted.
SAMPLE=empty('MEDAL_SAMPLE',BADGE);SAMPLE.location=(0,-.016,0)
pts=[(.009*math.cos(i*math.tau/40),.009*math.sin(i*math.tau/40))for i in range(40)]
solid('Sample medal rim',pts,.0054,.0074,BRASS,SAMPLE,.0003)
pts=[(.0076*math.cos(i*math.tau/40),.0076*math.sin(i*math.tau/40))for i in range(40)]
solid('Sample medal enamel',pts,.0074,.0078,BODY,SAMPLE,.00015)
star=[((.005 if i%2==0 else .0025)*math.cos(math.pi/2+i*math.pi/5),(.005 if i%2==0 else .0025)*math.sin(math.pi/2+i*math.pi/5)) for i in range(10)]
solid('Sample medal raised star',star,.0078,.009,BRASS,SAMPLE,.00012)
# Keep the exact production tray for inspection in the .blend, but exclude it from export.
for o in reference:o.hide_render=True;o.hide_set(True)
bpy.ops.object.select_all(action='DESELECT')
for o in ASSET.objects:o.hide_set(False);o.select_set(True)
bpy.context.view_layer.objects.active=NAME
bpy.ops.export_scene.gltf(filepath=str(DEST/'identity-addon.glb'),export_format='GLB',use_selection=True,export_apply=True,export_animations=False,export_extras=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'identity-furniture.blend'))
report={'reference':'models/reading-board/v2-shared/mana-tray.glb','materials':[m.name for m in [BRASS,SILVER,BODY,RECESS,GASKET]],'nameplate':{'width':.263,'depth':.035,'center':[.0415,0,-.055]},'insignia':{'width':.064,'depth':.075,'center':[.210,0,0]},'objects':len(ASSET.objects),'bytes':(DEST/'identity-addon.glb').stat().st_size}
(OUT/'model-report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
