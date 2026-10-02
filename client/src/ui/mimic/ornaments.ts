import * as T from 'three';import {ease} from './motion';import type {FamilyId} from './selection';
const gold=new T.MeshStandardMaterial({color:0xd9caa4,metalness:.28,roughness:.48,bumpScale:.38});
const loadMetal=()=>new Promise<void>((resolve,reject)=>new T.TextureLoader().load('/art/vfx/mimic-family/engraved-brass.png',texture=>{texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=4;gold.map=texture;gold.bumpMap=texture;gold.needsUpdate=true;resolve();},undefined,reject));
let metalPromise:Promise<void>|undefined;
export const metalReady=()=>metalPromise??=(loadMetal().catch(error=>{metalPromise=undefined;throw error;}));
const dark=new T.MeshStandardMaterial({color:0x302825,roughness:.83});
const enamel=new T.MeshStandardMaterial({color:0xdfc998,roughness:.44});
const gem=new T.MeshPhysicalMaterial({color:0x162b51,metalness:.28,roughness:.19,clearcoat:.55});
function mesh(g:T.BufferGeometry,m:T.Material){return new T.Mesh(g,m);}
function rod(a:T.Vector3,b:T.Vector3,r:number,mat:T.Material){const d=b.clone().sub(a),m=mesh(new T.CylinderGeometry(r,r*1.15,d.length(),10),mat);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return m;}
export function crown(){
 const g=new T.Group(),band=mesh(new T.CylinderGeometry(31,29,13,64,1,true),gold);band.position.y=5;band.scale.z=.56;g.add(band);
 for(const y of [0,11]){const rim=mesh(new T.TorusGeometry(30,1.5,8,64),gold);rim.rotation.x=Math.PI/2;rim.scale.y=.56;rim.position.y=y;g.add(rim);}
 for(let i=0;i<9;i++){
  const theta=i/9*Math.PI*2,petal=new T.Group(),s=new T.Shape();
  s.moveTo(-7,0);s.bezierCurveTo(-8,8,-4,10,-3,13);s.bezierCurveTo(-8,13,-7,20,-3,18);s.quadraticCurveTo(-3,25,0,29);s.quadraticCurveTo(3,25,3,18);s.bezierCurveTo(7,20,8,13,3,13);s.bezierCurveTo(4,10,8,8,7,0);s.closePath();
  const geo=new T.ExtrudeGeometry(s,{depth:2,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.65,bevelThickness:.6});
  const uv=geo.getAttribute('uv')as T.BufferAttribute;for(let j=0;j<uv.count;j++)uv.setXY(j,uv.getX(j)/28+.5,uv.getY(j)/32);
  petal.add(mesh(geo,gold));
  const bezel=mesh(new T.TorusGeometry(3.6,.8,8,18),gold);bezel.position.set(0,7,3);bezel.scale.y=1.3;petal.add(bezel);
  const jewel=mesh(new T.OctahedronGeometry(2.8),gem);jewel.position.set(0,7,3.4);jewel.scale.set(.9,1.3,.7);petal.add(jewel);
  const rib=new T.CatmullRomCurve3([new T.Vector3(0,11,3),new T.Vector3(0,20,3),new T.Vector3(0,27,2)]);petal.add(mesh(new T.TubeGeometry(rib,12,.55,6,false),gold));
  petal.position.set(Math.sin(theta)*30,8,Math.cos(theta)*16.8);petal.rotation.y=theta;g.add(petal);
 }
 for(let i=0;i<24;i++){const a=i/24*Math.PI*2,dot=mesh(new T.SphereGeometry(.85,8,6),enamel);dot.position.set(Math.sin(a)*30,1,Math.cos(a)*17);g.add(dot);}
 return g;
}
function claw(){const g=new T.Group();g.add(rod(new T.Vector3(0,0,0),new T.Vector3(15,-9,0),5,dark));const cuff=mesh(new T.SphereGeometry(5.5,12,8),gold);cuff.position.set(15,-9,0);g.add(cuff);for(let i=-1;i<=1;i++){const curve=new T.CatmullRomCurve3([new T.Vector3(14,-9,i*3),new T.Vector3(24,-13,i*5),new T.Vector3(29,-26,i*4)]);const geometry=new T.TubeGeometry(curve,16,2.6,8,false),pos=geometry.getAttribute('position')as T.BufferAttribute;for(let j=0;j<=16;j++){const p=curve.getPointAt(j/16),f=1-j/16*.96;for(let k=0;k<=8;k++){const ix=j*9+k;pos.setXYZ(ix,p.x+(pos.getX(ix)-p.x)*f,p.y+(pos.getY(ix)-p.y)*f,p.z+(pos.getZ(ix)-p.z)*f);}}geometry.computeVertexNormals();g.add(mesh(geometry,gold));}return g;}
export class Ornaments {
 private root=new T.Group();private claws:T.Group[]=[];
 constructor(scene:T.Scene,id:FamilyId,_variant:number){
  scene.add(this.root);
  // The approved leader has no keys. Only awakened mimic has claws.
  if(id==='AWAKENED_MIMIC')for(let i=0;i<4;i++){const k=claw();this.root.add(k);this.claws.push(k);}
 }
 draw(time:number,_gap:number,reduced:boolean,_spine:T.Vector3[]){
  const spread=ease(590,1030,time)*(1-ease(2150,2440,time));this.root.visible=spread>.001;
  if(!this.root.visible)return;
  for(const [i,k]of this.claws.entries()){
   const sign=i%2===0?-1:1,extend=ease(600,1040,time)*(1-ease(2180,2420,time));
   k.position.set(sign<0?7:173,-(190+Math.floor(i/2)*49),4);k.scale.set(sign*extend,extend,extend);k.rotation.z=reduced?0:sign*.12*extend;
  }
 }
 dispose(){this.root.traverse(n=>{if(n instanceof T.Mesh)n.geometry.dispose();});this.root.removeFromParent();}
}
