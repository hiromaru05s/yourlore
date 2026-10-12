import * as T from 'three';
import {ConvexGeometry} from 'three/addons/geometries/ConvexGeometry.js';
import {ease,rank,type Id} from './catalog';

export const bites=[
 {hit:1080,hold:1190,release:1580,snap:100},
 {hit:1190,hold:1320,release:1730,snap:155},
 {hit:1030,hold:1180,release:1560,snap:85},
 {hit:1120,hold:1250,release:1620,snap:110},
 {hit:1160,hold:1240,release:1660,snap:140},
 {hit:1250,hold:1400,release:1780,snap:125},
];
export function bitePose(v:number,ms:number){
 const b=bites[v],grow=ease(0,650,ms),u=T.MathUtils.clamp((ms-b.hit+b.snap)/b.snap,0,1),close=u*u*u;
 const retract=ease(b.hold,b.release,ms),pressure=ease(b.hit,b.hit+22,ms)*(1-ease(b.hold+30,b.release,ms));
 return {grow,close,open:0,pressure,wound:ease(b.hit,b.hit+40,ms)*(1-ease(1750,2110,ms)),retract,gap:52*(1-close),yaw:0,slide:0,hit:b.hit};
}
type Pose=ReturnType<typeof bitePose>;
function red(color:number,roughness:number,metalness=0){return new T.MeshPhysicalMaterial({color,roughness,metalness,clearcoat:.08,clearcoatRoughness:.4,envMapIntensity:.23,specularColor:0xff6171,specularIntensity:.35,emissive:0x390005,emissiveIntensity:.16});}
function solid(g:T.BufferGeometry,m:T.Material){const o=new T.Mesh(g,m);o.castShadow=true;o.receiveShadow=true;return o;}
function geometry(p:number[],idx:number[]){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();return g;}
function connect(idx:number[],i:number,j:number,n:number){const a=i*(n+1)+j;idx.push(a,a+1,a+n+1,a+1,a+n+2,a+n+1);}
function tube(points:T.Vector3[],radius:number,m:T.Material){return solid(new T.TubeGeometry(new T.CatmullRomCurve3(points),64,radius,8,false),m);}
function puddle(m:T.Material,sx:number,sy:number){const o=solid(new T.SphereGeometry(1,48,20),m);o.scale.set(sx,sy,2.3);o.position.z=2;return o;}
// A crowned canine: convex shoulder, oval root, labial ridge and a hooked pointed tip.
// Used only for the anatomical study, not as a base mesh for the other five directions.
function canine(length:number,width:number,hook:number){
 const p:number[]=[],idx:number[]=[],colors:number[]=[],N=48,S=24;
 for(let i=0;i<=N;i++){const u=i/N;const r=width*Math.pow(1-u,.76)*(.94+.12*Math.sin(Math.PI*u));
  for(let j=0;j<=S;j++){const a=j/S*Math.PI*2;const ridge=1+.11*Math.cos(a*3)*Math.sin(Math.PI*u);p.push(hook*u*u+r*Math.cos(a),-length*u,5*Math.sin(Math.PI*u)+r*.63*Math.sin(a)*ridge);const tone=.36+.56*Math.sin(Math.PI*u*.85)+.08*Math.sin(a)*Math.sin(Math.PI*u);colors.push(tone,tone*.82,tone*.84);if(i<N&&j<S)connect(idx,i,j,S);}}
 const cap=p.length/3;p.push(0,0,0);colors.push(.35,.28,.29);for(let j=0;j<S;j++)idx.push(cap,j+1,j);
 const g=geometry(p,idx);g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
}
abstract class Study{readonly group=new T.Group();abstract update(p:Pose,t:number):void;}
class Enamel extends Study{
 private jaws:T.Group[]=[];private roots:T.Mesh[]=[];
 constructor(){super();const enamel=red(0xa50820,.3,.08),blood=red(0x590015,.3);enamel.vertexColors=true;for(const side of [1,-1]){
  const jaw=new T.Group();jaw.position.y=side*105;this.group.add(jaw);this.jaws.push(jaw);
  for(const x of [-39,39]){const tooth=solid(canine(103,side===1?17:14,-Math.sign(x)*12),enamel);tooth.position.set(x,0,13);tooth.rotation.z=side===1?0:Math.PI;tooth.position.x=side===1?x:-x;jaw.add(tooth);}
  const root=tube([new T.Vector3(-58,0,4),new T.Vector3(-37,7*side,5),new T.Vector3(0,13*side,4),new T.Vector3(37,7*side,5),new T.Vector3(58,0,4)],4,blood);jaw.add(root);this.roots.push(root);
 }}
 update(p:Pose){const g=.025+.975*p.grow;this.jaws.forEach((j,i)=>{const s=i===0?1:-1;j.rotation.x=-s*(.22*(1-p.close)*p.grow);j.position.y=s*(104+26*(1-p.close));j.scale.set(g,1-p.retract*.17,g*(1-p.retract));});this.group.scale.setScalar(1-p.retract*.12);}
}
// A continuous, thick liquid sheet. Its free boundary draws two long drip-canines;
// it has front/back faces and a rounded rim, rather than detached triangular teeth.
class BloodTide extends Study{
 private sheets:T.Mesh[]=[];private pools:T.Mesh[]=[];private base:Float32Array[]=[];
 constructor(){super();const mat=red(0x930019,.32),deep=new T.MeshStandardMaterial({color:0x460009,roughness:1,metalness:0,envMapIntensity:0});for(const side of [1,-1]){
  const p:number[]=[],idx:number[]=[],N=64,S=20;
  for(let i=0;i<=N;i++){const x=-78+156*i/N;const tooth=77*Math.exp(-Math.pow((Math.abs(x)-37)/13,2));const outer=97-Math.pow(x/78,2)*22;const inner=outer-20-tooth;
   for(let j=0;j<=S;j++){const a=j/S*Math.PI*2,y=(outer+inner)/2+(outer-inner)/2*Math.cos(a),z=6+Math.sin(a)*(5+5*Math.sin(Math.PI*i/N));p.push(x,y,z);if(i<N&&j<S)connect(idx,i,j,S);}}
  const m=solid(geometry(p,idx),mat);m.rotation.z=side===1?0:Math.PI;this.sheets.push(m);this.base.push(new Float32Array(p));this.group.add(m);const pool=puddle(deep,81,24);pool.position.y=side*86;this.pools.push(pool);this.group.add(pool);
 }}
 update(p:Pose,t:number){this.sheets.forEach((m,k)=>{const a=m.geometry.getAttribute('position') as T.BufferAttribute,b=this.base[k];for(let i=0;i<a.count;i++){const x=b[i*3],y=b[i*3+1],z=b[i*3+2];const tip=ease(80,25,y),wave=Math.sin(x*.047+t*.006)*(1-p.close);a.setXYZ(i,x+(wave*4*tip),y-(1-p.close)*6+Math.sin(x*.04)*p.close*2,z*p.grow*(1-p.retract)+tip*38*p.grow*(1-p.close)*(1-p.retract));}a.needsUpdate=true;m.geometry.computeVertexNormals();m.position.y=(k===0?1:-1)*(28*(1-p.close));m.scale.set(1,.18+.82*p.grow,1);m.visible=p.retract<.99;});this.pools.forEach(o=>{o.scale.z=.2+2*(1-p.retract);o.scale.x=81*(1-.4*p.retract);});this.group.scale.setScalar(1-p.retract*.55);}
}
// A mouth cut INTO the face: a recessed black throat, a continuous scalloped lip,
// and long red incisive folds. The entire aperture is the moving mechanism.
class WoundMouth extends Study{
 private throat:T.Mesh;private lips:T.Mesh[]=[];private bases:Float32Array[]=[];
 constructor(){super();this.throat=puddle(new T.MeshBasicMaterial({color:0x100009}),86,78);this.throat.position.z=3;this.group.add(this.throat);
  const mat=red(0x9e001f,.27,.08);for(const side of [1,-1]){
   const p:number[]=[],idx:number[]=[],N=80,S=16;
   for(let i=0;i<=N;i++){const x=-86+172*i/N,arc=Math.sqrt(Math.max(0,1-(x/86)**2)),tooth=(46*Math.exp(-Math.pow((Math.abs(x)-40)/10,2))+13*Math.exp(-Math.pow(x/15,2)))*arc;
    const outer=70*arc,inner=outer-10*arc-tooth;
    for(let j=0;j<=S;j++){const a=j/S*Math.PI*2;p.push(x,(outer+inner)/2+(outer-inner)/2*Math.cos(a),8+7*Math.sin(a)*arc);if(i<N&&j<S)connect(idx,i,j,S);}}
   const lip=solid(geometry(p,idx),mat);lip.rotation.z=side===1?-.20:Math.PI-.20;this.group.add(lip);this.lips.push(lip);this.bases.push(new Float32Array(p));}
  this.throat.rotation.z=-.20;
 }
 update(p:Pose){const aperture=(.04+.96*p.grow)*(1-.94*p.close)*(1-p.retract);this.throat.scale.y=78*aperture;this.throat.scale.x=86*(1-p.retract*.4);this.lips.forEach((o,k)=>{const a=o.geometry.getAttribute('position') as T.BufferAttribute,b=this.bases[k];for(let i=0;i<a.count;i++){const x=b[i*3],y=b[i*3+1],z=b[i*3+2];a.setXYZ(i,x*(1-p.retract*.4),y*aperture,z*(.15+.85*p.grow)*(1-p.retract)+Math.max(0,55-y)*.36*p.grow*(1-p.close));}a.needsUpdate=true;o.geometry.computeVertexNormals();});}
}
class CrystalLock extends Study{
 private pieces:{mesh:T.Mesh;side:number;i:number;x:number;y:number}[]=[];
 constructor(){super();const ruby=red(0xb7002a,.18,.38),garnet=red(0x570016,.27,.42);for(const side of [1,-1])for(let i=0;i<5;i++){
  const y=(i-2)*34,x=side*(67-Math.abs(i-2)*5),length=i===1||i===3?75:41,width=i===1||i===3?15:11;
  const vertices=[new T.Vector3(0,-width,0),new T.Vector3(0,width,0),new T.Vector3(-side*8,-width*.6,18),new T.Vector3(-side*8,width*.6,18),new T.Vector3(-side*length,0,9),new T.Vector3(side*13,0,6),new T.Vector3(-side*19,0,27)];
  const mesh=solid(new ConvexGeometry(vertices),i%2?ruby:garnet);this.group.add(mesh);this.pieces.push({mesh,side,i,x,y});
 }}
 update(p:Pose){for(const o of this.pieces){const assembly=ease(o.i*.055,.66+o.i*.055,p.grow);o.mesh.position.set(o.x+o.side*(36*(1-p.close)),o.y+(o.side<0?12:0)+(o.i-2)*16*(1-assembly),3);o.mesh.rotation.y=o.side*(1-p.close)*.48*assembly;o.mesh.rotation.z=(o.i-2)*.09*(1-assembly)+o.side*p.retract*.35;o.mesh.scale.set(assembly*(1-p.retract*.55),assembly*(1-p.retract*.1),(.05+.95*assembly)*(1-p.retract));}}
}
// Two solid tapered blood ribbons; their hooked ends are the fangs. A rotating
// constriction, with a broad trailing band and a sharp accelerating leading tip.
class RibbonSnare extends Study{
 private bands:T.Mesh[]=[];
 constructor(){super();const mat=red(0xb60926,.3,.1);
  const curve=new T.CatmullRomCurve3([new T.Vector3(-62,113,3),new T.Vector3(-91,78,10),new T.Vector3(-77,27,17),new T.Vector3(-44,24,25),new T.Vector3(-22,68,34),new T.Vector3(-8,80,33),new T.Vector3(3,39,21),new T.Vector3(0,0,7)]);
  for(let side=0;side<2;side++){const p:number[]=[],idx:number[]=[],N=100,S=16;
   for(let i=0;i<=N;i++){const u=i/N,c=curve.getPoint(u),t=curve.getTangent(u),n=new T.Vector3(-t.y,t.x,0).normalize(),width=(6+10*Math.sin(Math.PI*u))*Math.pow(1-u,.48);
    for(let j=0;j<=S;j++){const q=j/S*Math.PI*2;p.push(c.x+n.x*Math.cos(q)*width,c.y+n.y*Math.cos(q)*width,c.z+Math.sin(q)*width*.48);if(i<N&&j<S)connect(idx,i,j,S);}}
   const g=geometry(p,idx);const m=solid(g,mat);this.group.add(m);this.bands.push(m);
  }
 }
 update(p:Pose){this.bands.forEach((o,k)=>{const s=k===0?1:-1;o.rotation.z=k*Math.PI+s*(.35*(1-p.close));o.position.y=s*29*(1-p.close);o.position.x=s*11*(1-p.close);o.scale.set(1-p.retract*.6,.1+.9*p.grow,(.03+.97*p.grow)*(1-p.retract));});}
}
// The red lacquer at the card's long edges grows into two sculpted jaw plates.
// Thick bevelled relief and an actual hinge distinguish this from loose tooth rows.
class LacquerHinge extends Study{
 private plates:T.Group[]=[];private relief:T.Mesh[]=[];
 constructor(){super();this.group.rotation.z=Math.PI/2;const mat=red(0x800014,.29,.25),edge=red(0xc91a34,.23,.42);
  for(const side of [1,-1]){const jaw=new T.Group();jaw.position.y=side*109;this.group.add(jaw);this.plates.push(jaw);
   const s=new T.Shape();s.moveTo(-77,0);s.bezierCurveTo(-76,-18,-64,-31,-58,-47);s.bezierCurveTo(-53,-59,-55,-84,-46,-104);s.bezierCurveTo(-32,-84,-25,-72,-28,-42);s.bezierCurveTo(-12,-61,-7,-46,0,-57);s.bezierCurveTo(7,-46,12,-61,28,-42);s.bezierCurveTo(25,-72,32,-84,46,-104);s.bezierCurveTo(55,-84,53,-59,58,-47);s.bezierCurveTo(64,-31,76,-18,77,0);s.bezierCurveTo(53,23,41,5,23,13);s.quadraticCurveTo(0,32,-23,13);s.bezierCurveTo(-41,5,-53,23,-77,0);
   const plate=solid(new T.ExtrudeGeometry(s,{depth:7,bevelEnabled:true,bevelSegments:4,steps:1,bevelSize:2.8,bevelThickness:2,curveSegments:16}),mat);const pos=plate.geometry.getAttribute('position') as T.BufferAttribute;
   for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);pos.setZ(i,z+7*Math.sin(Math.PI*Math.max(0,Math.min(1,-y/106)))+6*Math.exp(-Math.pow((Math.abs(x)-44)/18,2))*Math.sin(Math.PI*Math.max(0,Math.min(1,-y/108))));}pos.needsUpdate=true;plate.geometry.computeVertexNormals();
   plate.rotation.z=side===1?0:Math.PI;plate.position.z=7;jaw.add(plate);
   for(const x of [-45,45]){const line=tube([new T.Vector3(x,0,16),new T.Vector3(x*.98,-27*side,16),new T.Vector3(x*.83,-51*side,16),new T.Vector3(x*1.01,-94*side,10)],1.15,edge);jaw.add(line);this.relief.push(line);}
  }
 }
 update(p:Pose){this.plates.forEach((o,k)=>{const side=k===0?1:-1;o.rotation.x=-side*(.08+.50*p.grow)*(1-p.close);o.scale.set(1,.02+.98*p.grow,(.08+.92*p.grow)*(1-p.retract));o.position.y=side*(109-6*p.close);});this.group.scale.set(.92*(1-p.retract*.1),.80*(1-p.retract*.1),1);}
}
export class BiteRig{
 readonly group=new T.Group();readonly ready=Promise.resolve();readonly points=Array.from({length:4},()=>new T.Vector2());readonly gaps=new T.Vector4();
 pressure=0;wound=0;count=4;lowerClearance=0;focus=0;impact=0;
 private studies:Study[]=[new Enamel(),new BloodTide(),new WoundMouth(),new CrystalLock(),new RibbonSnare(),new LacquerHinge()];private bounds=new T.Box3();
 constructor(){for(const s of this.studies){this.group.add(s.group);s.group.traverse(o=>{if(o instanceof T.Mesh)(o.material as T.Material).transparent=true;});}}
 draw(id:Id,v:number,ms:number,h:number){const p=bitePose(v,ms),b=bites[v];this.group.visible=ms<b.release;this.group.position.set(0,0,h+4);this.pressure=p.pressure;this.wound=p.wound;
  this.focus=(.70+.30*p.grow)*(1-ease(b.hold+50,b.release+150,ms));this.impact=ease(b.hit,b.hit+12,ms)*(1-ease(b.hit+24,b.hit+105,ms));
  this.group.scale.setScalar(id==='VAMP_BUTLER'?.95:.9+rank(id)*.02);
  this.studies.forEach((s,i)=>s.group.visible=i===v);const s=this.studies[v];s.group.position.z=0;s.update(p,ms);s.group.traverse(o=>{if(o instanceof T.Mesh)(o.material as T.Material).opacity=1-ease(.80,1,p.retract);});
  this.group.updateWorldMatrix(true,true);this.bounds.setFromObject(s.group);const lift=Math.max(0,h+3-this.bounds.min.z);s.group.position.z=lift/this.group.scale.z;this.group.updateWorldMatrix(true,true);this.bounds.setFromObject(s.group);this.lowerClearance=this.group.visible?this.bounds.min.z:0;
  this.count=v===4?1:4;
  const contact=v===0?[27,2]:v===3?[7,34]:v===5?[3,42]:[37,7];
  for(let i=0;i<4;i++){this.points[i].set(v===4?0:(i%2?1:-1)*contact[0],v===4?0:(i<2?1:-1)*contact[1]);this.gaps.setComponent(i,p.gap);}
 }
 dispose(){const gs=new Set<T.BufferGeometry>(),ms=new Set<T.Material>();this.group.traverse(o=>{if(o instanceof T.Mesh){gs.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])ms.add(m);}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());this.group.clear();}
}
