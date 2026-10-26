import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const dir=await mkdtemp(path.join(tmpdir(),'lore-scene-recovery-'));
const original={setTimeout,clearTimeout};const scheduled=new Map();let next=0;
globalThis.setTimeout=fn=>{scheduled.set(++next,fn);return next;};globalThis.clearTimeout=id=>scheduled.delete(id);
const tick=()=>{const [id,fn]=scheduled.entries().next().value;scheduled.delete(id);fn();};
try{
 const file=path.join(dir,'recovery.mjs');await build({entryPoints:['client/src/ui/duelSceneRecovery.ts'],bundle:true,format:'esm',outfile:file});
 const {recoverDuelScene}=await import(file);
 const root={isConnected:true,dataset:{sceneReady:'true'}},state={turn:5,hp:29};let mounts=0,cleanups=0,lost;
 const stop=recoverDuelScene(root,callback=>{mounts++;lost=callback;root.dataset.tableState='ready';root.dataset.sceneReady='true';return()=>cleanups++;});
 lost();lost();assert.equal(scheduled.size,1,'both renderers losing context schedule one rebuild');assert.equal(root.dataset.sceneReady,undefined);assert.equal(root.dataset.widgetsReady,'fallback');
 tick();assert.equal(mounts,2);assert.equal(cleanups,1);assert.deepEqual(state,{turn:5,hp:29});assert.equal(root.dataset.sceneReady,'true');
 lost();stop();assert.equal(scheduled.size,0,'leaving the match cancels recovery');assert.equal(cleanups,2);lost();assert.equal(scheduled.size,0);
 let failures=0;const failed={isConnected:true,dataset:{}};
 const stopFailed=recoverDuelScene(failed,()=>{failures++;failed.dataset.tableState='fallback';return()=>{};});
 while(scheduled.size)tick();assert.equal(failures,4,'initial attempt plus three bounded retries');assert.equal(failed.dataset.widgetsReady,'fallback');stopFailed();
 const removed={isConnected:true,dataset:{}};let builds=0,loss;
 const stopRemoved=recoverDuelScene(removed,callback=>{builds++;loss=callback;removed.dataset.tableState='ready';return()=>{};});loss();removed.isConnected=false;tick();assert.equal(builds,1);stopRemoved();
 console.log('PASS: one rebuild per loss, fresh readiness, bounded initialization retry, cancellation on destroy/disconnect');
}finally{Object.assign(globalThis,original);await rm(dir,{recursive:true,force:true});}
