import assert from 'node:assert/strict';
import {build} from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {menuCacheManifest} from '../scripts/menu-cache-manifest.mjs';
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lore-packs-'));
const buffers=Array.from({length:4},(_,i)=>Buffer.from('original artwork '+i));const pack=Buffer.concat(buffers);
const entries=buffers.map((b,i)=>({url:'/art/test'+i+'.webp',hash:createHash('sha256').update(b).digest('hex'),bytes:b.length,type:'image/webp',pack:0,offset:i*b.length}));
let binding;const stored=new Map(),calls=[];let corrupt=false,missing=false;
const cache={async keys(){return [...stored.keys()].map(url=>({url}));},async match(key){return stored.get(key)?.clone();},async put(key,response){stored.set(key,response.clone());},async delete(key){stored.delete(key);}};
Object.assign(globalThis,{matchMedia:()=>({matches:false}),window:{caches:{}},document:{documentElement:{dataset:{}}},location:new URL('https://lore.test'),caches:{open:async()=>cache}});
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{serviceWorker:{register:async()=>({}),ready:Promise.resolve(),controller:{postMessage(message,ports){if(message.type==='LORE_MENU_BIND'){binding=message.entries;ports[0].postMessage({ok:true});}}}}}});
globalThis.fetch=async url=>{if(url==='/manifest.json')return Response.json({entries,packs:[{url:'/assets/pack.bin',bytes:pack.length}]});calls.push(url);if(url==='/assets/pack.bin'){if(missing)return new Response('',{status:404});const bytes=Buffer.from(pack);if(corrupt)bytes[0]^=1;return new Response(bytes);}return new Response(buffers[entries.findIndex(e=>e.url===url)]);};
try{
 await build({entryPoints:['client/src/ui/menuCache.ts'],bundle:true,platform:'node',format:'esm',outfile:dir+'/module.mjs',define:{__LORE_MENU_MANIFEST__:JSON.stringify('/manifest.json')}});
 const {prepareMenuCache}=await import(dir+'/module.mjs');const run=()=>prepareMenuCache(()=>{},new AbortController().signal);
 corrupt=true;await assert.rejects(run(),/version mismatch/);assert.equal(stored.size,0,'No corrupt pack entry admitted');
 corrupt=false;calls.length=0;await run();assert.deepEqual(calls,['/assets/pack.bin']);assert.equal(stored.size,4);for(const e of entries)assert.equal(await stored.get('https://lore.test/__lore_menu_content__/'+e.hash).text(),'original artwork '+entries.indexOf(e));
 calls.length=0;await run();assert.deepEqual(calls,[],'Warm launch uses one key scan and no transfers');
 stored.delete('https://lore.test/__lore_menu_content__/'+entries[0].hash);await run();assert.deepEqual(calls,[entries[0].url],'Sparse eviction fetches only the missing original');
 stored.clear();calls.length=0;missing=true;await run();assert.equal(stored.size,4);assert.deepEqual(calls,['/assets/pack.bin',...entries.map(e=>e.url)],'Unavailable pack recovers from individual originals');
 stored.clear();calls.length=0;missing=false;
 entries[0].scope='duel';for(const e of entries.slice(1))e.scope='menu';entries[3].media='narrow';
 const scoped=await import(dir+'/module.mjs?scoped');
 await scoped.prepareMenuCache(()=>{},new AbortController().signal,'duel');
 assert.deepEqual(calls,[entries[0].url],'Duel admission must not fetch an unrelated menu pack');
 assert.equal(binding.length,entries.length,'Binding and pruning still protect every scope and viewport variant');
 calls.length=0;await scoped.prepareMenuCache(()=>{},new AbortController().signal,[entries[1].url+'?v=current']);
 assert.deepEqual(calls,[entries[1].url],'Selected page fetches only its requested originals');
 // Restricted persistent storage still prepares selected image AND binary files.
 delete navigator.serviceWorker;calls.length=0;
 globalThis.Image=class{naturalWidth=1;naturalHeight=1;decode(){calls.push(this.src);return Promise.resolve();}};
 globalThis.fetch=async url=>{if(url==='/manifest.json')return Response.json({entries:[entries[0],entries[1],{url:'/sfx/duel.mp3',type:'audio/mpeg',scope:'duel'}]});calls.push(url);return new Response('audio');};
 const fallback=await import(dir+'/module.mjs?restricted');await fallback.prepareMenuCache(()=>{},new AbortController().signal,'duel');
 assert.equal(document.documentElement.dataset.menuCache,'http-fallback');assert.deepEqual(calls.sort(),['/sfx/duel.mp3','https://lore.test'+entries[0].url].sort());
 const m=await menuCacheManifest(process.cwd()+'/client');assert(m.assets.length<m.entries.length/20,'Packs collapse more than 20 individual requests on average');for(const url of ['/ui/cursors/normal.svg','/ui/mana/empty.svg','/ui/duel-controls/v1/help.png','/sfx/lore-v5/shuffle.mp3'])assert(m.entries.some(e=>e.url===url),'Include late CSS/control/audio resource '+url);for(const e of m.entries){const original=await fs.readFile(path.join('client/public',e.url)),packed=m.assets[e.pack].source.subarray(e.offset,e.offset+e.bytes);assert.deepEqual(packed,original,'Packed bytes preserve original art exactly');}
 const scopes=new Map();for(const e of m.entries){const set=scopes.get(e.pack)??new Set();set.add(e.scope);scopes.set(e.pack,set);}assert([...scopes.values()].every(s=>s.size===1),'Packs must not combine menu, duel and locale fonts');
 console.log('PASS: phased admission, complete binding, pack corruption rejection, original-byte parity, cache hit, sparse repair, pack-404 fallback;',m.entries.length,'URLs in',m.assets.length,'packs');
}finally{await fs.rm(dir,{recursive:true,force:true});}
