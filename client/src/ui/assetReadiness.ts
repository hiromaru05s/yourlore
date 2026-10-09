import {withDeadline} from '../net/deadline';
import {playHomeEntrance} from './homeEntrance';
import {menuAssetUrls} from './menuAssets';
import {loadingScreen} from './loadingScreen';
import {loungeText} from './loungeText';
import {getLang} from '../i18n';
const decoded=new Map<string,Promise<void>>();
const loaded=new Set<string>();
const canonical=(url:string)=>new URL(url,location.href).href;
let menuReady=false;
export const isMenuReady=()=>menuReady;
export function decodeAsset(url:string):Promise<void>{
 url=canonical(url);let task=decoded.get(url);if(!task){const img=new Image();img.loading="eager";img.fetchPriority="high";img.src=url;task=withDeadline(img.decode()).then(()=>{loaded.add(url);}).catch(error=>{img.src="";decoded.delete(url);throw error;});decoded.set(url,task);}return task;
}
export function imageUrls(root:HTMLElement):string[]{
 const urls=new Set<string>();
 for(const el of [root,...root.querySelectorAll<HTMLElement>('*')]){
  if(el instanceof HTMLImageElement){el.loading='eager';el.fetchPriority='high';if(el.currentSrc||el.src)urls.add(el.currentSrc||el.src);}
  for(const pseudo of [null,'::before','::after']){const style=getComputedStyle(el,pseudo);if(pseudo&&(style.content==='none'||style.content==='normal'))continue;for(const m of style.backgroundImage.matchAll(/url\(["']?(.*?)["']?\)/g))urls.add(m[1]);}
 }
 return [...urls];
}
/** A failed network request keeps an explicit retry surface, never broken art. */
export async function waitAssets(urls:string[],host:HTMLElement,onProgress?:(done:number,total:number)=>void,signal?:AbortSignal):Promise<void>{
 const unique=[...new Set(urls)],complete=new Set<string>();
 onProgress?.(0,unique.length);
 while(host.isConnected&&!signal?.aborted){
  const remaining=unique.filter(url=>!complete.has(url));
  const result=await Promise.allSettled(Array.from({length:Math.min(8,remaining.length)},async()=>{
   let error:unknown;while(remaining.length&&host.isConnected&&!signal?.aborted){const url=remaining.shift()!;try{await withDeadline(decodeAsset(url),20000,signal);complete.add(url);onProgress?.(complete.size,unique.length);}catch(e){error=e;}}
   if(error)throw error;
  }));
  if(result.every(r=>r.status==='fulfilled')||!host.isConnected||signal?.aborted)return;
  await new Promise<void>(resolve=>{
   const retry=document.createElement('button');retry.className='asset-retry';retry.textContent=getLang()==='ja'?'画像の読み込みを再試行':getLang()==='ko'?'이미지 다시 불러오기':'Retry loading artwork';host.append(retry);
   const observer=new MutationObserver(()=>{if(!host.isConnected)finish();});observer.observe(document.body,{subtree:true,childList:true});
   const finish=()=>{observer.disconnect();signal?.removeEventListener('abort',finish);retry.remove();resolve();};retry.onclick=finish;
   signal?.addEventListener('abort',finish,{once:true});if(signal?.aborted||!host.isConnected)finish();
  });
 }
}
export const hasUnloadedAssets=(urls:string[])=>urls.some(url=>!loaded.has(canonical(url)));
export function coverScreen(root:HTMLElement,preloadMenu=false,homeEntrance=false,screenAssets=imageUrls(root)):{ready:()=>Promise<boolean>;cancel:()=>void}{
 const loading=loadingScreen('screen-loader',loungeText('書庫を開いています','Opening the library','서고를 여는 중')),cover=loading.element;
 document.body.append(cover);root.inert=true;root.setAttribute('aria-busy','true');const abort=new AbortController();
 const release=()=>{cover.remove();root.inert=false;root.removeAttribute('aria-busy');};
 const cancel=()=>{abort.abort();release();};
 return {cancel,ready:async()=>{
  await waitAssets([...screenAssets,...(preloadMenu?menuAssetUrls():[])],cover,(done,total)=>loading.update(total?done/total*94:94,loungeText(`画像の準備 ${done} / ${total}`,`Artwork ${done} / ${total}`,`이미지 준비 ${done} / ${total}`)),abort.signal);
  if(abort.signal.aborted)return false;
  loading.update(95,loungeText("画面を仕上げています","Finishing the scene","화면 마무리 중"));
  await withDeadline(document.fonts.ready,20000,abort.signal).catch(()=>{});await Promise.all([...root.querySelectorAll('img')].map(i=>withDeadline(i.decode()).catch(()=>{})));
  await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));
  if(abort.signal.aborted)return false;
  if(preloadMenu)menuReady=true;
  loading.update(100,loungeText("準備完了","Ready","준비 완료"));
  if(homeEntrance)await playHomeEntrance(root,cover,abort.signal);
  if(abort.signal.aborted)return false;
  release();document.dispatchEvent(new Event("lore:screen-ready"));return true;
 }};
}
const reveals=new WeakMap<HTMLElement,AbortController>();
export function cancelRevealCards(grid:HTMLElement):void {
 reveals.get(grid)?.abort();reveals.delete(grid);grid.removeAttribute('aria-busy');
}
/** Swap only the latest requested page; obsolete failed loads release their retry UI. */
export async function revealCards(grid:HTMLElement,nodes:Node[],current:()=>boolean):Promise<void>{
 cancelRevealCards(grid);
 const abort=new AbortController();reveals.set(grid,abort);
 const tray=document.createElement('div');tray.className='asset-tray';tray.append(...nodes);grid.append(tray);grid.setAttribute('aria-busy','true');
 try {
  await waitAssets(imageUrls(tray),grid,undefined,abort.signal);
  if(abort.signal.aborted)return;
  await Promise.all([...tray.querySelectorAll('img')].map(i=>withDeadline(i.decode(),20000,abort.signal).catch(()=>{})));
  if(!abort.signal.aborted&&current()&&grid.isConnected){grid.replaceChildren(...Array.from(tray.childNodes));grid.scrollTop=0;}
 } finally {
  tray.remove();
  if(reveals.get(grid)===abort){reveals.delete(grid);grid.removeAttribute('aria-busy');}
 }
}
