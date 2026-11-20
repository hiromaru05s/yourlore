"""Add editable identity mounts using the actual mana-tray materials and tooling.
Run in a separate Blender process: --background --factory-startup --python ...
"""
import bpy,bmesh,math,ast,json,sys
from pathlib import Path
BASE=Path(__file__).resolve().parents[2]
FOLDED='--folded' in sys.argv
ALIGNED='--aligned' in sys.argv or FOLDED
OUT=BASE/'docs/3d-assets/2026-11-20-identity-furniture'
if ALIGNED:OUT=OUT/'aligned'
if FOLDED:OUT=OUT/'folded'
OUT.mkdir(parents=True,exist_ok=True)
DEST=BASE/'client/public/models/reading-board'/('identity-folded-1120' if FOLDED else 'identity-aligned-1120' if ALIGNED else 'identity-11120');DEST.mkdir(parents=True,exist_ok=True)
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
ROOT=empty('IDENTITY_ADDON');ROOT['unit']='meters';ROOT['mount']=('MANA_ROOT at x=-.405 y=.012 z=±.397' if ALIGNED else 'Existing MANA_ROOT at x=-.345 y=.012 z=±.397')
ND=.060 if ALIGNED else .035
BW=.106 if ALIGNED else .064;BD=.135 if ALIGNED else .075;BX=.226 if FOLDED else .236 if ALIGNED else .210
BO=.030 if ALIGNED else 0;SO=.032 if ALIGNED else .016
NAME=empty('NAMEPLATE_FRAME',ROOT);NAME.location=(.0415,.0375+ND/2,0)
frame(NAME,.263,ND,.006)
# Two tenons seat under the existing mana rail; they do not cover the crystals.
for x in [-.092,.092]:
 o=slab('Nameplate mortise bridge',.014,.012,.002,-.004,.001,BRASS,NAME,.0005);o.location=(x,-ND/2-.0005,0)
BADGE=empty('RANK_AND_MEDAL_FRAME',ROOT);BADGE.location=(BX,0 if FOLDED else BO,0)
if FOLDED:
 upper=empty('RANK_HALF',BADGE);upper.location=(0,.0375+ND/2,0)
 lower=empty('MEDAL_HALF',BADGE)
 frame(upper,BW,ND,.006);frame(lower,BW,.075,.008)
 sockets=[('RANK_SOCKET',upper,0,.040),('MEDAL_SOCKET',lower,0,.046)]
else:
 frame(BADGE,BW,BD,.008)
 for y in [-.022,.022]:
  o=slab('Tray to insignia tenon',.012,.012,.002,-.004,.001,BRASS,BADGE,.00045);o.location=(-BW/2-.002,y,0)
 sockets=[('RANK_SOCKET',BADGE,SO,.046 if ALIGNED else .026),('MEDAL_SOCKET',BADGE,-SO,.046 if ALIGNED else .026)]
for label,parent,y,depth in sockets:
 socket=empty(label,parent);socket.location=(0,y,0)
 slab(label+' inner bed',(.075 if ALIGNED else .037),depth,.004,.0039,.0044,RECESS,socket,.0002)
 band(label+' incised lip',(.076 if ALIGNED else .038),depth+.001,.004,.0007,.0042,.0052,BRASS,socket,.00016)
if not FOLDED:slab('Insignia central separator',(.080 if ALIGNED else .040),.0012,.0004,.004,.0056,BRASS,BADGE,.0002)
# A removable generic medal demonstrates the second socket; no player reward is asserted.
SAMPLE=empty('MEDAL_SAMPLE',lower if FOLDED else BADGE);SAMPLE.location=(0,0 if FOLDED else -SO,0)
MS=1.7 if ALIGNED else 1
pts=[(.009*MS*math.cos(i*math.tau/40),.009*MS*math.sin(i*math.tau/40))for i in range(40)]
solid('Sample medal rim',pts,.0054,.0074,BRASS,SAMPLE,.0003)
pts=[(.0076*MS*math.cos(i*math.tau/40),.0076*MS*math.sin(i*math.tau/40))for i in range(40)]
solid('Sample medal enamel',pts,.0074,.0078,BODY,SAMPLE,.00015)
star=[((.005 if i%2==0 else .0025)*MS*math.cos(math.pi/2+i*math.pi/5),(.005 if i%2==0 else .0025)*MS*math.sin(math.pi/2+i*math.pi/5)) for i in range(10)]
solid('Sample medal raised star',star,.0078,.009,BRASS,SAMPLE,.00012)
# Keep the exact production tray for inspection in the .blend, but exclude it from export.
for o in reference:o.hide_render=True;o.hide_set(True)
bpy.ops.object.select_all(action='DESELECT')
for o in ASSET.objects:o.hide_set(False);o.select_set(True)
bpy.context.view_layer.objects.active=NAME
bpy.ops.export_scene.gltf(filepath=str(DEST/'identity-addon.glb'),export_format='GLB',use_selection=True,export_apply=True,export_animations=False,export_extras=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'identity-furniture.blend'))
report={'reference':'models/reading-board/v2-shared/mana-tray.glb','materials':[m.name for m in [BRASS,SILVER,BODY,RECESS,GASKET]],'nameplate':{'width':.263,'depth':ND,'center':[.0415,0,-(.0375+ND/2)]},'insignia':{'width':BW,'depth':BD,'center':[BX,0,0 if FOLDED else -BO],'folded':FOLDED},'objects':len(ASSET.objects),'bytes':(DEST/'identity-addon.glb').stat().st_size}
(OUT/'model-report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
