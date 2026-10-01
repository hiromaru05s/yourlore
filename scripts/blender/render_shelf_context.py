"""Reimport delivered shelf GLBs, test board contact and actual card visibility."""
import bpy,json,math,sys
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
HERE=Path(__file__).resolve();OUT=HERE.parent.parent if HERE.parent.name=='source' else HERE.parents[2]/'docs/3d-assets/2026-09-21-blender-shelf'
bpy.ops.wm.open_mainfile(filepath=str(OUT/'lore-shelf-source.blend'));S=bpy.context.scene
for name in ['04_SHELF_EDITABLE','REFERENCE_CARDS_NOT_EXPORTED']:
 for o in bpy.data.collections[name].objects:o.hide_render=True;o.hide_set(True)
def load(path,name,location):
 before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(path));objects=[o for o in bpy.data.objects if o not in before]
 root=bpy.data.objects.new(name,None);S.collection.objects.link(root)
 for o in objects:
  if o.parent not in objects:o.parent=root
 root.location=location;return root,objects
def copy_card(root,count):
 for i in range(count):
  base=bpy.data.objects[f'Reference paper {i+1:02d}'];o=base.copy();S.collection.objects.link(o);o.parent=root;o.hide_render=False;o.hide_set(False)
 base=bpy.data.objects[f'Reference face {count:02d}'];o=base.copy();S.collection.objects.link(o);o.parent=root;o.hide_render=False;o.hide_set(False)
 return o
board,board_objects=load(OUT/'web/context/lore-board-v2.glb','BOARD_01_V2',(0,0,0));shelves=[]
for side,y in [('opponent',.245),('player',-.245)]:
 root,objects=load(OUT/'web/shelf.glb',f'SHELF_04_{side}',(-.54,y,0));shelves.append((side,root,objects))
 copy_card(root,1 if side=='opponent' else 10)
 load(OUT/'web/context/deck-place.glb',f'DECK_03_{side}',(.54,y,0))
 for file,x in [('mana-tray.glb',-.29+.0415),('mana-counter.glb',-.29-.132)]:
  load(OUT/'web/context'/file,f'MANA_02_{side}_{file}',(x,.397 if side=='opponent' else -.397,.012))
 for x in [-.12,0,.12]:
  r=bpy.data.objects.new('REFERENCE field card same scale',None);S.collection.objects.link(r);r.location=(x,.205 if side=='opponent' else -.205,-.0082);copy_card(r,1)
bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get()
def bvh(objects):
 verts=[];faces=[]
 for o in objects:
  if o.type!='MESH':continue
  ev=o.evaluated_get(deps);me=ev.to_mesh();me.calc_loop_triangles();offset=len(verts)
  verts.extend(o.matrix_world@v.co for v in me.vertices);faces.extend(tuple(offset+i for i in t.vertices) for t in me.loop_triangles);ev.to_mesh_clear()
 return BVHTree.FromPolygons(verts,faces,all_triangles=True)
bt=bvh(board_objects);probes=json.loads((OUT/'reference/card-visibility-probes.json').read_text())['blender_xy_m']
distance=2.25738;camera_pos=Vector((0,-distance*math.sin(math.radians(18)),distance*math.cos(math.radians(18))))
report={'board':'Board 01 v2 LOD1','shelf':'Reimported shelf.glb','camera_blender':list(camera_pos),'contact':[],'flat_card_floor':[],'card_visibility':[]}
for side,root,objects in shelves:
 tree=bvh(objects)
 for dx in [-.071,0,.071]:
  for dy in [-.107,0,.107]:
   p=Vector((root.location.x+dx,root.location.y+dy,.2));hit=bt.ray_cast(p,Vector((0,0,-1)),.3)[0]
   gap=-hit.z if hit else None;report['contact'].append({'side':side,'xy':[p.x,p.y],'gap_m':gap});assert hit and abs(gap)<.0001,report['contact'][-1]
 for dx in [-.054,0,.054]:
  for dy in [-.085,0,.085]:
   p=Vector((root.location.x+dx,root.location.y+dy,.2));hit=tree.ray_cast(p,Vector((0,0,-1)),.3)[0]
   report['flat_card_floor'].append({'side':side,'height_m':hit.z if hit else None});assert hit and abs(hit.z-.009)<.00002,report['flat_card_floor'][-1]
 for count in [1,10,40]:
  occluded=[]
  for x,y in probes:
   point=Vector((root.location.x+x,root.location.y+y,.009+.0008*count+.00002));ray=(camera_pos-point).normalized()
   hit=tree.ray_cast(point+ray*.00002,ray,(camera_pos-point).length)[0]
   if hit:occluded.append([x,y])
  row={'side':side,'count':count,'opaque_samples':len(probes),'occluded_samples':len(occluded),'occluded_xy':occluded[:30]};report['card_visibility'].append(row)
report['passed']=all(x['occluded_samples']==0 for x in report['card_visibility']);(OUT/'checks/board-fit-and-card-visibility.json').write_text(json.dumps(report,indent=2));assert report['passed'],report['card_visibility']
print('BOARD_CONTACT_AND_FULL_CARD_VISIBILITY_PASSED',flush=True)
bpy.data.objects['Studio floor'].location.z=-.043
for name,loc,power,size in [('Large soft key',(-1,-.7,2.1),45,1.1),('Cool broad fill',(1.2,-.2,1.6),10,1),('Long edge light',(0,1.4,1.8),30,1.2)]:
 o=bpy.data.objects[name];o.location=loc;o.data.energy=power;o.data.size=size;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
cam=S.camera;cam.data.type='PERSP';cam.data.sensor_fit='VERTICAL';cam.data.sensor_height=24;cam.data.lens=24/(2*math.tan(math.radians(25.608532)/2));cam.location=camera_pos;cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler()
S.cycles.samples=32;S.render.resolution_x=1920;S.render.resolution_y=1080
for im in bpy.data.images:
 if im.source=='FILE' and not im.packed_file:im.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'preview-board-context.blend'))
if '--no-render' not in sys.argv:
 S.render.filepath=str(OUT/'renders/04-board-and-card-scale.png');bpy.ops.render.render(write_still=True)
print('SHELF_CONTEXT_COMPLETE',flush=True)
