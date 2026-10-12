import * as T from 'three';
import {ease,rank,DENTAL_ROOT_EDGE,type Id} from './catalog';

export const bites=[
 {hit:1080,hold:1210,release:1590,snap:100},
 {hit:1190,hold:1310,release:1730,snap:135},
 {hit:1100,hold:1260,release:1630,snap:95},
 {hit:1050,hold:1190,release:1580,snap:105},
 {hit:1150,hold:1240,release:1620,snap:85},
 {hit:1250,hold:1370,release:1780,snap:130},
];
export function bitePose(v:number,ms:number){
 const b=bites[v],grow=ease(0,650,ms),u=T.MathUtils.clamp((ms-b.hit+b.snap)/b.snap,0,1),close=u*u*u;
 const retract=ease(b.hold,b.release,ms),pressure=ease(b.hit,b.hit+22,ms)*(1-ease(b.hold+30,b.release,ms));
 return {grow,close,open:0,pressure,wound:ease(b.hit,b.hit+40,ms)*(1-ease(1750,2110,ms)),retract,gap:52*(1-close),yaw:0,slide:0,hit:b.hit};
}
type Pose=ReturnType<typeof bitePose>;
function enamel(color=0xbc1630,roughness=.28){return new T.MeshPhysicalMaterial({color,roughness,metalness:.06,clearcoat:.24,clearcoatRoughness:.23,envMapIntensity:.34,specularColor:0xffabb4,specularIntensity:.48,vertexColors:true,emissive:0x300007,emissiveIntensity:.12});}
function solid(g:T.BufferGeometry,m:T.Material){const o=new T.Mesh(g,m);o.castShadow=true;o.receiveShadow=true;return o;}
function geometry(p:number[],idx:number[],color:number[]){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('color',new T.Float32BufferAttribute(color,3));g.setIndex(idx);g.computeVertexNormals();return g;}
// Anatomical construction shared as a modelling primitive, not a six-preset rig:
// rounded cervical shoulder, oval volume, a concave inner edge and convex outer edge.
// The tip follows a curved centreline; neither its silhouette nor its section is a triangle.
function fang(length:number,radius:number,bend:number,depth=.86){
 const p:number[]=[],idx:number[]=[],colors:number[]=[],N=56,S=28;
 for(let i=0;i<=N;i++){
  const u=i/N,cx=bend*u*u*u,cy=-length*u,dx=3*bend*u*u,inv=1/Math.hypot(length,dx),nx=length*inv,ny=dx*inv;
  const shoulder=.78+.28*Math.sin(Math.PI*Math.min(1,u*2.4));
  const r=radius*shoulder*Math.pow(1-u,.70);
  for(let j=0;j<=S;j++){
   const a=j/S*Math.PI*2,flute=1+.035*Math.cos(a*3)*Math.sin(Math.PI*u),rr=r*Math.cos(a);
   p.push(cx+nx*rr,cy+ny*rr,Math.sin(Math.PI*u)*3+r*depth*Math.sin(a)*flute);
   const cervical=.35+.65*ease(0,.38,u),ridge=.88+.12*Math.sin(a),striations=1-.018*Math.cos(a*19+u*6);
   colors.push(cervical*ridge*striations,cervical*.90*ridge,cervical*.92*ridge);
   if(i<N&&j<S){const k=i*(S+1)+j;idx.push(k,k+1,k+S+1,k+1,k+S+2,k+S+1);}
  }
 }
 const cap=p.length/3;p.push(0,0,0);colors.push(.25,.20,.22);for(let j=0;j<S;j++)idx.push(cap,j+1,j);
 return geometry(p,idx,colors);
}
function incisor(length:number,width:number){
 const p:number[]=[],idx:number[]=[],colors:number[]=[],N=24,S=28;
 // A rounded rectangular crown with a thin, broad cutting edge. It has no
 // pinched waist and cannot be mistaken for a miniature canine or a bead.
 for(let i=0;i<=N;i++){const u=i/N,w=width*(.72+.28*Math.sin(Math.PI*u*.82)),d=width*(.52-.37*ease(.5,1,u));
  for(let j=0;j<=S;j++){const a=j/S*Math.PI*2,c=Math.cos(a),s=Math.sin(a);p.push(Math.sign(c)*Math.pow(Math.abs(c),.65)*w,-length*u,Math.sign(s)*Math.pow(Math.abs(s),.7)*d);const shade=.45+.55*ease(0,.38,u);colors.push(shade,shade*.9,shade*.92);if(i<N&&j<S){const k=i*(S+1)+j;idx.push(k,k+1,k+S+1,k+1,k+S+2,k+S+1);}}
 }
 for(const end of [0,N]){const cap=p.length/3;p.push(0,-length*end/N,0);colors.push(.7,.63,.65);for(let j=0;j<S;j++){const a=end*(S+1)+j;idx.push(cap,end===0?a+1:a,end===0?a:a+1);}}
 return geometry(p,idx,colors);
}
function bloodRoot(points:T.Vector3[],radius=3){const m=new T.MeshPhysicalMaterial({color:0x510010,roughness:.42,clearcoat:.15,envMapIntensity:.1});return solid(new T.TubeGeometry(new T.CatmullRomCurve3(points),40,radius,10),m);}
function rootSpot(x:number,y:number,sx:number,sy:number){const o=solid(new T.SphereGeometry(1,32,16),new T.MeshStandardMaterial({color:0x610014,roughness:.65,envMapIntensity:0}));o.position.set(x,y,2);o.scale.set(sx,sy,2);return o;}
type Contact={mesh:T.Object3D;tip:T.Vector3};
abstract class Study{readonly group=new T.Group();readonly contacts:Contact[]=[];abstract update(p:Pose,t:number):void;
 protected tooth(parent:T.Group,length:number,width:number,bend:number,material:T.Material,x:number,y:number,z=16,rotation=0,contact=true){const mesh=solid(fang(length,width,bend),material);mesh.position.set(x,y,z);mesh.rotation.z=rotation;parent.add(mesh);if(contact)this.contacts.push({mesh,tip:new T.Vector3(bend,-length,0)});return mesh;}
}
// 01: an exposed curved dental arch. Small incisors make the two long upper
// canines unmistakable; the lower arch provides the opposing bite.
class DentalArch extends Study{
 private upper=new T.Group();private lower=new T.Group();
 constructor(){super();const m=enamel();this.group.add(this.upper,this.lower);
  for(const s of [-1,1]){this.tooth(this.upper,83,15,-s*15,m,s*43,3,17);this.tooth(this.lower,55,12,s*8,m,s*33,-4,13,Math.PI);}
  for(const row of [this.upper,this.lower]){const sign=row===this.upper?1:-1;
   for(const x of [-69,-12,12,69]){const small=solid(incisor(Math.abs(x)>60?25:29,Math.abs(x)>60?8:9),m);small.position.set(x,-Math.pow(x/70,2)*10*sign,13);small.rotation.z=sign===1?0:Math.PI;row.add(small);}
   row.add(bloodRoot([new T.Vector3(-76,-14*sign,6),new T.Vector3(-42,4*sign,6),new T.Vector3(0,8*sign,6),new T.Vector3(42,4*sign,6),new T.Vector3(76,-14*sign,6)],3.5));
  }
 }
 update(p:Pose){const g=.025+.975*p.grow;this.upper.rotation.x=-.10*(1-p.close);this.lower.rotation.x=.34*(1-p.close)*p.grow;
  for(const row of [this.upper,this.lower]){const sign=row===this.upper?1:-1;row.scale.set(g,1-p.retract*.23,g*(1-p.retract));
   // Anchor the centre of the curved root to the actual frame, accounting for
   // the hinge rotation. The one inward bite retains its existing end pose.
   const openY=sign*DENTAL_ROOT_EDGE-sign*8*Math.cos(row.rotation.x)+6*g*Math.sin(row.rotation.x);
   row.position.y=T.MathUtils.lerp(openY,sign===1?83:-48,p.close);
  }}
}
// 02: actual separate teeth condense from four small roots. The curved solid
// crowns become rigid before contact; the roots stretch back into liquid afterward.
class LiquidCanines extends Study{
 private teeth:{mesh:T.Mesh;base:Float32Array;sign:number;top:boolean}[]=[];private spots:T.Mesh[]=[];
 constructor(){super();const m=enamel(0xca142d,.19);for(const top of [true,false])for(const sign of [-1,1]){
  const len=top?116:44,mesh=this.tooth(this.group,len,top?20:11,-sign*(top?25:8),m,sign*(top?46:28),top?106:-38,18,top?0:Math.PI);
  this.teeth.push({mesh,base:new Float32Array(mesh.geometry.getAttribute('position').array),sign,top});const spot=rootSpot(sign*(top?46:28),top?106:-38,top?21:12,9);this.group.add(spot);this.spots.push(spot);
 }}
 update(p:Pose,t:number){this.teeth.forEach(({mesh,base,sign,top})=>{const growth=ease(top?0:.16,top?.86:1,p.grow),a=mesh.geometry.getAttribute('position') as T.BufferAttribute;
  for(let i=0;i<a.count;i++){const x=base[i*3],y=base[i*3+1],z=base[i*3+2],u=Math.min(1,Math.abs(y)/(top?116:44)),wobble=Math.sin(u*7+t*.008)*.04*(1-ease(.6,1,p.grow));a.setXYZ(i,x*(.05+.95*growth)*(1+wobble),y*(.08+.92*growth)*(1-p.retract*.63),z*(.06+.94*growth)*(1-p.retract));}a.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.position.y=(top?106:-38)+(top?1:-1)*29*(1-p.close);mesh.position.x=sign*(top?46:28);mesh.position.z=18+9*(1-p.close)*growth;});
  this.spots.forEach((s,i)=>{s.scale.z=2+2*(1-p.grow);s.position.y=(i<2?106:-38)+(i<2?1:-1)*29*(1-p.close);s.scale.y=9*(1-p.retract*.6);});}
}
// 03: a volumetric mouth behind separate teeth, without a logo-shaped red rim.
class RecessedMouth extends Study{
 private throat:T.Mesh;private upper=new T.Group();private lower=new T.Group();
 constructor(){super();this.throat=solid(new T.SphereGeometry(1,48,24),new T.MeshBasicMaterial({color:0x110008}));this.group.add(this.throat,this.upper,this.lower);const m=enamel(0xa9132e,.31);
  for(const s of [-1,1]){this.tooth(this.upper,68,17,-s*17,m,s*43,0,23);this.tooth(this.lower,51,13,s*9,m,s*27,0,18,Math.PI);}
  for(const row of [this.upper,this.lower])for(const x of [-68,-12,12,68]){const o=solid(incisor(Math.abs(x)>60?20:24,7),m);o.position.set(x,0,10);o.rotation.z=row===this.upper?0:Math.PI;row.add(o);}
 }
 update(p:Pose){const mouth=(.05+.95*p.grow)*(1-.97*p.close)*(1-p.retract);this.throat.scale.set(83*(.5+.5*p.grow),74*mouth,3+4*mouth);this.throat.position.z=4;
  this.upper.position.y=66+20*(1-p.close);this.lower.position.y=-49-18*(1-p.close);for(const row of [this.upper,this.lower]){row.scale.setScalar(.08+.92*p.grow);row.scale.z*=1-p.retract;row.position.z=-14*p.retract;}this.upper.rotation.x=-.24*(1-p.close);this.lower.rotation.x=.18*(1-p.close);}
}
// 04: a lateral pincer made of two strongly recurved canines, not crystal shards.
class HookFangs extends Study{
 private teeth:T.Mesh[]=[];
 constructor(){super();const m=enamel(0xaa1430,.26);for(const s of [-1,1]){
  const mesh=this.tooth(this.group,108,24,31,m,s*104,s*24,22,s<0?Math.PI/2:-Math.PI/2);this.teeth.push(mesh);
 }}
 update(p:Pose){this.teeth.forEach((m,i)=>{const s=i===0?-1:1;m.position.set(s*(104+27*(1-p.close)),s*24,22+8*(1-p.close));m.rotation.z=(s<0?Math.PI/2:-Math.PI/2)+s*.22*(1-p.close);m.rotation.y=s*.22*p.grow*(1-p.close);m.scale.set(.02+.98*p.grow,1-p.retract*.25,(.02+.98*p.grow)*(1-p.retract));});}
}
// 05: two long upper fangs fold out in depth and puncture in one downward strike.
// The absence of a lower tooth row is deliberate: this is a two-puncture bite.
class PiercingFangs extends Study{
 private hinges:T.Group[]=[];
 constructor(){super();const m=enamel(0xc01430,.24);for(const s of [-1,1]){const h=new T.Group();h.position.set(s*32,91,4);this.group.add(h);this.hinges.push(h);this.tooth(h,108,17,-s*11,m,0,0,13);const socket=rootSpot(0,0,15,11);h.add(socket);}}
 update(p:Pose){this.hinges.forEach(h=>{h.rotation.x=.13*p.close-.82*(1-p.close)*p.grow;h.position.z=31*(1-p.close)*p.grow;h.scale.set(.015+.985*p.grow,1-p.retract*.10,(.015+.985*p.grow)*(1-p.retract));});}
}
// 06: the dental arches grow at the card's long edges and fold around the card.
// Rounded independent teeth replace the old broad lacquer wing/insignia plates.
class EnclosingJaw extends Study{
 private hinges:T.Group[]=[];
 constructor(){super();const m=enamel(0x9f1430,.3);for(const s of [-1,1]){const h=new T.Group();h.position.x=s*85;h.rotation.z=s<0?Math.PI/2:-Math.PI/2;this.group.add(h);this.hinges.push(h);
   for(const x of [-48,48])this.tooth(h,91,18,-Math.sign(x)*12,m,x,0,15);
   for(const x of [-22,0,22]){const o=solid(incisor(30,8),m);o.position.set(x,0,12);h.add(o);}
   h.add(bloodRoot([new T.Vector3(-63,-5,5),new T.Vector3(-45,4,6),new T.Vector3(0,8,5),new T.Vector3(45,4,6),new T.Vector3(63,-5,5)],3));
  }}
 update(p:Pose){this.hinges.forEach((h,i)=>{const s=i===0?-1:1;h.position.x=s*(85+7*(1-p.close));h.rotation.x=-.66*(1-p.close)*p.grow;h.scale.set(.04+.96*p.grow,1-p.retract*.22,(.04+.96*p.grow)*(1-p.retract));});}
}
export class BiteRig{
 readonly group=new T.Group();readonly ready=Promise.resolve();readonly points=Array.from({length:4},()=>new T.Vector2());readonly gaps=new T.Vector4();
 pressure=0;wound=0;count=4;lowerClearance=0;focus=0;impact=0;
 private studies:Study[]=[new DentalArch(),new LiquidCanines(),new RecessedMouth(),new HookFangs(),new PiercingFangs(),new EnclosingJaw()];private bounds=new T.Box3();private tip=new T.Vector3();private anchors:T.Vector2[][]=[];
 constructor(){for(const [i,s] of this.studies.entries()){this.group.add(s.group);s.group.traverse(o=>{if(o instanceof T.Mesh)(o.material as T.Material).transparent=true;});s.update(bitePose(i,bites[i].hit+30),bites[i].hit+30);this.group.updateWorldMatrix(true,true);this.anchors.push(s.contacts.map(c=>{const t=c.mesh.localToWorld(c.tip.clone());return new T.Vector2(t.x,t.y);}));}}
 draw(id:Id,v:number,ms:number,h:number){const p=bitePose(v,ms),b=bites[v];this.group.visible=ms<b.release;this.group.position.set(0,0,h+4);this.pressure=p.pressure;this.wound=p.wound;
  this.focus=(.70+.30*p.grow)*(1-ease(b.hold+50,b.release+150,ms));this.impact=ease(b.hit,b.hit+12,ms)*(1-ease(b.hit+24,b.hit+105,ms));this.group.scale.setScalar(v===0?1:id==='VAMP_BUTLER'?.95:.9+rank(id)*.02);
  this.studies.forEach((s,i)=>s.group.visible=i===v);const s=this.studies[v];s.group.position.z=0;s.update(p,ms);s.group.traverse(o=>{if(o instanceof T.Mesh)(o.material as T.Material).opacity=1-ease(.80,1,p.retract);});
  this.group.updateWorldMatrix(true,true);this.bounds.setFromObject(s.group);const lift=Math.max(0,h+3-this.bounds.min.z);s.group.position.z=lift/this.group.scale.z;this.group.updateWorldMatrix(true,true);this.bounds.setFromObject(s.group);this.lowerClearance=this.group.visible?this.bounds.min.z:0;
  this.count=Math.min(4,s.contacts.length);for(let i=0;i<4;i++){const c=s.contacts[Math.min(i,s.contacts.length-1)];this.tip.copy(c.tip);c.mesh.localToWorld(this.tip);if(ms>=b.hit)this.points[i].copy(this.anchors[v][Math.min(i,s.contacts.length-1)]).multiplyScalar(this.group.scale.x);else this.points[i].set(this.tip.x,this.tip.y);this.gaps.setComponent(i,p.gap);}
 }
 dispose(){const gs=new Set<T.BufferGeometry>(),ms=new Set<T.Material>();this.group.traverse(o=>{if(o instanceof T.Mesh){gs.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])ms.add(m);}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());this.group.clear();}
}
