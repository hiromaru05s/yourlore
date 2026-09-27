import {getLang} from '../i18n';
const decoded=new Map<string,Promise<void>>();
export function decodeAsset(url:string):Promise<void>{
 let task=decoded.get(url);if(!task){const img=new Image();img.src=url;task=img.decode().then(()=>{}).catch(error=>{decoded.delete(url);throw error;});decoded.set(url,task);}return task;
}
export function imageUrls(root:HTMLElement):string[]{
 const urls=new Set<string>();
 for(const el of [root,...root.querySelectorAll<HTMLElement>('*')]){
  if(el instanceof HTMLImageElement){el.loading='eager';if(el.currentSrc||el.src)urls.add(el.currentSrc||el.src);}
  for(const pseudo of [null,'::before','::after'])for(const m of getComputedStyle(el,pseudo).backgroundImage.matchAll(/url\(["']?(.*?)["']?\)/g))urls.add(m[1]);
 }
 return [...urls];
}
/** A failed network request keeps an explicit retry surface, never broken art. */
export async function waitAssets(urls:string[],host:HTMLElement):Promise<void>{
 while(host.isConnected){
  const result=await Promise.allSettled(urls.map(decodeAsset));
  if(result.every(r=>r.status==='fulfilled'))return;
  await new Promise<void>(resolve=>{
   const retry=document.createElement('button');retry.className='asset-retry';retry.textContent=getLang()==='ja'?'画像の読み込みを再試行':getLang()==='ko'?'이미지 다시 불러오기':'Retry loading artwork';host.append(retry);
   const observer=new MutationObserver(()=>{if(!host.isConnected)finish();});observer.observe(document.body,{subtree:true,childList:true});
   const finish=()=>{observer.disconnect();retry.remove();resolve();};retry.onclick=finish;
  });
 }
}
export function coverScreen(root:HTMLElement):{ready:()=>Promise<void>;cancel:()=>void}{
 const cover=document.createElement('div');cover.className='screen-loader';cover.setAttribute('role','status');
 cover.innerHTML=`<img src="/art/brand/lore-logo-transparent.png" alt="LORE"><span>${getLang()==='ja'?'書庫を開いています':getLang()==='ko'?'서고를 여는 중':'Opening the library'}</span><i></i>`;
 document.body.append(cover);root.inert=true;root.setAttribute('aria-busy','true');let cancelled=false;
 const cancel=()=>{cancelled=true;cover.remove();root.inert=false;root.removeAttribute('aria-busy');};
 return {cancel,ready:async()=>{await waitAssets(imageUrls(root),cover);if(cancelled)return;await document.fonts.ready;await Promise.all([...root.querySelectorAll('img')].map(i=>i.decode().catch(()=>{})));await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));cancel();}};
}
/** Swap a page of cards only after every image has decoded. Old cards stay visible. */
export async function revealCards(grid:HTMLElement,nodes:Node[],current:()=>boolean):Promise<void>{
 const tray=document.createElement('div');tray.className='asset-tray';tray.append(...nodes);grid.append(tray);grid.setAttribute('aria-busy','true');
 await waitAssets(imageUrls(tray),grid);
 await Promise.all([...tray.querySelectorAll('img')].map(i=>i.decode().catch(()=>{})));
 if(current()&&grid.isConnected){grid.replaceChildren(...Array.from(tray.childNodes));grid.removeAttribute('aria-busy');grid.scrollTop=0;}else tray.remove();
}
