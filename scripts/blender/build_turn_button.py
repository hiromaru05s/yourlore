"""LORE component 05. A moving enamel cap in board 01's existing timer housing.
Meters. Blender X right, Y away, Z up. GLB origin matches END_TURN anchor.
No outer timer frame is duplicated. Text is a replaceable runtime label.
"""
import bpy, bmesh, math, json, sys
from pathlib import Path
from mathutils import Vector

HERE=Path(__file__).resolve()
OUT=HERE.parent.parent if HERE.parent.name=='source' else HERE.parents[2]/'docs/3d-assets/2026-09-21-blender-turn-button'
for p in ['web','renders','checks','source']:(OUT/p).mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
S=bpy.context.scene;S.unit_settings.system='METRIC';S.unit_settings.scale_length=1
def collection(name):
 c=bpy.data.collections.new(name);S.collection.children.link(c);return c
ASSET=collection('05_BUTTON_EDITABLE');TIMER=collection('05_TIMER_LIGHT_INSERTS');DEMO=collection('PREVIEW_LABEL_NOT_EXPORTED');STUDIO=collection('STUDIO_NOT_EXPORTED')
def empty(name,col,parent=None):
 o=bpy.data.objects.new(name,None);col.objects.link(o);o.parent=parent;o.empty_display_size=.004;return o
ROOT=empty('TURN_BUTTON',ASSET);BASE=empty('FIXED_BASE',ASSET,ROOT);CAP=empty('PRESS_CAP',ASSET,ROOT);RING=empty('TIMER_INSERTS',TIMER)
ROOT['component']='05';ROOT['anchor']='board 01 end_turn: glTF [0.700, 0.015, 0]';CAP['press_travel_m']=.0015
def linear(v):return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
def mat(name,rgb,metal,rough):
 m=bpy.data.materials.new(name);m.use_nodes=True;c=tuple(linear(v/255) for v in rgb)+(1,);m.diffuse_color=c
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=c;p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 p.inputs['Specular IOR Level'].default_value=.35 if metal<.3 else .5;return m
BRASS=mat('Champagne satin brass',(179,152,105),.78,.29)
SILVER=mat('Warm silver highlight',(205,200,184),.7,.31)
INK=mat('Dark graphite mechanism',(13,20,29),.25,.48)
FACE=mat('Turn enamel - runtime state',(19,48,66),.24,.29)
p=FACE.node_tree.nodes.get('Principled BSDF');p.inputs['Coat Weight'].default_value=.35;p.inputs['Coat Roughness'].default_value=.25
BLUE=mat('Timer illuminated - runtime state',(61,170,203),.1,.32)
p=BLUE.node_tree.nodes.get('Principled BSDF');p.inputs['Emission Color'].default_value=tuple(linear(v/255) for v in (59,167,204))+(1,);p.inputs['Emission Strength'].default_value=.45
DARK=mat('Timer unlit',(16,32,43),.2,.42)
DARK.use_fake_user=True
IVORY=mat('Preview ivory lettering',(233,227,204),.12,.42)
def mesh(name,vertices,faces,material,col,parent,smooth=False):
 me=bpy.data.meshes.new(name);me.from_pydata(vertices,[],faces);me.update()
 bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(me);bm.free()
 o=bpy.data.objects.new(name,me);col.objects.link(o);o.parent=parent;me.materials.append(material)
 if smooth:
  for p in me.polygons:p.use_smooth=True
  me.set_sharp_from_angle(angle=math.radians(35))
 return o
def lathe(name,profile,material,parent=CAP,segments=128):
 # Profiles close around the section; an axis is a single vertex, not degenerate quads.
 vertices=[];rings=[]
 for radius,z in profile:
  if radius==0:rings.append([len(vertices)]);vertices.append((0,0,z))
  else:
   rings.append(list(range(len(vertices),len(vertices)+segments)))
   vertices.extend((radius*math.cos(i*2*math.pi/segments),radius*math.sin(i*2*math.pi/segments),z) for i in range(segments))
 faces=[]
 for a,b in zip(rings,rings[1:]+rings[:1]):
  if len(a)==len(b)==1:continue
  for i in range(segments):
   j=(i+1)%segments
   faces.append((a[0],b[j],b[i]) if len(a)==1 else (a[i],a[j],b[0]) if len(b)==1 else (a[i],a[j],b[j],b[i]))
 return mesh(name,vertices,faces,material,ASSET,parent,True)

lathe('01 Insert body / closed mounting body',[(0,-.028),(.0448,-.028),(.0462,-.026),(.0464,-.010),(.0464,-.005),(.0457,-.0045),(0,-.0045)],INK,BASE)
lathe('02 Fixed shoulder / 1.1 mm socket clearance',[(.0437,-.006),(.0458,-.006),(.04635,-.0054),(.04635,-.0038),(.0459,-.0033),(.0437,-.0033)],BRASS,BASE)
lathe('03 Recessed cap travel gasket',[(.042,-.004),(.0459,-.004),(.0459,-.0028),(.0451,-.0025),(.042,-.0025)],INK,BASE)
lathe('04 Turned cap rolled edge',[(0,-.0005),(.0428,-.0005),(.0447,.001),(.0461,.0064),(.04625,.0081),(.0458,.0092),(.0446,.0102),(.0403,.0106),(.0396,.0098),(.0396,.006),(0,.006)],BRASS)
lathe('05 Warm silver cap reveal',[(.0416,.01030),(.0422,.01032),(.0425,.01060),(.0423,.01085),(.0417,.01085),(.0415,.01062)],SILVER)
lathe('06 Enamel shadow keyline',[(.0386,.0089),(.04065,.0089),(.04065,.0104),(.0402,.01065),(.0386,.01065)],INK)
lathe('07 Gently crowned enamel face',[(0,.0075),(.0393,.0075),(.0397,.0098),(.0392,.0105),(.037,.0109),(.032,.01125),(.024,.01150),(.014,.01167),(0,.01174)],FACE)
lathe('08 Fine inset champagne hairline',[(.0359,.01094),(.0363,.01094),(.0364,.01112),(.0363,.01125),(.0360,.01125),(.03585,.01110)],BRASS)
# Compact end marks leave room for two lines and do not distract from the cards.
for sign in [-1,1]:
 y=sign*.0275;z=.01160
 mesh('09 Small compass lozenge',[(0,y-.0022,z),(.00115,y,z),(0,y+.0022,z),(-.00115,y,z),(0,y,z+.0003),(0,y,z-.0003)],[(0,1,4),(1,2,4),(2,3,4),(3,0,4),(1,0,5),(2,1,5),(3,2,5),(0,3,5)],BRASS,ASSET,CAP)
label=empty('LABEL_SURFACE',ASSET,CAP);label.location.z=.0121;label['safe_width_m']=.064;label['safe_depth_m']=.039
rest=empty('REST_ANCHOR',ASSET,ROOT);rest['press_direction_gltf']=[0,-1,0]

def timer_segment(index):
 r0,r1=.0538,.0579;z0,z1=.00604,.00653;n=9
 angles=[math.pi/2-math.radians(index*15+1.15+(15-2.3)*j/(n-1)) for j in range(n)]
 verts=[(r*math.cos(a),r*math.sin(a),z) for z in [z0,z1] for r in [r0,r1] for a in angles];f=[]
 for j in range(n-1):f.extend([(j,j+1,n+j+1,n+j),(2*n+j,3*n+j,3*n+j+1,2*n+j+1),(j,2*n+j,2*n+j+1,j+1),(n+j,n+j+1,3*n+j+1,3*n+j)])
 f.extend([(0,n,3*n,2*n),(n-1,3*n-1,4*n-1,2*n-1)])
 o=mesh(f'TIMER_SEGMENT_{index:02d}',verts,f,BLUE,TIMER,RING);o['segment_index']=index;return o
segments=[timer_segment(i) for i in range(24)]

font=bpy.data.fonts.load(str(OUT/'web/fonts/DejaVuSerif.ttf'))
for i,word in enumerate(['END','TURN']):
 data=bpy.data.curves.new('Preview text - replace at runtime','FONT');data.body=word;data.font=font;data.size=.010;data.align_x='CENTER';data.align_y='CENTER';data.extrude=.000025;data.resolution_u=8
 o=bpy.data.objects.new('Preview '+word,data);DEMO.objects.link(o);o.parent=CAP;o.location=(0,.0070 if i==0 else -.0070,.0121);data.materials.append(IVORY)

def export(filename,collection,low=False):
 temp=bpy.data.collections.new('EXPORT_TEMP');S.collection.children.link(temp);mapping={};deps=bpy.context.evaluated_depsgraph_get()
 for o in collection.objects:
  if o.type=='MESH':
   me=bpy.data.meshes.new_from_object(o.evaluated_get(deps),depsgraph=deps);n=bpy.data.objects.new(o.name,me)
  else:n=o.copy()
  temp.objects.link(n);mapping[o]=n;n.matrix_world=o.matrix_world.copy()
  for key,value in o.items():n[key]=value
 for o,n in mapping.items():
  n.parent=mapping.get(o.parent);n.matrix_local=o.matrix_local.copy()
 # Consolidate by parent/material, preserving the PRESS_CAP transform and individual timer segments.
 if collection==ASSET:
  groups={}
  for o in mapping.values():
   if o.type=='MESH':groups.setdefault((o.parent,o.data.materials[0]),[]).append(o)
  for (parent,m),objects in groups.items():
   bpy.ops.object.select_all(action='DESELECT')
   for o in objects:o.select_set(True)
   bpy.context.view_layer.objects.active=objects[0]
   if len(objects)>1:bpy.ops.object.join()
   objects[0].name=('Cap ' if parent.name.startswith('PRESS_CAP') else 'Base ')+m.name
 meshes=[o for o in temp.objects if o.type=='MESH']
 for o in meshes:
  bpy.context.view_layer.objects.active=o
  if low:
   d=o.modifiers.new('LOD radial reduction','DECIMATE');d.ratio=.4;d.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=d.name)
  t=o.modifiers.new('Portable triangles','TRIANGULATE');t.keep_custom_normals=True;bpy.ops.object.modifier_apply(modifier=t.name)
 report={'triangles':0,'meshes':len(meshes),'nonmanifold_edges':0}
 points=[]
 for o in meshes:
  o.data.calc_loop_triangles();report['triangles']+=len(o.data.loop_triangles)
  bm=bmesh.new();bm.from_mesh(o.data);report['nonmanifold_edges']+=sum(not e.is_manifold for e in bm.edges);bm.free()
  points.extend(o.matrix_world@v.co for v in o.data.vertices)
 report['bounds_blender']={'min':[min(v[i] for v in points) for i in range(3)],'max':[max(v[i] for v in points) for i in range(3)]}
 bpy.ops.object.select_all(action='DESELECT')
 for o in temp.objects:o.select_set(True)
 # Temporarily use exact reusable names without .001 suffixes introduced by Blender copies.
 renamed=[]
 for original,copy in mapping.items():
  if original.type=='EMPTY' and copy.name in bpy.data.objects:
   old=original.name;original.name='EDITABLE_'+old;copy.name=old;renamed.append((original,old))
 bpy.ops.export_scene.gltf(filepath=str(OUT/'web'/filename),export_format='GLB',use_selection=True,export_yup=True,export_extras=True,export_cameras=False,export_lights=False)
 for o in list(temp.objects):bpy.data.objects.remove(o,do_unlink=True)
 bpy.data.collections.remove(temp)
 for o,name in renamed:o.name=name
 report['bytes']=(OUT/'web'/filename).stat().st_size;assert report['nonmanifold_edges']==0,report
 return report
bpy.context.view_layer.update()
reports={name:export(name,col,low) for name,col,low in [('turn-button.glb',ASSET,False),('turn-button-lod1.glb',ASSET,True),('timer-inserts.glb',TIMER,False)]}
(OUT/'checks/geometry.json').write_text(json.dumps(reports,indent=2))
spec={'component':'05_turn_button','revision':'v1','units':'meters','board_anchor_gltf':[.7,.015,0],'insert_diameter_m':.0928,'board_socket_diameter_m':.095,'minimum_radial_clearance_m':.0011,'rest_face_height_world_m':.02674,'press_travel_m':.0015,'dynamic_node':'PRESS_CAP','label_anchor':'LABEL_SURFACE','label_rectangle_m':[.064,.039],'timer':{'segments':24,'existing_housing':'Board 01 / TIMER_RING','radius_m':[.0538,.0579],'world_height_m':[.02104,.02153],'direction':'clockwise starting at 12 o clock','remaining':'lit from index 0; removed from the trailing edge'},'state':{'player':{'face':'#133042','timer':'#3daacb','text':'END TURN'},'opponent':{'face':'#492633','timer':'#ba6471','text':'ENEMY TURN'},'disabled':'Only player state may activate; local preview offers a separate return control.'},'assets':reports}
(OUT/'model-spec.json').write_text(json.dumps(spec,indent=2))
# Neutral studio for editable source and close renders. Housing belongs to board 01.
ground=mat('Studio gray',(154,160,166),0,.83)
mesh('Studio floor',[(-3,-3,-.029),(3,-3,-.029),(3,3,-.029),(-3,3,-.029)],[(0,1,2,3)],ground,STUDIO,None)
w=bpy.data.worlds.new('Neutral studio');w.use_nodes=True;w.node_tree.nodes['Background'].inputs[0].default_value=(.34,.38,.45,1);w.node_tree.nodes['Background'].inputs[1].default_value=.4;S.world=w
for name,loc,power,size,color in [('Large soft key',(-.22,-.28,.42),3,.3,(1,.92,.81)),('Cool broad fill',(.3,.1,.32),1.5,.26,(.76,.86,1)),('Long edge light',(-.05,.32,.3),2.5,.24,(1,1,1))]:
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;d.color=color;o=bpy.data.objects.new(name,d);STUDIO.objects.link(o);o.location=loc;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
d=bpy.data.cameras.new('Inspection camera');camera=bpy.data.objects.new('Inspection camera',d);STUDIO.objects.link(camera);S.camera=camera;d.type='ORTHO';d.ortho_scale=.155;d.clip_start=.005;d.clip_end=20
camera.location=(.095,-.17,.27);camera.rotation_euler=(Vector((0,0,.004))-camera.location).to_track_quat('-Z','Y').to_euler()
S.render.engine='CYCLES';S.cycles.device='CPU';S.cycles.samples=48;S.cycles.use_denoising=True;S.render.resolution_x=1400;S.render.resolution_y=1200;S.render.resolution_percentage=100;S.render.image_settings.file_format='PNG';S.view_settings.view_transform='AgX';S.view_settings.look='AgX - Medium High Contrast'
TIMER.hide_render=True;TIMER.hide_viewport=True
for a in bpy.context.screen.areas if bpy.context.screen else []:
 if a.type=='VIEW_3D':a.spaces.active.region_3d.view_distance=.22;a.spaces.active.region_3d.view_location=(0,0,0)
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'lore-turn-button-source.blend'))
if '--no-render' not in sys.argv:
 S.render.filepath=str(OUT/'renders/01-turn-button.png');bpy.ops.render.render(write_still=True)
print('TURN_BUTTON_COMPLETE',json.dumps(reports),flush=True)
