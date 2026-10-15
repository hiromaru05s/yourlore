import assert from 'node:assert/strict';
import {build} from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {webcrypto} from 'node:crypto';
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lore-menu-preparation-'));
const data=new TextEncoder().encode('original artwork'),hash=Buffer.from(await webcrypto.subtle.digest('SHA-256',data)).toString('hex');
const entries=[{url:'/art/test.webp',hash,bytes:data.length}],stored=new Map();let wrong=true,downloads=0;
const cache={async match(key){return stored.get(key)?.clone();},async put(key,response){stored.set(key,response.clone());},async delete(key){stored.delete(key);}};
Object.assign(globalThis,{window:{caches:{}},document:{documentElement:{dataset:{}}},location:new URL('https://lore.test'),caches:{open:async()=>cache}});
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
 console.log('PASS: stale-byte rejection, retry recovery, persistent cache hit without transfer, and cancellation');
}finally{await fs.rm(dir,{recursive:true,force:true});}
