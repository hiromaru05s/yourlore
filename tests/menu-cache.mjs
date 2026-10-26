import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto,createHash} from 'node:crypto';
import {menuCacheManifest} from '../scripts/menu-cache-manifest.mjs';
const source=await fs.readFile('client/public/menu-cache-sw.js','utf8');
const stores=new Map(),live=new Set(['a','b']);let fetched=0;
const caches={async open(name){if(!stores.has(name))stores.set(name,new Map());const store=stores.get(name),key=r=>typeof r==='string'?r:r.url;return {async put(r,v){store.set(key(r),v.clone());},async match(r){return store.get(key(r))?.clone();},async delete(r){return store.delete(key(r));},async keys(){return [...store.keys()].map(k=>new Request(k));}};}};
function worker(shortDeadline=false){const events={};const context={setTimeout:(fn,ms)=>setTimeout(fn,shortDeadline?5:ms),clearTimeout,Map,Set,URL,Response,Error,Array,JSON,Uint8Array,crypto:webcrypto,caches,fetch:async()=>{fetched++;return new Response('network');},self:{location:{origin:'https://lore.test'},clients:{claim:async()=>{},matchAll:async()=>[...live].map(id=>({id}))},skipWaiting:async()=>{},addEventListener:(type,fn)=>events[type]=fn}};vm.runInNewContext(source,context);return events;}
let events=worker();
async function bind(id,entries){let wait,reply;events.message({source:{id},data:{type:'LORE_MENU_BIND',entries},ports:[{postMessage:r=>reply=r}],waitUntil:p=>wait=p});await wait;return reply;}
async function read(url,id='a',headers={}){let result;const writes=[];events.fetch({clientId:id,request:new Request('https://lore.test'+url,{headers}),respondWith:p=>result=p,waitUntil:p=>writes.push(p)});const body=result?await (await result).text():null;await Promise.all(writes);return body;}
const a='a'.repeat(64),b='b'.repeat(64),key=h=>'https://lore.test/__lore_menu_content__/'+h;
const cache=await caches.open('lore-menu-content-v1');await cache.put(key(a),new Response('original'));await cache.put(key(b),new Response('updated'));
assert((await bind('a',[{url:'/art/card.webp',hash:a}])).ok);
assert((await bind('b',[{url:'/art/card.webp',hash:b}])).ok);
assert.equal(await read('/art/card.webp?v=old'),'original');assert.equal(await read('/art/card.webp?v=new','b'),'updated');assert.equal(fetched,0,'Known bytes must not revalidate');
events=worker();assert.equal(await read('/art/card.webp'),'original','Bindings survive worker termination');
assert.equal(await read('/api/auth/me'),null);assert.equal(await read('/index.html'),null);assert.equal(await read('/assets/game.js'),null);
assert.equal(await read('/art/card.webp','a',{'X-Lore-Asset-Preload':'1'}),null,'Integrity downloads bypass old cache entries');
assert.equal(await read('/art/unknown.webp'),'network');assert.equal(fetched,1);
assert.equal((await bind('a',[{url:'/api/private',hash:a}])).ok,false);
let wait;events.message({source:{id:'a'},data:{type:'LORE_MENU_PRUNE'},waitUntil:p=>wait=p});await wait;assert(await cache.match(key(a)));assert(await cache.match(key(b)),'Keep artwork belonging to another live build');
live.delete('a');events.message({source:{id:'b'},data:{type:'LORE_MENU_PRUNE'},waitUntil:p=>wait=p});await wait;assert.equal(await cache.match(key(a)),undefined);assert(await cache.match(key(b)));
await cache.delete(key(b));assert.equal(await read('/art/card.webp','b'),'network','Storage eviction is recoverable');
const netHash=createHash('sha256').update('network').digest('hex');
assert((await bind('a',[{url:'/art/on-demand.webp',hash:netHash},{url:'/art/stale.webp',hash:a}])).ok);
const beforeFetch=fetched;await Promise.all([read('/art/on-demand.webp'),read('/art/on-demand.webp')]);
assert.equal(fetched-beforeFetch,1,'Concurrent visible consumers share one transfer');
assert.equal(await read('/art/on-demand.webp'),'network');assert.equal(fetched-beforeFetch,1,'Verified on-demand bytes are reused');
await cache.delete(key(a));await read('/art/stale.webp');assert.equal(await cache.match(key(a)),undefined,'Stale CDN bytes must not poison a new release');
assert.equal(await read('/art/on-demand.webp','a',{Range:'bytes=0-1'}),'network','Cached complete media also satisfies range requests');
assert.equal(fetched-beforeFetch,2,'Cached media must not repeat its download');
// Cache Storage can stop resolving while ordinary network transfers still work.
const open=caches.open;caches.open=async name=>{const c=await open(name);return name==='lore-menu-content-v1'?{...c,match:()=>new Promise(()=>{})}:c;};
events=worker(true);const beforeStall=fetched;
assert.equal(await read('/art/on-demand.webp'),'network','A stalled cache read must fall back to network');
assert.equal(await read('/art/on-demand.webp'),'network','Later reads bypass storage after its timeout');
assert.equal(fetched-beforeStall,2);caches.open=open;
const m=await menuCacheManifest(process.cwd()+'/client');assert(m.entries.length>500);assert(m.entries.every(e=>e.bytes>0&&e.hash.length===64));
const duel=m.entries.filter(e=>e.scope==='duel'&&e.media!=='narrow');
assert(duel.reduce((n,e)=>n+e.bytes,0)<60*1024*1024,'Do not restore the full master/gallery archive to duel admission');
assert(!duel.some(e=>e.url.startsWith('/art/cards/')));
assert(duel.some(e=>e.url==='/ui/mana/empty.svg'),'State-dependent mana controls must be ready before play');
assert(duel.some(e=>e.url==='/art/biblion/arcana/dice-enamel.webp'),'Dice enamel must be ready before its first roll');
console.log('PASS: actual menu files, content hashes, no revalidation, per-client release isolation, worker restart, non-art bypass, eviction fallback, and bounded stale cache cleanup',m.entries.length,'files');
