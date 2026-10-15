import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {menuCacheManifest} from '../scripts/menu-cache-manifest.mjs';
const source=await fs.readFile('client/public/menu-cache-sw.js','utf8');
const stores=new Map(),live=new Set(['a','b']);let fetched=0;
const caches={async open(name){if(!stores.has(name))stores.set(name,new Map());const store=stores.get(name),key=r=>typeof r==='string'?r:r.url;return {async put(r,v){store.set(key(r),v.clone());},async match(r){return store.get(key(r))?.clone();},async delete(r){return store.delete(key(r));},async keys(){return [...store.keys()].map(k=>new Request(k));}};}};
function worker(){const events={};const context={Map,Set,URL,Response,Error,Array,JSON,caches,fetch:async()=>{fetched++;return new Response('network');},self:{location:{origin:'https://lore.test'},clients:{claim:async()=>{},matchAll:async()=>[...live].map(id=>({id}))},skipWaiting:async()=>{},addEventListener:(type,fn)=>events[type]=fn}};vm.runInNewContext(source,context);return events;}
let events=worker();
async function bind(id,entries){let wait,reply;events.message({source:{id},data:{type:'LORE_MENU_BIND',entries},ports:[{postMessage:r=>reply=r}],waitUntil:p=>wait=p});await wait;return reply;}
async function read(url,id='a',headers={}){let result;events.fetch({clientId:id,request:new Request('https://lore.test'+url,{headers}),respondWith:p=>result=p});return result?(await result).text():null;}
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
const m=await menuCacheManifest(process.cwd()+'/client');assert(m.entries.length>500);assert(m.entries.every(e=>e.bytes>0&&e.hash.length===64));
console.log('PASS: actual menu files, content hashes, no revalidation, per-client release isolation, worker restart, non-art bypass, eviction fallback, and bounded stale cache cleanup',m.entries.length,'files');
