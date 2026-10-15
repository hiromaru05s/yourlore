/* Only public artwork is cached. HTML, JS, APIs, account data and sockets
 * always use the network. A tab keeps the manifest of its own application build. */
const CONTENT='lore-menu-content-v1', META='lore-menu-clients-v1';
const bindings=new Map();
let maintenance=Promise.resolve();
const key=hash=>new URL('/__lore_menu_content__/'+hash,self.location.origin).href;
const metaKey=id=>new URL('/__lore_menu_client__/'+id,self.location.origin).href;
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
async function binding(id) {
 if(bindings.has(id))return bindings.get(id);
 const saved=await (await caches.open(META)).match(metaKey(id));
 if(!saved)return null;
 const entries=await saved.json();const map=new Map(entries.map(e=>[e.url,e.hash]));bindings.set(id,map);return map;
}
self.addEventListener('message',event=>{
 if(!event.source?.id)return;
 if(event.data?.type==='LORE_MENU_PRUNE'){
  maintenance=maintenance.catch(()=>{}).then(async()=>{
   const live=new Set((await self.clients.matchAll({includeUncontrolled:true})).map(c=>c.id));
   const meta=await caches.open(META),keep=new Set();
   for(const request of await meta.keys()){
    const id=new URL(request.url).pathname.split('/').pop();
    if(!live.has(id)){await meta.delete(request);bindings.delete(id);continue;}
    const entries=await (await meta.match(request)).json();entries.forEach(e=>keep.add(key(e.hash)));
   }
   const cache=await caches.open(CONTENT);
   for(const request of await cache.keys())if(!keep.has(request.url))await cache.delete(request);
  });event.waitUntil(maintenance.catch(()=>{}));return;
 }
 if(event.data?.type!=='LORE_MENU_BIND')return;
 maintenance=maintenance.catch(()=>{}).then(async()=>{
  try {
   const entries=event.data.entries;
   if(!Array.isArray(entries)||entries.length>5000||!entries.every(e=>/^\/(art|ui|frames|cosmetics)\/[^?#]+$/.test(e.url)&&!e.url.includes('..')&&/^[a-f0-9]{64}$/.test(e.hash)))throw Error('Invalid artwork manifest');
   await (await caches.open(META)).put(metaKey(event.source.id),new Response(JSON.stringify(entries)));
   bindings.set(event.source.id,new Map(entries.map(e=>[e.url,e.hash])));
   event.ports[0]?.postMessage({ok:true});
  }catch(error){event.ports[0]?.postMessage({ok:false,error:String(error)});}
 });event.waitUntil(maintenance);
});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||!/^\/(art|ui|frames|cosmetics)\//.test(url.pathname)||request.headers.has('X-Lore-Asset-Preload'))return;
 event.respondWith((async()=>{
  try {
   const hash=(await binding(event.clientId))?.get(url.pathname);
   if(hash){const cached=await (await caches.open(CONTENT)).match(key(hash));if(cached)return cached;}
  }catch{/* Restricted storage or eviction falls back to the normal request. */}
  return fetch(request);
 })());
});
