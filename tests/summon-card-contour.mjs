import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const dir=await mkdtemp(path.join(tmpdir(),'summon-contour-'));
try{
 const file=path.join(dir,'board.mjs');
 await build({entryPoints:['client/src/ui/summon/boardRender.ts'],bundle:true,platform:'node',format:'esm',outfile:file});
 const {renderSummonBoard}=await import(file);
 const backing={visible:true},alreadyHidden={visible:false},face={visible:true},effect={visible:true},scene={},camera={};
 let calls=0;
 const renderer={render(s,c){calls++;assert.equal(s,scene);assert.equal(c,camera);assert.equal(backing.visible,false);assert.equal(alreadyHidden.visible,false);assert.equal(face.visible,true);assert.equal(effect.visible,true);}};
 renderSummonBoard(renderer,scene,camera,[backing,alreadyHidden]);
 assert.equal(calls,1);assert.equal(backing.visible,true);assert.equal(alreadyHidden.visible,false);
 assert.throws(()=>renderSummonBoard({render(){assert.equal(backing.visible,false);throw Error('context lost');}},scene,camera,[backing,alreadyHidden]),/context lost/);
 assert.equal(backing.visible,true);assert.equal(alreadyHidden.visible,false);
 renderSummonBoard({render(){calls++;}},scene,camera,[]);assert.equal(calls,2);
 console.log('PASS: live board omits only explicit card backings; printed face/effects remain; studio visibility restored after success and renderer failure');
}finally{await rm(dir,{recursive:true,force:true});}
