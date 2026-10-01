"""LORE board 01. Own authored meshes/textures; no image-to-plane substitute.
Blender -b --factory-startup --python scripts/blender/build_reading_board.py -- --draft
Native: X right, Y opponent, Z up; tabletop Z=0. Export glTF Y-up.
"""
import bpy, bmesh, math, json, struct, zlib, sys, hashlib, random
import numpy as np
from pathlib import Path
from mathutils import Vector
from mathutils.geometry import tessellate_polygon
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'docs/3d-assets/2026-09-15-blender-reading-board'
SPEC=OUT/'model-spec.json'
if not SPEC.exists():SPEC=ROOT/'docs/3d-assets/2026-09-15-board-designer-brief/layout-spec.json'
if (Path(__file__).parent/'layout-spec.json').exists():
 OUT=Path(__file__).resolve().parent.parent;SPEC=Path(__file__).parent/'layout-spec.json'
for d in ['textures','renders','web','checks']: (OUT/d).mkdir(parents=True,exist_ok=True)
DRAFT='--draft' in sys.argv
random.seed(83)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
S=bpy.context.scene;S.unit_settings.system='METRIC';S.unit_settings.scale_length=1
ASSET=bpy.data.collections.new('01_BOARD_SOURCE');S.collection.children.link(ASSET)
STUDIO=bpy.data.collections.new('STUDIO_NOT_EXPORTED');S.collection.children.link(STUDIO)
ROOTOBJ=bpy.data.objects.new('BOARD_ROOT',None);ASSET.objects.link(ROOTOBJ)
ROOTOBJ['asset_id']='lore_reading_board_01';ROOTOBJ['units']='meters';ROOTOBJ['tabletop_y_gltf']=0.0
PART=None
def group(name):
 global PART
 o=bpy.data.objects.new(name,None);ASSET.objects.link(o);o.parent=ROOTOBJ;PART=o;return o
def attach(o,mat=None):
 for c in list(o.users_collection):c.objects.unlink(o)
 ASSET.objects.link(o);o.parent=PART or ROOTOBJ
 if mat:o.data.materials.append(mat)
 return o
def linear(rgb):
 return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb)
def png(path,a):
 h,w,_=a.shape
 def chunk(t,b):return struct.pack('>I',len(b))+t+b+struct.pack('>I',zlib.crc32(t+b))
 path.write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(b'\0'+r.tobytes() for r in a),6))+chunk(b'IEND',b''))
def material(name,color,metal=0,rough=.5,texture=None):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF')
 col=(*linear(tuple(x/255 for x in color)),1);p.inputs['Base Color'].default_value=col;m.diffuse_color=col
 p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 p.inputs['Specular IOR Level'].default_value=.15 if metal<.1 else .5
 if texture:
  for suffix,target in [('color','Base Color'),('normal','Normal'),('rough','Roughness')]:
   path=OUT/'textures'/f'{texture}-{suffix}.png'
   if not path.exists():continue
   n=m.node_tree.nodes.new('ShaderNodeTexImage');n.image=bpy.data.images.load(str(path));n.image.colorspace_settings.name='sRGB' if suffix=='color' else 'Non-Color'
   if suffix=='normal':
    b=m.node_tree.nodes.new('ShaderNodeNormalMap');b.inputs['Strength'].default_value=.12 if texture=='navy-jacquard' else .22;m.node_tree.links.new(n.outputs['Color'],b.inputs['Color']);m.node_tree.links.new(b.outputs['Normal'],p.inputs[target])
   else:m.node_tree.links.new(n.outputs['Color'],p.inputs[target])
 return m
def make_texture(name,color,kind):
 n=2048;u,v=np.meshgrid(np.arange(n)/n,np.arange(n)/n);rng=np.random.default_rng(77)
 noise=rng.normal(0,1,(n,n))
 if kind=='wood':
  t=v*18+np.sin(u*13)*1.1+np.sin(u*22+v*12)*.5
  g=np.sin(t*2*np.pi)*.42+np.sin(t*9*np.pi+u*10)*.20+noise*.05
  h=g*.30;brightness=1+g*.27
 elif kind=='fabric':
  # Repeating lozenge jacquard; fine threads, not large distracting symbols.
  # Offset quatrefoil weave, with rounded lobes instead of a square grid.
  uu=(u*12)%1-.5;vv=(v*12)%1-.5
  d=np.minimum.reduce([np.abs(np.sqrt((uu-.16)**2+vv**2)-.20),np.abs(np.sqrt((uu+.16)**2+vv**2)-.20),np.abs(np.sqrt(uu**2+(vv-.16)**2)-.20),np.abs(np.sqrt(uu**2+(vv+.16)**2)-.20)])
  edge=np.exp(-d*d/.00016)
  thread=(np.sin(u*512*np.pi)+np.sin(v*512*np.pi))*.015
  petals=np.cos(u*24*np.pi)*np.cos(v*24*np.pi)
  h=edge*.08+thread+noise*.008;brightness=1+edge*.13+petals*.02+noise*.006
 else:
  a=np.abs((u+v)*18%1-.5);b=np.abs((u-v)*18%1-.5)
  edge=np.exp(-np.minimum(a,b)**2/.0007)
  h=edge*.10+noise*.004;brightness=1-edge*.021+noise*.0018
 col=np.clip(np.array(color)[None,None,:]*brightness[:,:,None],0,255).astype(np.uint8)
 dx=(np.roll(h,-1,axis=1)-np.roll(h,1,axis=1))*1.4;dy=(np.roll(h,-1,axis=0)-np.roll(h,1,axis=0))*1.4
 normals=np.stack([-dx,dy,np.ones_like(h)],axis=-1);normals/=np.linalg.norm(normals,axis=-1,keepdims=True)
 nm=np.clip((normals*.5+.5)*255,0,255).astype(np.uint8)
 rr=np.clip((.51 if kind=='wood' else .72)+h*.025,0,1);rough=np.repeat((rr*255).astype(np.uint8)[:,:,None],3,axis=2)
 for suffix,a in [('color',col),('normal',nm),('rough',rough)]:png(OUT/'textures'/f'{name}-{suffix}.png',a)
make_texture('navy-wood',(23,33,48),'wood');make_texture('navy-jacquard',(28,46,72),'fabric');make_texture('ivory-weave',(228,233,235),'ivory')
WOOD=material('01_InkWood',(23,33,48),.03,.5,'navy-wood')
IVORY=material('02_IvoryWeave',(228,233,235),0,.7,'ivory-weave')
FABRIC=material('03_NavyJacquard',(28,46,72),0,.7,'navy-jacquard')
GOLD=material('04_ChampagneBrass',(179,152,105),.78,.29)
SILVER=material('05_WarmSilver',(205,200,184),.70,.31)
INK=material('06_RecessInk',(9,15,24),.02,.48)

def mesh(name,verts,faces,mat,smooth=False):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update()
 bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(me);bm.free()
 o=bpy.data.objects.new(name,me);attach(o,mat)
 uv=me.uv_layers.new(name='UVMap')
 for p in me.polygons:
  p.use_smooth=True
  normal=p.normal
  for li in p.loop_indices:
   co=me.vertices[me.loops[li].vertex_index].co
   # World-sized UV repeat, allowing tile material to stay consistent across parts.
   if abs(normal.z)>.5:q=(co.x/.32,co.y/.32)
   elif abs(normal.y)>.5:q=(co.x/.32,co.z/.12)
   else:q=(co.y/.32,co.z/.12)
   uv.data[li].uv=q
 if not smooth:me.set_sharp_from_angle(angle=math.radians(30))
 return o
def bevel(o,amount=.002,segments=3):
 mod=o.modifiers.new('Crafted edge bevel','BEVEL');mod.width=amount;mod.segments=segments
 mod=o.modifiers.new('Weighted hard-surface normals','WEIGHTED_NORMAL');mod.keep_sharp=True;mod.weight=40
 return o
def rr(w,d,r,n=12):
 pts=[]
 for x,y,a in [(w/2-r,d/2-r,0),(-w/2+r,d/2-r,90),(-w/2+r,-d/2+r,180),(w/2-r,-d/2+r,270)]:
  for j in range(n):
   t=math.radians(a+90*j/n);pts.append((x+r*math.cos(t),y+r*math.sin(t)))
 return pts
def cubic(a,b,c,d,n=24):
 return [tuple((1-t)**3*a[k]+3*(1-t)**2*t*b[k]+3*(1-t)*t*t*c[k]+t**3*d[k] for k in range(len(a))) for t in np.linspace(0,1,n,endpoint=False)]
def spline(nodes,n=8):
 pts=[];N=len(nodes)
 for i in range(N):
  a,b,c,d=[Vector(nodes[j%N]) for j in (i-1,i,i+1,i+2)]
  for t in np.linspace(0,1,n,endpoint=False):pts.append(tuple(.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t)))
 return pts
def solid(name,pts,z0,z1,mat,bev=0):
 n=len(pts);verts=[(x,y,z) for z in [z0,z1] for x,y in pts]
 faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 o=mesh(name,verts,faces,mat)
 if bev:bevel(o,bev)
 return o
def slab(name,x,y,w,d,z0,z1,mat,r=.01,bev=.001):return solid(name,[(a+x,b+y) for a,b in rr(w,d,r)],z0,z1,mat,bev)
def ring(name,outer,inner,z0,z1,mat):
 n=len(outer);assert n==len(inner)
 verts=[(x,y,z) for z in [z0,z1] for p in [outer,inner] for x,y in p];faces=[]
 for i in range(n):
  j=(i+1)%n;faces.extend([(i,j,n+j,n+i),(2*n+i,3*n+i,3*n+j,2*n+j),(i,2*n+i,2*n+j,j),(n+i,n+j,3*n+j,3*n+i)])
 return mesh(name,verts,faces,mat)
def rring(name,x,y,w,d,r,t,z0,z1,mat):
 outer=[(a+x,b+y) for a,b in rr(w,d,r)];inner=[(a+x,b+y) for a,b in rr(w-2*t,d-2*t,max(.001,r-t))]
 return bevel(ring(name,outer,inner,z0,z1,mat),min(t*.24,.0011),3)
def circle(x,y,rx,ry=None,n=96):return [(x+rx*math.cos(i*2*math.pi/n),y+(ry or rx)*math.sin(i*2*math.pi/n)) for i in range(n)]
def tube(name,pts,r,mat,cyclic=False,res=3):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=12;c.bevel_depth=r;c.bevel_resolution=res;c.use_fill_caps=True
 sp=c.splines.new('POLY');sp.points.add(len(pts)-1)
 for p,co in zip(sp.points,pts):p.co=(*co,1)
 sp.use_cyclic_u=cyclic;o=bpy.data.objects.new(name,c);attach(o,mat);return o
def line2(name,pts,z,r,mat,closed=True):return tube(name,[(x,y,z) for x,y in pts],r,mat,closed)
def lathe(name,profile,mat,x=0,y=0,segments=48):
 v=[(x+r*math.cos(t*2*math.pi/segments),y+r*math.sin(t*2*math.pi/segments),z) for r,z in profile for t in range(segments)];f=[]
 for k in range(len(profile)-1):
  for i in range(segments):j=(i+1)%segments;f.append((k*segments+i,k*segments+j,(k+1)*segments+j,(k+1)*segments+i))
 f += [tuple(reversed(range(segments))),tuple(range((len(profile)-1)*segments,len(profile)*segments))]
 return mesh(name,v,f,mat,True)
def sphere(name,loc,r,mat,scale=(1,1,1),segments=24):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=12,radius=r,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;attach(o,mat)
 for p in o.data.polygons:p.use_smooth=True
 return o
def gem(name,x,y,z,rx,ry,h,mat=GOLD):
 v=[(x,y+ry,z),(x-rx,y,z),(x,y-ry,z),(x+rx,y,z),(x,y,z+h),(x,y,z-.002)]
 return mesh(name,v,[(i,(i+1)%4,4) for i in range(4)]+[((i+1)%4,i,5) for i in range(4)],mat)
def apply(o):
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
 bpy.ops.object.convert(target='MESH');return bpy.context.object
def cut(o,cutter):
 bpy.context.view_layer.objects.active=o
 m=o.modifiers.new('True through aperture','BOOLEAN');m.operation='DIFFERENCE';m.solver='EXACT';m.object=cutter
 bpy.ops.object.modifier_apply(modifier=m.name)

# Silhouette, small portrait protrusions and rounded cabinet shoulders.
group('BASE_BODY')
nodes=[(.80,0),(.79,.26),(.762,.367),(.718,.415),(.62,.438),(.17,.438),(.112,.442),(.066,.463),(0,.47),(-.066,.463),(-.112,.442),(-.17,.438),(-.59,.438),(-.706,.421),(-.77,.365),(-.797,.20),(-.80,0),(-.797,-.20),(-.77,-.365),(-.706,-.421),(-.59,-.438),(-.17,-.438),(-.112,-.442),(-.066,-.463),(0,-.47),(.066,-.463),(.112,-.442),(.17,-.438),(.62,-.438),(.718,-.415),(.762,-.367),(.79,-.26)]
outline=spline(nodes,6)
body=solid('Continuous carved wooden carcass',outline,-.040,-.001,WOOD,.003)
bottom=solid('Inset lower plinth',[(x*.994,y*.989) for x,y in outline],-.041,-.035,INK,.002)
# True diagonal almond openings; mirrored in fore/aft, never filled by bottom.
hole=cubic((.670,.371),(.670,.273),(.725,.175),(.773,.123),32)+cubic((.773,.123),(.782,.245),(.725,.335),(.670,.371),32)
cutters=[]
for sign in [1,-1]:cutters.append(solid('temporary_rift_cutter',[(x,y*sign) for x,y in hole],-.08,.09,None))
cutters.append(solid('temporary_timer_cutter',circle(.70,0,.0475),-.08,.09,None))
body=apply(body);bottom=apply(bottom)
for o in [body,bottom]:
 for c in cutters:cut(o,c)
# Flat ivory inlay follows shoulder, with a dark rim around it.
group('FIELD_SURFACE')
fieldpts=spline([(.632,0),(.648,.27),(.628,.37),(.58,.416),(.12,.416),(.08,.421),(0,.432),(-.08,.421),(-.12,.416),(-.58,.416),(-.70,.397),(-.745,.32),(-.756,0),(-.745,-.32),(-.70,-.397),(-.58,-.416),(-.12,-.416),(-.08,-.421),(0,-.432),(.08,-.421),(.12,-.416),(.58,-.416),(.628,-.37),(.648,-.27)],8)
field=solid('Ivory woven reading surface',fieldpts,-.006,0,IVORY,.0012)
line2('Inlay champagne pinstripe',fieldpts,.0013,.0016,GOLD)
group('OUTER_JOINERY')
line2('Outer champagne edge',[(x*.995,y*.993) for x,y in outline],-.004,.0013,GOLD)
line2('Lower fine brass bead',[(x*.992,y*.986) for x,y in outline],-.034,.0011,GOLD)
# A continuous five-course moulded profile follows the carved silhouette.
# All courses are real cross-section geometry, including the recessed fillet.
profile=[(1,-.009),(.999,-.001),(.995,.003),(.985,.006),(.971,.007),(.966,.004)]
vv=[(x*f,y*f,z) for f,z in profile for x,y in outline];nn=len(outline)
ff=[(k*nn+i,k*nn+(i+1)%nn,(k+1)*nn+(i+1)%nn,(k+1)*nn+i) for k in range(len(profile)-1) for i in range(nn)]
ff += [(i,(len(profile)-1)*nn+i,(len(profile)-1)*nn+(i+1)%nn,(i+1)%nn) for i in range(nn)]
bevel(mesh('Continuous carved rim moulding',vv,ff,WOOD),.0005,2)
line2('Recessed perimeter fillet',[(x*.982,y*.982) for x,y in outline],.0065,.0006,INK)
for sign in [1,-1]:
 for start,end in [(-.55,-.14),(.15,.52)]:
  pts=[(x,sign*(.434+.0012*math.sin((x-start)*36))) for x in np.linspace(start,end,80)]
  line2('Fine carved shoulder flute',pts,.0068,.0004,INK,False)
for x,y,a in [(-.755,.342,.15),(-.745,-.35,-.18),(.735,.389,-.6),(.751,-.363,.6),(-.55,.425,0),(.51,.429,0),(-.57,-.427,0),(.54,-.428,0)]:
 pts=[(-.023,-.006),(-.013,-.012),(.015,-.012),(.024,0),(.012,.012),(-.018,.012)]
 p=solid('Forged corner mortise plate',[(x+a0,y+b0) for a0,b0 in pts],.006,.011,GOLD,.0008)
 for v in p.data.vertices:
  xx,yy=v.co.x-x,v.co.y-y;v.co.x=x+xx*math.cos(a)-yy*math.sin(a);v.co.y=y+xx*math.sin(a)+yy*math.cos(a)
 sphere('Domed rivet', (x,y,.013),.0045,GOLD,scale=(1,1,.38),segments=16)
 # tiny slot at center of each screw, real geometry, not a painted overlay
 tube('Screw slot',[(x-.0018,y,.015),(x+.0018,y,.015)],.0003,INK,res=1)
# Reference's low front joinery and cabinet pull.
for x in [-.64,.59]:
 slab('Vertical binding strap',x,-.442,.017,.008,-.035,.006,GOLD,.002,.001)
 for z in [-.027,-.002]:sphere('Strap pin',(x,-.447,z),.0022,GOLD,segments=12)
slab('Corner drawer inset',-.60,-.440,.16,.009,-.035,-.004,WOOD,.003,.001)
sphere('Small drawer pull',(-.60,-.452,-.018),.008,GOLD,scale=(1,.55,1))

group('MARKET_BASE')
slab('Market shadow foot',-.085,0,1.364,.204,.001,.007,INK,.014,.001)
slab('Market brass plinth',-.085,0,1.36,.20,.005,.013,GOLD,.013,.0012)
slab('Market navy fabric',-.085,0,1.347,.187,.012,.015,FABRIC,.010,.0005)
rring('Market double moulding',-.085,0,1.354,.194,.012,.0025,.013,.016,GOLD)
for x in [-.746,.576]:
 for y in [-.081,.081]:
  gem('Market binding corner',x,y,.016,.005,.006,.0017)
  sx=1 if x<0 else -1;sy=-1 if y>0 else 1
  line2('Market corner angular flourish',[(x+sx*.021,y-sy*.002),(x+sx*.010,y-sy*.002),(x-sx*.002,y+sy*.010),(x-sx*.002,y+sy*.023)],.016,.0011,GOLD,False)
line2('Subtle market division',[(-.308,-.094),(-.308,.094)],.016,.0009,GOLD,False)
for y in [-.094,.094]:gem('Divider diamond',-.308,y,.016,.003,.004,.002)
group('MARKET_SUPPLY_INSERT')
slab('Offered market low insert',-.495,0,.37,.184,.015,.020,GOLD,.012,.001)
slab('Offered market inset fabric',-.491,0,.349,.169,.020,.021,FABRIC,.009,.0005)
rring('Offered fillet border',-.491,0,.351,.171,.010,.0014,.021,.022,GOLD)

# Center the complete market on the ivory surface at its cross-section Y=0.
# White bounds: -0.756 .. +0.632 m. Preserve all internal 3+7 spacing.
MARKET_CENTER_X=(-.756+.632)/2
MARKET_SHIFT_X=MARKET_CENTER_X-(-.085)
for name in ['MARKET_BASE','MARKET_SUPPLY_INSERT']:
 bpy.data.objects[name].location.x=MARKET_SHIFT_X
ROOTOBJ['market_center_x']=MARKET_CENTER_X
ROOTOBJ['market_reference']='Ivory field cross-section at Y=0'
ROOTOBJ['left_corner_props']='Separate assets; removed 2026-09-19'

group('PORTRAIT_PLAYER_FRAME')
for sign in [-1,1]:
 if sign==1:group('PORTRAIT_OPPONENT_FRAME')
 y=sign*.385
 solid('Portrait rim base',circle(0,y,.102,.085),-.002,.006,WOOD)
 solid('Portrait replaceable backing',circle(0,y,.091,.074),.006,.007,FABRIC)
 o=ring('Oval champagne bezel',circle(0,y,.10,.083),circle(0,y,.091,.074),.005,.012,GOLD);bevel(o,.0012)
 line2('Oval ivory highlight bead',circle(0,y,.095,.078),.012,.0011,SILVER)
 line2('Portrait inner dark gasket',circle(0,y,.090,.073),.009,.0008,INK)
 for sx in [-1,1]:gem('Portrait side ferrule',sx*.099,y,.012,.006,.003,.002)
 for sy in [-1,1]:gem('Portrait center tiny diamond',0,y+sy*.081,.012,.006,.009,.003)

def ribbon(name,points,widths,z,mat,crest=.007):
 # Faceted sculpted ribbon cross-section with physical lower surface.
 v=[];N=len(points)
 for i,(x,y) in enumerate(points):
  a=Vector(points[max(0,i-1)]);b=Vector(points[min(N-1,i+1)]);t=(b-a).normalized();normal=Vector((-t.y,t.x));w=widths[i]
  for off,h in [(-.5,0),(-.34,.002),(0,crest),(.34,.002),(.5,0),(.5,-.003),(-.5,-.003)]:v.append((x+normal.x*w*off,y+normal.y*w*off,z+h))
 f=[]
 for i in range(N-1):
  for j in range(7):f.append((i*7+j,(i+1)*7+j,(i+1)*7+(j+1)%7,i*7+(j+1)%7))
 f += [tuple(reversed(range(7))),tuple(range((N-1)*7,N*7))]
 return mesh(name,v,f,mat)
group('RIFT_RAIL')
for sign in [1,-1]:
 hp=[(x,y*sign) for x,y in hole]
 center=np.mean(np.array(hp),axis=0)
 # Low navy/socket collar, applied cut leaves interior walls visible.
 shell=solid('Rift mounting shoulder',[(center[0]+(x-center[0])*1.18,center[1]+(y-center[1])*1.06) for x,y in hp],-.005,.009,WOOD)
 cut(shell,cutters[0 if sign==1 else 1])
 line2('Rift aperture inner warm silver',hp,.011,.0028,SILVER)
 # Three pointed ribbon ribs form one continuous sculpted shape around aperture.
 paths=[cubic((.648,.399),(.655,.272),(.741,.148),(.731,.052),48),cubic((.648,.399),(.760,.356),(.794,.211),(.733,.054),48),cubic((.664,.276),(.690,.213),(.768,.187),(.777,.117),28)]
 for j,p in enumerate(paths):
  p=[(x,y*sign) for x,y in p];w=[.001+.023*max(0,math.sin(math.pi*i/(len(p)-1)))**.6 for i in range(len(p))]
  ribbon('Sculpted silver Rift rib',p,w,.015,SILVER,.007)
  line2('Rib fine champagne spine',p,.023,.0008,GOLD,False)
 # Endpiece joins to the timer frame.
 gem('Rail end faceted binding',.665,sign*.389,.015,.015,.024,.010,SILVER)
 gem('Rail end inlaid brass diamond',.665,sign*.389,.026,.004,.007,.002,GOLD)
group('TIMER_RING')
o=ring('Timer sculptural housing',circle(.70,0,.065),circle(.70,0,.0475),-.005,.020,GOLD);bevel(o,.002)
o=ring('Timer silver exterior',circle(.70,0,.062),circle(.70,0,.059),.020,.024,SILVER);bevel(o,.0007)
o=ring('Timer dark progress channel',circle(.70,0,.0585),circle(.70,0,.053),.020,.021,INK)
o=ring('Button socket inner bezel',circle(.70,0,.0515),circle(.70,0,.0475),.019,.024,GOLD);bevel(o,.0007)
for i in range(24):
 a=i*2*math.pi/24
 line2('Timer radial channel divider',[(.70+.053*math.cos(a),.053*math.sin(a)),(.70+.0584*math.cos(a),.0584*math.sin(a))],.0218,.0007,GOLD,False)
for i in range(4):
 a=i*math.pi/2;gem('Timer quarter key',.70+.063*math.cos(a),.063*math.sin(a),.022,.008,.003,.002)
for c in cutters:bpy.data.objects.remove(c,do_unlink=True)

# Corner objects are separate assets as of 2026-09-19.

group('ATTACHMENT_ANCHORS')
spec=json.loads(SPEC.read_text())
for name,(x,y,z) in spec['anchors'].items():
 o=bpy.data.objects.new(name,None);ASSET.objects.link(o);o.parent=PART;o.location=(x,-z,y);o.empty_display_size=.009;o['role']='attachment_anchor'

def aim(o,target=(0,0,0)):o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
def setup_studio():
 S.render.engine='CYCLES';S.cycles.samples=24 if DRAFT else 96;S.cycles.use_denoising=True
 S.cycles.max_bounces=8;S.render.resolution_x=1600 if DRAFT else 2560;S.render.resolution_y=900 if DRAFT else 1440
 S.render.resolution_percentage=100;S.render.image_settings.file_format='PNG';S.view_settings.view_transform='AgX';S.view_settings.look='AgX - Medium High Contrast'
 S.world.use_nodes=True;S.world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.68,.73,1);S.world.node_tree.nodes['Background'].inputs[1].default_value=.06
 for name,loc,power,size in [('Key',(-1.0,-.7,2.1),45,1.1),('Fill',(1.2,-.2,1.6),10,1.0),('Rim',(.0,1.4,1.8),30,1.2)]:
  d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);STUDIO.objects.link(o);o.location=loc;aim(o)
 me=bpy.data.meshes.new('StudioFloor');me.from_pydata([(-20,-20,-.043),(20,-20,-.043),(20,20,-.043),(-20,20,-.043)],[],[(0,1,2,3)])
 o=bpy.data.objects.new('StudioFloor_NOT_EXPORTED',me);STUDIO.objects.link(o);o.data.materials.append(material('StudioGrey',(110,116,123),0,.85))
 d=bpy.data.cameras.new('CAM_GAME_18deg');cam=bpy.data.objects.new('CAM_GAME_18deg',d);STUDIO.objects.link(cam)
 d.type='PERSP';d.lens=50;d.sensor_fit='VERTICAL';d.sensor_height=24;d.lens=24/(2*math.tan(math.radians(spec['camera']['vertical_fov_deg'])/2));d.clip_start=.01;d.clip_end=20
 dist=2.25738;cam.location=(0,-dist*math.sin(math.radians(18)),dist*math.cos(math.radians(18)));aim(cam);S.camera=cam
 return cam
cam=setup_studio()
# Keep generated source nodes editable; a separate process handles optimized GLB export.
for im in bpy.data.images:
 if im.source=='FILE':im.pack()
ROOTOBJ['reference']='01-board-model-reference.png';ROOTOBJ['build_script']='scripts/blender/build_reading_board.py'
S.render.filepath=str(OUT/'renders'/'01-game-camera.png')
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':area.spaces.active.region_3d.view_perspective='CAMERA';area.spaces.active.shading.type='MATERIAL'
STUDIO.hide_select=True
for obj in ASSET.objects:
 if obj.get('role')=='attachment_anchor':obj.hide_set(True)
reference=ROOT/'docs/ui-concepts/2026-09-15-modeling-components/01-board/01-board-model-reference.png'
if not reference.exists():reference=OUT/'reference'/'approved.png'
if reference.exists():
 im=bpy.data.images.load(str(reference));im.name='REFERENCE_ONLY_approved_design';im.pack()
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'lore-reading-board-source.blend'))
if '--no-render' not in sys.argv:bpy.ops.render.render(write_still=True)
print('BOARD_BUILD_DONE',len(ASSET.objects))
