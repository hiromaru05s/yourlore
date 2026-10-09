import {FRAME_BACK} from '../../shared/cards';
import {captureCardSurface} from '../cardSurface';
import {boardMatrix,layoutRect} from '../boardProjection';
import {duration,motion} from './catalog';
import {isHexer,HEXER_SUMMON_VARIANT} from './selection';
import type {Renderer} from './renderer';
type Options={anchor?:HTMLElement;signal?:AbortSignal;onImpact?:()=>void};
const jobs=new Map<HTMLElement,{anchor:HTMLElement;cancel:()=>void}>();
let pool:{renderer:Renderer;users:number}|undefined;
function acquire(Type:new()=>Renderer){const entry=pool??={renderer:new Type(),users:0};entry.users++;let released=false;return{renderer:entry.renderer,release(){if(released)return;released=true;if(--entry.users===0){entry.renderer.dispose();if(pool===entry)pool=undefined;}}};}
export function cancelHexerSummon(source:HTMLElement){jobs.get(source)?.cancel();}
export function cancelHexerSummons(root?:HTMLElement){for(const [source,j] of [...jobs])if(!root||root.contains(source)||root.contains(j.anchor))j.cancel();}
/** Hide synchronously, rasterize offscreen, paint frame zero before mounting.
 * There is no native face/reveal/transfer between summon intent and this clock. */
export function playHexerSummon(source:HTMLElement,options:Options={}):Promise<boolean>{
 cancelHexerSummon(source);const id=source.dataset.cardId,anchor=options.anchor??source;
 if(!isHexer(id)||!source.isConnected||!anchor.isConnected||document.hidden||options.signal?.aborted)return Promise.resolve(false);
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){options.onImpact?.();return Promise.resolve(true);}
 const visibility=source.style.visibility;source.style.visibility='hidden';
 return new Promise(resolve=>{
  let ended=false,frame=0,impacted=false,host:HTMLCanvasElement|undefined,captureHost:HTMLElement|undefined,face:HTMLCanvasElement|undefined,lease:ReturnType<typeof acquire>|undefined;
  const impact=()=>{if(!impacted){impacted=true;options.onImpact?.();}};
  const finish=(complete=false)=>{if(ended)return;ended=true;clearTimeout(timeout);cancelAnimationFrame(frame);options.signal?.removeEventListener('abort',abort);host?.remove();captureHost?.remove();if(face)lease?.renderer.releaseFace(face);lease?.release();source.style.visibility=visibility;jobs.delete(source);resolve(complete);};
  const abort=()=>finish(),timeout=setTimeout(abort,10000);
  const fallback=(error:unknown)=>{if(ended)return;console.warn('[hexer-summon] Native card fallback',error);try{impact();}finally{finish();}};
  jobs.set(source,{anchor,cancel:abort});options.signal?.addEventListener('abort',abort,{once:true});
  void(async()=>{
   const {Renderer}=await import('./renderer');if(ended)return;lease=acquire(Renderer);
   captureHost=document.createElement('div');captureHost.className='game';captureHost.style.cssText='position:fixed;left:-4000px;top:0;width:180px;pointer-events:none';
   const copy=source.cloneNode(true) as HTMLElement;copy.removeAttribute('id');copy.removeAttribute('data-uid');copy.classList.remove('fx-field-ghost','fx-card-flight','cast-reveal');copy.style.cssText='position:relative;width:180px;height:270px;--cw:180px;--ch:270px;transform:none;opacity:1;visibility:visible';captureHost.append(copy);document.body.append(captureHost);
   const surface=await captureCardSurface(copy,FRAME_BACK,true,false);captureHost?.remove();captureHost=undefined;if(ended)return;
   if(!source.isConnected||!anchor.isConnected||document.hidden||options.signal?.aborted){finish();return;}if(!surface.face)throw Error('Public face unavailable');
   face=document.createElement('canvas');face.width=540;face.height=Math.round(540*surface.face.height/surface.face.width);face.getContext('2d')!.drawImage(surface.face,0,0,face.width,face.height);
   host=document.createElement('canvas');host.className='hexer-summon';host.dataset.cardId=id;host.dataset.variant='4';host.setAttribute('aria-hidden','true');host.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:136';host.width=innerWidth;host.height=innerHeight;const c=host.getContext('2d')!;
   const paint=(ms:number)=>{const plane=anchor.closest<HTMLElement>('[data-board-plane]'),box=plane?layoutRect(anchor):anchor.getBoundingClientRect();const matrix=(plane?boardMatrix(box.left+box.width/2,box.top+box.height/2,Number(plane.dataset.boardPlane)||0):new DOMMatrix().translate(box.left+box.width/2,box.top+box.height/2)).scale(box.width/180,-box.height/270,box.width/180);c.clearRect(0,0,host!.width,host!.height);lease!.renderer.drawBoard(c,face!,id,HEXER_SUMMON_VARIANT,ms,matrix,host!.width,host!.height);host!.dataset.time=String(Math.round(ms));};
   paint(0);document.body.append(host);const start=performance.now();
   const tick=(now:number)=>{try{if(ended)return;if(!source.isConnected||!anchor.isConnected||document.hidden||options.signal?.aborted){finish();return;}const ms=Math.min(duration(id),now-start);paint(ms);if(ms>=motion(id,0).contact){impact();if(ended)return;}if(ms===duration(id)){finish(true);return;}frame=requestAnimationFrame(tick);}catch(error){fallback(error);}};
   frame=requestAnimationFrame(tick);
  })().catch(fallback);
 });
}
window.addEventListener('resize',()=>cancelHexerSummons());
window.addEventListener('pagehide',()=>cancelHexerSummons());
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelHexerSummons();});
