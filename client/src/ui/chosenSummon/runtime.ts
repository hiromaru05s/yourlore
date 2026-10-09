import {FRAME_BACK} from '../../shared/cards';
import {captureCardSurface} from '../cardSurface';
import {boardMatrix,layoutRect,projectedPlacement} from '../boardProjection';
import {DURATION,designs,lift} from './catalog';
import {chosenHero,CHOSEN_SUMMON_VARIANT as VARIANT} from './selection';
import type {Renderer} from './renderer';

type Options={anchor?:HTMLElement;signal?:AbortSignal;onImpact?:()=>void};
const jobs=new Map<HTMLElement,{anchor:HTMLElement;cancel:()=>void}>();
// Simultaneous summons share one GPU context; every captured face remains job-owned.
let pool:{renderer:Renderer;users:number}|undefined;
function acquire(rendererType:new()=>Renderer){
 const entry=pool??=( {renderer:new rendererType(),users:0} );entry.users++;
 let released=false;
 return{renderer:entry.renderer,release(){if(released)return;released=true;if(--entry.users===0){entry.renderer.dispose();if(pool===entry)pool=undefined;}}};
}
export function chosenPlacement(anchor:HTMLElement,w:number,h:number,ms=0,reduced=false){
 const amount=reduced?0:lift(ms,VARIANT),plane=anchor.closest<HTMLElement>('[data-board-plane]');
 if(!plane)return projectedPlacement(anchor,w,h).translate(0,-amount*w);
 const box=layoutRect(anchor);
 return boardMatrix(box.left,box.top,(Number(plane.dataset.boardPlane)||0)+amount*box.width).scale(box.width/w,box.height/h);
}
export function cancelChosenSummon(source:HTMLElement){jobs.get(source)?.cancel();}
export function cancelChosenSummons(root?:HTMLElement){for(const [source,j] of [...jobs])if(!root||root.contains(source)||root.contains(j.anchor))j.cancel();}
export function playChosenSummon(source:HTMLElement,options:Options={}):Promise<boolean>{
 cancelChosenSummon(source);
 const hero=chosenHero(source.dataset.cardId),anchor=options.anchor??source;
 if(hero<0||!source.isConnected||!anchor.isConnected||document.hidden||options.signal?.aborted)return Promise.resolve(false);
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){options.onImpact?.();return Promise.resolve(true);}
 return new Promise(resolve=>{
  const visibility=source.style.visibility;
  let ended=false,frame=0,impacted=false,host:HTMLElement|undefined,captureHost:HTMLElement|undefined,face:HTMLCanvasElement|undefined,lease:ReturnType<typeof acquire>|undefined;
  const impact=()=>{if(!impacted){impacted=true;options.onImpact?.();}};
  const finish=(complete=false)=>{
   if(ended)return;ended=true;clearTimeout(timeout);cancelAnimationFrame(frame);options.signal?.removeEventListener('abort',abort);
   host?.remove();captureHost?.remove();if(face)lease?.renderer.releaseFace(face);lease?.release();source.style.visibility=visibility;jobs.delete(source);resolve(complete);
  };
  const abort=()=>finish(false),timeout=setTimeout(abort,10000);
  const fallback=(error:unknown)=>{if(ended)return;console.warn('[chosen-summon] Native card fallback',error);try{impact();}finally{finish(false);}};
  jobs.set(source,{anchor,cancel:abort});options.signal?.addEventListener('abort',abort,{once:true});
  void(async()=>{
   const {Renderer}=await import('./renderer');if(ended)return;
   lease=acquire(Renderer);await lease.renderer.ready;if(ended)return;
   captureHost=document.createElement('div');captureHost.className='game';captureHost.style.cssText='position:fixed;left:-4000px;top:0;width:180px;pointer-events:none';
   const copy=source.cloneNode(true) as HTMLElement;copy.removeAttribute('id');copy.removeAttribute('data-uid');copy.classList.remove('fx-field-ghost','fx-card-flight','cast-reveal');
   copy.style.cssText='position:relative;width:180px;height:270px;--cw:180px;--ch:270px;transform:none;opacity:1;visibility:visible';captureHost.append(copy);document.body.append(captureHost);
   const surface=await captureCardSurface(copy,FRAME_BACK,true,false);captureHost?.remove();captureHost=undefined;if(ended)return;
   if(!source.isConnected||!anchor.isConnected||document.hidden||options.signal?.aborted){finish();return;}if(!surface.face)throw Error('Public card surface unavailable');
   face=document.createElement('canvas');face.width=540;face.height=810;face.getContext('2d')!.drawImage(surface.face,0,0,540,810);
   host=document.createElement('div');host.className='chosen-hero-summon';host.dataset.cardId=source.dataset.cardId;host.dataset.variant='1';host.setAttribute('aria-hidden','true');host.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:136;isolation:isolate';
   const planes=(['ground','card'] as const).map(pass=>{const el=document.createElement('div');el.dataset.chosenPass=pass;el.style.cssText='position:absolute;left:0;top:0;width:180px;height:270px;transform-origin:0 0';const canvas=document.createElement('canvas');canvas.width=canvas.height=684;canvas.style.cssText='position:absolute;left:-252px;top:-207px;width:684px;height:684px';el.append(canvas);host!.append(el);return{el,c:canvas.getContext('2d')!,pass};});
   document.body.append(host);source.style.visibility='hidden';const start=performance.now();let lastPaint=-Infinity;
   const tick=(now:number)=>{try{
    if(ended)return;if(!source.isConnected||!anchor.isConnected||document.hidden||options.signal?.aborted){finish();return;}
    const ms=Math.min(DURATION,now-start);host!.dataset.time=String(Math.round(ms));if(ms>=designs[VARIANT].hit){impact();if(ended)return;}
    if(now-lastPaint>=1000/30){lastPaint=now;for(const {el,c,pass} of planes){el.style.transform=(pass==='ground'?projectedPlacement(anchor,180,270):chosenPlacement(anchor,180,270,ms)).toString();c.clearRect(0,0,684,684);lease!.renderer.draw(c,face!,hero,VARIANT,ms,342,342,180,false,pass,false);}}
    if(ms===DURATION){finish(true);return;}frame=requestAnimationFrame(tick);
   }catch(error){fallback(error);}};tick(start);
  })().catch(fallback);
 });
}
window.addEventListener('resize',()=>cancelChosenSummons());
window.addEventListener('pagehide',()=>cancelChosenSummons());
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelChosenSummons();});
