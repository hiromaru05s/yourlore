import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
const dir=await mkdtemp(tmpdir()+'/lore-grounded-');
try{
 await build({stdin:{contents:"export * from './client/src/ui/shufflePose';export * from './client/src/ui/impactDust';export * from './client/src/ui/riftFold';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/models.mjs'});
 const {overhandPose,dustPose,dustDuration,foldIntoRift}=await import(dir+'/models.mjs');
 for(const n of [2,3,7,14,20])for(let i=0;i<n;i++){
  for(let r=1;r<8;r++){
   const t=.19+.51*(r/8)**(1/1.35),a=overhandPose(t-1e-8,i,n),b=overhandPose(t+1e-8,i,n);
   for(const k of ['x','y','z','tilt','roll'])assert(Math.abs(a[k]-b[k])<.0001,`packet continuity n=${n} i=${i} r=${r} ${k}`);
  }
  assert.equal(overhandPose(1,i,n).tilt,0);assert.equal(overhandPose(1,i,n).x,0);assert.equal(overhandPose(1,i,n).z,0);
 }
 assert(dustDuration(true)>=1800);assert(Array.from({length:32},(_,i)=>dustPose(1600/1900,i,true,90)).some(p=>p.opacity>.005));
 for(let i=0;i<64;i++){const p=dustPose(1,i,true,90);assert.equal(p.opacity,0);assert(Object.values(p).every(Number.isFinite));}
 const sink={x:800,y:400,z:0};
 for(let i=0;i<=100;i++)for(const q of [0,.25,.5,.75,1]){
  const p=foldIntoRift({x:200,y:200+q*100,z:0},{x:250,y:200+q*100,z:0},sink,q,i/100,100);
  assert(Math.abs(p.z)<=4.5,'subtle curl under 4.5 percent of width');
 }
 console.log('PASS: eight continuous overhand packet transfers, square landing, lingering finite dust, restrained rift curvature');
}finally{await rm(dir,{recursive:true,force:true});}
