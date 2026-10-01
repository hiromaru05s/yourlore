"""Assemble delivered 01--05 GLBs at their measured anchors. Reopenable .blend.
Checks actual triangle intersections of insert/cap/timer against board 01.
"""
import bpy, math, json, sys
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
HERE=Path(__file__).resolve()
OUT=HERE.parent.parent if HERE.parent.name=='source' else HERE.parents[2]/'docs/3d-assets/2026-09-21-blender-turn-button'
bpy.ops.wm.open_mainfile(filepath=str(OUT/'lore-turn-button-source.blend'));S=bpy.context.scene
root=bpy.data.objects['TURN_BUTTON'];root.location=(.7,0,.015)
timer=bpy.data.objects['TIMER_INSERTS'];timer.location=(.7,0,.015)
bpy.data.collections['05_TIMER_LIGHT_INSERTS'].hide_render=False;bpy.data.collections['05_TIMER_LIGHT_INSERTS'].hide_viewport=False
def load(path,name,position=(0,0,0),collection=None):
 before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(path));objects=[o for o in bpy.data.objects if o not in before]
 col=collection
 if col is None:col=bpy.data.collections.new(name);S.collection.children.link(col)
 r=bpy.data.objects.new(name,None);col.objects.link(r)
 for o in objects:
  for c in list(o.users_collection):c.objects.unlink(o)
  col.objects.link(o)
  if o.parent not in objects:o.parent=r
 r.location=position;return r,objects
board,board_objects=load(OUT/'web/context/board-01.glb','01_BOARD')
for side,y in [('OPPONENT',.245),('PLAYER',-.245)]:
 load(OUT/'web/context/deck-03.glb','03_DECK_'+side,(.54,y,0))
 load(OUT/'web/context/shelf-04.glb','04_SHELF_'+side,(-.54,y,0))

font=bpy.data.fonts.load(str(OUT/'web/fonts/DejaVuSerif.ttf'));ivory=bpy.data.materials['Preview ivory lettering']
def text(name,body,size,position,parent,col):
 d=bpy.data.curves.new(name,'FONT');d.body=body;d.font=font;d.size=size;d.align_x='CENTER';d.align_y='CENTER';d.extrude=0;d.resolution_u=8
 o=bpy.data.objects.new(name,d);col.objects.link(o);o.parent=parent;o.location=position;d.materials.append(ivory);return o
def copy_tree(source,col):
 n=source.copy();col.objects.link(n)
 for child in source.children:
  new=copy_tree(child,col);new.parent=n;new.matrix_local=child.matrix_local.copy()
 return n
for side,y,current,maximum in [('OPPONENT',.397,16,20),('PLAYER',-.397,4,4)]:
 col=bpy.data.collections.new('02_MANA_'+side);S.collection.children.link(col)
 r=bpy.data.objects.new('02_MANA_ROOT_'+side,None);col.objects.link(r);r.location=(-.29,y,.012)
 for file,x in [('mana-tray.glb',.0415),('mana-counter.glb',-.132)]:
  obj,_=load(OUT/'web/mana'/file,side+' '+file,(x,0,0),col);obj.parent=r
 templates={}
 for state in ['ready','spent']:
  t,_=load(OUT/'web/mana'/('mana-crystal-'+state+'.glb'),side+' '+state,collection=col);t.parent=r;templates[state]=t
 used={'ready':0,'spent':0}
 for i in range(maximum):
  state='ready' if i<current else 'spent';t=templates[state] if used[state]==0 else copy_tree(templates[state],col);used[state]+=1;t.parent=r;t.name=f'{side} crystal {i+1:02d} {state}'
  if maximum<=10:
   scale=min(1,(.226/maximum-.003)/.02954);step=min(.045,.226/maximum);x=(i-(maximum-1)/2)*step;yoff=0
  else:scale=.57;x=(i%10-4.5)*.023;yoff=.013 if i<10 else -.013
  t.location=(.0415+x,yoff,.0038*(1-scale));t.scale=(scale,scale,scale)
 for state,t in templates.items():
  if not used[state]:
   for o in [t,*t.children_recursive]:bpy.data.objects.remove(o,do_unlink=True)
 text(side+' live mana reference',f'{current}/{maximum}',.018,(-.132,0,.0045),r,col)

# Full-size current card references, removable as a single collection; never baked into props.
REF=bpy.data.collections.new('REFERENCE_CARDS_TOGGLE');S.collection.children.link(REF)
def image_material(name,file):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=.7;p.inputs['Specular IOR Level'].default_value=.15
 im=bpy.data.images.load(str(OUT/'web/textures'/file));tx=m.node_tree.nodes.new('ShaderNodeTexImage');tx.image=im;m.node_tree.links.new(tx.outputs['Color'],p.inputs['Base Color']);m.node_tree.links.new(tx.outputs['Alpha'],p.inputs['Alpha']);return m
front=image_material('Current LORE card / native transparent frame','card-front.png');back=image_material('Current LORE card / default back','card-back.webp')
def card(x,y,z,is_front=True):
 w,h=(.1364,.198275) if is_front else (.110,.171875)
 me=bpy.data.meshes.new('Card reference surface');me.from_pydata([(-w/2,-h/2,0),(w/2,-h/2,0),(w/2,h/2,0),(-w/2,h/2,0)],[],[(0,1,2,3)]);me.update();uv=me.uv_layers.new()
 for i,value in enumerate([(0,0),(1,0),(1,1),(0,1)]):uv.data[i].uv=value
 o=bpy.data.objects.new('Reference current card',me);REF.objects.link(o);o.location=(x,y,z);me.materials.append(front if is_front else back)
for y in [-.245,.245]:
 card(-.54,y,.009+.0008);card(.54,y,.0088+.0008,False)
 for x in [-.12,0,.12]:card(x,-.205 if y<0 else .205,.0016)
for i,x in enumerate([-.592,-.477,-.362,-.217,-.097,.023,.143,.263,.383,.503]):card(x,0,.0226 if i<3 else .0166)
REF.hide_render=True;REF.hide_viewport=True

bpy.context.view_layer.update()
def bvh(objects):
 deps=bpy.context.evaluated_depsgraph_get();verts=[];faces=[]
 for o in objects:
  if o.type!='MESH':continue
  ev=o.evaluated_get(deps);me=ev.to_mesh();me.calc_loop_triangles();offset=len(verts);verts.extend(o.matrix_world@v.co for v in me.vertices);faces.extend(tuple(offset+i for i in t.vertices) for t in me.loop_triangles);ev.to_mesh_clear()
 return BVHTree.FromPolygons(verts,faces,all_triangles=True)
bt=bvh(board_objects);report={'board':'delivered board 01 LOD0','units':'meters','button_rest_intersections':None,'button_pressed_intersections':None,'timer_intersections':None,'radial_clearance':.0475-.0464}
cap=bpy.data.objects['PRESS_CAP'];asset=list(bpy.data.collections['05_BUTTON_EDITABLE'].objects)
report['button_rest_intersections']=len(bt.overlap(bvh(asset)))
fixed=list(bpy.data.objects['FIXED_BASE'].children_recursive);moving=list(cap.children_recursive)
report['cap_base_rest_intersections']=len(bvh(fixed).overlap(bvh(moving)))
cap.location.z=-.0015;bpy.context.view_layer.update();report['button_pressed_intersections']=len(bt.overlap(bvh(asset)))
report['cap_base_pressed_intersections']=len(bvh(fixed).overlap(bvh(moving)))
cap.location.z=0;bpy.context.view_layer.update();report['timer_intersections']=len(bt.overlap(bvh(list(bpy.data.collections['05_TIMER_LIGHT_INSERTS'].objects))))
report['passed']=all(report[k]==0 for k in ['button_rest_intersections','button_pressed_intersections','timer_intersections','cap_base_rest_intersections','cap_base_pressed_intersections'])
(OUT/'checks/assembled-fit.json').write_text(json.dumps(report,indent=2));assert report['passed'],report
print('ACTUAL_GEOMETRY_FIT_PASSED',json.dumps(report),flush=True)

# Studio lighting and board-01 camera, identical scale for both players.
bpy.data.objects['Studio floor'].location.z=-.014
for name,loc,power,size in [('Large soft key',(-1,-.7,2.1),45,1.1),('Cool broad fill',(1.2,-.2,1.6),10,1),('Long edge light',(0,1.4,1.8),30,1.2)]:
 o=bpy.data.objects[name];o.location=loc;o.data.energy=power;o.data.size=size;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
cam=S.camera;cam.data.type='PERSP';cam.data.sensor_fit='VERTICAL';cam.data.sensor_height=24;cam.data.lens=24/(2*math.tan(math.radians(25.608532)/2));dist=2.25738
cam.location=(0,-dist*math.sin(math.radians(18)),dist*math.cos(math.radians(18)));cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler()
S.cycles.samples=40;S.cycles.transparent_max_bounces=16;S.render.resolution_x=1920;S.render.resolution_y=1080
for im in bpy.data.images:
 if im.source=='FILE' and not im.packed_file:im.pack()
for a in bpy.context.screen.areas if bpy.context.screen else []:
 if a.type=='VIEW_3D':a.spaces.active.region_3d.view_distance=2.4;a.spaces.active.region_3d.view_location=(0,0,0)
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'lore-board-01-to-05-assembly.blend'))
if '--no-render' not in sys.argv:
 if '--enemy-only' not in sys.argv:
  S.render.filepath=str(OUT/'renders/02-assembled-board.png');bpy.ops.render.render(write_still=True)
  REF.hide_render=False;S.render.filepath=str(OUT/'renders/03-assembled-card-scale.png');bpy.ops.render.render(write_still=True);REF.hide_render=True
 cam.data.type='ORTHO';cam.data.ortho_scale=.185;cam.location=(.755,-.105,.245);cam.rotation_euler=(Vector((.7,0,.021))-cam.location).to_track_quat('-Z','Y').to_euler();S.render.resolution_x=1400;S.render.resolution_y=1100
 if '--enemy-only' not in sys.argv:
  S.render.filepath=str(OUT/'renders/04-button-in-board.png');bpy.ops.render.render(write_still=True)
 p=bpy.data.materials['Turn enamel - runtime state'].node_tree.nodes.get('Principled BSDF')
 def lin(v):return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
 p.inputs['Base Color'].default_value=tuple(lin(v/255) for v in (73,38,51))+(1,)
 blue=bpy.data.materials['Timer illuminated - runtime state'];p=blue.node_tree.nodes.get('Principled BSDF');color=tuple(lin(v/255) for v in (186,100,113))+(1,);p.inputs['Base Color'].default_value=color;p.inputs['Emission Color'].default_value=color
 bpy.data.objects['Preview END'].data.body='ENEMY';bpy.data.objects['Preview END'].data.size=.0085
 for o in bpy.data.collections['05_TIMER_LIGHT_INSERTS'].objects:
  if o.type=='MESH' and o.get('segment_index',0)>=14:o.data.materials[0]=bpy.data.materials['Timer unlit']
 S.render.filepath=str(OUT/'renders/05-enemy-turn.png');bpy.ops.render.render(write_still=True)
print('ASSEMBLY_COMPLETE',flush=True)
