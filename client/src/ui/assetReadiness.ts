import {assetHints} from './assetHints';
import {withDeadline} from '../net/deadline';
import {playHomeEntrance} from './homeEntrance';
import {loadingScreen} from './loadingScreen';
import {loungeText} from './loungeText';
import {getLang} from '../i18n';
import {decodeAsset as decodeImage} from './imageAssets';
export {hasUnloadedAssets} from './imageAssets';
export const decodeAsset=(url:string)=>decodeImage(url);
let menuReady=false;
export const isMenuReady=()=>menuReady;
export function imageUrls(root:HTMLElement):string[]{
 const urls=new Set<string>(),pending:Element[]=[root];
 while(pending.length){
  const el=pending.pop()!,base=getComputedStyle(el);
  // Visibility/opacity may hide prepared entrance actors; display:none is absent.
  if(base.display==='none')continue;
  const declared=assetHints.get(el);
  if(declared){for(const url of declared())if(url)urls.add(url);continue;}
  if(el instanceof HTMLImageElement){el.loading='eager';el.fetchPriority='high';if(el.currentSrc||el.src)urls.add(el.currentSrc||el.src);}
  for(const pseudo of [null,'::before','::after']){const style=pseudo?getComputedStyle(el,pseudo):base;if(style.display==='none'||pseudo&&(style.content==='none'||style.content==='normal'))continue;for(const m of style.backgroundImage.matchAll(/url\(["']?(.*?)["']?\)/g))urls.add(m[1]);}
  pending.push(...Array.from(el.children).reverse());
 }
 return [...urls];
}
/** A failed network request keeps an explicit retry surface, never broken art. */
export async function waitAssets(urls:string[],host:HTMLElement,onProgress?:(done:number,total:number)=>void,signal?:AbortSignal):Promise<void>{
 const unique=[...new Set(urls.map(url=>new URL(url,location.href).href))],complete=new Set<string>();
 let attempts=0;
 onProgress?.(0,unique.length);
 while(host.isConnected&&!signal?.aborted){
  const remaining=unique.filter(url=>!complete.has(url));
  const result=await Promise.allSettled(Array.from({length:Math.min(8,remaining.length)},async()=>{
   let error:unknown;while(remaining.length&&host.isConnected&&!signal?.aborted){const url=remaining.shift()!;try{await withDeadline(decodeAsset(url),20000,signal);complete.add(url);onProgress?.(complete.size,unique.length);}catch(e){error=e;}}
   if(error)throw error;
  }));
  if(result.every(r=>r.status==='fulfilled')||!host.isConnected||signal?.aborted)return;
  if(++attempts<3)continue;
  await new Promise<void>(resolve=>{
   const retry=document.createElement('button');retry.className='asset-retry';retry.textContent=getLang()==='ja'?'画像の読み込みを再試行':getLang()==='ko'?'이미지 다시 불러오기':'Retry loading artwork';host.append(retry);
   const observer=new MutationObserver(()=>{if(!host.isConnected)finish();});observer.observe(document.body,{subtree:true,childList:true});
   const finish=()=>{observer.disconnect();signal?.removeEventListener('abort',finish);retry.remove();resolve();};retry.onclick=()=>{attempts=0;finish();};signal?.addEventListener('abort',finish,{once:true});if(signal?.aborted||!host.isConnected)finish();
  });
 }
}
export function coverScreen(root:HTMLElement,firstMenu=false,homeEntrance=false,screenAssets=imageUrls(root)):{ready:()=>Promise<boolean>;cancel:()=>void}{
 const loading=loadingScreen('screen-loader',loungeText('書庫を開いています','Opening the library','서고를 여는 중')),cover=loading.element;
 document.body.append(cover);root.inert=true;root.setAttribute('aria-busy','true');const abort=new AbortController();
 const release=()=>{cover.remove();root.inert=false;root.removeAttribute('aria-busy');};
 const cancel=()=>{abort.abort();release();};
 return {cancel,ready:async()=>{
  await waitAssets(screenAssets,cover,(done,total)=>loading.update(total?done/total*94:94,loungeText(`画像の準備 ${done} / ${total}`,`Artwork ${done} / ${total}`,`이미지 준비 ${done} / ${total}`)),abort.signal);
  if(abort.signal.aborted)return false;
  loading.update(95,loungeText("画面を仕上げています","Finishing the scene","화면 마무리 중"));
  await withDeadline(document.fonts.ready,20000,abort.signal).catch(()=>{});
  // imageUrls promotes rendered images to eager. Hidden tutorial chapters keep
  // lazy images that browsers intentionally do not fetch: decoding those waits
  // until timeout even when every visible asset is already prepared.
  await Promise.all([...root.querySelectorAll('img')].filter(i=>i.loading!=='lazy').map(i=>withDeadline(i.decode(),20000,abort.signal).catch(()=>{})));
  await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));
  if(abort.signal.aborted)return false;
  if(firstMenu)menuReady=true;
  // The visible HOME's first complete GPU frame belongs to this screen gate;
  // unrelated duel and catalogue preparation does not. Cancel releases observers.
  if(homeEntrance)await new Promise<void>(resolve=>{
   const finish=()=>{observer.disconnect();abort.signal.removeEventListener('abort',finish);resolve();};
   const check=()=>{if(abort.signal.aborted||!root.isConnected||!root.querySelector('[data-atmosphere="loading"]'))finish();};
   const observer=new MutationObserver(check);observer.observe(root,{subtree:true,attributes:true,attributeFilter:['data-atmosphere'],childList:true});
   abort.signal.addEventListener('abort',finish,{once:true});check();
  });
  if(abort.signal.aborted)return false;
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
