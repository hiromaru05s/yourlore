let worker:Worker|undefined,serial=0,disabled=false,idle:ReturnType<typeof setTimeout>|undefined;
const pending=new Map<number,{resolve:(bitmap:ImageBitmap)=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>}>();
function stop(){clearTimeout(idle);worker?.terminate();worker=undefined;for(const job of pending.values()){clearTimeout(job.timer);job.reject(Error('Frame preparation interrupted'));}pending.clear();}
function rest(){clearTimeout(idle);if(!pending.size)idle=setTimeout(stop,30000);}
function connect(){
 if(disabled||typeof Worker==='undefined'||typeof OffscreenCanvas==='undefined'||typeof createImageBitmap==='undefined')throw Error('Worker raster unavailable');
 if(!worker){
  worker=new Worker(new URL('./raster.worker.ts',import.meta.url),{type:'module'});
  worker.onmessage=(e:MessageEvent<{id:number;bitmap?:ImageBitmap;error?:string}>)=>{
   const job=pending.get(e.data.id);if(!job){e.data.bitmap?.close();return;}
   pending.delete(e.data.id);clearTimeout(job.timer);
   if(e.data.bitmap)job.resolve(e.data.bitmap);else job.reject(Error(e.data.error||'Frame preparation failed'));rest();
  };
  worker.onerror=()=>{disabled=true;stop();};
 }
 return worker;
}
export function prepareRasterWorker():void{try{connect();rest();}catch{/* Main-thread exact fallback. */}}
/** Transfer pixels; no DOM, account data or network requests run in the worker. */
export async function frameMaskOffThread(image:HTMLImageElement,artPath:string|null|undefined,seals:number[][],matte?:{width:number;height:number}):Promise<ImageBitmap>{
 const target=connect();clearTimeout(idle);const bitmap=await createImageBitmap(image),id=++serial;
 if(target!==worker){bitmap.close();throw Error('Raster worker replaced');}
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{disabled=true;stop();},10000);pending.set(id,{resolve,reject,timer});
  try{target.postMessage({id,image:bitmap,artPath,seals,matte},[bitmap]);}catch(error){bitmap.close();pending.delete(id);clearTimeout(timer);reject(error);rest();}
 });
}
if(typeof window!=='undefined')window.addEventListener('pagehide',stop);
