import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';
const dir=await mkdtemp(tmpdir()+'/lore-tempo-');
try{
 await build({stdin:{contents:"export * from './client/src/game/combatTempo';export * from './client/src/ui/turnUrgency';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/test.mjs'});
 const {contactPlayback,turnUrgency}=await import(dir+'/test.mjs');
 let impact,end;let contacts=0,recovered=false;
 const play=contactPlayback(callback=>{impact=callback;return new Promise(r=>{end=r;}).then(()=>{recovered=true;});},()=>contacts++);
 await Promise.resolve();impact();impact();await play.contact;assert.equal(contacts,1);assert.equal(recovered,false,'damage and counter can proceed before recovery');end();await play.finished;assert(recovered);
 for(const mode of ['skip','missing','cancel']){const play=contactPlayback(async()=>{},()=>assert.fail(mode+' must not fabricate an impact'));await play.contact;await play.finished;}
 const failed=contactPlayback(async()=>{throw Error('renderer failed');},()=>assert.fail());await failed.contact;await assert.rejects(failed.finished,/renderer failed/);
 assert.equal(turnUrgency(25,true),0);assert.equal(turnUrgency(90,true),0);assert.equal(turnUrgency(0,true),1);assert.equal(turnUrgency(1,false),0);assert.equal(turnUrgency(NaN,true),0);
 const levels=[25,15,5,1].map(s=>turnUrgency(s,true));assert(levels.every((x,i)=>!i||x>levels[i-1]));
 console.log('PASS contact before recovery, single impact, missing/skip/cancel/error settlement, monotonic warning and opponent reset');
}finally{await rm(dir,{recursive:true,force:true});}
