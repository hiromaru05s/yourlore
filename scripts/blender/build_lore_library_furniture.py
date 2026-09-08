"""Blender-built library shelf and ImageGen-referenced market; meters, glTF +Y up."""
import bpy, math, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
DOC=ROOT/'docs/3d-assets/2026-09-09-library-furniture'
OUT=ROOT/'client/public/models/library-furniture'
DOC.mkdir(parents=True,exist_ok=True); OUT.mkdir(parents=True,exist_ok=True)
U=.064
IVORY=(.87,.83,.72,1); WOOD=(.065,.042,.026,1); NAVY=(.016,.029,.058,1); GOLD=(.53,.32,.12,1); BLUE=(.025,.17,.30,1)
def coord(x,y,z): return (x*U,-z*U,y*U)
def material(name,metal,rough):
    m=bpy.data.materials.new(name);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
    v=m.node_tree.nodes.new('ShaderNodeVertexColor');v.layer_name='Color';m.node_tree.links.new(v.outputs['Color'],p.inputs['Base Color'])
    return m
def paint(o,color,slot=0):
    o.data.materials.append(MATS[0 if LOW else slot])
    a=o.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
    for v in a.data:v.color=color
    PARTS.append(o);return o
def box(name,pos,dim,color,slot=0,bevel=.01):
    bpy.ops.mesh.primitive_cube_add(size=1,location=coord(*pos));o=bpy.context.object;o.name=name
    o.dimensions=(dim[0]*U,dim[2]*U,dim[1]*U);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        m=o.modifiers.new('Soft manufactured edges','BEVEL');m.width=bevel*U;m.segments=1 if LOW else 2
        bpy.ops.object.modifier_apply(modifier=m.name)
    return paint(o,color,slot)
def tube(name,pts,r=.008,color=GOLD):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=1;c.bevel_depth=r*U;c.bevel_resolution=0 if LOW else 1
    s=c.splines.new('POLY');s.points.add(len(pts)-1)
    for p,v in zip(s.points,pts):p.co=(*coord(*v),1)
    o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);bpy.context.view_layer.objects.active=o;o.select_set(True)
    bpy.ops.object.convert(target='MESH');o.select_set(False);return paint(o,color,1)
def diamond(name,x,y,z,size):
    # Flat faceted enamel jewel in a brass setting, on the front fascia.
    for s,d,col,slot in [(size,0,GOLD,1),(size*.62,.007,BLUE,2)]:
        o=box(name,(x,y,z+d),(s,s,.01),col,slot,0);o.rotation_euler.y=math.pi/4
def shelf():
    box('Walnut foot',(0,-.075,0),(2,.09,1.4),WOOD,bevel=.009)
    box('Foundation gold edge',(0,-.023,0),(1.99,.018,1.39),GOLD,1,.005)
    box('Flat card support',(0,-.006,0),(1.97,.012,1.37),WOOD,bevel=.003)
    box('Walnut back',(0,.54,-.67),(1.78,1.08,.06),WOOD)
    for y in [.03,1.055]:tube('Back gold inlay',[(-.86,y,-.64),(.86,y,-.64)],.006)
    box('Ivory front fascia',(0,.075,.65),(1.84,.15,.068),IVORY,bevel=.008)
    for y in [.014,.145]:tube('Front gold border',[(-.9,y,.688),(.9,y,.688)],.004)
    diamond('Front library seal',0,.075,.683,.07)
    # Curved bookends remain entirely outside the shared card exclusion volume.
    n=7 if LOW else 20
    profile=[(-.695,0),(.695,0),(.695,.17)]
    curve=[]
    for i in range(n+1):
        t=i/n;z=.69-1.38*t;y=.17+.93*t*t*t;curve.append((z,y))
    profile+=curve
    for sign in [-1,1]:
        verts=[coord(x,y,z) for x in [sign*.87,sign*.98] for z,y in profile]
        k=len(profile);faces=[tuple(range(k-1,-1,-1)),tuple(range(k,2*k))]+[(i,(i+1)%k,(i+1)%k+k,i+k) for i in range(k)]
        mesh=bpy.data.meshes.new('Curved bookend');mesh.from_pydata(verts,[],faces);mesh.update()
        o=bpy.data.objects.new('Ivory sweeping bookend',mesh);bpy.context.collection.objects.link(o);paint(o,IVORY)
        tube('Bookend brass rim',[(sign*.982,y,z) for z,y in curve],.007)
        box('Corner walnut pillar',(sign*.94,.085,.648),(.105,.17,.068),WOOD,bevel=.009)
        diamond('Corner enamel',sign*.94,.085,.683,.045)
    diamond('Back central seal',0,1.04,-.65,.042)
def market():
    # The market's presentation aspect follows the UI; the mesh stays a simple
    # level plinth, matching market-concept.png rather than embedding live cards.
    box('Walnut footing',(0,-.16,0),(6,.12,1.13),WOOD,bevel=.06)
    box('Lower brass band',(0,-.094,0),(5.98,.018,1.115),GOLD,1,.025)
    box('Ivory porcelain fascia',(0,-.052,0),(5.94,.072,1.09),IVORY,bevel=.035)
    box('Upper brass rim',(0,-.012,0),(5.96,.015,1.1),GOLD,1,.024)
    box('Uninterrupted navy top',(0,-.003,0),(5.91,.006,1.052),NAVY,bevel=.025)
    for z in [-.549,.549]:
        for start,end in [(-2.72,-.25),(.25,2.72)]:tube('Fine fascia engraving',[(start,-.052,z),(end,-.052,z)],.0028)
    diamond('Market enamel clasp',0,-.055,.552,.059)
    for x in [-2.91,2.91]:
        for z in [-.49,.49]:box('Corner gold cap',(x,-.046,z),(.06,.085,.055),GOLD,1,.012)
def run(kind,low):
    global LOW,MATS,PARTS
    LOW=low;PARTS=[];bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS=[material('body',.12 if low else 0,.58),material('trim',.73,.32),material('accent',.3,.24)]
    (shelf if kind=='shelf' else market)()
    bpy.ops.object.select_all(action='DESELECT')
    for o in PARTS:o.select_set(True)
    bpy.context.view_layer.objects.active=PARTS[0];bpy.ops.object.join();obj=bpy.context.object;obj.name=kind.title()+'Visual'
    # Consistent outward normals, triangulation and identity transform at export.
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
    root=bpy.data.objects.new('cosmetic_root' if kind=='shelf' else 'market_root',None);bpy.context.collection.objects.link(root);obj.parent=root
    anchor=bpy.data.objects.new('shelf_mount' if kind=='shelf' else 'market_mount',None);bpy.context.collection.objects.link(anchor);anchor.parent=root
    for o in [root,anchor]:o.select_set(True)
    path=OUT/(kind+('-low' if low else '')+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_yup=True,export_apply=True)
    if not low:
        scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
        scene.render.resolution_x=1200;scene.render.resolution_y=780;scene.render.resolution_percentage=100
        world=bpy.data.worlds.new('Studio');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.35,.35,.35,1);scene.world=world
        bpy.ops.mesh.primitive_plane_add(size=200*U,location=coord(0,-.125 if kind=='shelf' else -.225,0));floor=bpy.context.object
        fm=bpy.data.materials.new('Studio floor');fm.diffuse_color=(.22,.23,.25,1);floor.data.materials.append(fm)
        for loc,power,size in [((-3,7,4),.65,5),((4,4,-2),.35,4)]:
            bpy.ops.object.light_add(type='AREA',location=coord(*loc));l=bpy.context.object;l.data.energy=power;l.data.shape='DISK';l.data.size=size*U;l.rotation_euler=(Vector(coord(0,.2,0))-l.location).to_track_quat('-Z','Y').to_euler()
        bpy.ops.object.camera_add(location=coord(3.4 if kind=='shelf' else 4,3.4 if kind=='shelf' else 5,5.6 if kind=='shelf' else 8));cam=bpy.context.object
        cam.rotation_euler=(Vector(coord(0,.38 if kind=='shelf' else 0,0))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=(3.7 if kind=='shelf' else 7)*U;scene.camera=cam
        scene.view_settings.view_transform='AgX';scene.render.filepath=str(DOC/(kind+'-preview.png'))
        bpy.ops.wm.save_as_mainfile(filepath=str(DOC/(kind+'.blend')));bpy.ops.render.render(write_still=True)
for kind in ['shelf','market']:
    for low in [False,True]:run(kind,low)
