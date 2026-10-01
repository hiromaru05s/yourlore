import * as T from 'three';import {ease} from '../mimic-four/rig';import type {FamilyId} from './catalog';
const gold=new T.MeshStandardMaterial({color:0xa7833c,metalness:.68,roughness:.34});
const dark=new T.MeshStandardMaterial({color:0x302825,roughness:.83});
const enamel=new T.MeshStandardMaterial({color:0xdfc998,roughness:.44});
const gem=new T.MeshPhysicalMaterial({color:0x162b51,metalness:.28,roughness:.19,clearcoat:.55});
const amber=new T.MeshPhysicalMaterial({color:0xeea225,emissive:0x9b3a00,emissiveIntensity:.3,roughness:.25,metalness:.12,clearcoat:.6});
function mesh(g:T.BufferGeometry,m:T.Material){return new T.Mesh(g,m);}
function rod(a:T.Vector3,b:T.Vector3,r:number,mat:T.Material){const d=b.clone().sub(a),m=mesh(new T.CylinderGeometry(r,r*1.15,d.length(),10),mat);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return m;}
function crown(){
 const g=new T.Group(),s=new T.Shape();s.moveTo(-32,0);s.lineTo(32,0);s.lineTo(34,26);s.lineTo(23,15);s.lineTo(16,29);s.lineTo(8,17);s.lineTo(0,37);s.lineTo(-8,17);s.lineTo(-16,29);s.lineTo(-23,15);s.lineTo(-34,26);s.closePath();
 g.add(mesh(new T.ExtrudeGeometry(s,{depth:5,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:1,bevelThickness:1}),gold));
 for(let i=-2;i<=2;i++){const inset=mesh(new T.OctahedronGeometry(i===0?4.5:3.2),gem);inset.position.set(i*12,8,7);inset.scale.y=1.4;g.add(inset);}
 for(let i=-4;i<=4;i++){const dot=mesh(new T.SphereGeometry(.9,8,6),enamel);dot.position.set(i*7,2,6);g.add(dot);}
 return g;
}
function key(){const g=new T.Group(),ring=mesh(new T.TorusGeometry(6,1.7,8,18),gold);ring.position.y=12;g.add(ring);g.add(rod(new T.Vector3(0,6,0),new T.Vector3(0,-22,0),1.5,gold));for(let i=0;i<2;i++){const bit=mesh(new T.BoxGeometry(6,2.5,3),gold);bit.position.set(3,-15-i*6,0);g.add(bit);}return g;}
function claw(){const g=new T.Group();g.add(rod(new T.Vector3(0,0,0),new T.Vector3(15,-9,0),5,dark));const cuff=mesh(new T.SphereGeometry(5.5,12,8),gold);cuff.position.set(15,-9,0);g.add(cuff);for(let i=-1;i<=1;i++){const curve=new T.CatmullRomCurve3([new T.Vector3(14,-9,i*3),new T.Vector3(24,-13,i*5),new T.Vector3(29,-26,i*4)]);const geometry=new T.TubeGeometry(curve,16,2.6,8,false),pos=geometry.getAttribute('position')as T.BufferAttribute;for(let j=0;j<=16;j++){const p=curve.getPointAt(j/16),f=1-j/16*.96;for(let k=0;k<=8;k++){const ix=j*9+k;pos.setXYZ(ix,p.x+(pos.getX(ix)-p.x)*f,p.y+(pos.getY(ix)-p.y)*f,p.z+(pos.getZ(ix)-p.z)*f);}}geometry.computeVertexNormals();g.add(mesh(geometry,gold));}return g;}
export class Ornaments{
 private root=new T.Group();private crown:T.Group;private keys:T.Group[]=[];private claws:T.Group[]=[];private roots:T.Group[]=[];private tusks:T.Mesh[]=[];
 constructor(scene:T.Scene,private id:FamilyId,private variant:number){
  scene.add(this.root);this.crown=crown();this.root.add(this.crown);this.crown.visible=id==='MIMIC_KING'||id==='MIMIC_KING2';
  if(id==='MIMIC_LORD')for(let i=0;i<3;i++){const k=key();this.root.add(k);this.keys.push(k);}
  if(id==='AWAKENED_MIMIC'||id==='MIMIC_KING'||id==='MIMIC_KING2')for(let i=0;i<4;i++){const k=claw();this.root.add(k);this.claws.push(k);}
  if(id==='MIMIC_KING')for(const sign of [-1,1]){const curve=new T.CatmullRomCurve3([new T.Vector3(0,0,0),new T.Vector3(sign*3,17,5),new T.Vector3(sign*2,37,1)]),g=new T.TubeGeometry(curve,24,7,12,false),pos=g.getAttribute('position')as T.BufferAttribute;for(let i=0;i<=24;i++){const p=curve.getPointAt(i/24);for(let j=0;j<=12;j++){const ix=i*13+j,f=Math.pow(1-i/24,.65);pos.setXYZ(ix,p.x+(pos.getX(ix)-p.x)*f,p.y+(pos.getY(ix)-p.y)*f,p.z+(pos.getZ(ix)-p.z)*f);}}g.computeVertexNormals();const m=mesh(g,enamel);this.root.add(m);this.tusks.push(m);}
  if(id==='ORIGIN_MIMIC')for(let i=0;i<8;i++){
   const group=new T.Group();for(let branch=0;branch<3;branch++){
    const curve=new T.CatmullRomCurve3([new T.Vector3(0,0,0),new T.Vector3(12,-7,branch*2),new T.Vector3(22+branch*3,-25,4),new T.Vector3(34,-44-branch*4,0)]),g=new T.TubeGeometry(curve,24,4-branch,7,false),pos=g.getAttribute('position')as T.BufferAttribute,colors=new Float32Array(pos.count*3);
    for(let j=0;j<pos.count;j++){const u=Math.floor(j/8)/24,p=curve.getPointAt(u),f=(1-u)*(.86+.14*Math.sin(j*1.7));pos.setXYZ(j,p.x+(pos.getX(j)-p.x)*f,p.y+(pos.getY(j)-p.y)*f,p.z+(pos.getZ(j)-p.z)*f);const v=.6+.4*Math.sin(j*2.2)**2;colors.set([v,v*.77,v*.53],j*3);}g.setAttribute('color',new T.BufferAttribute(colors,3));g.computeVertexNormals();group.add(mesh(g,new T.MeshStandardMaterial({color:0x72654e,vertexColors:true,roughness:.87})));
   }
   for(let j=0;j<3;j++){const shard=mesh(new T.OctahedronGeometry(2.5+j*.3),amber);shard.position.set(7+j*9,-j*10,5);shard.scale.y=2;group.add(shard);}this.root.add(group);this.roots.push(group);
  }
 }
 draw(time:number,gap:number,reduced:boolean,spine:T.Vector3[]){
  const spread=ease(590,1030,time)*(1-ease(2150,2440,time)),v=this.variant;this.root.visible=spread>.001;
  if(!this.root.visible)return;
  for(const [i,k]of this.keys.entries()){
   k.scale.setScalar(spread*.75);k.position.set(90+(i-1)*(v===2?22:12)*spread,-(v===3?175:210),20+i);
   k.rotation.z=reduced?0:v===1?(i===1?ease(640,1030,time)*Math.PI*2:Math.sin(time*.006+i)*.2):v===2?(i-1)*.5*spread:Math.sin(time*.007+i*.5)*.55*spread;
  }
  for(const [i,k]of this.claws.entries()){
   const sign=i%2===0?-1:1,stagger=this.id==='AWAKENED_MIMIC'&&v===2?i*90:0,extend=ease(600+stagger,1040+stagger,time)*(1-ease(2180,2420,time));
   k.position.set(sign<0?7:173,-(190+Math.floor(i/2)*49),4);k.scale.set(sign*extend,extend,extend);k.rotation.z=reduced?0:sign*(v===3?Math.sin(time*.008+i)*.3:.12)*extend;
  }
  if(this.id==='MIMIC_KING'){
   this.crown.position.set(90,gap*.54+3,7);this.crown.scale.setScalar(spread*(v===1?1.12:1));this.crown.rotation.y=reduced?0:v===3?Math.sin(time*.004)*.5:Math.sin(time*.003)*.12;this.crown.rotation.z=v===3?Math.sin(time*.004)*.1:0;
   for(const [i,m]of this.tusks.entries()){m.position.set(i===0?22:158,-(140+gap*.46),7);m.scale.setScalar(spread*(v===2?1.3:1));m.rotation.z=(i===0?-1:1)*.12;}
  }
  if(this.id==='MIMIC_KING2'){
   const tip=spine[59],carry=ease(1370,1860,time)*(1-ease(2060,2250,time));
   if(v===1){this.crown.position.copy(tip).lerp(new T.Vector3(90,gap*.54+3,12),carry);this.crown.scale.setScalar(spread*(.55+carry*.5));}
   else if(v===2){this.crown.position.set(90,gap*.54+16+Math.sin(time*.004)*6,12);this.crown.scale.setScalar(spread*1.1);}
   else{this.crown.position.copy(spine[51]);this.crown.position.z+=8;this.crown.scale.setScalar(spread*.62);}
   this.crown.rotation.z=reduced?0:Math.sin(time*.005)*.25;this.crown.rotation.y=reduced?0:Math.sin(time*.004)*.4;
  }
  for(const [i,r]of this.roots.entries()){
   const sign=i%2===0?-1:1,delay=v===3?i*55:v===1?i*25:0,extend=ease(490+delay,1120+delay,time)*(1-ease(2100,2490,time));
   r.position.set(sign<0?4:176,-(157+Math.floor(i/2)*32),-1);r.scale.set(sign*extend*(reduced?.55:1),extend,extend);r.rotation.z=reduced?0:sign*(.14+Math.sin(time*.003-i*.9)*(v===2?.3:.15))*extend;
  }
 }
 dispose(){this.root.traverse(n=>{if(n instanceof T.Mesh){n.geometry.dispose();if(![gold,dark,enamel,gem,amber].includes(n.material as any))(n.material as T.Material).dispose();}});this.root.removeFromParent();}
}
