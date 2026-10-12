import {FRAME_BACK} from '../../shared/cards';
import {captureCardSurface} from '../cardSurface';
import {MERCHANT_VARIANT,isDarkMerchant} from './selection';
import type {DarkRenderer} from './darkRenderer';
import type {ContactSound} from './sound';
const active=new Map<HTMLElement,()=>void>();
let artwork:Promise<HTMLImageElement>|undefined;
function loadArt(){return artwork??=new Promise<HTMLImageElement>((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>{artwork=undefined;reject(Error('Merchant art unavailable'));};im.src='/vfx/merchant/balance.png';});}
export function warmDarkMerchant(){void Promise.all([loadArt(),import('./darkRenderer'),import('./sound')]).catch(()=>{});}
export function cancelDarkMerchants(){for(const cancel of [...active.values()])cancel();}
/** Owns the expanded spell reveal, including its flight from the public source card. */
export function playDarkMerchant(card:HTMLElement,signal?:AbortSignal):Promise<boolean>{
 active.get(card)?.();
 if(!isDarkMerchant(card.dataset.cardId)||!card.isConnected||signal?.aborted||document.hidden)return Promise.resolve(false);
 // Native focusCard remains the accessible reduced-motion and renderer fallback.
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return Promise.resolve(false);
 return new Promise(resolve=>{
  let done=false,frame=0,renderer:DarkRenderer|undefined,sound:ContactSound|undefined,host:HTMLCanvasElement|undefined,capture:HTMLElement|undefined;
  const visibility=card.style.visibility;
  const finish=(complete=false)=>{if(done)return;done=true;clearTimeout(deadline);cancelAnimationFrame(frame);signal?.removeEventListener('abort',abort);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('resize',abort);window.removeEventListener('pagehide',abort);host?.remove();capture?.remove();renderer?.dispose();sound?.dispose();card.style.visibility=visibility;if(active.get(card)===abort)active.delete(card);resolve(complete);};
  const abort=()=>finish(),hidden=()=>{if(document.hidden)abort();},deadline=setTimeout(abort,10000);
  active.set(card,abort);signal?.addEventListener('abort',abort,{once:true});document.addEventListener('visibilitychange',hidden);window.addEventListener('resize',abort);window.addEventListener('pagehide',abort);
  void(async()=>{
   const from=card.getBoundingClientRect();
   capture=document.createElement('div');capture.className='game';capture.style.cssText='position:fixed;left:-4000px;top:0;width:180px;pointer-events:none';
   const copy=card.cloneNode(true) as HTMLElement;copy.removeAttribute('id');copy.removeAttribute('data-uid');copy.classList.remove('fx-card-flight','cast-reveal');copy.style.cssText='position:relative;width:180px;height:270px;--cw:180px;--ch:270px;transform:none;opacity:1;visibility:visible';capture.append(copy);document.body.append(capture);
   const [surface,art,visual,audio]=await Promise.all([captureCardSurface(copy,FRAME_BACK,true,false),loadArt(),import('./darkRenderer'),import('./sound')]);
   capture.remove();capture=undefined;if(done)return;if(!surface.face||!card.isConnected||signal?.aborted){finish();return;}
   const face=document.createElement('canvas');face.width=540;face.height=Math.round(540*1.74/1.24);face.getContext('2d')!.drawImage(surface.face,0,0,face.width,face.height);
   renderer=new visual.DarkRenderer([art]);sound=new audio.ContactSound(12,true);
   host=document.createElement('canvas');host.className='dark-merchant-reveal';host.dataset.variant='3';host.setAttribute('aria-hidden','true');host.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:136';
   const w=innerWidth,h=innerHeight,dpr=Math.min(devicePixelRatio||1,1.5);host.width=Math.round(w*dpr);host.height=Math.round(h*dpr);const c=host.getContext('2d')!;c.scale(dpr,dpr);
   document.body.append(host);card.style.visibility='hidden';
   const start=performance.now();let lastPaint=-Infinity;
   const tick=(now:number)=>{if(done)return;if(!card.isConnected||signal?.aborted||document.hidden){abort();return;}
    try{const ms=Math.max(0,Math.min(6600,now-start));host!.dataset.time=String(Math.round(ms));sound!.advance(ms);
     if(now-lastPaint>=1000/30){lastPaint=now;c.clearRect(0,0,w,h);renderer!.dark(c,face,MERCHANT_VARIANT,Math.min(ms,6599),w,h,false,true,{x:from.left+from.width/2,y:from.top+from.height/2,w:from.width},true);}
     if(ms>=6600){
      // Continue the same readable face into the existing discard/rift flight.
      const scale=Math.min(w/960,h/650),cw=Math.max(scale*138,Math.min(w*.29,110));
      const nw=card.offsetWidth||100,nh=card.offsetHeight||150,targetW=cw*.98;
      card.style.transition='none';card.style.transformOrigin='0 0';card.style.left=`${w/2-targetW/2}px`;card.style.top=`${h*.49-scale*12-targetW*nh/nw/2}px`;card.style.transform=`scale(${targetW/nw})`;finish(true);return;
     }frame=requestAnimationFrame(tick);
    }catch(error){console.warn('[merchant] Native spell fallback',error);abort();}
   };tick(start);
  })().catch(error=>{if(!done)console.warn('[merchant] Native spell fallback',error);finish();});
 });
}
