"""LORE 03: low-profile deck pedestal. All dimensions in meters.
Run with Blender 5.2 --background --factory-startup --python this_file.py
Authored geometry, standard glTF PBR, removable card references. No game changes.
"""
import bpy, bmesh, math, json, sys
from pathlib import Path
from mathutils import Vector

HERE=Path(__file__).resolve()
OUT=HERE.parent.parent if HERE.parent.name=='source' else HERE.parents[2]/'docs/3d-assets/2026-09-20-blender-deck-place'
for p in ['renders','checks','web','source']:(OUT/p).mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
S=bpy.context.scene;S.unit_settings.system='METRIC';S.unit_settings.scale_length=1
ASSET=bpy.data.collections.new('03_DECK_PLACE_EDITABLE');S.collection.children.link(ASSET)
DEMO=bpy.data.collections.new('REFERENCE_CARDS_NOT_EXPORTED');S.collection.children.link(DEMO)
STUDIO=bpy.data.collections.new('STUDIO_NOT_EXPORTED');S.collection.children.link(STUDIO)
def empty(name,col=ASSET,parent=None):
 o=bpy.data.objects.new(name,None);col.objects.link(o);o.parent=parent;o.empty_display_size=.006;return o
ROOT=empty('DECK_PLACE_ROOT');ROOT['component']='03';ROOT['units']='meters';ROOT['origin']='Bottom center; attach at board 01 deck anchors with identity rotation and unit scale'
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
 outer=contour(w,h,r);inner=contour(w-2*width,h-2*width,r-width);N=len(outer)
 verts=[(x,y,z) for z in [z0,z1] for c in [outer,inner] for x,y in c];faces=[]
 for i in range(N):
  j=(i+1)%N;faces.extend([(i,N+i,N+j,j),(2*N+i,2*N+j,3*N+j,3*N+i),(i,j,2*N+j,2*N+i),(N+i,3*N+i,3*N+j,N+j)])
 return mesh(name,verts,faces,mat,bevel=bevel)

# 8.8 mm total, entirely below the card contact plane. No raised lip to snag cards.
slab('01 Recessed underside foot',.126,.188,.005,0,.0012,GASKET,.0002)
slab('02 Lower brass shoe',.136,.198,.006,.0008,.0020,BRASS,.00025)
slab('03 Inkwood body',.1344,.1964,.0054,.0018,.0066,WOOD,.00055)
ring('04 Lower reveal',.1346,.1966,.0055,.00065,.0021,.00245,GASKET,.00005)
slab('05 Upper brass chamfer',.135,.197,.0057,.0062,.0085,BRASS,.00045)
slab('06 Inset wooden shoulder',.1318,.1938,.0048,.0072,.00855,WOOD,.00022)
ring('07 Fine warm silver inlay',.1298,.1918,.0046,.00045,.00848,.00862,SILVER,.00003)
ring('08 Inner brass seam',.1268,.1888,.0043,.00040,.00848,.00867,BRASS,.000025)
slab('09 Flat woven contact panel',.1256,.1876,.004,.0077,.0088,TOP,.00012)
# Restrained flush joinery marks at four corners, outside the card silhouette.
for x in [-.0638,.0638]:
 for y in [-.0948,.0948]:
  o=slab('Flush corner brass key',.0014,.0025,.00035,.00854,.00867,BRASS,.00004,n=6);o.location.x=x;o.location.y=y
for name,z,role in [('ANCHOR_CARD_CONTACT',.0088,'Bottom surface of first card'),('ANCHOR_DRAW_ORIGIN',.0088,'Add card_count * 0.0008 to height at runtime')]:
 a=empty(name,parent=ROOT);a.location.z=z;a['role']=role

CARD_W=.110;CARD_H=.171875;CARD_T=.0008
# Separate demo geometry is intentionally excluded from all pedestal exports.
EDGE=material('Reference card edge',(97,97,102),.05,.5)
BACK=material('Reference LORE card back',(255,255,255),0,.52)
im=bpy.data.images.load(str(OUT/'reference/card-back.png'));tx=BACK.node_tree.nodes.new('ShaderNodeTexImage');tx.image=im;BACK.node_tree.links.new(tx.outputs['Color'],BACK.node_tree.nodes['Principled BSDF'].inputs['Base Color']);BACK.node_tree.links.new(tx.outputs['Alpha'],BACK.node_tree.nodes['Principled BSDF'].inputs['Alpha'])
CARDS=empty('REFERENCE_CARD_STACK',DEMO,None)
def reference_card(index):
 z=.0088+CARD_T*index
 o=slab(f'Reference card {index+1:02d}',CARD_W,CARD_H,.002,z,z+CARD_T,EDGE,.00007,DEMO,CARDS,n=8)
 pts=contour(CARD_W-.0003,CARD_H-.0003,.0019,10)
 face=mesh(f'Reference back {index+1:02d}',[(x,y,z+CARD_T+.000006) for x,y in pts],[tuple(range(len(pts)))],BACK,DEMO,CARDS)
 for li in face.data.polygons[0].loop_indices:
  v=face.data.vertices[face.data.loops[li].vertex_index].co;face.data.uv_layers.active.data[li].uv=(v.x/CARD_W+.5,v.y/CARD_H+.5)
 return o,face
demo_cards=[reference_card(i) for i in range(40)]
def card_count(count):
 for i,pair in enumerate(demo_cards):
  for o in pair:o.hide_render=i>=count;o.hide_set(i>=count)
card_count(20)

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
   mod=o.modifiers.new('LOD reduction','DECIMATE');mod.ratio=.30;mod.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=mod.name)
  # Tangent calculation requires triangles; preserve custom normals on the copy.
  mod=o.modifiers.new('Portable export triangles','TRIANGULATE');mod.keep_custom_normals=True;bpy.ops.object.modifier_apply(modifier=mod.name)
  if not any(n.type=='TEX_IMAGE' for n in o.data.materials[0].node_tree.nodes):
   for uv in list(o.data.uv_layers):o.data.uv_layers.remove(uv)
  merged.append(o)
 for name in ['ANCHOR_CARD_CONTACT','ANCHOR_DRAW_ORIGIN']:
  original=bpy.data.objects[name];a=empty(name.replace('ANCHOR_',''),col);a.location=original.location
  for k,v in original.items():a[k]=v
 bpy.ops.object.select_all(action='DESELECT')
 for o in col.objects:o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=str(OUT/'web'/filename),export_format='GLB',use_selection=True,export_yup=True,export_extras=True,export_cameras=False,export_lights=False,export_tangents=True)
 report={'meshes':len(merged),'triangles':0,'nonmanifold_edges':0,'bounds':None}
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
reports={n:export_model(n,low) for n,low in [('deck-place.glb',False),('deck-place-lod1.glb',True)]}
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
d.type='ORTHO';d.ortho_scale=.29;d.clip_start=.01;d.clip_end=20
def look(position,target=(0,0,.01)):
 camera.location=position;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
look((.23,-.30,.34))
S.render.engine='CYCLES';S.cycles.device='CPU';S.cycles.samples=40;S.cycles.use_denoising=True
S.render.resolution_x=1600;S.render.resolution_y=1200;S.render.resolution_percentage=100
S.render.image_settings.file_format='PNG';S.view_settings.view_transform='AgX';S.view_settings.look='AgX - Medium High Contrast'
S.render.film_transparent=False
for im in bpy.data.images:
 if im.source=='FILE' and not im.packed_file:im.pack()
# Source opens with twenty removable reference cards; pedestal GLBs contain zero cards.
bpy.ops.object.select_all(action='DESELECT');ROOT.select_set(True);bpy.context.view_layer.objects.active=ROOT
for a in bpy.context.screen.areas if bpy.context.screen else []:
 if a.type=='VIEW_3D':a.spaces.active.region_3d.view_distance=.40;a.spaces.active.region_3d.view_location=(0,0,.01)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'lore-deck-place-source.blend'))
spec={'component':'03_deck_place','revision':'v1','units':'meters','origin':'Bottom center, board surface','dimensions_m':{'width':.136,'depth':.198,'height':.0088},'card':{'width':CARD_W,'depth':CARD_H,'thickness':CARD_T},'contact_plane':.0088,'contact_panel_m':[.1256,.1876],'edge_clearance_m':[(.1256-CARD_W)/2,(.1876-CARD_H)/2],'board_anchors_gltf':{'player':[.54,0,.245],'opponent':[.54,0,-.245]},'orientation_gltf':'Identity rotation, uniform scale 1 for both players. Camera provides perspective.','camera':{'tilt_deg':18,'vertical_fov_deg':25.608532,'distance_m':2.25738},'assets':reports,'reference_cards':'Preview only; 20 and 40 are inspection counts, not deck-size rules.'}
(OUT/'model-spec.json').write_text(json.dumps(spec,indent=2))
if '--no-render' not in sys.argv:
 card_count(0);S.render.filepath=str(OUT/'renders/01-empty-pedestal.png');bpy.ops.render.render(write_still=True)
 card_count(20);S.render.filepath=str(OUT/'renders/02-with-reference-deck.png');bpy.ops.render.render(write_still=True)
 card_count(1);look((.23,-.3,.12));S.camera.data.ortho_scale=.285;S.render.resolution_y=1000
 S.render.filepath=str(OUT/'renders/03-low-profile.png');bpy.ops.render.render(write_still=True)
print('DECK_PLACE_BUILD_COMPLETE',json.dumps(reports),flush=True)
