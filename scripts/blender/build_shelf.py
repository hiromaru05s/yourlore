"""LORE 04: open archive box shelf. All dimensions in meters.
Run with Blender 5.2 --background --factory-startup --python this_file.py
Authored geometry, standard glTF PBR, removable card references. No game changes.
"""
import bpy, bmesh, math, json, sys, struct
from pathlib import Path
from mathutils import Vector

HERE=Path(__file__).resolve()
OUT=HERE.parent.parent if HERE.parent.name=='source' else HERE.parents[2]/'docs/3d-assets/2026-09-21-blender-shelf'
for p in ['renders','checks','web','source']:(OUT/p).mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
S=bpy.context.scene;S.unit_settings.system='METRIC';S.unit_settings.scale_length=1
ASSET=bpy.data.collections.new('04_SHELF_EDITABLE');S.collection.children.link(ASSET)
DEMO=bpy.data.collections.new('REFERENCE_CARDS_NOT_EXPORTED');S.collection.children.link(DEMO)
STUDIO=bpy.data.collections.new('STUDIO_NOT_EXPORTED');S.collection.children.link(STUDIO)
def empty(name,col=ASSET,parent=None):
 o=bpy.data.objects.new(name,None);col.objects.link(o);o.parent=parent;o.empty_display_size=.006;return o
ROOT=empty('SHELF_ROOT');ROOT['component']='04';ROOT['units']='meters';ROOT['origin']='Bottom center; attach at board 01 shelf anchors with identity rotation and unit scale'
def lin(v):return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
def material(name,rgb,metal,rough,texture=None):
 m=bpy.data.materials.new(name);m.use_nodes=True;c=tuple(lin(v/255) for v in rgb)+(1,);m.diffuse_color=c
 n=m.node_tree.nodes;p=n.get('Principled BSDF');p.inputs['Base Color'].default_value=c;p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 p.inputs['Specular IOR Level'].default_value=.15 if metal<.3 else .5
 if texture:
  for suffix,socket in [('color','Base Color'),('rough','Roughness'),('normal','Normal')]:
   path=OUT/'web/textures'/f'{texture}-{suffix}.{ "jpg" if suffix=="color" else "png" }'
   im=bpy.data.images.load(str(path));node=n.new('ShaderNodeTexImage');node.image=im
   if suffix!='color':im.colorspace_settings.name='Non-Color'
   if suffix=='normal':
    normal=n.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.16;m.node_tree.links.new(node.outputs['Color'],normal.inputs['Color']);m.node_tree.links.new(normal.outputs['Normal'],p.inputs[socket])
   else:m.node_tree.links.new(node.outputs['Color'],p.inputs[socket])
 return m
WOOD=material('01 Ink navy stained wood',(23,33,48),.03,.5,'navy-wood')
TOP=material('02 Woven navy contact surface',(28,46,72),0,.7,'navy-jacquard')
BRASS=material('03 Satin champagne brass',(179,152,105),.78,.29)
SILVER=material('04 Warm silver pinstripe',(205,200,184),.70,.31)
GASKET=material('05 Graphite contact foot',(12,17,22),0,.75)

def contour(w,h,r,n=12):
 pts=[]
 for cx,cy,start in [(w/2-r,h/2-r,0),(-w/2+r,h/2-r,90),(-w/2+r,-h/2+r,180),(w/2-r,-h/2+r,270)]:
  for j in range(n):
   a=math.radians(start+j*90/(n-1));pts.append((cx+r*math.cos(a),cy+r*math.sin(a)))
 return pts
def mesh(name,verts,faces,mat,col=ASSET,parent=ROOT,bevel=0):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update()
 bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(me);bm.free()
 uv=me.uv_layers.new(name='UVMap')
 for poly in me.polygons:
  axis=max(range(3),key=lambda k:abs(poly.normal[k]))
  for li in poly.loop_indices:
   v=me.vertices[me.loops[li].vertex_index].co
   uv_scale=.08 if mat==TOP else .24
   uv.data[li].uv=((v.x/uv_scale+.5,v.y/uv_scale+.5) if axis==2 else (v.x/.24+.5,v.z/.12) if axis==1 else (v.y/.24+.5,v.z/.12))
 o=bpy.data.objects.new(name,me);col.objects.link(o);o.parent=parent;me.materials.append(mat)
 if bevel:
  for p in me.polygons:p.use_smooth=True
  me.set_sharp_from_angle(angle=math.radians(35))
  mod=o.modifiers.new('Fine edge radius','BEVEL');mod.width=bevel;mod.segments=3
  mod=o.modifiers.new('Face weighted normals','WEIGHTED_NORMAL');mod.keep_sharp=True
 return o
def slab(name,w,h,r,z0,z1,mat,bevel=.00015,col=ASSET,parent=ROOT,n=12):
 pts=contour(w,h,r,n);N=len(pts)
 return mesh(name,[(x,y,z) for z in [z0,z1] for x,y in pts],[tuple(reversed(range(N))),tuple(range(N,2*N))]+[(i,(i+1)%N,(i+1)%N+N,i+N) for i in range(N)],mat,col,parent,bevel)
def ring(name,w,h,r,width,z0,z1,mat,bevel=.00007):
 outer=contour(w,h,r);inner=contour(w-2*width,h-2*width,max(.002,r-width));N=len(outer)
 verts=[(x,y,z) for z in [z0,z1] for c in [outer,inner] for x,y in c];faces=[]
 for i in range(N):
  j=(i+1)%N;faces.extend([(i,N+i,N+j,j),(2*N+i,2*N+j,3*N+j,3*N+i),(i,j,2*N+j,2*N+i),(N+i,3*N+i,3*N+j,N+j)])
 return mesh(name,verts,faces,mat,bevel=bevel)


# The clear opening is sized around the actual card, including its projecting seals.
CONTACT=.009
slab('01 Recessed graphite foot',.156,.222,.006,0,.0012,GASKET,.0002)
slab('02 Thin champagne base shoe',.166,.232,.007,.0010,.0032,BRASS,.00035)
slab('03 Structural bottom',.162,.228,.006,.0028,.0083,WOOD,.00045)
ring('04 Box walls / continuous open cavity',.162,.228,.006,.009,.0052,.0338,WOOD,.0006)
ring('05 Fine lower shadow reveal',.1625,.2285,.006,.00065,.0042,.0048,GASKET,.00005)
ring('06 Dark navy inner lining',.1444,.2104,.0028,.0012,.0082,.0318,TOP,.00012)
slab('07 Flat woven cavity floor',.142,.208,.002,.0078,CONTACT,TOP,.00012)
ring('08 Rounded timber rim',.1628,.2288,.006,.010,.0325,.0348,WOOD,.00035)
ring('09 Outer fine brass rim',.163,.229,.0062,.0011,.0341,.0351,BRASS,.00014)
ring('10 Inner silver bead',.1448,.2108,.003,.0007,.0346,.0352,SILVER,.00012)
# Four mortised corners and compact faceted metal corner caps.
for ix,x in enumerate([-.0754,.0754]):
 for iy,y in enumerate([-.1084,.1084]):
  o=slab(f'Corner timber post {ix}{iy}',.012,.012,.001,.004,.0360,WOOD,.00045);o.location.x=x;o.location.y=y
  o=slab(f'Corner brass collar {ix}{iy}',.014,.014,.0014,.0347,.0365,BRASS,.00020);o.location.x=x;o.location.y=y
  a=.0068;b=.0042
  p=[(-a,-a),(a,-a),(a,a),(-a,a)];q=[(-b,-b),(b,-b),(b,b),(-b,b)]
  cap=mesh(f'Faceted champagne cap {ix}{iy}',[(u,v,.0363) for u,v in p]+[(u,v,.038) for u,v in q],[(3,2,1,0),(4,5,6,7)]+[(j,(j+1)%4,(j+1)%4+4,j+4) for j in range(4)],BRASS,bevel=.00008);cap.location.x=x;cap.location.y=y
  # Corner bindings stop below the upper cap; separate, editable metal joinery.
  for axis in ['x','y']:
   if axis=='x':o=slab(f'Corner outer binding X {ix}{iy}',.0008,.010,.0003,.008,.0347,BRASS,.0001);o.location=(x+(.006 if x>0 else -.006),y,0)
   else:o=slab(f'Corner outer binding Y {ix}{iy}',.010,.0008,.0003,.008,.0347,BRASS,.0001);o.location=(x,y+(.006 if y>0 else -.006),0)
# A small recessed front and cast handle read as furniture, without added ornaments.
front=slab('11 Inset front fascia',.116,.021,.0025,-.0004,.0004,WOOD,.00025);front.rotation_euler.x=math.pi/2;front.location=(0,-.1141,.0185)
trim=ring('12 Front fine inlaid rule',.119,.024,.003,.0005,-.00013,.00013,BRASS,.00005);trim.rotation_euler.x=math.pi/2;trim.location=(0,-.11465,.0185)
for x in [-.017,.017]:
 o=slab('Handle mounting escutcheon',.007,.009,.002,-.0006,.0006,BRASS,.00022);o.rotation_euler.x=math.pi/2;o.location=(x,-.1153,.020)
 o=slab('Handle dark mounting pin',.0024,.004,.0008,-.002,.002,BRASS,.00030);o.rotation_euler.x=math.pi/2;o.location=(x,-.1175,.021)
def tube(name,points,radius,mat):
 points=[Vector(p) for p in points];verts=[];faces=[];N=10
 for i,p in enumerate(points):
  direction=(points[min(i+1,len(points)-1)]-points[max(i-1,0)]).normalized()
  u=direction.cross(Vector((0,1,0))).normalized();v=direction.cross(u).normalized()
  for k in range(N):verts.append(tuple(p+radius*(u*math.cos(k*2*math.pi/N)+v*math.sin(k*2*math.pi/N))))
 for j in range(len(points)-1):
  for k in range(N):faces.append((j*N+k,j*N+(k+1)%N,(j+1)*N+(k+1)%N,(j+1)*N+k))
 faces.extend([tuple(reversed(range(N))),tuple(range((len(points)-1)*N,len(points)*N))])
 o=mesh(name,verts,faces,mat)
 for p in o.data.polygons:p.use_smooth=True
 return o
path=[(-.017,-.120,.022),(-.017,-.120,.018)]
for j in range(1,7):
 a=math.pi+(math.pi/2)*j/6;path.append((-.013+.004*math.cos(a),-.120,.018+.004*math.sin(a)))
path.append((.013,-.120,.014))
for j in range(1,7):
 a=-math.pi/2+(math.pi/2)*j/6;path.append((.013+.004*math.cos(a),-.120,.018+.004*math.sin(a)))
path.append((.017,-.120,.022));tube('13 Cast champagne pull handle',path,.0014,BRASS)
for name,z,role in [('ANCHOR_CARD_CONTACT',CONTACT,'Bottom of first shelf card'),('ANCHOR_CARD_ARRIVAL',CONTACT,'Runtime top face = contact + card_count * thickness'),('ANCHOR_LIFT_CLEARANCE',.050,'Lift the lowest card above this local height before a horizontal shuffle transfer')]:
 a=empty(name,parent=ROOT);a.location.z=z;a['role']=role
ROOT['interior_width']=.142;ROOT['interior_depth']=.208;ROOT['contact_height']=CONTACT

CARD_W=.110;CARD_H=.171875;CARD_T=.0008
# The native renderer's transparent capture retains the cost/ATK/HP silhouettes.
# The plain supporting sheet is smaller than the ornate print; no rectangular border.
EDGE=material('Reference paper edges',(56,60,67),0,.65)
FRONT=material('Reference current LORE card face',(255,255,255),0,.7)
im=bpy.data.images.load(str(OUT/'web/textures/card-front.png'));tx=FRONT.node_tree.nodes.new('ShaderNodeTexImage');tx.image=im
p=FRONT.node_tree.nodes['Principled BSDF'];FRONT.node_tree.links.new(tx.outputs['Color'],p.inputs['Base Color']);FRONT.node_tree.links.new(tx.outputs['Alpha'],p.inputs['Alpha'])
CARDS=empty('REFERENCE_FACE_UP_STACK',DEMO,None)
def reference_card(index):
 z=CONTACT+CARD_T*index
 body=slab(f'Reference paper {index+1:02d}',.101,.157,.0045,z,z+CARD_T,EDGE,.00006,DEMO,CARDS,n=8)
 w=.1364;h=.198275
 face=mesh(f'Reference face {index+1:02d}',[(-w/2,-h/2,z+CARD_T+.00001),(w/2,-h/2,z+CARD_T+.00001),(w/2,h/2,z+CARD_T+.00001),(-w/2,h/2,z+CARD_T+.00001)],[(0,1,2,3)],FRONT,DEMO,CARDS)
 for li in face.data.polygons[0].loop_indices:
  v=face.data.vertices[face.data.loops[li].vertex_index].co;face.data.uv_layers.active.data[li].uv=(v.x/w+.5,v.y/h+.5)
 return body,face
demo_cards=[reference_card(i) for i in range(40)]
def card_count(count):
 for i,pair in enumerate(demo_cards):
  body,face=pair
  body.hide_render=i>=count;body.hide_set(i>=count)
  # Only the visible top card has a print. Stacked alpha planes would both show
  # repeated stat frames and exhaust transparent-ray depth into a black rectangle.
  face.hide_render=i!=count-1;face.hide_set(i!=count-1)
card_count(10)
def repair_export_tangents(path):
 # Blender can emit a zero tangent at a few collapsed bevel vertices.
 # Reconstruct only those vectors from their actual incident triangle UVs.
 data=bytearray(path.read_bytes());jsize=struct.unpack_from('<I',data,12)[0]
 doc=json.loads(data[20:20+jsize]);binary=20+jsize+8;repaired=0
 def accessor(i):
  a=doc['accessors'][i];v=doc['bufferViews'][a['bufferView']]
  components={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
  fmt={5121:'B',5123:'H',5125:'I',5126:'f'}[a['componentType']]
  size=struct.calcsize('<'+fmt)*components;stride=v.get('byteStride',size)
  start=binary+v.get('byteOffset',0)+a.get('byteOffset',0)
  return [struct.unpack_from('<'+fmt*components,data,start+j*stride) for j in range(a['count'])],start,stride
 for mesh in doc['meshes']:
  for prim in mesh['primitives']:
   attrs=prim['attributes']
   if 'TANGENT' not in attrs:continue
   tangents,start,stride=accessor(attrs['TANGENT'])
   bad={i for i,t in enumerate(tangents) if sum(x*x for x in t[:3])<.5}
   if not bad:continue
   positions,_,_=accessor(attrs['POSITION']);normals,_,_=accessor(attrs['NORMAL']);uvs,_,_=accessor(attrs['TEXCOORD_0']);indices,_,_=accessor(prim['indices']);best={}
   for k in range(0,len(indices),3):
    tri=[indices[k+j][0] for j in range(3)]
    affected=bad.intersection(tri)
    if not affected:continue
    a,b,c=tri;p,q,r=[Vector(positions[i]) for i in tri]
    e1=q-p;e2=r-p;uv1=Vector(uvs[b])-Vector(uvs[a]);uv2=Vector(uvs[c])-Vector(uvs[a]);det=uv1.x*uv2.y-uv1.y*uv2.x
    if abs(det)<1e-20:continue
    t=(e1*uv2.y-e2*uv1.y)/det;bt=(e2*uv1.x-e1*uv2.x)/det;area=e1.cross(e2).length
    for i in affected:
     n=Vector(normals[i]);v=t-n*n.dot(t)
     if v.length<1e-12:continue
     v.normalize();w=-1 if n.cross(v).dot(bt)<0 else 1
     if i not in best or area>best[i][0]:best[i]=(area,(*v,w))
   assert bad==set(best),'Cannot reconstruct an export tangent from valid triangle UVs'
   for i,(_,t) in best.items():struct.pack_into('<4f',data,start+i*stride,*t);repaired+=1
 path.write_bytes(data);return repaired


# Evaluate copies only: retain every authored part and modifier in the source.
def export_model(filename,low=False):
 col=bpy.data.collections.new('TEMP_EXPORT');S.collection.children.link(col);deps=bpy.context.evaluated_depsgraph_get();copies=[]
 for o in ASSET.objects:
  if o.type!='MESH':continue
  ev=o.evaluated_get(deps);me=bpy.data.meshes.new_from_object(ev,preserve_all_data_layers=True,depsgraph=deps)
  n=bpy.data.objects.new(o.name,me);col.objects.link(n);n.matrix_world=o.matrix_world.copy();copies.append(n)
 groups={}
 for o in copies:groups.setdefault(o.data.materials[0].name,[]).append(o)
 merged=[]
 for material_name,objects in groups.items():
  bpy.ops.object.select_all(action='DESELECT')
  for o in objects:o.select_set(True)
  bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();o=objects[0];o.name=material_name
  if low:
   mod=o.modifiers.new('LOD reduction','DECIMATE');mod.ratio=.35;mod.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=mod.name)
  # Tangent calculation requires triangles; preserve custom normals on the copy.
  mod=o.modifiers.new('Portable export triangles','TRIANGULATE');mod.keep_custom_normals=True;bpy.ops.object.modifier_apply(modifier=mod.name)
  # Collapse can leave a tiny bevel triangle with collinear UVs. Reproject only
  # those triangles so MikkTSpace has a real tangent, rather than a zero vector.
  if low and o.data.uv_layers:
   layer=o.data.uv_layers.active.data;repaired=0
   for face in o.data.polygons:
    li=list(face.loop_indices);a,b,c=[layer[i].uv.copy() for i in li]
    if abs((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x))>=1e-12:continue
    axis=max(range(3),key=lambda k:abs(face.normal[k]));uv_scale=.08 if o.data.materials[0]==TOP else .24
    for i in li:
     v=o.data.vertices[o.data.loops[i].vertex_index].co
     layer[i].uv=(v.x/uv_scale+.5,v.y/uv_scale+.5) if axis==2 else (v.x/.24+.5,v.z/.12) if axis==1 else (v.y/.24+.5,v.z/.12)
    repaired+=1
   o['collapsed_uv_triangles_repaired']=repaired
  if not any(n.type=='TEX_IMAGE' for n in o.data.materials[0].node_tree.nodes):
   for uv in list(o.data.uv_layers):o.data.uv_layers.remove(uv)
  merged.append(o)
 for name in ['ANCHOR_CARD_CONTACT','ANCHOR_CARD_ARRIVAL','ANCHOR_LIFT_CLEARANCE']:
  original=bpy.data.objects[name];a=empty(name.replace('ANCHOR_',''),col);a.location=original.location
  for k,v in original.items():a[k]=v
 bpy.ops.object.select_all(action='DESELECT')
 for o in col.objects:o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=str(OUT/'web'/filename),export_format='GLB',use_selection=True,export_yup=True,export_extras=True,export_cameras=False,export_lights=False,export_tangents=True)
 report={'meshes':len(merged),'triangles':0,'nonmanifold_edges':0,'bounds':None,'tangents_reconstructed_from_triangle_uvs':repair_export_tangents(OUT/'web'/filename)}
 vertices=[]
 for o in merged:
  o.data.calc_loop_triangles();report['triangles']+=len(o.data.loop_triangles)
  bm=bmesh.new();bm.from_mesh(o.data);report['nonmanifold_edges']+=sum(not e.is_manifold for e in bm.edges);bm.free()
  vertices.extend([o.matrix_world@v.co for v in o.data.vertices])
 report['bounds']={'min':[min(v[i] for v in vertices) for i in range(3)],'max':[max(v[i] for v in vertices) for i in range(3)]}
 report['bytes']=(OUT/'web'/filename).stat().st_size
 for o in list(col.objects):bpy.data.objects.remove(o,do_unlink=True)
 bpy.data.collections.remove(col)
 assert report['nonmanifold_edges']==0,report
 return report
bpy.context.view_layer.update()
reports={n:export_model(n,low) for n,low in [('shelf.glb',False),('shelf-lod1.glb',True)]}
(OUT/'checks/geometry.json').write_text(json.dumps(reports,indent=2))

# Studio is part of the editable source but never part of the GLB.
FLOOR=material('Studio warm neutral',(147,151,157),0,.83)
slab('Studio floor',4,4,.02,-.001,-.00015,FLOOR,0,STUDIO,None)
world=bpy.data.worlds.new('Neutral studio');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.34,.38,.45,1);world.node_tree.nodes['Background'].inputs[1].default_value=.4;S.world=world
def area(name,loc,power,size,color):
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;d.color=color;o=bpy.data.objects.new(name,d);STUDIO.objects.link(o);o.location=loc;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler();return o
area('Large soft key',(-.22,-.28,.42),3,.30,(1,.92,.81))
area('Cool broad fill',(.3,.1,.32),1.5,.26,(.76,.86,1))
area('Long edge light',(-.05,.32,.3),2.5,.24,(1,1,1))
d=bpy.data.cameras.new('Inspection camera');camera=bpy.data.objects.new('Inspection camera',d);STUDIO.objects.link(camera);S.camera=camera
d.type='ORTHO';d.ortho_scale=.345;d.clip_start=.01;d.clip_end=20
def look(position,target=(0,0,.01)):
 camera.location=position;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
look((.14,-.32,.47),target=(0,0,.017))
S.render.engine='CYCLES';S.cycles.device='CPU';S.cycles.samples=32;S.cycles.use_denoising=True
S.render.resolution_x=1600;S.render.resolution_y=1200;S.render.resolution_percentage=100
S.render.image_settings.file_format='PNG';S.view_settings.view_transform='AgX';S.view_settings.look='AgX - Medium High Contrast'
S.render.film_transparent=False
for im in bpy.data.images:
 if im.source=='FILE' and not im.packed_file:im.pack()
# Source opens with ten removable reference cards; pedestal GLBs contain zero cards.
bpy.ops.object.select_all(action='DESELECT');ROOT.select_set(True);bpy.context.view_layer.objects.active=ROOT
for a in bpy.context.screen.areas if bpy.context.screen else []:
 if a.type=='VIEW_3D':a.spaces.active.region_3d.view_distance=.40;a.spaces.active.region_3d.view_location=(0,0,.01)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'lore-shelf-source.blend'))

spec={'component':'04_shelf','revision':'v1','units':'meters','origin':'Bottom center on board surface','base_footprint_m':[.166,.232],'maximum_height_m':.038,'handle_front_y_blender_m':-.1214,'opening_m':[.142,.208],'contact_plane_m':CONTACT,'card':{'width':CARD_W,'depth':CARD_H,'thickness':CARD_T,'face_capture_m':[.1364,.198275],'face_capture_padding_of_body_width':.12},'nominal_clearance_per_side_m':[(.142-CARD_W)/2,(.208-CARD_H)/2],'board_anchors_gltf':{'player':[-.54,0,.245],'opponent':[-.54,0,-.245]},'orientation_gltf':'Identity rotation, unit scale for both sides; keep prints upright to the viewer.','camera':{'tilt_from_vertical_deg':18,'vertical_fov_deg':25.608532,'distance_m':2.25738},'runtime':{'top_face_height':'0.009 + card_count * 0.0008','shuffle_clearance_m':.050,'note':'Lift the bottom of the stack over the rail before moving horizontally. Counts are inspection examples, not game rules.'},'assets':reports,'parts':len([o for o in ASSET.objects if o.type=='MESH'])}
(OUT/'model-spec.json').write_text(json.dumps(spec,indent=2))
if '--no-render' not in sys.argv:
 card_count(0);S.render.filepath=str(OUT/'renders/01-empty-shelf.png');bpy.ops.render.render(write_still=True)
 card_count(10);S.render.filepath=str(OUT/'renders/02-face-up-cards.png');bpy.ops.render.render(write_still=True)
 card_count(0);look((.18,-.34,.16),target=(0,0,.016));S.camera.data.ortho_scale=.34;S.render.resolution_y=1000
 S.render.filepath=str(OUT/'renders/03-box-and-handle.png');bpy.ops.render.render(write_still=True)
print('SHELF_BUILD_COMPLETE',json.dumps(reports),flush=True)
