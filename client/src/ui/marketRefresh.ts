import type {GameState} from '../shared/types';
import {FRAME_BACK} from '../shared/cards';
import '../styles/market-refresh.css';

/** Full replacement of the current public offers, including free refreshes.
 * Purchases, turn changes, rejected actions and reconnect renders are excluded. */
export function supplyWasRefreshed(before:GameState,after:GameState):boolean {
  if(before===after||before.turn!==after.turn||before.cur!==after.cur||after.over)return false;
  const old=before.players[before.cur].supply,next=after.players[after.cur].supply;
  const uids=new Set(old.filter(c=>c!==null).map(c=>c.uid));
  const filled=next.filter(c=>c!==null);
  return filled.length>0&&next.length===old.length&&filled.every(c=>!uids.has(c.uid));
}

function faceClone(element:HTMLElement):HTMLElement {
  const clone=element.cloneNode(true) as HTMLElement;
  for(const node of [clone,...clone.querySelectorAll<HTMLElement>('*')]){
    node.removeAttribute('id');node.removeAttribute('data-uid');node.removeAttribute('data-sup-idx');
    node.removeAttribute('tabindex');
  }
  clone.classList.remove('is-armed');
  // cloneNode does not copy cardEl's onload callback. Newly decoded artwork
  // must also leave the loading state on the animated copy, before its reveal.
  for(const img of clone.querySelectorAll<HTMLImageElement>('.card-art-img')){
    const reveal=()=>{img.classList.add('art-loaded');img.parentElement?.classList.add('art-done');};
    img.loading='eager';
    if(img.complete&&img.naturalWidth)reveal();else img.addEventListener('load',reveal,{once:true});
  }
  return clone;
}

export function captureSupplyFaces(root:HTMLElement):HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>('#supplyMarket > .card,#supplyMarket > .slot')].map(faceClone);
}

const clamp=(t:number)=>Math.max(0,Math.min(1,t));
const smooth=(t:number)=>{t=clamp(t);return t*t*(3-2*t);};
export const MARKET_REFRESH_MS=780;
export const MARKET_REFRESH_STAGGER_MS=55;

/** Both faces, edge lighting and height use one clock. The face changes only
 * while the opaque card back is facing the viewer. No game state is mutated. */
export function playSupplyRefresh(root:HTMLElement,oldFaces:HTMLElement[],rate=1):{done:Promise<void>;cancel:()=>void} {
  const supply=root.querySelector<HTMLElement>('#supplyMarket');
  const targets=supply?[...supply.querySelectorAll<HTMLElement>(':scope > .card,:scope > .slot')]:[];
  if(!supply||!targets.length||document.hidden)return {done:Promise.resolve(),cancel(){}};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const speed=Math.max(.1,Math.min(4,rate));
  const total=(reduced?160:MARKET_REFRESH_MS+(targets.length-1)*MARKET_REFRESH_STAGGER_MS)/speed;
  const oldInert=supply.inert;
  root.querySelector('#market')?.classList.remove('reroll-focus');
  supply.dataset.marketRefresh='playing';supply.setAttribute('aria-busy','true');
  // Only offers that are still face down are unavailable. All other controls,
  // including another refresh, retain the controller's fast-forward behavior.
  supply.inert=true;
  const layer=document.createElement('div');layer.className='market-refresh-layer';layer.setAttribute('aria-hidden','true');
  const tiles=targets.map((target,i)=>{
    const tile=document.createElement('div');tile.className='market-refresh-tile';
    const width=target.offsetWidth,height=target.offsetHeight;
    tile.style.cssText=`left:${target.offsetLeft}px;top:${target.offsetTop}px;width:${width}px;height:${height}px;--cw:${width}px;--ch:${height}px;`;
    const shadow=document.createElement('div');shadow.className='market-refresh-shadow';
    const body=document.createElement('div');body.className='market-refresh-body';
    const old=document.createElement('div');old.className='market-refresh-front';old.append(oldFaces[i]??faceClone(target));
    const next=document.createElement('div');next.className='market-refresh-front';next.append(faceClone(target));next.style.visibility='hidden';
    const back=document.createElement('div');back.className='market-refresh-back';back.style.backgroundImage=`url("${FRAME_BACK}")`;
    const edge=document.createElement('div');edge.className='market-refresh-edge';
    body.append(old,next,back,edge);tile.append(shadow,body);layer.append(tile);
    const visibility=target.style.visibility;target.style.visibility='hidden';
    return {target,visibility,tile,body,old,next,shadow,width};
  });
  supply.append(layer);
  let frame=0,timer=0,finished=false;
  let resolve!:()=>void;
  const done=new Promise<void>(r=>{resolve=r;});
  const cancel=()=>{
    if(finished)return;finished=true;cancelAnimationFrame(frame);clearTimeout(timer);
    layer.remove();tiles.forEach(({target,visibility})=>{target.style.visibility=visibility;});
    supply.inert=oldInert;delete supply.dataset.marketRefresh;supply.removeAttribute('aria-busy');
    window.removeEventListener('resize',cancel);document.removeEventListener('visibilitychange',cancel);
    resolve();
  };
  const start=performance.now();
  const tick=(now:number)=>{
    if(!supply.isConnected){cancel();return;}
    const elapsed=(now-start)*speed;
    for(let i=0;i<tiles.length;i++){
      const {body,old,next,shadow,width}=tiles[i];
      const age=Math.max(0,elapsed-i*MARKET_REFRESH_STAGGER_MS);
      if(reduced){
        old.style.opacity=String(1-clamp(elapsed/160));next.style.visibility='visible';next.style.opacity=String(clamp(elapsed/160));
        continue;
      }
      const rotation=360*smooth((age-95)/510);
      const lift=smooth(age/170)*(1-smooth((age-560)/220));
      const settle=Math.sin(clamp((age-605)/175)*Math.PI)*1.2;
      old.style.visibility=rotation<180?'visible':'hidden';next.style.visibility=rotation>=180?'visible':'hidden';
      body.style.transform=`translate3d(0,${-width*.08*lift}px,${1+width*.24*lift-settle}px) rotateY(${rotation}deg) rotateZ(${-2.5*Math.sin(rotation*Math.PI/180)}deg)`;
      body.style.setProperty('--refresh-glint',String(Math.sin(clamp(age/700)*Math.PI)*.58));
      shadow.style.opacity=String(.23-.11*lift);shadow.style.transform=`translateY(${width*.06*lift}px) scale(${1+.12*lift},${1+.06*lift})`;
    }
    if(now-start>=total)cancel();else frame=requestAnimationFrame(tick);
  };
  window.addEventListener('resize',cancel);document.addEventListener('visibilitychange',cancel);
  // Also release on suspended rAF / a hidden tab, and on controller teardown.
  timer=window.setTimeout(cancel,total+250);tick(start);
  return {done,cancel};
}
