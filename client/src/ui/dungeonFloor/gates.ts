import * as T from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {ease} from './choreography';
import type {Palette} from './model';
const V=(x:number,y:number,z:number)=>new T.Vector3(x,y,z);
function add(p:T.Object3D,g:T.BufferGeometry,m:T.Material,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;p.add(o);return o;}
function box(p:T.Object3D,w:number,h:number,d:number,m:T.Material,x=0,y=0,z=0,r=.035){return add(p,new RoundedBoxGeometry(w,h,d,3,Math.min(r,w/4,h/4,d/4)),m,x,y,z);}
function extrude(p:T.Object3D,s:T.Shape,d:number,m:T.Material,z=0){return add(p,new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSize:.023,bevelThickness:.018,bevelSegments:4,curveSegments:48}),m,0,0,z);}
function arc(p:T.Object3D,inner:number,outer:number,a:number,b:number,y:number,d:number,m:T.Material,z=0){const s=new T.Shape(),steps=Math.max(12,Math.ceil((b-a)/(Math.PI*2)*128));for(let j=0;j<=steps;j++){const t=a+(b-a)*j/steps;const x=Math.cos(t)*outer,yy=y+Math.sin(t)*outer;if(j===0)s.moveTo(x,yy);else s.lineTo(x,yy);}for(let j=steps;j>=0;j--){const t=a+(b-a)*j/steps;s.lineTo(Math.cos(t)*inner,y+Math.sin(t)*inner);}s.closePath();return extrude(p,s,d,m,z);}
function tube(p:T.Object3D,points:T.Vector3[],r:number,m:T.Material){return add(p,new T.TubeGeometry(new T.CatmullRomCurve3(points),36,r,10,false),m);}
function bolt(p:T.Object3D,x:number,y:number,z:number,m:T.Material,r=.035){const o=add(p,new T.CylinderGeometry(r,r,.032,16),m,x,y,z);o.rotation.x=Math.PI/2;return o;}
function merge(group:T.Group,except:T.Object3D[]=[]){const bins=new Map<T.Material,T.Mesh[]>();for(const o of [...group.children])if(o instanceof T.Mesh&&!Array.isArray(o.material)&&!except.includes(o)){const a=bins.get(o.material)||[];a.push(o);bins.set(o.material,a);}for(const [mat,parts]of bins){if(parts.length<2)continue;const copies=parts.map(o=>{o.updateMatrix();return(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(o.matrix)}),g=mergeGeometries(copies,false);copies.forEach(g=>g.dispose());if(g){parts.forEach(o=>{group.remove(o);o.geometry.dispose()});add(group,g,mat);}}}
export class Gate{
 root=new T.Group();private assembly=new T.Group();private doors:T.Group[]=[];private lock=new T.Group();private shutter=new T.Group();private pillars:T.Group[]=[];private lintel=new T.Group();private gears:T.Mesh[]=[];private chains:T.Group[]=[];private petals:T.Group[]=[];private rim=new T.Group();private throat:T.Mesh;private floorLips:T.Mesh[]=[];private upper=new T.Plane(V(0,-1,0),3.12);private last={open:0,close:0,retract:0,settled:false};
 constructor(readonly p:Palette,readonly variant:number){this.root.add(this.assembly);const stone=p.stone.clone();stone.color.set(0xb4b09d);stone.bumpScale=.055;const bronze=p.brass.clone();bronze.color.set(0xb5a783);bronze.roughness=.48;const dark=p.iron.clone();dark.color.set(0x242e2c);dark.roughness=.52;const edge=new T.MeshStandardMaterial({color:0xbcb18b,metalness:.76,roughness:.4});const wood=p.wood.clone();wood.color.set(0xc9b79c);wood.bumpScale=.026;const sealMat=new T.MeshStandardMaterial({color:0x070b0d,roughness:1});
 this.throat=add(this.assembly,variant===2?new T.CircleGeometry(1.60,80):new T.PlaneGeometry(2.98,3.2),sealMat,0,variant===2?1.93:1.60,-.5);this.throat.castShadow=false;
 for(const side of [-1,1]){const lip=box(this.root,variant===2?4.6:4.9,.07,.10,dark,0,-.024,side*.16,.014);this.floorLips.push(lip);}
 if(variant===0){
  for(const side of [-1,1]){for(let j=0;j<5;j++){box(this.assembly,.54,.39,.76,stone,side*1.79,.22+j*.39,0,.045);box(this.assembly,.60,.045,.85,bronze,side*1.79,.03+j*.39,.015,.008);}box(this.assembly,.84,.20,1.05,stone,side*1.79,.12,.025,.06);box(this.assembly,.71,.14,.91,stone,side*1.79,1.99,.005,.035);}
  for(let j=0;j<11;j++){arc(this.assembly,1.49,2.04,j*Math.PI/11+.014,(j+1)*Math.PI/11-.014,1.94,.73,stone,-.34);}
  arc(this.assembly,1.43,1.48,0,Math.PI,1.94,.82,bronze,-.38);arc(this.assembly,2.03,2.085,0,Math.PI,1.94,.77,bronze,-.355);
  for(const side of [-1,1]){const hinge=new T.Group();hinge.position.set(side*1.45,.10,.18);this.assembly.add(hinge);this.doors.push(hinge);const shape=new T.Shape();const left=side<0?-1.43:0,right=side<0?0:1.43;shape.moveTo(left-side*1.45,0);shape.lineTo(right-side*1.45,0);for(let j=0;j<=32;j++){const x=right-(right-left)*j/32;shape.lineTo(x-side*1.45,1.84+Math.sqrt(Math.max(0,1.43*1.43-x*x)));}shape.closePath();extrude(hinge,shape,.23,wood,-.10);
   for(let j=0;j<4;j++){const x=-side*(.17+j*.355),top=1.84+Math.sqrt(Math.max(0,1.43*1.43-(x+side*1.45)**2));box(hinge,.013,top-.10,.024,dark,x,top/2,.15,.003);}
   for(const y of [.3,1.03,1.78]){box(hinge,1.44,.12,.06,bronze,-side*.72,y,.155,.02);for(let j=0;j<4;j++)bolt(hinge,-side*(.16+j*.37),y,.206,edge);}
   box(hinge,.095,2.85,.07,bronze,-side*1.39,1.48,.155,.02);
   const ring=add(hinge,new T.TorusGeometry(.15,.025,12,48),bronze,-side*1.15,1.28,.24);ring.rotation.x=.12;bolt(hinge,-side*1.15,1.45,.23,edge,.052);
   for(const y of [.4,1.65,2.3]){const pin=add(hinge,new T.CylinderGeometry(.065,.065,.28,24),dark,0,y,0);pin.rotation.y=.3;}
   for(const sign of [-1,1])tube(hinge,[V(-side*.72,2.11,.15),V(-side*.72+sign*.20,2.27,.15),V(-side*.72+sign*.23,2.48,.15),V(-side*.72,2.63,.15)],.018,bronze);
   merge(hinge);
  }
  this.lock.position.set(0,1.06,.52);box(this.lock,1.2,.14,.12,dark,0,0,0);for(const x of [-.42,.42])box(this.lock,.12,.26,.16,bronze,x,0,.03);this.assembly.add(this.lock);merge(this.lock);
 }else if(variant===1){
  for(const side of [-1,1]){for(let j=0;j<3;j++){const part=new T.Group();part.position.set(side*1.78,j*1.02,0);part.userData.baseY=j*1.02;box(part,.66-j*.07,1.09,.74-j*.06,dark,0,.51,0,.06);box(part,.28,.85,.055,bronze,0,.51,.39-j*.03,.025);for(const y of [.16,.84])bolt(part,0,y,.43-j*.03,edge,.045);this.assembly.add(part);this.pillars.push(part);merge(part);}
   box(this.assembly,.89,.18,.99,stone,side*1.78,.10,0,.05);
   const chain=new T.Group();chain.position.x=side*1.46;for(let j=0;j<24;j++){const link=add(chain,new T.TorusGeometry(.043,.012,8,12),bronze,0,j*.135,.20);link.rotation.y=j%2?Math.PI/2:0;}this.lintel.add(chain);this.chains.push(chain);
  }
  box(this.lintel,4.23,.43,.86,dark,0,0,0,.07);box(this.lintel,4.34,.085,.96,bronze,0,.23,0,.02);for(const side of [-1,1]){const gear=add(this.lintel,new T.TorusGeometry(.22,.06,12,40),bronze,side*1.78,0,.51);this.gears.push(gear);for(let j=0;j<10;j++){const a=j*Math.PI/5;const tooth=box(this.lintel,.065,.095,.05,edge,side*1.78+Math.cos(a)*.28,Math.sin(a)*.28,.53,.009);tooth.rotation.z=a-Math.PI/2;}bolt(this.lintel,side*1.78,0,.56,dark,.12);}this.assembly.add(this.lintel);
  const grateMat=dark.clone(),grateEdge=bronze.clone();grateMat.clippingPlanes=[this.upper];grateEdge.clippingPlanes=[this.upper];
  for(let j=0;j<9;j++){const x=(j-4)*.33;box(this.shutter,.068,2.96,.10,grateMat,x,1.64,.08,.018);const tip=add(this.shutter,new T.ConeGeometry(.078,.26,4),grateEdge,x,.075,.08);tip.rotation.z=Math.PI;}
  for(const y of [.35,1.25,2.28,3.08]){box(this.shutter,2.94,.105,.16,grateMat,0,y,.08,.02);for(let j=0;j<9;j++)bolt(this.shutter,(j-4)*.33,y,.18,grateEdge,.027);}this.assembly.add(this.shutter);merge(this.shutter);merge(this.lintel,this.gears);
 }else{
  this.assembly.add(this.rim);for(const side of [-1,1]){box(this.rim,.55,.39,.89,dark,side*1.56,.19,0,.09);box(this.rim,.60,.07,.94,bronze,side*1.56,.035,0,.024);}
  arc(this.rim,1.60,1.94,0,Math.PI*2,1.93,.44,dark,-.22);for(const r of [1.63,1.86,1.96])add(this.rim,new T.TorusGeometry(r,.035,12,96),bronze,0,1.93,.25);
  for(let j=0;j<16;j++){const a=j*Math.PI/8;bolt(this.rim,Math.cos(a)*1.78,1.93+Math.sin(a)*1.78,.27,edge,.040);}
  for(let j=0;j<8;j++){const a=j*Math.PI/4,spoke=new T.Group();spoke.position.set(0,1.93,0);spoke.rotation.z=a;this.rim.add(spoke);const petal=new T.Group();petal.position.set(0,1.57,.045);spoke.add(petal);this.petals.push(petal);const shape=new T.Shape();shape.moveTo(0,-1.565);for(let k=0;k<=24;k++){const a=-Math.PI/8+.004+(Math.PI/4-.008)*k/24;shape.lineTo(Math.sin(a)*1.60,Math.cos(a)*1.60-1.57);}shape.closePath();extrude(petal,shape,.085,j%2?bronze:dark,-.04);tube(petal,[V(-.49,-.08,.07),V(-.31,-.66,.07),V(.0,-1.46,.07)],.014,edge);const hinge=add(petal,new T.CylinderGeometry(.06,.06,1.08,28),bronze,0,0,.04);hinge.rotation.z=Math.PI/2;for(const x of [-.49,.49])bolt(petal,x,-.10,.10,edge);merge(petal);}
 }
 box(this.assembly,4.45,.20,1.28,stone,0,-.04,.12,.06);box(this.assembly,4.5,.065,1.32,bronze,0,.055,.12,.018);merge(this.assembly);merge(this.rim);
 }
 pose(t:number,n:number,_inspect=false){
 const open=ease(240,800,t);this.root.visible=n>0&&t>0;
 this.assembly.position.set(0,0,0);this.floorLips.forEach(o=>o.visible=false);
 this.doors.forEach((o,i)=>o.rotation.y=(i?1:-1)*open*1.52);
 this.lock.visible=open<.08;this.lock.position.x=ease(140,340,t)*.66;
 this.last={open,close:0,retract:0,settled:false};this.root.updateMatrixWorld(true);
 }
 get state(){return{...this.last,sourceArt:false};}
}
