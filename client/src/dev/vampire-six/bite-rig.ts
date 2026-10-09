import * as T from 'three';
import {ease,rank,type Id} from './catalog';

export const bites=[
 {hit:1120,hold:1240,release:1520},
 {hit:1260,hold:1430,release:1660},
 {hit:1100,hold:1410,release:1630},
 {hit:1050,hold:1700,release:1910},
 {hit:1390,hold:1520,release:1790},
 {hit:1420,hold:1630,release:1910},
];
export function bitePose(v:number,ms:number){
 const b=bites[v],grow=ease(280,760,ms),close=ease(b.hit-170,b.hit,ms),open=ease(b.hold,b.release,ms);
 const pressure=ease(b.hit,b.hit+32,ms)*(1-open),wound=ease(b.hit,b.hit+60,ms)*(1-ease(2370,3030,ms));
 const retract=ease(b.release,b.release+300,ms),gap=(1-close)*48*ease(330,850,ms)+open*30;
 const yaw=v===2?-.52+ease(700,b.hit,ms)*.20:v===5?.12:0;
 const slide=v===2?ease(b.hit,b.hold,ms)*26:0;
 return {grow,close,open,pressure,wound,retract,gap,yaw,slide,hit:b.hit};
}

// Smooth elliptical canine with a curved body, a closed root, and a true pointed tip.
// Generated geometry and physical shading only: no billboard or generated texture.
function canine(length:number,radius:number,curve:number){
 const pos:number[]=[],col:number[]=[],indices:number[]=[],rings=40,sides=28;
 for(let i=0;i<=rings;i++){
  const u=i/rings,rad=radius*Math.pow(1-u,.77)*(.10+.90*ease(0,.11,u));
  const y=curve*(1-u)*(1-u)-Math.sin(u*Math.PI)*5,z=length*(1-u);
  for(let j=0;j<=sides;j++){
   const a=j/sides*Math.PI*2,groove=1+.018*Math.sin(a*9+u*5)*Math.sin(u*Math.PI);
   pos.push(Math.cos(a)*rad*groove,y+Math.sin(a)*rad*.70*groove,z);
   const root=ease(0,.42,u),grain=.985+.015*Math.sin(a*21+u*71);
   col.push((.64+.34*root)*grain,(.49+.47*root)*grain,(.34+.53*root)*grain);
   if(i<rings&&j<sides){const n=i*(sides+1)+j;indices.push(n,n+sides+1,n+1,n+1,n+sides+1,n+sides+2);}
  }
 }
 const root=pos.length/3;pos.push(0,curve,length);col.push(.6,.44,.3);
 for(let j=0;j<sides;j++)indices.push(root,j,j+1);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
function tube(points:number[][],radius:number,mat:T.Material){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p as [number,number,number])));return new T.Mesh(new T.TubeGeometry(curve,48,radius,12,false),mat);}

export class BiteRig{
 readonly group=new T.Group();readonly ready=Promise.resolve();
 readonly points=Array.from({length:4},()=>new T.Vector2());
 readonly gaps=new T.Vector4();pressure=0;wound=0;count=2;lowerClearance=0;private lowerBounds=new T.Box3();
 private ivory=new T.MeshPhysicalMaterial({color:0xd8c5a5,envMapIntensity:.7,vertexColors:true,roughness:.26,metalness:0,clearcoat:.4,clearcoatRoughness:.17});
 private blood=new T.MeshPhysicalMaterial({color:0x650515,roughness:.2,metalness:.08,clearcoat:1,clearcoatRoughness:.13});
 private gum=new T.MeshPhysicalMaterial({color:0x2a0b14,roughness:.42,metalness:0,clearcoat:.28});
 private obsidian=new T.MeshPhysicalMaterial({color:0x170e19,roughness:.3,metalness:.30,clearcoat:.45});
 private silver=new T.MeshStandardMaterial({color:0xa99ca4,metalness:.88,roughness:.25});
 private glass=new T.MeshPhysicalMaterial({color:0x990a20,vertexColors:true,roughness:.13,metalness:.1,clearcoat:1,ior:1.48});
 private upper=new T.Group();private lower=new T.Group();private arch=new T.Group();private lowerArch=new T.Group();
 private fangs:T.Mesh[]=[];private lowerFangs:T.Mesh[]=[];private small:T.Mesh[]=[];private bloodBeads:T.Mesh[]=[];
 private liquidGeometry:T.BufferGeometry;private liquidBase:Float32Array;
 private threads:T.Mesh[]=[];private threadGeo:T.CylinderGeometry;
 constructor(){
  this.group.add(this.upper,this.lower);this.upper.add(this.arch);this.lower.add(this.lowerArch);
  const shape=canine(76,13,24),short=canine(34,8,12);this.liquidGeometry=shape.clone();this.liquidBase=new Float32Array(shape.getAttribute('position').array);
  for(let i=0;i<4;i++){const m=new T.Mesh(shape,this.ivory);m.castShadow=true;m.userData.solid=shape;this.upper.add(m);this.fangs.push(m);const l=new T.Mesh(short,this.ivory);l.rotation.x=Math.PI;l.castShadow=true;this.lower.add(l);this.lowerFangs.push(l);}
  const upperPoints=[[-71,5,43],[-57,29,59],[-34,43,69],[0,50,73],[34,43,69],[57,29,59],[71,5,43]];
  this.arch.add(tube(upperPoints,7,this.gum));
  this.arch.add(tube(upperPoints.map(([x,y,z])=>[x,y+3,z+3]),1.1,this.obsidian));
  const lowerPoints=[[-64,-8,-13],[-42,-28,-26],[0,-40,-31],[42,-28,-26],[64,-8,-13]];
  this.lowerArch.add(tube(lowerPoints,5,this.obsidian));
  for(const x of [-17,-5.5,5.5,17]){const m=new T.Mesh(canine(24,6,5),this.ivory);m.position.set(x,39,43);m.castShadow=true;this.arch.add(m);this.small.push(m);}
  for(let i=0;i<4;i++){const bead=new T.Mesh(new T.SphereGeometry(1,20,14),this.blood);this.group.add(bead);this.bloodBeads.push(bead);}
  // Reusable segmented cylinders follow the contact-to-fang path during suction.
  this.threadGeo=new T.CylinderGeometry(1,1,1,8,1);
  for(let i=0;i<32;i++){const m=new T.Mesh(this.threadGeo,this.blood);this.group.add(m);this.threads.push(m);}
 }
 draw(id:Id,v:number,ms:number,h:number){
  const p=bitePose(v,ms),royal=v===5,full=v===1||royal,liquid=v===4;
  this.group.visible=ms>280&&ms<2260;this.group.position.z=h+2;
  this.pressure=p.pressure;this.wound=p.wound;this.count=royal?4:2;
  const yOffset=full?-112:0;
  const life=p.grow*(1-p.retract),scale=(id==='VAMP_BUTLER'?.82:.76+rank(id)*.075);
  this.upper.position.set(0,yOffset,p.gap*(1-p.retract)-p.pressure*2);this.upper.rotation.z=p.yaw;this.upper.rotation.x=full?-.20*(1-p.close+p.open):0;
  this.lower.position.set(0,yOffset,-Math.min(17,p.gap*.38)*(1-p.retract));this.lower.rotation.z=p.yaw;this.lower.rotation.x=full?.24*(1-p.close+p.open):0;
  this.upper.scale.set(1,1,scale);this.lower.scale.set(1,1,scale);
  this.arch.visible=full;this.lowerArch.visible=full;
  this.arch.scale.setScalar(Math.max(.001,life));this.lowerArch.scale.setScalar(Math.max(.001,life));
  const attackLean=(1-p.close)*.18*(1-p.retract),fadeSize=Math.max(.001,life);
  for(let i=0;i<4;i++){
   const side=i%2?1:-1,outer=i>=2,x=side*(royal?(outer?58:24):34),y=(royal?(outer?4:31):24)-p.slide;
   const fang=this.fangs[i];fang.visible=i<this.count;
   fang.position.set(x,y,0);fang.rotation.set(-attackLean*(v===3?.4:1),side*attackLean*.55,0);
   fang.scale.set(fadeSize*(royal&&outer?.8:1),fadeSize,fadeSize*(royal&&outer?.75:1));
   fang.material=liquid?this.glass:this.ivory;if(liquid)fang.geometry=this.liquidGeometry;else fang.geometry=this.fangs[0].userData.solid;
   const xx=x*Math.cos(p.yaw)-y*Math.sin(p.yaw),yy=x*Math.sin(p.yaw)+y*Math.cos(p.yaw)+yOffset;
   this.points[i].set(xx,yy);this.gaps.setComponent(i,this.upper.position.z);
   const low=this.lowerFangs[i];low.visible=full&&i<2;low.position.set(side*29,-18,0);low.scale.setScalar(fadeSize*.9);
   const bead=this.bloodBeads[i];bead.visible=i<this.count&&p.wound>.001;
   const wet=p.wound*(1-ease(1950,2360,ms));bead.position.set(xx,yy,.8);bead.scale.set(4.2*wet,5.6*wet,1.4*wet);
  }
  if(liquid){const attr=this.liquidGeometry.getAttribute('position') as T.BufferAttribute,soft=1-ease(850,1190,ms);for(let i=0;i<attr.count;i++){const x=this.liquidBase[i*3],y=this.liquidBase[i*3+1],z=this.liquidBase[i*3+2],wave=Math.sin(z*.19-ms*.009)*soft;attr.setXYZ(i,x*(1+wave*.23),y+wave*2.5*Math.sin(z/76*Math.PI),z);}attr.needsUpdate=true;this.liquidGeometry.computeVertexNormals();}
  this.lowerClearance=0;if(full&&this.group.visible&&life>.001){this.lower.updateWorldMatrix(true,true);this.lowerBounds.setFromObject(this.lower);const lift=Math.max(0,.4-this.lowerBounds.min.z);this.lower.position.z+=lift;this.lowerClearance=this.lowerBounds.min.z+lift;}
  this.glass.color.setRGB(.36+ease(650,1100,ms)*.2,.012,.026);this.glass.roughness=.11+ease(800,1200,ms)*.12;
  this.blood.color.set(id==='VAMP_BUTLER'?0x550f20:0x720416);
  // A gradual silhouette collapse returns the jaw into its contact marks.
  this.arch.children.forEach(o=>{if(o instanceof T.Mesh)o.material=royal?(o.geometry instanceof T.TubeGeometry?this.obsidian:this.ivory):(o.geometry instanceof T.TubeGeometry?this.gum:this.ivory);});
  const suction=v===3?ease(p.hit+80,p.hit+210,ms)*(1-ease(1730,1930,ms)):liquid?ease(340,650,ms)*(1-ease(900,1250,ms)):0;
  const upAxis=new T.Vector3(0,1,0);
  for(let k=0;k<32;k++){
   const m=this.threads[k],strand=Math.floor(k/8),seg=k%8,side=strand%2?1:-1,offset=strand>=2?1:0;
   m.visible=suction>.001;if(!m.visible)continue;
   const contact=this.points[strand%2];
   const point=(u:number)=>new T.Vector3(contact.x+side*Math.sin(u*Math.PI)*(8+offset*5)*suction,contact.y+Math.sin(u*5-ms*.003+offset)*3*suction,-p.pressure*2+u*(p.gap*(1-p.retract)+48*life*scale));
   const a=point(seg/8),b=point((seg+1)/8),d=b.clone().sub(a);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(upAxis,d.clone().normalize());m.scale.set(.95*suction*(1-seg*.08),d.length(),.95*suction*(1-seg*.08));
  }
 }
 dispose(){const geometries=new Set<T.BufferGeometry>();this.group.traverse(o=>{if(o instanceof T.Mesh)geometries.add(o.geometry);});geometries.add(this.liquidGeometry);geometries.add(this.fangs[0].userData.solid);geometries.forEach(g=>g.dispose());[this.ivory,this.blood,this.gum,this.obsidian,this.silver,this.glass].forEach(m=>m.dispose());this.group.clear();}
}
