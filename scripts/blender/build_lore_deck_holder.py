"""Create the LORE Biblion deck pedestal in an isolated Blender process.
Blender --background --factory-startup --python scripts/blender/build_lore_deck_holder.py
Native Blender is Z-up; exported GLB is meters / Y-up / top at Y=0.
"""
from pathlib import Path
import bpy, bmesh, numpy as np
import math, json, struct, zlib, hashlib
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
DOC=ROOT/'docs/3d-assets/2026-09-09-blender-deck-holder'
OUT=ROOT/'client/public/models/cosmetics/deck_holder_biblion_ivory/v1'
for d in [DOC/'textures',OUT]: d.mkdir(parents=True,exist_ok=True)
C=json.loads((ROOT/'docs/cosmetics/v1/constraints.json').read_text())
U=C['unitMeters']; W,D=C['deck_holder']['topSizeXZU']; R=C['deck_holder']['topCornerRadiusU']
TOP_RECT=(.02,.02,.642,.98)
# Width/depth/radius/height, in the shared card-width unit. All detail is below zero.
PROFILE=[(W,D,R,0),(1.212,1.862,.046,-.006),(1.24,1.89,.060,-.017),
 (1.24,1.89,.060,-.024),(1.208,1.858,.044,-.031),(1.208,1.858,.044,-.093),
 (1.25,1.90,.065,-.100),(1.26,1.91,.070,-.110),(1.248,1.898,.064,-.116),
 (1.12,1.77,.04,-.126),(1.12,1.77,.04,-.140)]
COLORS={'ivory':(242,239,231),'navy':(16,26,46),'gold':(164,127,77),'print':(140,100,55),'foot':(12,19,32)}
SWATCH={'navy':(.84,.15),'gold':(.84,.35),'foot':(.84,.55),'ivory':(.84,.75)}

def png(path,a):
 h,w,_=a.shape
 def ch(t,b):return struct.pack('>I',len(b))+t+b+struct.pack('>I',zlib.crc32(t+b))
 raw=b''.join(b'\0'+row.tobytes() for row in a)
 path.write_bytes(b'\x89PNG\r\n\x1a\n'+ch(b'IHDR',struct.pack('>IIBBBBB',w,h,8,2,0,0,0))+ch(b'IDAT',zlib.compress(raw,9))+ch(b'IEND',b''))

def artwork(size):
 # Own vector-like texture design, not a generated image or an edited reference raster.
 u=(np.arange(size,dtype=np.float32)+.5)/size
 v=1-(np.arange(size,dtype=np.float32)+.5)/size
 uu,vv=np.meshgrid(u,v)
 x=(uu-TOP_RECT[0])/(TOP_RECT[2]-TOP_RECT[0])*W-W/2
 y=(vv-TOP_RECT[1])/(TOP_RECT[3]-TOP_RECT[1])*D-D/2
 aa=W/((TOP_RECT[2]-TOP_RECT[0])*size)
 def rr(inset):
  r=max(R-inset,.004);qx=np.abs(x)-(W/2-inset-r);qy=np.abs(y)-(D/2-inset-r)
  return np.hypot(np.maximum(qx,0),np.maximum(qy,0))+np.minimum(np.maximum(qx,qy),0)-r
 mask=np.zeros_like(x)
 for inset,width in [(.025,.004),(.047,.0028)]:
  mask=np.maximum(mask,np.clip((width/2+aa/2-np.abs(rr(inset)))/aa,0,1))
 # Tiny diamond breaks along the short ends, echoing the approved table borders.
 mask[(np.abs(x)<.023)&(np.abs(y)>.85)]=0
 for sy in [-1,1]:
  d=np.abs(x)/.019+np.abs(y-sy*(D/2-.036))/.013
  mask=np.maximum(mask,np.clip((1-d)*.013/aa+.5,0,1))
 # Restrained planar bookbinding corner flourishes, contained inside the printed edge.
 for sx in [-1,1]:
  for sy in [-1,1]:
   dx=sx*x-(W/2-.071);dy=sy*y-(D/2-.071)
   corner=(dx<=0)&(dx>=-.090)&(dy<=0)&(dy>=-.090)
   flourish=np.minimum(np.abs(dx),np.abs(dy))
   mask=np.maximum(mask,corner*np.clip((.0018+aa/2-flourish)/aa,0,1))
 # Flat central seal: open diamond and four short rays. Covered by the deck in use.
 diamond=np.abs(x)/.073+np.abs(y)/.11
 seal=np.clip((.028+aa/.073/2-np.abs(diamond-1))/(aa/.073),0,1)*.65
 mask=np.maximum(mask,seal)
 for sy in [-1,1]:
  ray=(sy*y>=.123)&(sy*y<=.155)
  mask=np.maximum(mask,ray*np.clip((.0015+aa/2-np.abs(x))/aa,0,1)*.65)
 col=np.rint(np.array(COLORS['ivory'])+mask[...,None]*(np.array(COLORS['print'])-np.array(COLORS['ivory']))).astype(np.uint8)
 orm=np.empty((size,size,3),np.uint8);orm[:,:,0]=255;orm[:,:,1]=np.rint(184-mask*72);orm[:,:,2]=np.rint(mask*55)
 for name,(_,cy) in SWATCH.items():
  select=(uu>.70)&(np.abs(vv-cy)<.075)
  col[select]=COLORS[name]
  rough,metal={'gold':(.38,.65),'navy':(.42,.05),'foot':(.62,0),'ivory':(.72,0)}[name]
  orm[select]=[255,round(rough*255),round(metal*255)]
 return col,orm

def textures(tag,base_size,orm_size):
 col,_=artwork(base_size);_,orm=artwork(orm_size)
 a=DOC/'textures'/f'{tag}-basecolor.png';b=DOC/'textures'/f'{tag}-orm.png';png(a,col);png(b,orm)
 return a,b

def linear(rgb):
 return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb)

def solid(name,rgb,metal=0,rough=.6):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF')
 color=(*linear(tuple(x/255 for x in rgb)),1)
 p.inputs['Base Color'].default_value=color;p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;m.diffuse_color=color
 return m

def atlas_mat(tag,paths):
 m=solid('body',COLORS['ivory']);n=m.node_tree.nodes;l=m.node_tree.links;p=n.get('Principled BSDF')
 a=n.new('ShaderNodeTexImage');a.image=bpy.data.images.load(str(paths[0]));a.image.colorspace_settings.name='sRGB';l.new(a.outputs['Color'],p.inputs['Base Color'])
 o=n.new('ShaderNodeTexImage');o.image=bpy.data.images.load(str(paths[1]));o.image.colorspace_settings.name='Non-Color'
 sep=n.new('ShaderNodeSeparateColor');l.new(o.outputs['Color'],sep.inputs['Color']);l.new(sep.outputs['Green'],p.inputs['Roughness']);l.new(sep.outputs['Blue'],p.inputs['Metallic'])
 return m

def contour(w,d,r,segs):
 pts=[]
 for cx,cy,start in [(w/2-r,d/2-r,0),(-w/2+r,d/2-r,90),(-w/2+r,-d/2+r,180),(w/2-r,-d/2+r,270)]:
  for j in range(segs+1):
   a=math.radians(start+j*90/segs);pts.append((cx+r*math.cos(a),cy+r*math.sin(a)))
 return pts

def make_holder(tag,segs,mat):
 profile=PROFILE if tag=='standard' else [PROFILE[i] for i in [0,2,3,4,5,7,8,9,10]]
 bands=['ivory','gold','gold','gold','navy','navy','gold','gold','navy','foot'] if tag=='standard' else ['gold','gold','gold','navy','navy','gold','navy','foot']
 verts=[];faces=[];regions=[];n=len(contour(*profile[0][:3],segs))
 for w,d,r,z in profile:verts.extend((x*U,y*U,z*U) for x,y in contour(w,d,r,segs))
 for k in range(len(profile)-1):
  for i in range(n):
   j=(i+1)%n;faces.append((k*n+i,(k+1)*n+i,(k+1)*n+j,k*n+j));regions.append(bands[k])
 ti=len(verts);verts.append((0,0,0));bi=len(verts);verts.append((0,0,-.14*U))
 for i in range(n):
  j=(i+1)%n;faces.append((ti,i,j));regions.append('top')
  k=(len(profile)-1)*n;faces.append((bi,k+j,k+i));regions.append('foot')
 # A shallow faceted gold shard on each short vertical face. Never above the top.
 for side in [-1,1]:
  z=-.062;rad=.026;front=.929;start=len(verts)
  for x,h in [(0,z+rad),(-rad,z),(0,z-rad),(rad,z)]:verts.append((x*U,side*front*U,h*U))
  verts.extend([(0,side*.944*U,z*U),(0,side*.927*U,z*U)])
  for i in range(4):
   j=(i+1)%4
   face=(start+i,start+j,start+4) if side<0 else (start+j,start+i,start+4)
   back=(start+j,start+i,start+5) if side<0 else (start+i,start+j,start+5)
   faces.extend([face,back]);regions.extend(['gold','gold'])
 mesh=bpy.data.meshes.new('DeckPedestal_closed');mesh.from_pydata(verts,[],faces);mesh.materials.append(mat);mesh.update()
 bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);assert all(e.is_manifold for e in bm.edges);bm.to_mesh(mesh);bm.free()
 obj=bpy.data.objects.new('DeckPedestal',mesh);bpy.context.collection.objects.link(obj)
 uv=mesh.uv_layers.new(name='CosmeticAtlas_v1')
 for poly,reg in zip(mesh.polygons,regions):
  # Hard edges along horizontal profile breaks; smoothly rounded vertical corners via split normals below.
  poly.use_smooth=False
  for li in poly.loop_indices:
   v=mesh.vertices[mesh.loops[li].vertex_index].co
   if reg=='top':
    uv.data[li].uv=(TOP_RECT[0]+(v.x/(U*W)+.5)*(TOP_RECT[2]-TOP_RECT[0]),TOP_RECT[1]+(v.y/(U*D)+.5)*(TOP_RECT[3]-TOP_RECT[1]))
   else:uv.data[li].uv=SWATCH[reg]
 # Average adjacent face normals only within the same horizontal band, keeping the top exactly flat.
 normals=[]
 adj={}
 for p,reg in zip(mesh.polygons,regions):
  for vi in p.vertices: adj.setdefault(vi,[]).append(p)
 for p in mesh.polygons:
  for li in p.loop_indices:
   vi=mesh.loops[li].vertex_index
   if p.index<(len(profile)-1)*n:
    ring=p.index//n
    candidates=[q.normal for q in adj[vi] if q.index//n==ring and q.index<(len(profile)-1)*n]
    no=sum(candidates,Vector()).normalized()
   else:no=p.normal
   normals.append(no)
 mesh.normals_split_custom_set(normals)
 root=bpy.data.objects.new('cosmetic_root',None);bpy.context.collection.objects.link(root)
 visual=bpy.data.objects.new('visual',None);bpy.context.collection.objects.link(visual);visual.parent=root;obj.parent=visual
 anchor=bpy.data.objects.new('deck_mount',None);bpy.context.collection.objects.link(anchor);anchor.parent=root
 root['asset_id']='deck_holder_biblion_ivory';root['spec_version']=1
 mesh.calc_loop_triangles()
 return root,obj,[root,visual,obj,anchor],len(mesh.loop_triangles)

def aim(o,target=(0,0,0)):
 o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()

def studio():
 s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=48;s.cycles.use_denoising=True
 s.render.resolution_x=1400;s.render.resolution_y=1150;s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGBA'
 s.view_settings.view_transform='AgX';s.world.use_nodes=True
 b=s.world.node_tree.nodes['Background'];b.inputs[0].default_value=(.65,.68,.73,1);b.inputs[1].default_value=.45
 bpy.ops.object.camera_add(location=(.135,-.185,.160));cam=bpy.context.object;cam.name='Studio_Camera_NOT_EXPORTED';cam.data.type='ORTHO';cam.data.ortho_scale=.184;aim(cam,(0,0,-.002));s.camera=cam
 for name,loc,power,size in [('Key',(-.18,-.14,.27),4.0,.22),('Fill',(.17,-.04,.20),1.4,.20),('Rim',(.02,.19,.23),3.0,.18)]:
  d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);s.collection.objects.link(o);o.location=loc;aim(o)
 bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.14*U-.00002));floor=bpy.context.object;floor.name='Studio_Floor_NOT_EXPORTED';floor.data.materials.append(solid('Studio_Mist',(141,151,170),rough=.85))
 return cam,floor

def cards():
 col=bpy.data.collections.new('REFERENCE_CARDS_NOT_EXPORTED');bpy.context.scene.collection.children.link(col)
 papers=[solid('Reference_Paper_'+str(i),(220-i*7,213-i*7,191-i*6),rough=.72) for i in range(3)];back=solid('Reference_Sleeve',(16,26,46),rough=.48)
 p=back.node_tree.nodes.get('Principled BSDF');t=back.node_tree.nodes.new('ShaderNodeTexImage');t.image=bpy.data.images.load(str(ROOT/'client/public/frames/sleeve_default.webp'));back.node_tree.links.new(t.outputs['Color'],p.inputs['Base Color'])
 for j in range(40):
  pts=contour(1,1.5625,.045,6);n=len(pts);verts=[(x*U,y*U,z) for z in [j*.00032+.00001,(j+1)*.00032+.00001] for x,y in pts]
  faces=[tuple(reversed(range(n))),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
  m=bpy.data.meshes.new('ReferenceCard');m.from_pydata(verts,[],faces);m.materials.append(papers[j%3]);m.materials.append(back);m.polygons[1].material_index=1
  uv=m.uv_layers.new()
  for poly in m.polygons:
   for li in poly.loop_indices:
    v=m.vertices[m.loops[li].vertex_index].co;uv.data[li].uv=(v.x/.064+.5,v.y/.100+.5)
  o=bpy.data.objects.new(f'Reference_card_{j+1:02}',m);col.objects.link(o)
 return col

def render(path):
 bpy.context.scene.render.filepath=str(path);bpy.ops.render.render(write_still=True)

def main():
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 s=bpy.context.scene;s.unit_settings.system='METRIC';s.unit_settings.scale_length=1
 # Full-resolution editable atlas is independent of the approved table's files.
 textures('source',2048,2048)
 manifest={'assetId':'deck_holder_biblion_ivory','specVersion':1,'blenderVersion':bpy.app.version_string,'generator':'scripts/blender/build_lore_deck_holder.py','reference':'docs/3d-assets/2026-09-08-blender-table/preview.png','topSizeMeters':[W*U,D*U],'topRadiusMeters':R*U,'heightMeters':.14*U,'topY':0,'materials':1,'variants':{}}
 mainroot=None;objects=None
 for tag,segs,sz,osz in [('standard',18,1024,512),('low',5,512,256)]:
  saved_names=[]
  if tag=='low':
   saved_names=[(o,o.name) for o in objects]+[(objects[2].data.materials[0],objects[2].data.materials[0].name)]
   for datablock,name in saved_names:datablock.name='Standard_source_'+name
  paths=textures(tag,sz,osz);mat=atlas_mat(tag,paths);root,obj,group,tris=make_holder(tag,segs,mat)
  bpy.ops.object.select_all(action='DESELECT')
  for o in group:o.select_set(True)
  bpy.context.view_layer.objects.active=obj
  path=OUT/('model.glb' if tag=='standard' else 'model-low.glb')
  bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_extras=True,export_cameras=False,export_lights=False,export_animations=False)
  manifest['variants'][tag]={'file':str(path.relative_to(ROOT)),'triangles':tris,'drawCalls':1,'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'textureSizes':[[sz,sz],[osz,osz]],'gpuMiBWithMipmaps':(sz*sz+osz*osz)*4*4/3/1024**2}
  if tag=='standard': mainroot=root;objects=group
  else:
   for o in reversed(group):bpy.data.objects.remove(o,do_unlink=True)
   bpy.data.materials.remove(mat)
   for datablock,name in saved_names:datablock.name=name
 cam,floor=studio()
 for im in bpy.data.images:
  if im.source=='FILE':im.pack()
 bpy.ops.object.select_all(action='DESELECT');objects[2].select_set(True);bpy.context.view_layer.objects.active=objects[2]
 s.render.filepath=str(DOC/'preview.png')
 for screen in bpy.data.screens:
  for area in screen.areas:
   if area.type=='VIEW_3D':area.spaces.active.region_3d.view_perspective='CAMERA';area.spaces.active.shading.type='MATERIAL'
 bpy.context.preferences.filepaths.save_version=0
 render(DOC/'preview.png')
 # Exact spec camera for the two transparent static fallback images.
 s.render.resolution_x=512;s.render.resolution_y=512;s.render.film_transparent=True;floor.hide_render=True
 cam.location=(0,-6*U,4*U);cam.data.ortho_scale=2.8*U;aim(cam)
 render(DOC/'fallback-self.png');mainroot.rotation_euler.z=math.pi;render(DOC/'fallback-opponent.png');mainroot.rotation_euler.z=0
 # Inspection renders from actual geometry, using the current game's card-back artwork.
 s.render.film_transparent=False;floor.hide_render=False;s.render.resolution_x=1400;s.render.resolution_y=1150
 cam.location=(.135,-.185,.160);cam.data.ortho_scale=.184;aim(cam,(0,0,.004))
 ref=cards();render(DOC/'with-deck-40.png')
 for o in list(ref.objects)[1:]:o.hide_render=True
 render(DOC/'with-card-1.png')
 for o in ref.objects:o.hide_render=False
 ref.hide_render=True;ref.hide_viewport=True
 cam.location=(.135,-.185,.160);aim(cam,(0,0,-.002));s.render.filepath=str(DOC/'preview.png')
 for im in bpy.data.images:
  if im.source=='FILE':im.pack()
 bpy.ops.wm.save_as_mainfile(filepath=str(DOC/'lore-biblion-deck-holder.blend'))
 (DOC/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 print('DECK_HOLDER_RESULT '+json.dumps(manifest))
if __name__=='__main__':main()
