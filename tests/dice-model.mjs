import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const dir=await mkdtemp(path.join(tmpdir(),'lore-dice-'));
try{
 await build({entryPoints:['client/src/ui/diceScene.ts'],bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'dice.mjs')});
 const {createDie,landingQuaternion,FACE_NORMALS}=await import(path.join(dir,'dice.mjs'));
 const die=createDie(null);
 for(let n=1;n<=6;n++){
  const face=die.getObjectByName('face-'+n);assert(face);
  assert.equal(face.children.filter(c=>c.name==='pip').length,n,'exact geometric pip count');
  const normal=FACE_NORMALS[n].clone().applyQuaternion(landingQuaternion(n));assert(normal.z>.95,'rolled face must point toward viewer');
  assert(FACE_NORMALS[n].clone().add(FACE_NORMALS[7-n]).length()<1e-9,'opposite sides sum to seven');
 }
 console.log('PASS: all six dice faces, correct geometric pips, opposite faces and authoritative landing');
}finally{await rm(dir,{recursive:true,force:true});}
