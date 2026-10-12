import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Worker as Thread} from 'node:worker_threads';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import path from 'node:path';
const dir=await mkdtemp(path.join(tmpdir(),'lore-air-worker-'));let live=0,created=0;
try{
 await build({entryPoints:['client/src/ui/purchaseAir.worker.ts'],bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'worker.mjs')});
 await writeFile(path.join(dir,'bridge.mjs'),`import {parentPort} from 'node:worker_threads';globalThis.postMessage=(data,transfer)=>parentPort.postMessage(data,transfer);await import('./worker.mjs');parentPort.on('message',()=>globalThis.onmessage());`);
 await build({entryPoints:['client/src/ui/purchaseAir.ts'],bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'main.mjs')});
 globalThis.document={createElement:()=>({getContext:()=>({putImageData(){}})})};globalThis.ImageData=class{constructor(w,h){this.data=new Uint8ClampedArray(w*h*4);}};
 globalThis.Worker=class{constructor(){live++;created++;this.thread=new Thread(path.join(dir,'bridge.mjs'));this.thread.on('message',data=>this.onmessage?.({data}));this.thread.on('error',()=>this.onerror?.({preventDefault(){}}));}postMessage(data){this.thread.postMessage(data);}terminate(){if(this.thread){live--;void this.thread.terminate();this.thread=null;}}};
 const {PurchaseAirWake,buildPurchaseAirFields}=await import(path.join(dir,'main.mjs'));
 const abort=new AbortController();const cancelled=PurchaseAirWake.prepare(abort.signal);abort.abort();assert.equal(await cancelled,undefined);assert.equal(live,0);
 let pulses=0;const pulse=setInterval(()=>pulses++,10);const started=performance.now();const wake=await PurchaseAirWake.prepare(new AbortController().signal);const elapsed=performance.now()-started;clearInterval(pulse);assert(wake);assert.equal(live,0);assert(pulses>0);
 const fields=buildPurchaseAirFields();assert.deepEqual(wake.fields,fields,'Every density and lighting float survives worker transfer unchanged');
 wake.dispose();const count=created;const next=await PurchaseAirWake.prepare(new AbortController().signal);assert.equal(created,count,'Reuse immutable cached fields across matches');assert.deepEqual(next.fields,fields,'Disposal of the old canvas must not empty shared fields');next.dispose();
 globalThis.Worker=class{constructor(){throw Error('Workers blocked');}};
 const fallbackModule=await import(path.join(dir,'main.mjs')+'?fallback');const fallback=await fallbackModule.PurchaseAirWake.prepare(new AbortController().signal);assert.deepEqual(fallback.fields,fields);fallback.dispose();
 console.log(JSON.stringify({frames:fields.length,floats:fields.reduce((n,f)=>n+f.density.length+f.light.length,0),elapsed,pulses,cancelled:true,rematch:true}));
}finally{await rm(dir,{recursive:true,force:true});}
