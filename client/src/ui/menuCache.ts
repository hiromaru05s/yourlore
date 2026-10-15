import {withDeadline} from '../net/deadline';
import {decodeAsset} from './imageAssets';
import {menuAssetUrls} from './menuAssets';
declare const __LORE_MENU_MANIFEST__: string;
type Entry={url:string;hash:string;bytes:number};
const CONTENT='lore-menu-content-v1';
const key=(hash:string)=>new URL('/__lore_menu_content__/'+hash,location.origin).href;
let manifest:Promise<Entry[]>|undefined, registration:Promise<boolean>|undefined;
const downloaded=new Map<string,Promise<void>>();
const hex=(bytes:ArrayBuffer)=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
async function connect():Promise<boolean> {
 if(!('serviceWorker' in navigator)||!('caches' in window)||!crypto.subtle||typeof __LORE_MENU_MANIFEST__==='undefined')return false;
 try {
  await withDeadline(navigator.serviceWorker.register('/menu-cache-sw.js',{scope:'/',updateViaCache:'none'}),20000);
  await withDeadline(navigator.serviceWorker.ready,20000);
  if(!navigator.serviceWorker.controller)await new Promise<void>((resolve,reject)=>{
   const done=()=>{clearTimeout(timer);navigator.serviceWorker.removeEventListener('controllerchange',done);resolve();};
   const timer=setTimeout(()=>{navigator.serviceWorker.removeEventListener('controllerchange',done);reject(Error('Artwork cache activation timed out'));},20000);
   navigator.serviceWorker.addEventListener('controllerchange',done);if(navigator.serviceWorker.controller)done();
  });
  const cache=await caches.open(CONTENT),probe=key('storage-probe');
  await cache.put(probe,new Response('ok'));await cache.delete(probe);return true;
 }catch{return false;}
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
 const enabled=await(registration??=connect());
 if(signal.aborted)return;
 if(!enabled){await prepareWithoutStorage(progress,signal);return;}
 const entries=await(manifest??=fetch(__LORE_MENU_MANIFEST__,{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error('Artwork manifest unavailable');return r.json();}).then(m=>m.entries as Entry[]).catch(e=>{manifest=undefined;throw e;}));
 // Persist this client's binding before loading, including across worker restarts.
 await bind(entries);
 navigator.serviceWorker.controller?.postMessage({type:'LORE_MENU_PRUNE'});
 const cache=await caches.open(CONTENT),remaining=[...entries];let done=0,failed=false;
 progress(done,entries.length);
 const results=await Promise.allSettled(Array.from({length:6},async()=>{
  try {while(remaining.length&&!signal.aborted&&!failed){
   const entry=remaining.shift()!;
   if(!await cache.match(key(entry.hash))){
    let task=downloaded.get(entry.hash);
    if(!task){
     task=(async()=>{
      const response=await fetch(entry.url,{cache:'no-cache',headers:{'X-Lore-Asset-Preload':'1'},signal:AbortSignal.timeout(60000)});
      if(!response.ok)throw Error(`Artwork ${response.status}: ${entry.url}`);
      const bytes=await response.arrayBuffer();
      if(hex(await crypto.subtle.digest('SHA-256',bytes))!==entry.hash)throw Error(`Artwork version mismatch: ${entry.url}`);
      await cache.put(key(entry.hash),new Response(bytes,{headers:{'Content-Type':response.headers.get('Content-Type')||'application/octet-stream'}}));
     })().finally(()=>downloaded.delete(entry.hash));downloaded.set(entry.hash,task);
    }
    await task;
   }
   progress(++done,entries.length);
  }}catch(error){failed=true;throw error;}
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
