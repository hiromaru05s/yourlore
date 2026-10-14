import * as T from 'three';
import type { SpiritPose, SpiritForm } from './manaSpirit';
const smooth=(a:number,b:number,t:number)=>{const x=Math.max(0,Math.min(1,(t-a)/(b-a)));return x*x*(3-2*x);};

/** Face timing is unchanged. Limbs lead joy, while soft tips follow a little later. */
export function rabbitGesture(p:SpiritPose,time:number){
 const sleepy=p.mood==='sleepy'?p.elapsed:-1;
 const joy=p.mood==='flutter'?p.elapsed:-1;
 const droop=smooth(.2,1.8,sleepy)*(1-smooth(5.0,6.8,sleepy));
 const flutter=smooth(.15,.75,joy)*(1-smooth(3.25,4.6,joy));
 const happy=p.mood==='happy'?p.elapsed:-1;
 const affection=smooth(.08,.55,happy)*(1-smooth(1.6,2.6,happy));
 const wave=Math.sin(joy*18);
 return {droop,flutter,affection,
  leftHand:.17+flutter*(.46+.65*wave)-droop*.16-affection*.40,
  rightHand:.17+flutter*(.46+.65*Math.sin(joy*18+.16))-droop*.16-affection*.40,
  earLeft:-affection*.11+Math.sin(time*1.45)*.045+Math.sin(time*2.3+.2)*.017+flutter*Math.sin(joy*7-.3)*.115,
  earRight:affection*.08+Math.sin(time*1.45+.6)*.044+Math.sin(time*2.1+1.2)*.015+flutter*Math.sin(joy*7-.65)*.115,
  tipLeft:affection*.10+Math.sin(time*1.45-.65)*.052+flutter*Math.sin(joy*7-1)*.17,
  tipRight:-affection*.08+Math.sin(time*1.45-.05)*.049+flutter*Math.sin(joy*7-1.35)*.17,
 };
}

export function buildMoonRabbit(body:T.Group,pearl:T.Material):SpiritForm{
 const add=(g:T.BufferGeometry,m:T.Material,parent:T.Object3D=body)=>{const o=new T.Mesh(g,m);parent.add(o);return o;};
 const profile=new T.SplineCurve([[0,-.70],[.29,-.66],[.49,-.42],[.55,-.01],[.54,.36],[.38,.65],[0,.76]].map(([x,y])=>new T.Vector2(x,y))).getPoints(100).map(p=>new T.Vector2(Math.max(0,p.x),p.y));
 const shell=add(new T.LatheGeometry(profile,96),pearl);shell.scale.z=.87;
 for(const side of [-1,1]){const foot=add(new T.SphereGeometry(1,40,28),pearl);foot.position.set(side*.22,-.61,0);foot.scale.set(.23,.18,.29);}
 const hand=(side:number)=>{
  const pivot=new T.Group();pivot.position.set(side*.47,-.06,.025);body.add(pivot);
  const palm=add(new T.SphereGeometry(1,40,28),pearl,pivot);palm.position.set(side*.175,-.055,0);palm.scale.set(.245,.135,.11);palm.rotation.z=-side*.32;
  return pivot;
 };
 const left=hand(-1),right=hand(1);
 const earMaterial=new T.MeshPhysicalMaterial({color:0xc9ddda,roughness:.44,metalness:0,clearcoat:.2});
 const ear=(side:number)=>{
  const group=new T.Group();group.name=side<0?'rabbit-ear-left':'rabbit-ear-right';group.position.set(side*.245,.55,-.045);body.add(group);
  const rows=28,cols=20,geometry=new T.BufferGeometry(),inner=new T.BufferGeometry();
  const positions=new Float32Array((rows+1)*(cols+1)*3),normals=new Float32Array(positions.length),indices:number[]=[];
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i;indices.push(a,a+cols+2,a+1,a,a+cols+1,a+cols+2);}
  geometry.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));geometry.setAttribute('normal',new T.BufferAttribute(normals,3).setUsage(T.DynamicDrawUsage));geometry.setIndex(indices);
  const inPositions=new Float32Array((rows+1)*9),inIndices:number[]=[];
  for(let j=0;j<rows;j++)for(let i=0;i<2;i++){const a=j*3+i;inIndices.push(a,a+1,a+4,a,a+4,a+3);}
  inner.setAttribute('position',new T.BufferAttribute(inPositions,3).setUsage(T.DynamicDrawUsage));inner.setIndex(inIndices);
  const outerMesh=add(geometry,pearl,group),innerMesh=add(inner,earMaterial,group);outerMesh.frustumCulled=false;innerMesh.frustumCulled=false;
  const length=.79+(side>0?.018:0);
  const centers:Array<[number,number,number,number]>=[];
  const update=(droop:number,sway:number,tip:number,joy:number)=>{
   let cx=0,cy=0,cz=0;
   for(let j=0;j<=rows;j++){
    const t=j/rows;
    const angle=side*(.09+droop*(.55+1.65*t*t)-joy*.035)+sway+tip*t*t;
    if(j){cx+=Math.sin(angle)*length/rows;cy+=Math.cos(angle)*length/rows;cz+=(droop*.15*t+.018*t)*length/rows;}
    centers[j]=[cx,cy,cz,angle];
    const width=.139*Math.pow(Math.max(0,Math.sin(Math.PI*(.14+.86*t))),.62);
    const depth=width*.53;
    for(let i=0;i<=cols;i++){
     const phi=i/cols*Math.PI*2,xx=width*Math.cos(phi),zz=depth*Math.sin(phi),k=(j*(cols+1)+i)*3;
     positions[k]=cx+Math.cos(angle)*xx;positions[k+1]=cy-Math.sin(angle)*xx;positions[k+2]=cz+zz;
    }
   }
   // Narrow inset follows the same continuous surface; no separate rigid ear pieces.
   for(let j=0;j<=rows;j++){
    const t=.13+j/rows*.74,idx=t*rows,k0=Math.floor(idx),f=idx-k0,a=centers[k0],b=centers[Math.min(rows,k0+1)];
    const x=a[0]+(b[0]-a[0])*f,y=a[1]+(b[1]-a[1])*f,z=a[2]+(b[2]-a[2])*f,angle=a[3]+(b[3]-a[3])*f;
    const w=.139*Math.pow(Math.sin(Math.PI*(.14+.86*t)),.62),narrow=Math.sin(Math.PI*j/rows)*.45;
    for(let i=0;i<3;i++){const u=(i-1)*narrow,xx=w*u,k=(j*3+i)*3;inPositions[k]=x+Math.cos(angle)*xx;inPositions[k+1]=y-Math.sin(angle)*xx;inPositions[k+2]=z+w*.53*Math.sqrt(1-u*u)+.0015;}
   }
   geometry.attributes.position.needsUpdate=true;geometry.computeVertexNormals();inner.attributes.position.needsUpdate=true;inner.computeVertexNormals();
  };
  update(0,0,0,0);return update;
 };
 const leftEar=ear(-1),rightEar=ear(1);
 let state={droop:0,flutter:0,affection:0,leftHand:.17,rightHand:.17,earLeft:0,earRight:0,tipLeft:0,tipRight:0};
 return {left,right,update(p,dt,time){
  const target=rabbitGesture(p,time),blend=dt===0?1:1-Math.exp(-dt*12);
  for(const key of Object.keys(state) as (keyof typeof state)[])state[key]+=(target[key]-state[key])*blend;
  left.rotation.set(state.flutter*Math.sin(p.elapsed*18+.6)*.16,-state.affection*.52,-state.leftHand);
  right.rotation.set(-state.flutter*Math.sin(p.elapsed*18+.76)*.16,state.affection*.52,state.rightHand);
  leftEar(state.droop,state.earLeft,state.tipLeft,state.flutter);rightEar(state.droop,state.earRight,state.tipRight,state.flutter);
  shell.scale.y=1+Math.sin(time*1.8)*.008*(1-state.flutter*.7);
 }};
}
