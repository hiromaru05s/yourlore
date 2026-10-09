import {FRAME_BACK} from '../../shared/cards';
import {captureCardSurface,CARD_PADDING} from '../cardSurface';
import {boardMatrix,layoutRect} from '../boardProjection';
import {GolemRenderer} from './renderer';
import {DURATION,designs,ease} from './catalog';
import {isGolem} from './selection';

type Options={anchor?:HTMLElement;from?:DOMRect;reveal?:HTMLElement;signal?:AbortSignal;onImpact?:()=>void};
const jobs=new Map<HTMLElement,{anchor:HTMLElement;cancel:()=>void}>();
export function cancelGolem(source:HTMLElement){jobs.get(source)?.cancel();}
export function cancelGolems(root?:HTMLElement){for(const [source,job] of [...jobs])if(!root||root.contains(source)||root.contains(job.anchor))job.cancel();}
/** 01: the first visible frame is already stone, including hand-to-board travel. */
export function playGolem(source:HTMLElement,options:Options={}):Promise<boolean>{
 cancelGolem(source);const id=source.dataset.cardId,anchor=options.anchor??source;
 if(!isGolem(id)||!source.isConnected||!anchor.isConnected||document.hidden||options.signal?.aborted)return Promise.resolve(false);
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){options.onImpact?.();return Promise.resolve(true);}
 const visibility=source.style.visibility,revealVisibility=options.reveal?.style.visibility;
 // Hide synchronously, before any surface capture, image decode or animation frame.
 source.style.visibility='hidden';if(options.reveal)options.reveal.style.visibility='hidden';
 return new Promise(resolve=>{
  let ended=false,raf=0,impacted=false,renderer:GolemRenderer|undefined,captureHost:HTMLElement|undefined;
  const host=document.createElement('div');host.className='golem-summon';host.dataset.cardId=id;host.dataset.variant='1';host.setAttribute('aria-hidden','true');host.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:136';
  const canvas=document.createElement('canvas');const dpr=Math.min(devicePixelRatio,1.5);canvas.width=Math.round(innerWidth*dpr);canvas.height=Math.round(innerHeight*dpr);canvas.style.cssText='width:100%;height:100%';host.append(canvas);document.body.append(host);
  const impact=()=>{if(!impacted){impacted=true;options.onImpact?.();}};
  const finish=(complete=false)=>{if(ended)return;ended=true;clearTimeout(timeout);cancelAnimationFrame(raf);options.signal?.removeEventListener('abort',abort);window.removeEventListener('resize',abort);window.removeEventListener('pagehide',abort);document.removeEventListener('visibilitychange',hidden);host.remove();captureHost?.remove();renderer?.dispose();source.style.visibility=visibility;if(options.reveal)options.reveal.style.visibility=revealVisibility??'';jobs.delete(source);resolve(complete);};
  const abort=()=>finish(),hidden=()=>{if(document.hidden)finish();},timeout=setTimeout(abort,10000);
  jobs.set(source,{anchor,cancel:abort});options.signal?.addEventListener('abort',abort,{once:true});window.addEventListener('resize',abort);window.addEventListener('pagehide',abort);document.addEventListener('visibilitychange',hidden);
  const paint=(ms:number)=>{
   const plane=anchor.closest<HTMLElement>('[data-board-plane]');const box=plane?layoutRect(anchor):anchor.getBoundingClientRect();
   const end=(plane?boardMatrix(box.left+box.width/2,box.top+box.height/2,Number(plane.dataset.boardPlane)||0):new DOMMatrix().translate(box.left+box.width/2,box.top+box.height/2)).scale(box.width,-box.height/1.5625,box.width);
   const travel=options.from?440:0,from=options.from;
   let matrix=end;
   if(from&&ms<travel){const begin=new DOMMatrix().translate(from.left+from.width/2,from.top+from.height/2).scale(from.width,-from.height/1.5625,from.width);const a=Array.from(begin.toFloat64Array()),b=Array.from(end.toFloat64Array()),u=ease(0,travel,ms);matrix=new DOMMatrix(a.map((n,i)=>n+(b[i]-n)*u));}
   canvas.getContext('2d')!.clearRect(0,0,canvas.width,canvas.height);renderer!.drawBoard(canvas,0,Math.max(0,ms-travel),matrix);host.dataset.time=String(Math.round(ms));
  };
  void(async()=>{
   renderer=new GolemRenderer(id);paint(0); // Stone can render before the public face finishes loading.
   captureHost=document.createElement('div');captureHost.className='game';captureHost.style.cssText='position:fixed;left:-4000px;top:0;width:180px;pointer-events:none';
   const copy=source.cloneNode(true) as HTMLElement;copy.removeAttribute('id');copy.removeAttribute('data-uid');copy.classList.remove('fx-field-ghost','fx-card-flight','cast-reveal');copy.style.cssText='position:relative;width:180px;height:281.25px;--cw:180px;--ch:281.25px;transform:none;opacity:1;visibility:visible';captureHost.append(copy);document.body.append(captureHost);
   const surface=await captureCardSurface(copy,FRAME_BACK,true,false);captureHost.remove();captureHost=undefined;
   if(ended)return;if(!surface.face)throw Error('Public golem face unavailable');
   // Match the reviewed renderer's unpadded 1 : 1.5625 card surface exactly.
   const face=document.createElement('canvas');face.width=768;face.height=1200;const sw=surface.face.width/(1+CARD_PADDING*2),pad=sw*CARD_PADDING;
   face.getContext('2d')!.drawImage(surface.face,pad,pad,sw,sw*1.5625,0,0,768,1200);renderer.setFace(id,face);
   const travel=options.from?440:0,start=performance.now();
   const tick=(now:number)=>{try{if(ended)return;if(!source.isConnected||!anchor.isConnected||document.hidden||options.signal?.aborted){finish();return;}const ms=Math.max(0,Math.min(DURATION+travel,now-start));paint(ms);if(ms>=travel+designs[0].hit)impact();if(ended)return;if(ms>=DURATION+travel){finish(true);return;}raf=requestAnimationFrame(tick);}catch(error){console.warn('[golem] Native card fallback',error);try{impact();}finally{finish();}}};tick(start);
  })().catch(error=>{if(!ended){console.warn('[golem] Native card fallback',error);try{impact();}finally{finish();}}});
 });
}
