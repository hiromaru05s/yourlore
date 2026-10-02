"""Reimport the delivered GLBs, verify contact with board 01, and render context."""
import bpy,bmesh,json,math,sys
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
HERE=Path(__file__).resolve();OUT=HERE.parent.parent if HERE.parent.name=='source' else HERE.parents[2]/'docs/3d-assets/2026-09-20-blender-deck-place'
bpy.ops.wm.open_mainfile(filepath=str(OUT/'lore-deck-place-source.blend'))
S=bpy.context.scene
for o in bpy.data.collections['03_DECK_PLACE_EDITABLE'].objects:o.hide_render=True;o.hide_set(True)
original_cards=list(bpy.data.collections['REFERENCE_CARDS_NOT_EXPORTED'].objects)
for o in original_cards:o.hide_render=True;o.hide_set(True)
def load(path,name,location):
 before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(path));objects=[o for o in bpy.data.objects if o not in before]
 root=bpy.data.objects.new(name,None);S.collection.objects.link(root)
 for o in objects:
  if o.parent not in objects:o.parent=root
 root.location=location;return root,objects
board,board_meshes=load(OUT/'web/context/lore-board-v2.glb','BOARD_01_V2',(0,0,0))
decks=[]
for side,y in [('opponent',.245),('player',-.245)]:
 root,objects=load(OUT/'web/deck-place.glb',f'DECK_03_{side}',(.54,y,0));decks.append((side,root,objects))
 for i in range(20):
  for base in [bpy.data.objects[f'Reference card {i+1:02d}'],bpy.data.objects[f'Reference back {i+1:02d}']]:
   o=base.copy();S.collection.objects.link(o);o.parent=root;o.hide_render=False;o.hide_set(False)
 # The previous component's empty numeric/crystal frames give an uncluttered scale reference.
 for file,x in [('mana-tray.glb',-.29+.0415),('mana-counter.glb',-.29-.132)]:
  load(OUT/'web/context'/file,f'MANA_02_{side}_{file}',(x,.397 if side=='opponent' else -.397,.012))
bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get()
def bvh(objects):
 verts=[];faces=[]
 for o in objects:
  if o.type!='MESH':continue
  ev=o.evaluated_get(deps);me=ev.to_mesh();me.calc_loop_triangles();offset=len(verts)
  verts.extend(o.matrix_world@v.co for v in me.vertices);faces.extend(tuple(offset+i for i in t.vertices) for t in me.loop_triangles);ev.to_mesh_clear()
 return BVHTree.FromPolygons(verts,faces,all_triangles=True)
bt=bvh(board_meshes);report={'board':'Delivered board 01 v2 LOD1','deck':'Reimported deck-place.glb','contact_checks':[],'card_surface_checks':[]}
for side,root,objects in decks:
 tree=bvh(objects)
 for x in [-.060,0,.060]:
  for y in [-.09,0,.09]:
   point=Vector((root.location.x+x,root.location.y+y,.1));hit=bt.ray_cast(point,Vector((0,0,-1)),.2)[0]
   gap=0-hit.z if hit else None;report['contact_checks'].append({'side':side,'xy':[point.x,point.y],'gap_m':gap})
   assert hit is not None and abs(gap)<.0001,report['contact_checks'][-1]
 for x in [-.054,0,.054]:
  for y in [-.085,0,.085]:
   p=Vector((root.location.x+x,root.location.y+y,.1));hit=tree.ray_cast(p,Vector((0,0,-1)),.2)[0]
   report['card_surface_checks'].append({'side':side,'xy':[p.x,p.y],'height':hit.z if hit else None})
   assert hit is not None and abs(hit.z-.0088)<.000015,report['card_surface_checks'][-1]
report['passed']=True;(OUT/'checks/board-fit.json').write_text(json.dumps(report,indent=2));print('BOARD_FIT_PASSED',flush=True)
bpy.data.objects['Studio floor'].location.z=-.043
for name,loc,power,size in [('Large soft key',(-1,-.7,2.1),45,1.1),('Cool broad fill',(1.2,-.2,1.6),10,1),('Long edge light',(0,1.4,1.8),30,1.2)]:
 o=bpy.data.objects[name];o.location=loc;o.data.energy=power;o.data.size=size;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
cam=S.camera;cam.data.type='PERSP';cam.data.sensor_fit='VERTICAL';cam.data.sensor_height=24;cam.data.lens=24/(2*math.tan(math.radians(25.608532)/2));dist=2.25738
cam.location=(0,-dist*math.sin(math.radians(18)),dist*math.cos(math.radians(18)));cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler()
S.cycles.samples=32;S.render.resolution_x=1920;S.render.resolution_y=1080
for im in bpy.data.images:
 if im.source=='FILE' and not im.packed_file:im.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'preview-board-context.blend'))
if '--no-render' not in sys.argv:
 S.render.filepath=str(OUT/'renders/04-board-context.png');bpy.ops.render.render(write_still=True)
print('DECK_CONTEXT_COMPLETE',flush=True)
