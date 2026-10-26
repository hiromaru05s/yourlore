import assert from 'node:assert/strict';
import {build} from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {webcrypto} from 'node:crypto';
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lore-menu-preparation-'));
const data=new TextEncoder().encode('original artwork'),hash=Buffer.from(await webcrypto.subtle.digest('SHA-256',data)).toString('hex');
const entries=[{url:'/art/test.webp',hash,bytes:data.length}],stored=new Map();let wrong=true,downloads=0;
const cache={async keys(){return [...stored.keys()].map(url=>({url}));},async match(key){return stored.get(key)?.clone();},async put(key,response){stored.set(key,response.clone());},async delete(key){stored.delete(key);}};
Object.assign(globalThis,{matchMedia:()=>({matches:false}),window:{caches:{}},document:{documentElement:{dataset:{}}},location:new URL('https://lore.test'),caches:{open:async()=>cache}});
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{serviceWorker:{register:async()=>({}),ready:Promise.resolve(),controller:{postMessage(message,ports){if(message.type==='LORE_MENU_BIND')ports[0].postMessage({ok:true});}}}}});
globalThis.fetch=async url=>{if(url==='/manifest.json')return Response.json({entries});downloads++;return new Response(wrong?'stale release':data,{headers:{'Content-Type':'image/webp'}});};
try{
 await build({entryPoints:['client/src/ui/menuCache.ts'],bundle:true,platform:'node',format:'esm',outfile:dir+'/module.mjs',define:{__LORE_MENU_MANIFEST__:JSON.stringify('/manifest.json')}});
 const {prepareMenuCache}=await import(dir+'/module.mjs'),progress=[];
 await assert.rejects(prepareMenuCache((a,b)=>progress.push([a,b]),new AbortController().signal),/version mismatch/);
 assert.equal(stored.size,0,'Never admit stale or corrupt bytes');
 wrong=false;await prepareMenuCache(()=>{},new AbortController().signal);assert.equal(document.documentElement.dataset.menuCache,'ready');const count=downloads;
 await prepareMenuCache(()=>{},new AbortController().signal);assert.equal(downloads,count,'Re-entry does not revalidate unchanged artwork');
 const aborted=new AbortController();aborted.abort();await prepareMenuCache(()=>{throw Error('Cancelled work published progress');},aborted.signal);
 const nativeTimeout=globalThis.setTimeout;globalThis.setTimeout=(fn,ms,...args)=>nativeTimeout(fn,ms===60000?5:ms,...args);
 let activate; navigator.serviceWorker.ready=new Promise(r=>activate=r);
 const retryWorker=await import(dir+'/module.mjs?slow-worker');
 try {await assert.rejects(retryWorker.prepareMenuCache(()=>{},new AbortController().signal),error=>error.name==='TimeoutError','A worker activation timeout must not fall back to bulk image decode');activate();await retryWorker.prepareMenuCache(()=>{},new AbortController().signal);assert.equal(document.documentElement.dataset.menuCache,'ready');}finally{globalThis.setTimeout=nativeTimeout;}
 // Reproduce the 0% admission stall: Cache.keys never resolves after HOME.
 const keys=cache.keys;cache.keys=()=>new Promise(()=>{});
 const originalTimer=globalThis.setTimeout;globalThis.setTimeout=(fn,ms,...args)=>originalTimer(fn,ms===10000?5:ms,...args);
 const stuckStorage=await import(dir+'/module.mjs?stuck-storage'),fallbackProgress=[];
 try{await stuckStorage.prepareMenuCache((a,b)=>fallbackProgress.push([a,b]),new AbortController().signal);assert.equal(document.documentElement.dataset.menuCache,'http-fallback');assert.deepEqual(fallbackProgress.at(-1),[1,1]);}finally{cache.keys=keys;globalThis.setTimeout=originalTimer;}
 console.log('PASS: stalled cache scan falls back to original network assets; stale-byte rejection, retry recovery, persistent cache hit without transfer, cancellation, and recovery after slow worker activation');
}finally{await fs.rm(dir,{recursive:true,force:true});}
