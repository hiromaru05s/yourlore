/** Bounded pack transfer. A slow but progressing response must not be discarded
 * and downloaded again as individual originals. Only inactivity times out. */
export async function fetchAssetPack(url:string,bytes:number,idleMs=60000):Promise<ArrayBuffer>{
 if(!Number.isSafeInteger(bytes)||bytes<=0||bytes>64*1024*1024)throw Error('Invalid artwork pack size');
 const abort=new AbortController();let timer:ReturnType<typeof setTimeout>,reader:ReadableStreamDefaultReader<Uint8Array>|undefined;
 const touch=()=>{clearTimeout(timer);timer=setTimeout(()=>abort.abort(new DOMException('Artwork transfer stalled','TimeoutError')),idleMs);};
 touch();
 try{
  const response=await fetch(url,{cache:'no-store',headers:{'X-Lore-Asset-Preload':'1'},signal:abort.signal});
  if(!response.ok||!response.body)throw Error('Artwork pack unavailable');
  reader=response.body.getReader();const data=new Uint8Array(bytes);let offset=0;
  while(true){
   const chunk=await reader.read();if(chunk.done)break;
   if(chunk.value.byteLength){touch();if(offset+chunk.value.byteLength>bytes)throw Error('Oversized artwork pack');data.set(chunk.value,offset);offset+=chunk.value.byteLength;}
  }
  if(offset!==bytes)throw Error('Incomplete artwork pack');
  return data.buffer;
 }catch(error){abort.abort();await reader?.cancel().catch(()=>{});throw error;}
 finally{clearTimeout(timer!);reader?.releaseLock();}
}
