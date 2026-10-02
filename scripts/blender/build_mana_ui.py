"""LORE component 02. Hand-authored modular geometry, dimensions in meters.
Run: Blender --background --factory-startup --python scripts/blender/build_mana_ui.py
Blender X right / Y far / Z up; glTF X right / Y up / Z near.
"""
import bpy, bmesh, math, json, sys
from pathlib import Path
from mathutils import Vector

HERE=Path(__file__).resolve()
OUT=HERE.parents[2]/'docs/3d-assets/2026-09-20-blender-mana-ui'
if HERE.parent.name=='source': OUT=HERE.parent.parent
for d in ['web','renders','checks','source']: (OUT/d).mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
S=bpy.context.scene;S.unit_settings.system='METRIC';S.unit_settings.scale_length=1
ASSET=bpy.data.collections.new('02_MANA_EDITABLE');S.collection.children.link(ASSET)
DEMO=bpy.data.collections.new('DEMO_NUMBERS_NOT_EXPORTED');S.collection.children.link(DEMO)
STUDIO=bpy.data.collections.new('STUDIO_NOT_EXPORTED');S.collection.children.link(STUDIO)
def empty(name,parent=None,col=ASSET):
 o=bpy.data.objects.new(name,None);col.objects.link(o);o.parent=parent;o.empty_display_size=.006;return o
ROOT=empty('MANA_ROOT');ROOT['component']='02';ROOT['units']='meters';ROOT['current']=16;ROOT['maximum']=20
ROOT['origin']='Board mana anchor; mounting feet extend down 12 mm to playing surface'
def lin(v):return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
def mat(name,rgb,metal=0,rough=.4,emission=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;c=tuple(lin(v/255) for v in rgb)+(1,);m.diffuse_color=c
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=c;p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 p.inputs['Coat Weight'].default_value=.12 if 'Sapphire' in name else 0
 p.inputs['Specular IOR Level'].default_value=.36 if 'Sapphire' in name else .12 if metal<.3 else .5
 if emission:p.inputs['Emission Color'].default_value=c;p.inputs['Emission Strength'].default_value=emission
 return m
BRASS=mat('Champagne brass / matches board 01',(179,152,105),.78,.29)
SILVER=mat('Warm silver edge',(205,200,184),.70,.31)
BODY=mat('Ink blue enamel',(21,30,45),.25,.34)
RECESS=mat('Deep navy inset',(11,23,39),.10,.42)
GASKET=mat('Soft graphite mounting pad',(12,17,22),0,.73)
SETTING=mat('Blackened silver crystal collet',(45,59,76),.66,.3)
REFLECTOR=mat('Polished silver undercut',(173,186,201),.95,.15)
def gemstone(name,rgb,absorption,transmission,roughness):
 m=mat(name,rgb,0,roughness);nodes=m.node_tree.nodes;p=nodes.get('Principled BSDF')
 p.inputs['Transmission Weight'].default_value=transmission
 p.inputs['IOR'].default_value=1.76;p.inputs['Specular IOR Level'].default_value=.5
 p.inputs['Coat Weight'].default_value=.08;p.inputs['Coat Roughness'].default_value=.055
 volume=nodes.new('ShaderNodeVolumeAbsorption');volume.inputs['Color'].default_value=(*absorption,1);volume.inputs['Density'].default_value=28
 m.node_tree.links.new(volume.outputs['Volume'],nodes.get('Material Output').inputs['Volume'])
 # Portable optical thickness for the browser's KHR_materials_volume approximation.
 group=bpy.data.node_groups.get('glTF Material Output')
 if not group:
  group=bpy.data.node_groups.new('glTF Material Output','ShaderNodeTree')
  # Exporter 5.2 detects this socket to retain settings instead of inlining them away.
  group.interface.new_socket(name='Occlusion',in_out='INPUT',socket_type='NodeSocketFloat')
  group.interface.new_socket(name='Thickness',in_out='INPUT',socket_type='NodeSocketFloat')
  group.nodes.new('NodeGroupInput');group.nodes.new('NodeGroupOutput')
 settings=nodes.new('ShaderNodeGroup');settings.node_tree=group;settings.inputs['Thickness'].default_value=.012
 return m
BLUE=gemstone('Sapphire / optical available',(86,163,242),(.06,.29,.72),.86,.075)
SPENT=gemstone('Smoky quartz / spent',(88,102,120),(.24,.29,.36),.38,.17)
TYPE=mat('Preview numerals / warm ivory',(241,235,215),.10,.4)
ACTIVE=[BLUE];INACTIVE=[SPENT]
def mesh(name,verts,faces,material,parent,col=ASSET,bevel=0):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update()
 bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(me);bm.free()
 o=bpy.data.objects.new(name,me);col.objects.link(o);o.parent=parent
 if material:me.materials.append(material)
 if bevel:
  for p in me.polygons:p.use_smooth=True
  me.set_sharp_from_angle(angle=math.radians(35))
  m=o.modifiers.new('Machined soft edge','BEVEL');m.width=bevel;m.segments=3
  m=o.modifiers.new('Weighted surface normals','WEIGHTED_NORMAL');m.keep_sharp=True;m.weight=40
 return o
def chamfer(w,h,c):
 return [(w/2-c,h/2),(-w/2+c,h/2),(-w/2,h/2-c),(-w/2,-h/2+c),(-w/2+c,-h/2),(w/2-c,-h/2),(w/2,-h/2+c),(w/2,h/2-c)]
def solid(name,pts,z0,z1,m,parent,bev=0):
 n=len(pts);v=[(x,y,z) for z in [z0,z1] for x,y in pts]
 f=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 return mesh(name,v,f,m,parent,bevel=bev)
def slab(name,w,h,c,z0,z1,m,parent,bev=.00045):return solid(name,chamfer(w,h,c),z0,z1,m,parent,bev)
def band(name,w,h,c,t,z0,z1,m,parent,bev=.0003):
 outer=chamfer(w,h,c);inner=chamfer(w-2*t,h-2*t,max(.001,c-t*.6));n=len(outer)
 v=[(x,y,z) for z in [z0,z1] for p in [outer,inner] for x,y in p];f=[]
 for i in range(n):
  j=(i+1)%n;f.extend([(i,n+i,n+j,j),(2*n+i,2*n+j,3*n+j,3*n+i),(i,j,2*n+j,2*n+i),(n+i,3*n+i,3*n+j,n+j)])
 return mesh(name,v,f,m,parent,bevel=bev)
TRAY=empty('MANA_TRAY',ROOT);TRAY.location.x=.0415;TRAY['role']='crystal_container'
COUNTER=empty('MANA_COUNTER',ROOT);COUNTER.location.x=-.132;COUNTER['role']='numeric_container'
def frame(parent,w,h,c):
 slab('Enamel structural casing',w,h,c,-.003,.003,BODY,parent,.0009)
 band('Lower champagne stepped plinth',w+.002,h+.002,c+.0005,.003,-.004,-.0015,BRASS,parent,.00055)
 band('Raised forged bezel',w,h,c,.006,.001,.010,BRASS,parent,.0007)
 band('Warm silver chamfer highlight',w-.0022,h-.0022,c-.0004,.0011,.010,.011,SILVER,parent,.00022)
 band('Inner ink reveal',w-.0105,h-.0105,c-.003,.0019,.004,.009,BODY,parent,.00028)
 band('Inner fine brass bead',w-.0143,h-.0143,c-.004,.0008,.004,.0054,BRASS,parent,.00018)
 slab('Recessed navy face',w-.014,h-.014,c-.004,-.0005,.0038,RECESS,parent,.0005)
 # Central contact pad sits on the white surface at the existing board anchor.
 pad=slab('Underside contact pad',w-.025,.009,.003,-.012,-.002,GASKET,parent,.00065)
 for x in [-w*.33,w*.33]:
  shoe=slab('Underside structural shoe',.020,.016,.003,-.010,-.001,BODY,parent,.0005);shoe.location.x=x
frame(TRAY,.263,.075,.011)
frame(COUNTER,.086,.063,.010)
# Narrow joinery bridge hides the seam without fusing the two editable components.
bridge=slab('Counter to tray joint',.010,.036,.002,-.002,.004,BRASS,COUNTER,.0006);bridge.location.x=.043
anchor=empty('ANCHOR_COUNTER_TEXT',COUNTER);anchor.location=(0,0,.0041);anchor['role']='dynamic_text';anchor['safe_width']=.063;anchor['safe_height']=.038
anchor=empty('ANCHOR_CRYSTAL_FIELD',TRAY);anchor.location.z=.0039;anchor['role']='crystal_layout'
anchor['safe_width']=.236;anchor['safe_height']=.052
CRYSTALS=empty('MANA_CRYSTALS',ROOT);CRYSTALS.location.x=TRAY.location.x
def outline_gem(scale=1):
 return [(0,.020*scale),(-.0098*scale,.009*scale),(-.014*scale,0),(-.0098*scale,-.009*scale),(0,-.020*scale),(.0098*scale,-.009*scale),(.014*scale,0),(.0098*scale,.009*scale)]
def crystal(parent):
 p=outline_gem();n=8;girdle=[]
 for i,a in enumerate(p):
  b=p[(i+1)%n];girdle.extend([a,((a[0]+b[0])*.5,(a[1]+b[1])*.5)])
 # Brilliant-derived lozenge: 8 table edges, 8 star facets, 16 bezel facets,
 # 16 upper-girdle facets, 16 lower-girdle and 16 pavilion facets. No painted faces.
 v=[(x,y,z) for z in [0,.0008] for x,y in girdle]
 v.extend([(x*.34,y*.34,.0092) for x,y in p]) # table indices 32..39
 for i,a in enumerate(p):
  b=p[(i+1)%n];v.append(((a[0]+b[0])*.34,(a[1]+b[1])*.34,.0055)) # stars 40..47
 v.extend([(x*.48,y*.48,-.0045) for x,y in girdle]) # pavilion break 48..63
 v.append((0,0,-.0067));f=[tuple(range(32,40))]
 for i in range(16):
  j=(i+1)%16;f.extend([(i,j,16+j,16+i),(i,48+i,48+j),(i,48+j,j),(48+i,64,48+j)])
 for i in range(n):
  j=(i+1)%n;a=16+2*i;b=16+(2*i+1)%16;c=16+(2*i+2)%16;t=32+i;u=32+j;s=40+i;prev=40+(i-1)%n
  f.extend([(t,s,u),(t,a,s),(t,prev,a),(s,a,b),(s,b,c)])
 o=mesh('Brilliant cut sapphire',v,f,ACTIVE[0],parent)
 if parent.get('slot')==1:
  hull=bmesh.new();hull.from_mesh(o.data);bmesh.ops.convex_hull(hull,input=list(hull.verts),use_existing_faces=False)
  hull.normal_update();planes={}
  for face in hull.faces:
   normal=face.normal;d=normal.dot(face.verts[0].co)
   # Only supporting planes of the closed convex cut, omit internal original faces.
   if any(normal.dot(q.co)>d+1e-7 for q in hull.verts):continue
   plane=[normal.x,normal.z,-normal.y,d/.020];planes[tuple(round(x,5) for x in plane)]=plane
  hull.free()
  (OUT/'web/crystal-optics.json').write_text(json.dumps({'scale':.020,'center':[0,.0106,0],'ior':1.76,'planes':list(planes.values()),'method':'Convex hull of the authored cut, before 25 micron polishing bevel'},indent=2))
 # A narrow polished bevel catches a sliver of light without rounding away facets.
 bevel=o.modifiers.new('Polished facet arris 25 microns','BEVEL');bevel.width=.000025;bevel.segments=2;bevel.affect='EDGES'
 o.location.z=.0106;o['role']='state_crystal';o['cut']='Brilliant-derived lozenge; closed crown, girdle and pavilion'
 # A shaped metal basket and pale reflector seat the full pavilion, not a flat decal.
 outer=outline_gem(1.055);inner=outline_gem(.955)
 vv=[(x,y,z) for z in [.0038,.0109] for pts in [outer,inner] for x,y in pts];ff=[]
 for i in range(n):
  j=(i+1)%n;ff.extend([(i,j,n+j,n+i),(2*n+i,3*n+i,3*n+j,2*n+j),(i,2*n+i,2*n+j,j),(n+i,n+j,3*n+j,3*n+i)])
 mesh('Blackened silver basket',vv,ff,SETTING,parent,bevel=.00010)
 solid('Pavilion reflector',outline_gem(.93),.0038,.00385,REFLECTOR,parent,.00002)
 return o
for i in range(20):
 slot=empty(f'CRYSTAL_{i+1:02d}',CRYSTALS);slot['slot']=i+1;slot['role']='mana_slot';crystal(slot)

def layout(maximum):
 if maximum==0:return []
 if maximum<=10:
  scale=min(1.0,(.226/maximum-.003)/.02954)
  step=min(.045,.226/maximum)
  return [((i-(maximum-1)/2)*step,0,scale) for i in range(maximum)]
 return [((i%10-4.5)*.023,.013 if i<10 else -.013,.57) for i in range(maximum)]
def state(current,maximum):
 ROOT['current']=current;ROOT['maximum']=maximum;positions=layout(maximum)
 for i,slot in enumerate(CRYSTALS.children):
  visible=i<maximum;slot.hide_render=not visible
  for o in slot.children:o.hide_render=not visible;o.hide_set(not visible)
  if not visible:continue
  x,y,scale=positions[i];slot.location=(x,y,.0038*(1-scale));slot.scale=(scale,scale,scale)
  for o in slot.children:
   if o.get('role')=='state_crystal':
    for k,m in enumerate(ACTIVE if i<current else INACTIVE):o.data.materials[k]=m
state(16,20)

FONT=bpy.data.fonts.load(str(OUT/'web/fonts/DejaVuSerif.ttf'));FONT.pack()
def text(name,string,x,y,size,parent=COUNTER):
 d=bpy.data.curves.new(name,'FONT');d.body=string;d.font=FONT;d.size=size;d.align_x='CENTER';d.align_y='CENTER';d.extrude=.00006;d.resolution_u=6
 o=bpy.data.objects.new(name,d);DEMO.objects.link(o);o.parent=parent;o.location=(x,y,.0044);d.materials.append(TYPE);return o
NUM=text('Preview current / runtime text','16',-.011,.0007,.027)
MAX=text('Preview maximum / runtime text','/20',.018,-.001,.016)
def numerals(current,maximum):
 NUM.data.body=str(current);MAX.data.body='/'+str(maximum)
 # Center the combined width, keeping the current amount visually dominant.
 bpy.context.view_layer.update();total=NUM.dimensions.x+MAX.dimensions.x+.0016
 NUM.location.x=-total/2+NUM.dimensions.x/2
 MAX.location.x=total/2-MAX.dimensions.x/2
numerals(16,20)

def aim(o,target):o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
S.render.engine='CYCLES';S.cycles.samples=64;S.cycles.use_denoising=True;S.cycles.max_bounces=10;S.cycles.transmission_bounces=8
# Use available hardware without modifying user preferences or an open GUI scene.
try:
 if '--metal' not in sys.argv:raise RuntimeError('CPU is the portable default; use --metal for an initialized Metal device')
 prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='METAL';prefs.get_devices()
 if any(d.type=='METAL' for d in prefs.devices):
  for d in prefs.devices:d.use=d.type=='METAL'
  S.cycles.device='GPU'
except (TypeError,RuntimeError):pass
S.render.resolution_x=1920;S.render.resolution_y=1080;S.render.resolution_percentage=100;S.render.image_settings.file_format='PNG'
S.view_settings.view_transform='AgX';S.view_settings.look='AgX - Medium High Contrast'
S.world.use_nodes=True;S.world.node_tree.nodes['Background'].inputs[0].default_value=(.55,.60,.70,1);S.world.node_tree.nodes['Background'].inputs[1].default_value=.09
for name,loc,power,size in [('Large warm key',(-.3,-.3,.8),5,.45),('Cool soft fill',(.4,.1,.5),1.5,.5),('Long rim',(.0,.4,.5),3,.4)]:
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);STUDIO.objects.link(o);o.location=loc;aim(o,(0,0,0))
floor=mesh('Studio ground',[(-20,-20,-.0123),(20,-20,-.0123),(20,20,-.0123),(-20,20,-.0123)],[(0,1,2,3)],mat('Studio blue grey',(78,88,99),0,.8),None,col=STUDIO)
d=bpy.data.cameras.new('CAM_MANA');cam=bpy.data.objects.new('CAM_MANA',d);STUDIO.objects.link(cam);S.camera=cam;d.type='ORTHO';d.ortho_scale=.415;d.clip_start=.001;d.clip_end=20
cam.location=(.06,-.23,.46);aim(cam,(0,0,.002))
for sc in bpy.data.screens:
 for a in sc.areas:
  if a.type=='VIEW_3D':a.spaces.active.region_3d.view_perspective='CAMERA';a.spaces.active.shading.type='MATERIAL'
STUDIO.hide_select=True
ref=bpy.data.images.load(str(OUT/'reference/approved-board.png'));ref.name='REFERENCE_ONLY_approved_board';ref.pack()
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'lore-mana-ui-source.blend'))

# Evaluate source topology and export disposable, merged-per-material copies.
report={'blender':bpy.app.version_string,'units':'meters','source_objects':len(ASSET.objects),'source_triangles':0,'nonmanifold':[],'exports':[]}
deps=bpy.context.evaluated_depsgraph_get()
for o in ASSET.objects:
 if o.type!='MESH':continue
 ev=o.evaluated_get(deps);me=ev.to_mesh();me.calc_loop_triangles();report['source_triangles']+=len(me.loop_triangles)
 bm=bmesh.new();bm.from_mesh(me);bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=1e-8)
 bad=sum(not e.is_manifold for e in bm.edges)
 if bad:report['nonmanifold'].append({'name':o.name,'edges':bad})
 bm.free();ev.to_mesh_clear()
assert not report['nonmanifold'],report['nonmanifold']
def descendants(o):return [o]+[d for c in o.children for d in descendants(c)]
def export(name,root,origin=True):
 col=bpy.data.collections.new('TEMP_EXPORT');S.collection.children.link(col);mapping={}
 objs=descendants(root);bpy.context.view_layer.update()
 # Keep the part hierarchy and independent gems; join only within a logical part.
 for o in objs:
  if o.type=='MESH':
   ev=o.evaluated_get(deps);me=bpy.data.meshes.new_from_object(ev,preserve_all_data_layers=False,depsgraph=deps)
   n=bpy.data.objects.new('MODEL_'+o.name.replace('.','_'),me)
  else:n=bpy.data.objects.new('MODEL_'+o.name.replace('.','_'),None)
  col.objects.link(n);mapping[o]=n
  for k in o.keys():n[k]=o[k]
 for o,n in mapping.items():
  n.matrix_world=o.matrix_world.copy()
  if o.parent in mapping:
   n.parent=mapping[o.parent];n.matrix_local=o.matrix_local.copy()
  elif origin:n.matrix_world.identity()
 # The root shift must retain local coordinates of children.
 if origin:mapping[root].location=(0,0,0);mapping[root].rotation_euler=(0,0,0);mapping[root].scale=(1,1,1)
 # Collapse casing pieces to one multi-material mesh per editable container.
 for src,n in list(mapping.items()):
  if src.get('role') not in ('crystal_container','numeric_container'):continue
  parts=[c for c in list(n.children) if c.type=='MESH']
  bpy.ops.object.select_all(action='DESELECT')
  for c in parts:c.select_set(True)
  bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();parts[0].name=src.name+'_SURFACES'
 bpy.ops.object.select_all(action='DESELECT')
 for n in col.objects:n.select_set(True)
 bpy.context.view_layer.objects.active=mapping[root]
 path=OUT/'web'/name
 bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_yup=True,export_apply=False,export_extras=True,export_cameras=False,export_lights=False,export_animations=False,export_texcoords=False,export_normals=True,export_tangents=False)
 tri=0;meshes=0
 for n in col.objects:
  if n.type=='MESH':n.data.calc_loop_triangles();tri+=len(n.data.loop_triangles);meshes+=1
 report['exports'].append({'file':name,'triangles':tri,'meshes':meshes,'bytes':path.stat().st_size})
 for n in list(col.objects):bpy.data.objects.remove(n,do_unlink=True)
 bpy.data.collections.remove(col)
export('mana-assembly.glb',ROOT)
export('mana-tray.glb',TRAY)
export('mana-counter.glb',COUNTER)
slot=CRYSTALS.children[0];original_location=slot.location.copy();original_scale=slot.scale.copy();slot.location=(0,0,0);slot.scale=(1,1,1)
export('mana-crystal-ready.glb',slot)
for o in slot.children:
 if o.get('role')=='state_crystal':
  for k,m in enumerate(INACTIVE):o.data.materials[k]=m
export('mana-crystal-spent.glb',slot)
slot.location=original_location;slot.scale=original_scale;state(16,20)
(OUT/'checks/geometry.json').write_text(json.dumps(report,indent=2))
print('MANA_EXPORTED',json.dumps(report),flush=True)
if '--no-render' in sys.argv:sys.exit(0)
def render(name,loc,target,scale,current=16,maximum=20):
 state(current,maximum);numerals(current,maximum);cam.location=loc;aim(cam,target);cam.data.ortho_scale=scale
 S.render.filepath=str(OUT/'renders'/name);bpy.ops.render.render(write_still=True)
render('01-mana-16-of-20.png',(.035,-.20,.45),(0,0,.003),.415)
render('02-mana-4-of-4.png',(.035,-.20,.45),(0,0,.003),.415,4,4)
if '--preview-only' in sys.argv:sys.exit(0)
render('03-mana-top.png',(0,0,.5),(0,0,.003),.405)
render('04-mana-side.png',(.05,-.45,.14),(0,0,.003),.415)
state(16,20);numerals(16,20)
TRAY.location.z=.028;CRYSTALS.location.z=.06;COUNTER.location.x=-.20
render('05-mana-parts.png',(.025,-.25,.46),(-.028,0,.025),.51)
TRAY.location.z=0;CRYSTALS.location.z=0;COUNTER.location.x=-.132
state(0,0);NUM.hide_render=True;MAX.hide_render=True;NUM.hide_set(True);MAX.hide_set(True)
cam.location=(.035,-.20,.45);aim(cam,(0,0,.003));cam.data.ortho_scale=.415
S.render.filepath=str(OUT/'renders/07-empty-frames.png');bpy.ops.render.render(write_still=True)
# Save a ready-to-open empty variant without changing the full editable original.
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'lore-mana-empty-frames.blend'))
NUM.hide_render=False;MAX.hide_render=False;NUM.hide_set(False);MAX.hide_set(False);state(1,1)
# Tight inspection of the optical cut and basket; the tray remains for scale.
cam.location=(.071,-.052,.115);aim(cam,(.0415,0,.010));cam.data.ortho_scale=.066
S.render.resolution_x=1400;S.render.resolution_y=1400;S.cycles.samples=96
S.render.filepath=str(OUT/'renders/09-crystal-detail.png');bpy.ops.render.render(write_still=True)
print('MANA_DELIVERY_RENDERED',flush=True)
