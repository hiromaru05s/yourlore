import * as T from 'three';
import {enamel,solid,incisor,bloodRoot,rootSpot,Study,DentalArch} from '../../ui/vampireSummon/geometry';
import {BITE,pose} from '../../ui/vampireSummon/catalog';
import {ease,rank,type Id} from './catalog';

export const bites=[
 BITE,
 {hit:1190,hold:1310,release:1730,snap:135},
 {hit:1100,hold:1260,release:1630,snap:95},
 {hit:1050,hold:1190,release:1580,snap:105},
 {hit:1150,hold:1240,release:1620,snap:85},
 {hit:1250,hold:1370,release:1780,snap:130},
];
export function bitePose(v:number,ms:number){
 if(v===0)return pose(ms);
 const b=bites[v],grow=ease(0,650,ms),u=T.MathUtils.clamp((ms-b.hit+b.snap)/b.snap,0,1),close=u*u*u;
 const retract=ease(b.hold,b.release,ms),pressure=ease(b.hit,b.hit+22,ms)*(1-ease(b.hold+30,b.release,ms));
 return {grow,close,open:0,pressure,wound:ease(b.hit,b.hit+40,ms)*(1-ease(1750,2110,ms)),retract,gap:52*(1-close),yaw:0,slide:0,hit:b.hit};
}
type Pose=ReturnType<typeof bitePose>;
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
