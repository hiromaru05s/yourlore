"""Blender-built library shelf and ImageGen-referenced market; meters, glTF +Y up."""
import bpy, math, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
DOC=ROOT/'docs/3d-assets/2026-09-09-release-furniture'
OUT=ROOT/'client/public/models/library-furniture/v2'
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
    # Portrait card tray: 1.52 x 2.08 U; a full 1 x 1.5625 U card fits freely.
    # The mounting plane is the velvet face; the foot rests .12 U below it.
    wood=(.022,.019,.018,1); cloth=(.012,.038,.108,1)
    box('Ebony foundation',(0,-.075,0),(1.52,.09,2.08),wood,bevel=.018)
    box('Brass foundation fillet',(0,-.025,0),(1.50,.014,2.06),GOLD,1,.008)
    box('Navy velvet bed',(0,-.008,0),(1.30,.016,1.86),cloth,bevel=.012)
    for x in [-.695,.695]:
        box('Long ebony rail',(x,.11,0),(.13,.26,2.02),wood,bevel=.016)
        for y in [.01,.22]: tube('Long brass inlay',[(x+(.067 if x>0 else -.067),y,-.94),(x+(.067 if x>0 else -.067),y,.94)],.005)
        tube('Top brass rail',[(x,.244,-.92),(x,.244,.92)],.005)
        box('Blue inner lining',(x*.897,.085,0),(.012,.17,1.86),NAVY,bevel=.004)
        for j in range(5):
            tube('Fine wood grain',[(x+.061,.035+j*.034,-.85),(x+.061,.037+j*.034,.85)],.0015,(.085,.068,.043,1))
    for z in [-.975,.975]:
        box('End ebony rail',(0,.11,z),(1.4,.26,.13),wood,bevel=.016)
        for y in [.01,.22]:tube('End brass inlay',[(-.62,y,z+(.067 if z>0 else -.067)),(.62,y,z+(.067 if z>0 else -.067))],.005)
        tube('Top end brass rail',[(-.60,.244,z),(.60,.244,z)],.005)
        diamond('End brass and enamel seal',0,.12,z+(.068 if z>0 else -.068),.064)
    for x in [-.69,.69]:
        for z in [-.975,.975]:
            box('Brass corner guard',(x,.12,z),(.15,.29,.15),GOLD,1,.012)
            box('Corner blue enamel cap',(x,.270,z),(.102,.008,.102),BLUE,2,.007)
            box('Corner navy inset',(x,.12,z+(.076 if z>0 else -.076)),(.098,.20,.009),NAVY,bevel=.004)
            diamond('Corner diamond',x,.12,z+(.084 if z>0 else -.084),.040)
    # Understated woven lozenges on the cloth, modelled in relief, below the card.
    if not LOW:
        for i in range(-5,6):
            for j in range(-7,8):
                x=i*.105;z=j*.113
                tube('Velvet weave',[(x-.028,.0005,z),(x,.0005,z+.035),(x+.028,.0005,z),(x,.0005,z-.035),(x-.028,.0005,z)],.0008,(.018,.047,.124,1))
def supply():
    # Independent 4-card upper plinth. Bottom -.08 U, top at the mount plane.
    box('Thin ivory foundation',(0,-.048,0),(4.5,.064,1.94),IVORY,bevel=.035)
    box('Brass rim',(0,-.014,0),(4.49,.012,1.93),GOLD,1,.030)
    box('Inset navy presentation felt',(0,-.005,0),(4.43,.01,1.87),(.025,.063,.098,1),bevel=.030)
    for z in [-.951,.951]:
        tube('Hairline enamel border',[(-2.13,-.003,z),(2.13,-.003,z)],.003,(.14,.29,.36,1))
    diamond('Supply clasp',0,-.043,.970,.032)
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
    {'shelf':shelf,'supply':supply}[kind]()
    bpy.ops.object.select_all(action='DESELECT')
    for o in PARTS:o.select_set(True)
    bpy.context.view_layer.objects.active=PARTS[0];bpy.ops.object.join();obj=bpy.context.object;obj.name=kind.title()+'Visual'
    # Consistent outward normals, triangulation and identity transform at export.
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
    root=bpy.data.objects.new('cosmetic_root' if kind=='shelf' else kind+'_root',None);bpy.context.collection.objects.link(root);obj.parent=root
    anchor=bpy.data.objects.new('shelf_mount' if kind=='shelf' else kind+'_mount',None);bpy.context.collection.objects.link(anchor);anchor.parent=root
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
        cam.rotation_euler=(Vector(coord(0,.06 if kind=='shelf' else 0,0))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=(3.3 if kind=='shelf' else 5.5)*U;scene.camera=cam
        scene.view_settings.view_transform='AgX';scene.render.filepath=str(DOC/(kind+'-preview.png'))
        bpy.ops.wm.save_as_mainfile(filepath=str(DOC/(kind+'.blend')));bpy.ops.render.render(write_still=True)
for kind in ['shelf','supply']:
    for low in [False,True]:run(kind,low)
