"""Reimport shipped board GLB, place the mana source on both fitted anchors,
measure surface clearance and render its scale in the real board camera."""
import bpy,bmesh,math,json,sys
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
HERE=Path(__file__).resolve();OUT=HERE.parents[2]/'docs/3d-assets/2026-09-20-blender-mana-ui'
if HERE.parent.name=='source':OUT=HERE.parent.parent
bpy.ops.wm.open_mainfile(filepath=str(OUT/'lore-mana-ui-source.blend'))
S=bpy.context.scene;root=bpy.data.objects['MANA_ROOT'];source=bpy.data.collections['02_MANA_EDITABLE'];demo=bpy.data.collections['DEMO_NUMBERS_NOT_EXPORTED']
before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(OUT/'web/context/lore-board-v2.glb'));board=[o for o in bpy.data.objects if o not in before]
root.location=(-.29,.397,.012)
copycol=bpy.data.collections.new('PREVIEW_PLAYER_COPY');S.collection.children.link(copycol);mapping={}
for o in list(source.objects)+list(demo.objects):
 n=o.copy()
 if o.data:n.data=o.data.copy()
 copycol.objects.link(n);mapping[o]=n
for o,n in mapping.items():
 if o.parent in mapping:n.parent=mapping[o.parent];n.matrix_local=o.matrix_local.copy()
player=mapping[root];player.name='PREVIEW_PLAYER_MANA';player.location=(-.29,-.397,.012);player['current']=4;player['maximum']=4
group=next(o for o in copycol.objects if o.name.startswith('MANA_CRYSTALS'))
slots=sorted([o for o in group.children],key=lambda o:o['slot'])
ready=[bpy.data.materials['Sapphire / optical available']]
for i,slot in enumerate(slots):
 slot.location=((i-1.5)*.045,0,0);slot.scale=(1,1,1)
 for o in slot.children:
  o.hide_render=i>=4;o.hide_set(i>=4)
  if o.get('role')=='state_crystal':
   for k,m in enumerate(ready):o.data.materials[k]=m
num=mapping[bpy.data.objects['Preview current / runtime text']];maximum=mapping[bpy.data.objects['Preview maximum / runtime text']]
num.data.body='4';maximum.data.body='/4';bpy.context.view_layer.update();width=num.dimensions.x+maximum.dimensions.x+.0016
num.location.x=-width/2+num.dimensions.x/2;maximum.location.x=width/2-maximum.dimensions.x/2
# Measure against the board, rather than assuming its entire top is flat.
bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get();verts=[];faces=[]
for o in board:
 if o.type!='MESH':continue
 ev=o.evaluated_get(deps);me=ev.to_mesh();me.calc_loop_triangles();offset=len(verts)
 verts.extend([o.matrix_world@v.co for v in me.vertices]);faces.extend([tuple(offset+i for i in t.vertices) for t in me.loop_triangles]);ev.to_mesh_clear()
tree=BVHTree.FromPolygons(verts,faces,all_triangles=True)
report={'board':'component 01 v2 GLB','mana_positions_blender':{'opponent':list(root.location),'player':list(player.location)},'contact_checks':[],'visible_mesh_vertex_clearance_min':1}
for side,r in [('opponent',root),('player',player)]:
 for dx in [-.132,-.048,.12]:
  x=r.location.x+dx;y=r.location.y
  hit=tree.ray_cast(Vector((x,y,1)),Vector((0,0,-1)),2)[0]
  gap=r.location.z-.012-hit.z if hit else None
  report['contact_checks'].append({'side':side,'x':x,'y':y,'gap_m':gap})
  assert hit is not None and abs(gap)<.0001,(side,gap)
 collection=source if side=='opponent' else copycol
 for o in collection.objects:
  if o.type!='MESH' or o.hide_render:continue
  ev=o.evaluated_get(deps);me=ev.to_mesh()
  for v in me.vertices:
   co=o.matrix_world@v.co;hit=tree.ray_cast(Vector((co.x,co.y,1)),Vector((0,0,-1)),2)[0]
   if hit:report['visible_mesh_vertex_clearance_min']=min(report['visible_mesh_vertex_clearance_min'],co.z-hit.z)
  ev.to_mesh_clear()
assert report['visible_mesh_vertex_clearance_min']>-.0001,report
report['passed']=True;(OUT/'checks/board-fit.json').write_text(json.dumps(report,indent=2));print('FIT',json.dumps(report),flush=True)
# Match board 01's camera and lighting, keep all mana materials unchanged.
floor=bpy.data.objects['Studio ground'];floor.location.z=-.0307
for name,loc,power,size in [('Large warm key',(-1,-.7,2.1),45,1.1),('Cool soft fill',(1.2,-.2,1.6),10,1.0),('Long rim',(0,1.4,1.8),30,1.2)]:
 o=bpy.data.objects[name];o.location=loc;o.data.energy=power;o.data.size=size;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
cam=S.camera;cam.data.type='PERSP';cam.data.sensor_fit='VERTICAL';cam.data.sensor_height=24;cam.data.lens=24/(2*math.tan(math.radians(25.608532)/2));dist=2.25738
cam.location=(0,-dist*math.sin(math.radians(18)),dist*math.cos(math.radians(18)));cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler()
S.cycles.samples=64;S.render.resolution_x=1920;S.render.resolution_y=1080
try:
 if '--metal' not in sys.argv:raise RuntimeError('CPU is the portable default')
 prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='METAL';prefs.get_devices()
 if any(d.type=='METAL' for d in prefs.devices):
  for d in prefs.devices:d.use=d.type=='METAL'
  S.cycles.device='GPU'
except (TypeError,RuntimeError):S.cycles.device='CPU'
for im in bpy.data.images:
 if im.source=='FILE' and not im.packed_file:im.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'preview-board-context.blend'))
S.render.filepath=str(OUT/'renders/06-board-context.png');bpy.ops.render.render(write_still=True)
print('BOARD_CONTEXT_RENDERED',flush=True)
