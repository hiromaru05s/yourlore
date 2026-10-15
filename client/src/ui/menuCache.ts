import {withDeadline} from '../net/deadline';
import {decodeAsset} from './imageAssets';
import {menuAssetUrls} from './menuAssets';
declare const __LORE_MENU_MANIFEST__: string;
type Entry={url:string;hash:string;bytes:number;type?:string;media?:'narrow'|'wide';pack?:number;offset?:number};
type Manifest={entries:Entry[];packs?:{url:string;bytes:number}[]};
const CONTENT='lore-menu-content-v1';
const key=(hash:string)=>new URL('/__lore_menu_content__/'+hash,location.origin).href;
let manifest:Promise<Manifest>|undefined, registration:Promise<boolean>|undefined;
const downloaded=new Map<string,Promise<void>>();
const hex=(bytes:ArrayBuffer)=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
async function connect():Promise<boolean> {
 if(!('serviceWorker' in navigator)||!('caches' in window)||!crypto.subtle||typeof __LORE_MENU_MANIFEST__==='undefined')return false;
 try {
  const script=new URL('/menu-cache-sw.js?v=3',location.origin).href;
  await withDeadline(navigator.serviceWorker.register(script,{scope:'/',updateViaCache:'none'}),60000);
  await withDeadline(navigator.serviceWorker.ready,60000);
  const current=()=>!!navigator.serviceWorker.controller&&(!navigator.serviceWorker.controller.scriptURL||navigator.serviceWorker.controller.scriptURL===script);
  if(!current())await new Promise<void>((resolve,reject)=>{
   const done=()=>{if(!current())return;clearTimeout(timer);navigator.serviceWorker.removeEventListener('controllerchange',done);resolve();};
   const timer=setTimeout(()=>{navigator.serviceWorker.removeEventListener('controllerchange',done);reject(new DOMException('Artwork cache activation timed out','TimeoutError'));},60000);
   navigator.serviceWorker.addEventListener('controllerchange',done);if(current())done();
  });
  const cache=await caches.open(CONTENT),probe=key('storage-probe');
  await cache.put(probe,new Response('ok'));await cache.delete(probe);return true;
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
/** Preload original compressed files, not hundreds of decoded full-size bitmaps.
 * Content hashes reuse unchanged files across deploys and reject stale CDN data. */
export async function prepareMenuCache(progress:(done:number,total:number)=>void,signal:AbortSignal):Promise<void> {
 // A slow worker is not an unsupported worker. Retry activation instead of
 // permanently selecting thousands of individual image downloads for this tab.
 const enabled=await(registration??=connect().catch(error=>{registration=undefined;throw error;}));
 if(signal.aborted)return;
 if(!enabled){registration=undefined;await prepareWithoutStorage(progress,signal);return;}
 const inventory:Manifest=await(manifest??=fetch(__LORE_MENU_MANIFEST__,{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error('Artwork manifest unavailable');return r.json();}).catch(e=>{manifest=undefined;throw e;}));
 const {packs=[]}=inventory,narrow=matchMedia('(max-width:700px)').matches;
 const entries=inventory.entries.filter(e=>!e.media||e.media===(narrow?'narrow':'wide'));
 // Persist this client's binding before loading, including across worker restarts.
 await bind(entries);
 const cache=await caches.open(CONTENT);
 // One metadata scan instead of opening 1,200 response bodies on every launch.
 const present=new Set((await cache.keys()).map(r=>r.url));
 const missing=entries.filter(e=>!present.has(key(e.hash)));
 let done=entries.length-missing.length,failed=false;
 progress(done,entries.length);
 const store=async(entry:Entry,bytes:ArrayBuffer,type=entry.type)=>{
  if(bytes.byteLength!==entry.bytes||hex(await crypto.subtle.digest('SHA-256',bytes))!==entry.hash)throw Error(`Artwork version mismatch: ${entry.url}`);
  await cache.put(key(entry.hash),new Response(bytes,{headers:{'Content-Type':type||'application/octet-stream'}}));
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
   try{const r=await fetch(pack.url,{cache:'no-store',headers:{'X-Lore-Asset-Preload':'1'},signal:AbortSignal.timeout(180000)});if(!r.ok)throw Error('Artwork pack unavailable');data=await r.arrayBuffer();if(data.byteLength!==pack.bytes)throw Error('Incomplete artwork pack');}
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
  if(failure.reason?.name==='QuotaExceededError'||failure.reason?.name==='SecurityError'){await prepareWithoutStorage(progress,signal);return;}
  throw failure.reason;
 }
 if(!signal.aborted){document.documentElement.dataset.menuCache='ready';navigator.serviceWorker.controller?.postMessage({type:'LORE_MENU_PRUNE'});}
}

async function prepareWithoutStorage(progress:(done:number,total:number)=>void,signal:AbortSignal):Promise<void>{
 document.documentElement.dataset.menuCache='http-fallback';
 const remaining=menuAssetUrls(),total=remaining.length;let done=0,failed=false;progress(0,total);
 const results=await Promise.allSettled(Array.from({length:6},async()=>{
  try{while(remaining.length&&!signal.aborted&&!failed){await decodeAsset(remaining.shift()!);progress(++done,total);}}catch(error){failed=true;throw error;}
 }));
 const failure=results.find((r):r is PromiseRejectedResult=>r.status==='rejected');if(failure)throw failure.reason;
}
