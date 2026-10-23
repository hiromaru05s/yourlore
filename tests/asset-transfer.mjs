import assert from 'node:assert/strict';import {build} from 'esbuild';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';
const dir=await mkdtemp(tmpdir()+'/lore-transfer-'),nativeFetch=globalThis.fetch;
try{
 await build({entryPoints:['client/src/ui/assetTransfer.ts'],bundle:true,platform:'node',format:'esm',outfile:dir+'/transfer.mjs'});
 const {fetchAssetPack}=await import(dir+'/transfer.mjs');let calls=0,aborts=0;
 // Node initializes its Fetch implementation lazily. Do that before the 30 ms
 // transfer clock so this fixture measures stream progress, not runtime startup.
 new Response();
 globalThis.fetch=async(_url,{signal})=>{calls++;let interval;return new Response(new ReadableStream({start(controller){let n=0;signal.addEventListener('abort',()=>{aborts++;clearInterval(interval);controller.error(signal.reason);});interval=setInterval(()=>{controller.enqueue(new Uint8Array([++n]));if(n===12){clearInterval(interval);controller.close();}},5);},cancel(){clearInterval(interval);}}));};
 assert.deepEqual([...new Uint8Array(await fetchAssetPack('/slow.bin',12,30))],Array.from({length:12},(_,i)=>i+1));
 await new Promise(r=>setTimeout(r,40));assert.equal(calls,1);assert.equal(aborts,0,'Successful progressing transfer never restarts and clears its timer');
 globalThis.fetch=async(_url,{signal})=>new Response(new ReadableStream({start(controller){controller.enqueue(new Uint8Array([1]));signal.addEventListener('abort',()=>controller.error(signal.reason));}}));
 await assert.rejects(fetchAssetPack('/stalled.bin',12,20),/stalled/);
 globalThis.fetch=async()=>new Response(new Uint8Array([1,2]));await assert.rejects(fetchAssetPack('/short.bin',3),/Incomplete/);await assert.rejects(fetchAssetPack('/large.bin',1),/Oversized/);
 await assert.rejects(fetchAssetPack('/invalid.bin',Infinity),/Invalid/);
 globalThis.fetch=async()=>new Response('',{status:503});await assert.rejects(fetchAssetPack('/offline.bin',3),/unavailable/);
 console.log('PASS progressing transfer exceeds total idle window without restart; stalls, length/integrity bounds, HTTP failure and timer cleanup');
}finally{globalThis.fetch=nativeFetch;await rm(dir,{recursive:true,force:true});}
