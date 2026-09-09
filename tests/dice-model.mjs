import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const dir=await mkdtemp(path.join(tmpdir(),'lore-dice-'));
try{
 await build({entryPoints:['client/src/ui/diceScene.ts'],bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'dice.mjs')});
 const {createDie,landingQuaternion,FACE_NORMALS,diePose}=await import(path.join(dir,'dice.mjs'));
 const die=createDie(null);
 for(let n=1;n<=6;n++){
  const face=die.getObjectByName('face-'+n);assert(face);
  assert.equal(face.children.filter(c=>c.name==='pip').length,n,'exact geometric pip count');
  const normal=FACE_NORMALS[n].clone().applyQuaternion(landingQuaternion(n));assert(normal.y>.999,'authoritative face rests upwards on the floor');
  for(let i=0;i<=1000;i++){
   const p=diePose(i/1000,n);assert(p.lift>=-1e-9);assert(p.y>=.4999,'die never crosses the floor');
  }
  for(const t of [.3,.59,.79,.92,1])assert(Math.abs(diePose(t,n).lift)<1e-8,'each bounce makes ground contact');
  assert(Math.abs(diePose(1,n).y-.5)<1e-9);assert(Math.abs(diePose(1,n).x)<1e-9);
  assert(FACE_NORMALS[n].clone().add(FACE_NORMALS[7-n]).length()<1e-9,'opposite sides sum to seven');
 }
 console.log('PASS: all six dice faces, correct geometric pips, opposite faces and authoritative landing');
}finally{await rm(dir,{recursive:true,force:true});}
