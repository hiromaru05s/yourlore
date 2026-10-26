import * as THREE from 'three';

const WIDTH=1672,HEIGHT=941;
const PERIOD=54,FLIGHT=19;

/** Small cel silhouettes, continuously deformed from one mesh per bird.
 * Transparent sorting places the flock after clouds (2), before the castle plate (3).
 * The architecture's real alpha masks the birds; no screen-space cutouts are needed. */
export function createDistantBirds(scene:THREE.Scene){
 const material=new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,side:THREE.DoubleSide});
 const dark=new THREE.Color('#424e70'),light=new THREE.Color('#8597b3');
 const flock=Array.from({length:4},(_,i)=>{
  const geometry=new THREE.BufferGeometry();
  const positions=new Float32Array(36*3),colors=new Float32Array(36*3);
  for(let v=0;v<36;v++){const color=v>=30?light:dark;colors.set([color.r,color.g,color.b],v*3);}
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  const mesh=new THREE.Mesh(geometry,material);mesh.renderOrder=2.5;mesh.frustumCulled=false;mesh.visible=false;
  scene.add(mesh);
  return {mesh,positions,scale:[1,.82,.91,.73][i]};
 });
 function update(time:number,cue=Number.NEGATIVE_INFINITY){
  const local=time-(Number.isFinite(cue)?cue:4);
  const cycle=Math.floor(Math.max(0,local)/PERIOD),age=local-cycle*PERIOD;
  const direction=cycle%2===0?1:-1;
  let active=0;
  for(const [i,bird] of flock.entries()){
   const progress=(age-i*.34)/FLIGHT;
   bird.mesh.visible=local>=0&&progress>=0&&progress<=1;
   if(!bird.mesh.visible)continue;
   active++;
   const x=-70+progress*(WIDTH+140);
   const arc=Math.sin(progress*Math.PI);
   const y=385+arc*45+Math.sin(cycle*.8)*10+[0,24,-16,10][i]+Math.sin(time*.85+i*1.4)*2;
   bird.mesh.position.set(direction===1?x:WIDTH-x,HEIGHT-y,-1);
   bird.mesh.scale.set(direction*bird.scale,bird.scale,1);
   bird.mesh.rotation.z=direction*(.035*Math.cos(progress*Math.PI*1.5));
   // Short bouts of flapping ease into a glide; every bird keeps its own wing phase.
   const envelope=THREE.MathUtils.smoothstep(Math.sin(time*1.25+i*.85),-.5,.35);
   const flap=2+Math.sin(time*(12.8+i*.36)+i*1.9)*9*envelope;
   const p=bird.positions;let v=0;
   const tri=(ax:number,ay:number,bx:number,by:number,cx:number,cy:number)=>{
    p.set([ax,ay,0,bx,by,0,cx,cy,0],v);v+=9;
   };
   // Tapered body, pointed beak, and forked tail.
   tri(-5,0,2,1.7,5,0);tri(-5,0,5,0,1,-1.5);
   tri(-4,0,-9,2,-7,-.2);tri(-4,0,-7,-.2,-9,-1.8);
   for(const side of [-1,1]){
    const ex=-1+side*4,ey=flap*.58+side*1.6;
    const tx=-4+side*10,ty=flap+side*2.8;
    tri(1,0,ex,ey,tx,ty);tri(1,0,tx,ty,-4,flap*.32);
    tri(-4,flap*.32,tx,ty,ex-3,ey*.65);
   }
   // A single inset cel face preserves a dark outer silhouette at small sizes.
   tri(-.5,.3,3,flap*.52+1.3,4.7,flap*.8+2.1);
   tri(-1,0,-4,flap*.42-1.2,-8,flap*.8-2.1);
   bird.mesh.geometry.attributes.position.needsUpdate=true;
  }
  return {active,age,leadX:flock[0].mesh.position.x,wing:flock[0].positions[43]};
 }
 return {update};
}
