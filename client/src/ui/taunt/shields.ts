import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {pulse} from './timing';

type Point=[number,number];
export type ShieldRig={left:T.Group;right:T.Group;boss:T.Group};
/** The approved 01 clock. Every design, including the frozen reference, uses this verbatim. */
export function moveShield(r:ShieldRig,t:number){
 const open=pulse(80,390,670,960,t),hold=pulse(20,180,800,1000,t);
 for(const [sign,rig]of [[-1,r.left],[1,r.right]] as const){
  rig.position.set(sign*78*(1-open),26+86*(1-open),4+open*40);
  rig.rotation.set(.05*open,sign*(1-open)*1.48,sign*.06*(1-open));
  rig.scale.setScalar(.08+.92*hold);
 }
 r.boss.position.set(0,26,71);r.boss.scale.setScalar(pulse(280,420,650,870,t));
}
const curve=(x:number,y:number)=>13*(1-Math.min(1,Math.abs(x)/68)**1.4)*(1-.38*(y/85)**2);
const scaled=(p:Point[],s:number):Point[]=>p.map(([x,y])=>[x*s,y*s]);
function mesh(g:T.BufferGeometry,m:T.Material,parent:T.Group,x=0,y=0,z=0){const a=new T.Mesh(g,m);a.position.set(x,y,z);a.castShadow=a.receiveShadow=true;parent.add(a);return a;}

/** Curved solid plate: dense radial tessellation, rolled bevel, closed back and sidewall.
 * Unlike bending the vertices of a single polygon, this keeps reflections continuous across its face. */
function plate(p:Point[],z:number,depth:number,bevel=1.1){
 const cx=p.reduce((s,v)=>s+v[0],0)/p.length,cy=p.reduce((s,v)=>s+v[1],0)/p.length;
 const edge:Point[]=[];for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],n=Math.max(2,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/5));for(let j=0;j<n;j++)edge.push([a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n]);}
 // All front triangles face +Z; sign mirroring happens on the completed group.
 let area=0;for(let i=0;i<edge.length;i++){const a=edge[i],b=edge[(i+1)%edge.length];area+=a[0]*b[1]-b[0]*a[1];}if(area<0)edge.reverse();
 const pos:number[]=[],uv:number[]=[],idx:number[]=[];const n=edge.length;
 const add=(x:number,y:number,h:number)=>{pos.push(x,y,curve(x,y)+h);uv.push((x+68)/136,(y+85)/170);};
 add(cx,cy,z+depth);
 const steps=10,cut=Math.max(.85,1-bevel/35);
 for(let k=1;k<=steps;k++)for(const [x,y]of edge)add(cx+(x-cx)*k/steps*cut,cy+(y-cy)*k/steps*cut,z+depth);
 for(let j=0;j<n;j++)idx.push(0,1+j,1+(j+1)%n);
 for(let k=1;k<steps;k++)for(let j=0;j<n;j++){const a=1+(k-1)*n+j,b=1+(k-1)*n+(j+1)%n,c=1+k*n+j,d=1+k*n+(j+1)%n;idx.push(a,c,b,b,c,d);}
 let last=1+(steps-1)*n;
 for(const [s,h]of [[1,z+depth-bevel],[1,z+bevel],[cut,z]] as const){const next=pos.length/3;for(const [x,y]of edge)add(cx+(x-cx)*s,cy+(y-cy)*s,h);for(let j=0;j<n;j++)idx.push(last+j,next+j,last+(j+1)%n,last+(j+1)%n,next+j,next+(j+1)%n);last=next;}
 const back=pos.length/3;add(cx,cy,z);for(let j=0;j<n;j++)idx.push(back,last+(j+1)%n,last+j);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
function line(parent:T.Group,points:Point[],z:number,r:number,mat:T.Material,closed=false){
 const pts=closed?[...points,points[0]]:points;const path=new T.CatmullRomCurve3(pts.map(([x,y])=>new T.Vector3(x,y,curve(x,y)+z)),false,'centripetal');
 return mesh(new T.TubeGeometry(path,Math.max(16,pts.length*7),r,6,false),mat,parent);
}
function etch(parent:T.Group,points:Point[],z:number,m:T.Material){return line(parent,points,z,.32,m);}
function sphere(parent:T.Group,x:number,y:number,z:number,r:number,m:T.Material){const a=mesh(new T.SphereGeometry(r,12,8),m,parent,x,y,curve(x,y)+z);a.scale.z=.5;return a;}
function grain(){
 const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d')!,im=ctx.createImageData(512,512);let seed=7423;
 for(let y=0;y<512;y++)for(let x=0;x<512;x++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const v=150+(seed/4294967296-.5)*16+Math.sin(y*1.37)*5;const i=(y*512+x)*4;im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=255;}ctx.putImageData(im,0,0);
 const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;return t;
}
/** Bake static mesh parts per material per moving half; no decorative per-frame object work. */
function batch(group:T.Group){
 const sets=new Map<T.Material,T.BufferGeometry[]>();group.updateMatrixWorld(true);
 for(const o of [...group.children])if(o instanceof T.Mesh){o.updateMatrix();const g=o.geometry.clone().applyMatrix4(o.matrix);const a=sets.get(o.material)||[];a.push(g.index?g.toNonIndexed():g);if(g.index)g.dispose();sets.set(o.material,a);o.geometry.dispose();group.remove(o);}
 for(const [m,list]of sets){const g=mergeGeometries(list,false)!;list.forEach(a=>a.dispose());mesh(g,m,group);}
}

export function makeShields(groups:T.Group[],variants:number[]=[0,1,2,3]):ShieldRig[]{
 const texture=grain();const metal=(color:number,roughness=.3,metalness=.82)=>new T.MeshStandardMaterial({color,roughness,metalness,bumpMap:texture,bumpScale:.1,roughnessMap:texture,envMapIntensity:.78});
 const steel=metal(0x8195a4,.47),silver=metal(0xd3dce0,.4),gold=metal(0xcaa45d,.46),bronze=metal(0x8f6135,.49),black=metal(0x212e38,.57),groove=metal(0x172229,.8,.5);
 const blue=metal(0x314c62,.68,.64),pearl=metal(0x819da9,.6,.72),obsidian=metal(0x293139,.58,.84);
 const crimson=new T.MeshPhysicalMaterial({color:0x691f2b,metalness:.44,roughness:.36,clearcoat:.45,clearcoatRoughness:.35,bumpMap:texture,bumpScale:.05,envMapIntensity:.7});
 const shapes:Point[][]=[
  [[0,78],[19,76],[63,57],[59,-17],[41,-45],[0,-74]],
  [[0,78],[26,74],[63,53],[58,7],[45,-32],[0,-77]],
  [[0,76],[34,76],[63,59],[63,14],[53,-24],[0,-75]],
  [[0,78],[42,72],[64,52],[60,-20],[43,-48],[0,-75]],
 ];
 return groups.map((group,index)=>{
  const v=variants[index];
  const left=new T.Group(),right=new T.Group(),boss=new T.Group();group.add(left,right,boss);const p=shapes[v];
  for(const [sign,rig]of [[-1,left],[1,right]] as const){
   const half=new T.Group();rig.add(half);half.scale.x=sign;
   const rim=v===0?steel:v===1?silver:v===2?gold:steel,face=[blue,pearl,obsidian,crimson][v];
   mesh(plate(p,0,5,1.3),black,half);
   mesh(plate(p,4.5,3,1.1),rim,half);
   mesh(plate(scaled(p,.935),7.3,1.6,.65),groove,half);
   mesh(plate(scaled(p,.9),8.7,1.7,.6),face,half);
   const outer=p.slice(1,-1).map(([x,y])=>[x*.965,y*.965] as Point);
   line(half,[[0,p[0][1]*.965],...outer,[0,p.at(-1)![1]*.965]],7.65,.64,v===2?bronze:silver);
   // A second engraved hairline follows the inner rolled rim rather than floating above it.
   line(half,scaled(p,.848).slice(0,-1),10.15,.48,v===0?gold:v===2?gold:groove);
   mesh(plate([[0,71],[4,69],[5,-60],[0,-67]],10.5,2,.45),rim,half);
   // Visible hinge barrels and rear straps belong to each half; they follow the approved fold.
   for(const y of [27,43]){const a=mesh(new T.CylinderGeometry(2.3,2.3,10,12),bronze,half,58,y,3);a.rotation.z=.05;}
   for(const y of [-10,31])mesh(plate([[16,y-4],[49,y-4],[49,y+4],[16,y+4]],-2.4,1.5,.6),bronze,half);
   for(const [x,y]of [[52,48],[53,8],[43,-28],[18,-54]] as Point[]){
    sphere(half,x,y,8.9,2.9,groove);sphere(half,x,y,10,1.75,v===2?gold:silver);
    etch(half,[[x-1,y],[x+1,y]],11,v===2?bronze:groove);
   }
   if(v===0){
    // Classic: armoured raised spine, blue steel fields and restrained chevron chasing.
    mesh(plate([[6,64],[14,59],[14,-39],[6,-53]],10.4,2.2,.6),steel,half);
    mesh(plate([[15,44],[43,37],[40,29],[15,37]],10.5,1.4,.55),gold,half);
    etch(half,[[20,50],[43,42],[42,39]],10.7,groove);
    for(let i=0;i<3;i++)etch(half,[[19,-3-i*9],[36,-9-i*7],[32,-14-i*7]],10.65,steel);
    line(half,[[10,53],[10,17],[10,-34]],13.05,.48,silver);
    mesh(plate([[17,27],[21,24],[17,21],[13,24]],11.3,1,.3),gold,half);
   }else if(v===1){
    // Fluted silver: broad sculpted wing vanes with dark recessed seams.
    const vanes:Point[][]=[
     [[8,-48],[9,56],[16,53],[17,3]],
     [[19,-29],[21,50],[28,46],[28,1]],
     [[30,-12],[33,40],[40,34],[41,10]],
     [[43,1],[45,29],[51,21],[50,10]],
    ];
    vanes.forEach((vane,j)=>mesh(plate(vane,11.1,3.2,.85),j%2?pearl:steel,half));
    mesh(plate([[5,63],[17,62],[47,44],[43,40],[16,53],[5,54]],11.2,2,.7),gold,half);
    for(let j=0;j<5;j++)etch(half,[[15+j*6,56-j*2.8],[17+j*6,52-j*2.8]],13.5,bronze);
   }else if(v===2){
    // Black and gilt: raised laurel work is part of the plate, not a separate moving effect.
    line(half,[[15,-42],[33,-19],[40,6],[38,35]],11.3,1.05,gold);
    for(let j=0;j<5;j++){
     const y=-27+j*12,x=26+Math.sin(j/4*Math.PI*.8)*10;
     const leaf:Point[]=[[x,y-4],[x-9,y+4],[x-8,y+12],[x-2,y+6],[x+1,y]];
     mesh(plate(leaf,11.2,2.3,.7),gold,half);etch(half,[[x,y-2],[x-6,y+7]],13.65,bronze);
     const leaf2:Point[]=[[x+2,y-2],[x+9,y+2],[x+10,y+10],[x+4,y+5]];
     mesh(plate(leaf2,11.2,1.9,.65),bronze,half);etch(half,[[x+3,y],[x+8,y+7]],13.35,gold);
    }
    mesh(plate([[5,63],[26,63],[45,51],[44,46],[25,56],[5,56]],10.8,1.9,.6),gold,half);
    for(let j=0;j<6;j++)etch(half,[[8+j*5,58],[10+j*5,61]],13,bronze);
   }else{
    // Red enamel: interlocking hammered steel bands and a broad, clean coloured field.
    for(let j=0;j<3;j++){
     const y=45-j*32;
     mesh(plate([[5,y+7],[48-j*6,y-7],[47-j*6,y-15],[5,y-1]],11,2.7,.8),steel,half);
     line(half,[[7,y+6],[44-j*6,y-6]],14,.7,silver);
     etch(half,[[9,y+1],[39-j*6,y-10]],14,black);
     sphere(half,38-j*6,y-6,14,1.6,gold);
    }
    mesh(plate([[5,66],[36,60],[48,51],[45,48],[33,55],[5,60]],10.5,2.7,.7),silver,half);
    for(let j=0;j<4;j++)etch(half,[[18+j*6,53-j*2],[18+j*6,49-j*2]],10.65,gold);
   }
   batch(half);
  }
  // Bosses all share exactly the original scale pulse and z position.
  const bossM=v===2?gold:v===3?black:silver;
  const ring=new T.TorusGeometry(v===1?11:10,1.35,8,v===3?8:32);mesh(ring,v===2?bronze:gold,boss,0,0,-2);
  mesh(new T.CylinderGeometry(11,12,3, v===3?8:32),black,boss,0,0,-2).rotation.x=Math.PI/2;
  const dome=mesh(new T.SphereGeometry(v===2?10:9,24,12),bossM,boss,0,0,0);dome.scale.set(1,v===1?1.2:1,.48);
  const diamond=new T.Shape();diamond.moveTo(0,17);diamond.lineTo(5,0);diamond.lineTo(0,-18);diamond.lineTo(-5,0);diamond.closePath();
  mesh(new T.ExtrudeGeometry(diamond,{depth:1.4,bevelEnabled:true,bevelThickness:.65,bevelSize:.65,bevelSegments:2}),v===3?gold:v===2?silver:gold,boss,0,0,4.4);
  for(const sign of [-1,1])mesh(new T.SphereGeometry(1.2,8,6),v===2?black:gold,boss,sign*7,0,4.5);
  batch(boss);return{left,right,boss};
 });
}
