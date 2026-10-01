"""LORE 06: real relief arrows and a sprung cap. Units meters; +Z up in Blender.
Fits the 65 mm space left of the three-card offered-market insert on board 01.
"""
import bpy,bmesh,math,json,sys
from pathlib import Path
from mathutils import Vector
HERE=Path(__file__).resolve();BASE=HERE.parents[2]
OUT=HERE.parent.parent if HERE.parent.name=='source' else BASE/'docs/3d-assets/2026-09-21-blender-reroll-button'
for name in ['web','renders','checks','source']:(OUT/name).mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
S=bpy.context.scene;S.unit_settings.system='METRIC'
C=bpy.data.collections.new('06_REROLL_EDITABLE');S.collection.children.link(C)
def empty(name,parent=None):
 o=bpy.data.objects.new(name,None);C.objects.link(o);o.parent=parent;o.empty_display_size=.004;return o
root=empty('REROLL_BUTTON');fixed=empty('FIXED_BASE',root);cap=empty('PRESS_CAP',root);symbol=empty('REROLL_ARROWS',cap)
root['board_anchor_gltf']=[-.694,.016,0];cap['press_travel_m']=.0012

def mat(name,rgb,metal,rough):
 m=bpy.data.materials.new(name);m.use_nodes=True
 c=tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in [n/255 for n in rgb])+(1,)
 m.diffuse_color=c;p=m.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=c;p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;return m
brass=mat('Champagne satin brass',(179,152,105),.78,.29)
edge=mat('Warm silver reveal',(205,200,184),.70,.31)
ink=mat('Mechanism graphite',(13,20,29),.3,.48)
face=mat('Reroll brushed champagne face',(202,179,135),.65,.38)
arrows=mat('Reroll navy enamel relief',(16,41,57),.22,.24)
p=arrows.node_tree.nodes['Principled BSDF'];p.inputs['Coat Weight'].default_value=.35

def mesh(name,v,f,m,parent,smooth=False):
 me=bpy.data.meshes.new(name);me.from_pydata(v,[],f);me.update();bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(me);bm.free()
 o=bpy.data.objects.new(name,me);C.objects.link(o);o.parent=parent;me.materials.append(m)
 if smooth:
  for poly in me.polygons:poly.use_smooth=True
  me.set_sharp_from_angle(angle=math.radians(35))
 return o

def lathe(name,profile,m,parent,segments=96):
 v=[];rings=[]
 for r,z in profile:
  rings.append(list(range(len(v),len(v)+(1 if r==0 else segments))))
  v.extend([(0,0,z)] if r==0 else [(r*math.cos(i*2*math.pi/segments),r*math.sin(i*2*math.pi/segments),z) for i in range(segments)])
 f=[]
 for a,b in zip(rings,rings[1:]+rings[:1]):
  if len(a)==len(b)==1:continue
  for i in range(segments):
   j=(i+1)%segments;f.append((a[0],b[j],b[i]) if len(a)==1 else (a[i],a[j],b[0]) if len(b)==1 else (a[i],a[j],b[j],b[i]))
 return mesh(name,v,f,m,parent,True)

lathe('Recessed mounting foot',[(0,0),(.030,0),(.031,.0007),(.031,.0024),(.0296,.003),(0,.003)],ink,fixed)
lathe('Stationary rolled collar',[(.027,.001),(.031,.001),(.0323,.002),(.0325,.004),(.032,.005),(.030,.0055),(.028,.0045)],brass,fixed)
lathe('Narrow travel shadow',[(.027,.003),(.030,.003),(.030,.0058),(.0285,.0064),(.027,.006)],ink,fixed)
lathe('Spring cap turned shoulder',[(0,.0038),(.027,.0038),(.0294,.0056),(.0304,.0072),(.0305,.0087),(.0298,.0094),(.0284,.0098),(.0273,.009),(0,.009)],brass,cap)
lathe('Polished fine outer reveal',[(.0281,.0095),(.0285,.0095),(.0287,.0098),(.0285,.0100),(.0282,.0100),(.0280,.0098)],edge,cap)
lathe('Slightly crowned satin face',[(0,.0078),(.027,.0078),(.0275,.009),(.027,.0098),(.023,.0101),(.016,.0103),(0,.0104)],face,cap)
lathe('Hairline enamel border',[(.0255,.0099),(.0259,.0099),(.026,.01012),(.0257,.01024),(.0255,.01012)],ink,cap)
# Two opposed clockwise arrows; closed, beveled real 3D glyphs. No font dependency.
for rotation in [0,math.pi]:
 pts=[]
 for i in range(41):
  a=math.radians(25+115*i/40)+rotation;pts.append((.018*math.cos(a),.018*math.sin(a)))
 a=math.radians(140)+rotation
 # arrow points along increasing angle, visibly wider than the circular stroke
 for r,d in [(.0225,0),(.0155,28),(.0085,0),(.0135,0)]:
  b=a+math.radians(d);pts.append((r*math.cos(b),r*math.sin(b)))
 for i in range(40,-1,-1):
  a=math.radians(25+115*i/40)+rotation;pts.append((.0135*math.cos(a),.0135*math.sin(a)))
 n=len(pts);v=[(x,y,z) for z in [.01020,.01135] for x,y in pts]
 f=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 o=mesh('Clockwise enamel arrow',v,f,arrows,symbol)
 b=o.modifiers.new('Soft machined glyph edges','BEVEL');b.width=.00022;b.segments=3
 a=o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
lathe('Center brass pivot',[(0,.0104),(.002,.0104),(.0024,.0107),(.002,.0113),(0,.01145)],brass,symbol,48)
# Hidden in-use mounting reference. Top remains above the offered-market plinth.
label=empty('LABEL_SURFACE',cap);label.location=(0,-.043,.009);label['runtime_label']='Reroll cost displayed beside the offered market; no baked text.'

def export(name,low=False):
 bpy.ops.object.select_all(action='DESELECT');copies=[]
 for o in list(C.objects):
  if o.type=='MESH':
   d=bpy.context.evaluated_depsgraph_get();me=bpy.data.meshes.new_from_object(o.evaluated_get(d),depsgraph=d);n=bpy.data.objects.new('Export '+o.name,me);S.collection.objects.link(n);n.matrix_world=o.matrix_world;n.parent=o.parent
   copies.append(n)
 for o in copies:
  bpy.context.view_layer.objects.active=o;o.select_set(True)
  if low:
   m=o.modifiers.new('LOD','DECIMATE');m.ratio=.42;bpy.ops.object.modifier_apply(modifier=m.name)
  m=o.modifiers.new('Triangles','TRIANGULATE');bpy.ops.object.modifier_apply(modifier=m.name);o.select_set(False)
 report={'triangles':sum(len(o.data.polygons) for o in copies),'meshes':len(copies),'nonmanifold_edges':0}
 for o in copies:
  b=bmesh.new();b.from_mesh(o.data);report['nonmanifold_edges']+=sum(not e.is_manifold for e in b.edges);b.free();o.select_set(True)
 for o in C.objects:
  if o.type=='EMPTY':o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=str(OUT/'web'/name),export_format='GLB',use_selection=True,export_extras=True,export_yup=True,export_cameras=False,export_lights=False)
 for o in copies:bpy.data.objects.remove(o,do_unlink=True)
 report['bytes']=(OUT/'web'/name).stat().st_size;assert report['nonmanifold_edges']==0,report;return report
bpy.context.view_layer.update();reports={n:export(n,l) for n,l in [('reroll-button.glb',False),('reroll-button-lod1.glb',True)]}
(OUT/'checks/geometry.json').write_text(json.dumps(reports,indent=2))
(OUT/'model-spec.json').write_text(json.dumps({'component':'06','units':'meters','board_anchor_gltf':[-.694,.016,0],'diameter_m':.065,'height_m':.01145,'press_travel_m':.0012,'dynamic_nodes':['PRESS_CAP','REROLL_ARROWS'],'target':'Only 3 offered market cards','assets':reports},indent=2))
# Studio and close-up camera, excluded from GLB.
w=bpy.data.worlds.new('Neutral studio');w.use_nodes=True;w.node_tree.nodes['Background'].inputs[0].default_value=(.34,.38,.45,1);w.node_tree.nodes['Background'].inputs[1].default_value=.4;S.world=w
bpy.ops.mesh.primitive_plane_add(size=20,location=(0,0,-.0001));bpy.context.object.data.materials.append(mat('Studio slate',(91,99,109),0,.85))
for pos,power,size in [((-.12,-.18,.3),2.0,.24),((.2,.1,.2),1.2,.2)]:
 d=bpy.data.lights.new('Softbox','AREA');d.energy=power;d.shape='DISK';d.size=size;o=bpy.data.objects.new('Softbox',d);S.collection.objects.link(o);o.location=pos;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
d=bpy.data.cameras.new('Inspection camera');o=bpy.data.objects.new('Inspection camera',d);S.collection.objects.link(o);o.location=(.06,-.10,.18);o.rotation_euler=(Vector((0,0,.004))-o.location).to_track_quat('-Z','Y').to_euler();d.type='ORTHO';d.ortho_scale=.097;S.camera=o
S.render.engine='CYCLES';S.cycles.device='CPU';S.cycles.samples=40;S.cycles.use_denoising=True;S.render.resolution_x=1400;S.render.resolution_y=1200;S.render.resolution_percentage=100;S.render.image_settings.file_format='PNG';S.view_settings.view_transform='AgX';S.view_settings.look='AgX - Medium High Contrast'
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'lore-reroll-button-source.blend'))
if '--no-render' not in sys.argv:
 S.render.filepath=str(OUT/'renders/01-reroll-button.png');bpy.ops.render.render(write_still=True)
print('REROLL_COMPLETE',json.dumps(reports),flush=True)
