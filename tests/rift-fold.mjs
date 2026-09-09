import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
const dir=await mkdtemp(tmpdir()+'/lore-rift-fold-');
try{
 await build({entryPoints:['client/src/ui/riftFold.ts'],bundle:true,platform:'node',format:'esm',outfile:dir+'/fold.mjs'});
 const {foldIntoRift}=await import(dir+'/fold.mjs');
 const target={x:920,y:420,z:0};
 for(let t=0;t<=100;t++)for(let q=0;q<=20;q++)for(const x of [-60,0,60]){
  const row={x:300,y:200+q*8,z:0},point={...row,x:row.x+x,z:.75};
  const p=foldIntoRift(point,row,target,q/20,t/100,120);
  assert(Object.values(p).every(Number.isFinite));
  if(t===0)assert.deepEqual(p,point);
  if(t===100)assert.deepEqual(p,target);
 }
 const tail=foldIntoRift({x:240,y:200,z:0},{x:300,y:200,z:0},target,0,.8,120);
 const tip=foldIntoRift({x:240,y:360,z:0},{x:300,y:360,z:0},target,1,.8,120);
 assert.deepEqual(tip,target);assert(Math.hypot(tail.x-target.x,tail.y-target.y)>20,'tail stays extended after leading end is consumed');
 const last=foldIntoRift({x:240,y:200,z:0},{x:300,y:200,z:0},target,0,.999,120);
 assert(Math.hypot(last.x-target.x,last.y-target.y)<1,'last edge reaches the slit before geometry is removed');
 console.log('PASS: finite fold geometry, exact initial pose, leading-edge ingestion and subpixel final tail');
}finally{await rm(dir,{recursive:true,force:true});}
