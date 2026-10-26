import {fetchAssetPack} from './assetTransfer';
import {withDeadline} from '../net/deadline';
import {decodeAsset} from './imageAssets';
declare const __LORE_MENU_MANIFEST__: string;
type Entry={scope?:'menu'|'duel'|'font';url:string;hash:string;bytes:number;type?:string;media?:'narrow'|'wide';pack?:number;offset?:number};
type Manifest={entries:Entry[];packs?:{url:string;bytes:number}[]};
const CONTENT='lore-menu-content-v1';
// Cache Storage and service-worker calls can each consume their own timeout.
// Give duel admission one budget for the entire cache inspection instead.
const DUEL_CACHE_CHECK_MS=5000;
const key=(hash:string)=>new URL('/__lore_menu_content__/'+hash,location.origin).href;
let manifest:Promise<Manifest>|undefined, registration:Promise<boolean>|undefined;
const downloaded=new Map<string,Promise<void>>();
const hex=(bytes:ArrayBuffer)=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
async function connect():Promise<boolean> {
 if(!('serviceWorker' in navigator)||!('caches' in window)||!crypto.subtle||typeof __LORE_MENU_MANIFEST__==='undefined')return false;
 try {
  const script=new URL('/menu-cache-sw.js?v=5',location.origin).href;
  await withDeadline(navigator.serviceWorker.register(script,{scope:'/',updateViaCache:'none'}),60000);
  await withDeadline(navigator.serviceWorker.ready,60000);
  const current=()=>!!navigator.serviceWorker.controller&&(!navigator.serviceWorker.controller.scriptURL||navigator.serviceWorker.controller.scriptURL===script);
  if(!current())await new Promise<void>((resolve,reject)=>{
   const done=()=>{if(!current())return;clearTimeout(timer);navigator.serviceWorker.removeEventListener('controllerchange',done);resolve();};
   const timer=setTimeout(()=>{navigator.serviceWorker.removeEventListener('controllerchange',done);reject(new DOMException('Artwork cache activation timed out','TimeoutError'));},60000);
   navigator.serviceWorker.addEventListener('controllerchange',done);if(current())done();
  });
  try {
   await withDeadline((async()=>{const cache=await caches.open(CONTENT),probe=key('storage-probe');await cache.put(probe,new Response('ok'));await cache.delete(probe);})(),10000);
   return true;
  }catch{return false;}
 }catch(error){if((error as Error)?.name==='TimeoutError')throw error;return false;}
}
async function bind(entries:Entry[]):Promise<void> {
 await new Promise<void>((resolve,reject)=>{
  const channel=new MessageChannel();
  const finish=(error?:Error)=>{clearTimeout(timer);channel.port1.close();channel.port2.close();error?reject(error):resolve();};
  const timer=setTimeout(()=>finish(Error('Artwork cache handshake timed out')),10000);
  channel.port1.onmessage=e=>finish(e.data.ok?undefined:Error(e.data.error));
  navigator.serviceWorker.controller?.postMessage({type:'LORE_MENU_BIND',entries},[channel.port2]);
 });
}
/** Bind the current build before a duel. Bulk preloading is reserved for explicit
 * menu scopes; the duel gate separately prepares code, visible board and deck. */
export async function prepareMenuCache(progress:(done:number,total:number)=>void,signal:AbortSignal,scope?:'duel'|readonly string[]):Promise<void> {
 const cacheCheckEnds=performance.now()+DUEL_CACHE_CHECK_MS;
 const inspect=<T>(task:Promise<T>,regularLimit?:number):Promise<T>=>scope==='duel'
  ?withDeadline(task,Math.max(1,cacheCheckEnds-performance.now()),signal)
  :regularLimit?withDeadline(task,regularLimit,signal):task;
 // A slow worker is not an unsupported worker. Retry activation instead of
 // permanently selecting thousands of individual image downloads for this tab.
 const connection=registration??=connect().catch(error=>{registration=undefined;throw error;});
 let enabled=false;
 try {
  // A duel must remain playable when a browser never activates its worker.
  // HOME's speculative registration can continue while this attempt uses HTTP.
  enabled=await inspect(connection);
 }catch(error){if(scope!=='duel'||(error as Error)?.name!=='TimeoutError')throw error;}
 if(signal.aborted)return;
 if(!enabled&&typeof __LORE_MENU_MANIFEST__==='undefined'){registration=undefined;await prepareWithoutStorage(progress,signal,scope);return;}
 const inventoryRequest=manifest??=fetch(__LORE_MENU_MANIFEST__,{cache:'force-cache',signal:AbortSignal.timeout(60000)}).then(r=>{if(!r.ok)throw Error('Artwork manifest unavailable');return r.json() as Promise<Manifest>;}).catch(e=>{manifest=undefined;throw e;});
 let inventory:Manifest;
 try {inventory=await inspect(inventoryRequest);}
 catch(error){if(scope!=='duel')throw error;await prepareWithoutStorage(progress,signal,scope);return;}
 if(scope==='duel'){
  if(enabled){
   try{
    await inspect(bind(inventory.entries));
    if(signal.aborted)return;
    document.documentElement.dataset.menuCache='ready';
    progress(1,1);
    return;
   }catch{registration=undefined;}
  }
  await prepareWithoutStorage(progress,signal,scope);
  return;
 }
 const {packs=[]}=inventory,narrow=matchMedia('(max-width:700px)').matches;
 const compatible=inventory.entries.filter(e=>!e.media||e.media===(narrow?'narrow':'wide'));
 const wanted=Array.isArray(scope)?new Set(scope.map(url=>new URL(url,location.href).pathname)):undefined;
 const entries=compatible.filter(e=>!wanted||wanted.has(e.url));
 if(!enabled){registration=undefined;await prepareWithoutStorage(progress,signal,scope,entries);return;}
 // Persist this client's binding before loading, including across worker restarts.
 let cache:Cache,present:Set<string>;
 try {
  await inspect(bind(inventory.entries)); // Protect every phase and viewport already prepared by this tab.
  cache=await inspect(caches.open(CONTENT),10000);
  // One metadata scan instead of opening 1,200 response bodies on every launch.
  present=new Set((await inspect(cache.keys(),10000)).map(r=>r.url));
 }catch{
  registration=undefined;
  await prepareWithoutStorage(progress,signal,scope,entries);return;
 }
 const missing=entries.filter(e=>!present.has(key(e.hash)));
 let done=entries.length-missing.length,failed=false;
 progress(done,entries.length);
 const store=async(entry:Entry,bytes:ArrayBuffer,type=entry.type)=>{
  if(bytes.byteLength!==entry.bytes||hex(await crypto.subtle.digest('SHA-256',bytes))!==entry.hash)throw Error(`Artwork version mismatch: ${entry.url}`);
  await withDeadline(cache.put(key(entry.hash),new Response(bytes,{headers:{'Content-Type':type||'application/octet-stream'}})),10000);
 };
 const single=async(entry:Entry)=>{
  let task=downloaded.get(entry.hash);
  if(!task){task=(async()=>{
   const response=await fetch(entry.url,{cache:'no-cache',headers:{'X-Lore-Asset-Preload':'1'},signal:AbortSignal.timeout(60000)});
   if(!response.ok)throw Error(`Artwork ${response.status}: ${entry.url}`);
   await store(entry,await response.arrayBuffer(),entry.type||response.headers.get('Content-Type')||undefined);
  })().finally(()=>downloaded.delete(entry.hash));downloaded.set(entry.hash,task);}
  await task;progress(++done,entries.length);
 };
 const jobs:Array<()=>Promise<void>>=[];
 const grouped=new Map<number,Entry[]>();
 for(const e of missing){if(e.pack!==undefined&&packs[e.pack]){const group=grouped.get(e.pack)??[];group.push(e);grouped.set(e.pack,group);}else jobs.push(()=>single(e));}
 for(const [index,group] of grouped){
  const pack=packs[index],bytes=[...new Map(group.map(e=>[e.hash,e])).values()].reduce((n,e)=>n+e.bytes,0);
  // A small update/eviction fetches individual originals; cold starts use packs.
  if(group.length<3||bytes<pack.bytes*.7){jobs.push(...group.map(e=>()=>single(e)));continue;}
  jobs.push(async()=>{
   let data:ArrayBuffer;
   // A pack is much larger than one image. Do not discard a progressing
   // transfer on a slow connection and restart it as dozens of originals.
   try{data=await fetchAssetPack(pack.url,pack.bytes);}
   catch{for(const e of group){if(signal.aborted||failed)return;await single(e);}return;}
   const written=new Set<string>();
   for(const e of group){
    if(signal.aborted||failed)return;
    if(!written.has(e.hash)){
     const offset=e.offset;if(!Number.isSafeInteger(offset)||offset!<0||offset!+e.bytes>data.byteLength)throw Error('Invalid artwork pack offset');
     await store(e,data.slice(offset,offset!+e.bytes));written.add(e.hash);
    }
    progress(++done,entries.length);
   }
  });
 }
 const results=await Promise.allSettled(Array.from({length:6},async()=>{
  try{while(jobs.length&&!signal.aborted&&!failed)await jobs.shift()!();}catch(error){failed=true;throw error;}
 }));
 const failure=results.find((r):r is PromiseRejectedResult=>r.status==='rejected');
 if(failure){
  if(failure.reason?.name==='QuotaExceededError'||failure.reason?.name==='SecurityError'||failure.reason?.name==='TimeoutError'){await prepareWithoutStorage(progress,signal,scope,entries);return;}
  throw failure.reason;
 }
 if(!signal.aborted){document.documentElement.dataset.menuCache='ready';navigator.serviceWorker.controller?.postMessage({type:'LORE_MENU_PRUNE'});}
}

async function prepareWithoutStorage(progress:(done:number,total:number)=>void,signal:AbortSignal,scope?:'duel'|readonly string[],entries?:Entry[]):Promise<void>{
 document.documentElement.dataset.menuCache='http-fallback';
 if(signal.aborted)return;
 // Make the handoff visible before loading the fallback inventory chunk.
 progress(0,1);
 if(scope==='duel'){
  // The admission gate also loads duel code, the visible board, and the
  // selected deck. Without persistent storage, downloading the entire card
  // archive here only delays the room; other card art can load when needed.
  progress(1,1);
  return;
 }
 const wanted=Array.isArray(scope)?new Set(scope.map(url=>new URL(url,location.href).pathname)):undefined;
 const selected=(url:string)=>!wanted||wanted.has(new URL(url,location.href).pathname);
 const narrow=matchMedia('(max-width:700px)').matches;
 const {menuAssetUrls,duelFileAssets}=entries?{menuAssetUrls:()=>[],duelFileAssets:()=>[]}:await withDeadline(import('./menuAssets'),10000,signal);
 const files=entries??[...menuAssetUrls().filter(selected).map(url=>({url,type:'image/'})),...duelFileAssets().filter(e=>selected(e.url)&&(!e.media||e.media===(narrow?'narrow':'wide'))).map(e=>({...e,type:''}))];
 const remaining=files.map(e=>e.type?.startsWith('image/')?()=>decodeAsset(e.url):async()=>{const r=await fetch(e.url,{cache:'force-cache',signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error('Asset unavailable: '+e.url);await r.arrayBuffer();}),total=remaining.length;let done=0,failed=false;progress(0,total);
 const results=await Promise.allSettled(Array.from({length:6},async()=>{
  try{while(remaining.length&&!signal.aborted&&!failed){await remaining.shift()!();progress(++done,total);}}catch(error){failed=true;throw error;}
 }));
 const failure=results.find((r):r is PromiseRejectedResult=>r.status==='rejected');if(failure)throw failure.reason;
}
