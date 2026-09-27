import {loadingScreen} from './loadingScreen';
import {loungeText} from './loungeText';
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
export async function waitAssets(urls:string[],host:HTMLElement,onProgress?:(done:number,total:number)=>void):Promise<void>{
 const unique=[...new Set(urls)],complete=new Set<string>();
 onProgress?.(0,unique.length);
 while(host.isConnected){
  const result=await Promise.allSettled(unique.map(async url=>{await decodeAsset(url);complete.add(url);onProgress?.(complete.size,unique.length);}));
  if(result.every(r=>r.status==='fulfilled'))return;
  await new Promise<void>(resolve=>{
   const retry=document.createElement('button');retry.className='asset-retry';retry.textContent=getLang()==='ja'?'画像の読み込みを再試行':getLang()==='ko'?'이미지 다시 불러오기':'Retry loading artwork';host.append(retry);
   const observer=new MutationObserver(()=>{if(!host.isConnected)finish();});observer.observe(document.body,{subtree:true,childList:true});
   const finish=()=>{observer.disconnect();retry.remove();resolve();};retry.onclick=finish;
  });
 }
}
export function coverScreen(root:HTMLElement):{ready:()=>Promise<void>;cancel:()=>void}{
 const loading=loadingScreen('screen-loader',loungeText('書庫を開いています','Opening the library','서고를 여는 중')),cover=loading.element;
 document.body.append(cover);root.inert=true;root.setAttribute('aria-busy','true');let cancelled=false;
 const cancel=()=>{cancelled=true;cover.remove();root.inert=false;root.removeAttribute('aria-busy');};
 return {cancel,ready:async()=>{await waitAssets(imageUrls(root),cover,(done,total)=>loading.update(total?done/total*94:94,loungeText(`画像の準備 ${done} / ${total}`,`Artwork ${done} / ${total}`,`이미지 준비 ${done} / ${total}`)));if(cancelled)return;loading.update(95,loungeText("画面を仕上げています","Finishing the scene","화면 마무리 중"));await document.fonts.ready;await Promise.all([...root.querySelectorAll('img')].map(i=>i.decode().catch(()=>{})));await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));loading.update(100,loungeText("準備完了","Ready","준비 완료"));cancel();document.dispatchEvent(new Event("lore:screen-ready"));}};
}
/** Swap a page of cards only after every image has decoded. Old cards stay visible. */
export async function revealCards(grid:HTMLElement,nodes:Node[],current:()=>boolean):Promise<void>{
 const tray=document.createElement('div');tray.className='asset-tray';tray.append(...nodes);grid.append(tray);grid.setAttribute('aria-busy','true');
 await waitAssets(imageUrls(tray),grid);
 await Promise.all([...tray.querySelectorAll('img')].map(i=>i.decode().catch(()=>{})));
 if(current()&&grid.isConnected){grid.replaceChildren(...Array.from(tray.childNodes));grid.removeAttribute('aria-busy');grid.scrollTop=0;}else tray.remove();
}
