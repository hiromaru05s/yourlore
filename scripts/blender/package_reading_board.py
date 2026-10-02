"""Export, measure, and render the authored LORE board, without touching source."""
import bpy, bmesh, json, math, sys, struct
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'docs/3d-assets/2026-09-15-blender-reading-board'
if (Path(__file__).parent/'layout-spec.json').exists():OUT=Path(__file__).resolve().parent.parent
bpy.ops.wm.open_mainfile(filepath=str(OUT/'lore-reading-board-source.blend'))
S=bpy.context.scene
source=bpy.data.collections['01_BOARD_SOURCE']
deps=bpy.context.evaluated_depsgraph_get()
report={'source_objects':len(source.objects),'parts':{},'units':'meters','coordinates':'Blender Z-up; GLB Y-up','levels':[]}
bounds=[];bad=[]
for o in source.objects:
 if o.type not in ('MESH','CURVE'):continue
 ev=o.evaluated_get(deps);me=ev.to_mesh();me.calc_loop_triangles()
 part=o.parent.name;report['parts'][part]=report['parts'].get(part,0)+len(me.loop_triangles)
 bounds += [tuple(o.matrix_world@v.co) for v in me.vertices]
 bm=bmesh.new();bm.from_mesh(me)
 bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=.0000001)
 n=sum(not e.is_manifold for e in bm.edges)
 if n:bad.append({'object':o.name,'nonmanifold_edges':n})
 bm.free();ev.to_mesh_clear()
report['source_triangles']=sum(report['parts'].values())
report['bounds_blender']={'min':[min(c[k] for c in bounds) for k in range(3)],'max':[max(c[k] for c in bounds) for k in range(3)]}
report['source_nonmanifold']=bad

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

def export_level(level,target):
 # Preserve source image nodes; swap in measured runtime texture resolutions.
 replaced=[]
 for mat in bpy.data.materials:
  if not mat.use_nodes:continue
  for node in mat.node_tree.nodes:
   if node.type!='TEX_IMAGE' or not node.image:continue
   stem=Path(node.image.filepath).stem
   suffix='.jpg' if stem.endswith('-color') else '.png'
   path=OUT/'textures'/level/(stem+suffix)
   if path.exists():
    old=node.image;replaced.append((node,old));node.image=bpy.data.images.load(str(path));node.image.colorspace_settings.name=old.colorspace_settings.name
 collection=bpy.data.collections.new('EXPORT_'+level);S.collection.children.link(collection)
 objs=[]
 for o in list(source.objects):
  if o.type=='EMPTY' and o.get('role')=='attachment_anchor':
   new=bpy.data.objects.new('ANCHOR_'+o.name,None);collection.objects.link(new);new.matrix_world=o.matrix_world.copy();new['role']='attachment_anchor';new['anchor_name']=o.name;objs.append(new)
  if o.type not in ('MESH','CURVE'):continue
  if level=='lod1' and any(w in o.name for w in ['page ruling','Fine feather barb','cover ray','Screw slot','carved shoulder flute']):continue
  ev=o.evaluated_get(deps);me=bpy.data.meshes.new_from_object(ev,preserve_all_data_layers=True,depsgraph=deps)
  new=bpy.data.objects.new(o.name+'_'+level,me);collection.objects.link(new);new.matrix_world=o.matrix_world.copy();objs.append(new)
 # Join by material. Source remains a fully editable part hierarchy.
 grouped={}
 for o in objs:
  if o.type=='MESH':grouped.setdefault(o.data.materials[0].name,[]).append(o)
 merged=[]
 for name,parts in grouped.items():
  bpy.ops.object.select_all(action='DESELECT')
  for o in parts:o.select_set(True)
  bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();o=parts[0];o.name=level+'_'+name
  # Collapse doubles from cap seams before simplification.
  bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=.000001);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(o.data);bm.free()
  merged.append(o)
 total=0
 for o in merged:o.data.calc_loop_triangles();total+=len(o.data.loop_triangles)
 ratio=min(1,target/total)
 for o in merged:
  bpy.context.view_layer.objects.active=o
  if ratio<1:
   dec=o.modifiers.new('Screen-space balanced simplification','DECIMATE');dec.ratio=ratio;dec.use_collapse_triangulate=True
   bpy.ops.object.modifier_apply(modifier=dec.name)
  # Explicitly triangulate to freeze all export diagonals.
  mod=o.modifiers.new('Export triangulation','TRIANGULATE');mod.keep_custom_normals=True
  bpy.ops.object.modifier_apply(modifier=mod.name)
  bm=bmesh.new();bm.from_mesh(o.data)
  degenerate=[f for f in bm.faces if f.calc_area()<1e-12]
  bmesh.ops.delete(bm,geom=degenerate,context='FACES_ONLY');bm.to_mesh(o.data);bm.free()
  # Re-project after decimation: bevel/collapse interpolation can otherwise
  # leave zero-area UV triangles and invalid zero-length export tangents.
  uv=o.data.uv_layers.active or o.data.uv_layers.new(name='UVMap')
  for poly in o.data.polygons:
   normal=poly.normal;axis=max(range(3),key=lambda i:abs(normal[i]))
   for li in poly.loop_indices:
    co=o.data.vertices[o.data.loops[li].vertex_index].co
    uv.data[li].uv=(co.x/.32,co.y/.32) if axis==2 else ((co.x/.32,co.z/.12) if axis==1 else (co.y/.32,co.z/.12))
  if not any(n.type=='TEX_IMAGE' for n in o.data.materials[0].node_tree.nodes):
   for layer in list(o.data.uv_layers):o.data.uv_layers.remove(layer)
 total=sum(len(o.data.polygons) for o in merged)
 bpy.ops.object.select_all(action='DESELECT')
 for o in collection.objects:o.select_set(True)
 path=OUT/'web'/('lore-board-'+level+'.glb')
 bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_yup=True,export_apply=False,export_cameras=False,export_lights=False,export_extras=True,export_texcoords=True,export_normals=True,export_tangents=True,export_image_format='AUTO',export_animations=False)
 tangent_repairs=repair_export_tangents(path)
 report['levels'].append({'level':level,'triangles':total,'material_meshes':len(merged),'file_bytes':path.stat().st_size,'ratio':ratio,'tangents_reconstructed_from_triangle_uvs':tangent_repairs})
 for node,old in replaced:node.image=old
 for o in list(collection.objects):bpy.data.objects.remove(o,do_unlink=True)
 bpy.data.collections.remove(collection)

export_level('lod0',78000)
export_level('lod1',24500)
(OUT/'checks'/'geometry-report.json').write_text(json.dumps(report,indent=2))
if '--export-only' in sys.argv:print('EXPORT_COMPLETE',json.dumps(report));sys.exit(0)
S.render.filepath=str(OUT/'renders'/'01-game-camera.png');bpy.ops.render.render(write_still=True)

def aim(cam,target):cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler()
cam=S.camera;S.cycles.samples=72;S.render.resolution_x=2400;S.render.resolution_y=1500
views=[('02-three-quarter',(-1.22,-1.55,1.95),(0,0,0),2.0),('03-front-profile',(0,-2.6,.38),(0,0,.01),1.86),('04-right-profile',(2.8,0,.38),(0,0,.01),1.35),('05-rear-three-quarter',(1.3,1.8,1.7),(0,0,0),2.05),('06-top-orthographic',(0,0,3),(0,0,0),1.83),('07-rift-detail',(1.35,-.80,1.15),(.707,-.11,.008),.61),('08-left-detail',(-1.15,-.3,.87),(-.62,.24,0),.55)]
for name,loc,target,scale in views:
 cam.data.type='ORTHO';cam.data.ortho_scale=scale;cam.location=loc;aim(cam,target)
 S.render.filepath=str(OUT/'renders'/(name+'.png'));bpy.ops.render.render(write_still=True)
print('PACKAGE_REPORT',json.dumps(report))
