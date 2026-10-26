import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const dir=await mkdtemp(join(tmpdir(),'lore-birds-'));
try{
 await build({stdin:{contents:`export {createDistantBirds} from './client/src/ui/homeDistantBirds'; export {Scene} from 'three';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',outfile:join(dir,'birds.mjs')});
 const {createDistantBirds,Scene}=await import(pathToFileURL(join(dir,'birds.mjs')).href);
 const scene=new Scene(),birds=createDistantBirds(scene);
 assert.equal(birds.update(0).active,0,'First frame stays quiet');
 assert.equal(birds.update(10).active,4,'Flock enters after initial delay');
 assert.equal(birds.update(17).active,0,'Flock exits before the next flight');
 for(const start of [4,19,34,49]){
  assert.equal(birds.update(start-.01).active,0,'Quiet immediately before each 15-second departure');
  assert.equal(birds.update(start).active,1,'Lead bird departs every 15 seconds');
  assert.equal(birds.update(start+1.1).active,4,'Whole flock follows the lead');
  assert.equal(birds.update(start+12.1).active,0,'Even the last bird exits before cycle reset');
 }
 assert.deepEqual(birds.update(11),birds.update(11),'Paused clock freezes the pose');
 const forward=birds.update(12).leadX;assert(birds.update(12.1).leadX>forward);
 const backward=birds.update(23).leadX;assert(birds.update(23.1).leadX<backward,'Next flock reverses direction');
 let moved=false,prior;
 for(let t=0;t<120;t+=1/60){
  const state=birds.update(t);if(prior&&state.active&&prior.wing!==state.wing)moved=true;prior=state;
  for(const mesh of scene.children){
   assert.equal(mesh.renderOrder,2.5);assert.equal(mesh.material.transparent,true);assert.equal(mesh.material.depthWrite,false);
   for(const value of mesh.geometry.attributes.position.array)assert(Number.isFinite(value),'Geometry remains finite through two flight cycles');
  }
 }
 assert(moved,'Wing vertices deform continuously');
 assert.equal(birds.update(15,9).active,4,'Preview cue uses the same animation');
 const materials=new Set();scene.traverse(mesh=>{if(mesh.isMesh){mesh.geometry.dispose();materials.add(mesh.material);}});materials.forEach(m=>m.dispose());
 console.log('PASS distant birds: 15-second flights with no mid-flight reset, alternating direction, frozen clock, continuous finite geometry, layered transparency');
}finally{await rm(dir,{recursive:true,force:true});}
