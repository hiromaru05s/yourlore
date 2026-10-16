import {settleSummonFace} from '../summon/quality';
import {FRAME_BACK} from '../../shared/cards';
import {captureCardSurface,CARD_PADDING} from '../cardSurface';
import {voidPlacement} from './placement';
import {isVoidSummon,VOID_SUMMON_DURATION,VOID_SUMMON_IMPACT} from './selection';
import type {VoidRenderer} from './renderer';
type Options={anchor?:HTMLElement;signal?:AbortSignal;onImpact?:()=>void};
const jobs=new Map<HTMLElement,{anchor:HTMLElement;cancel:()=>void}>();
let pool:{renderer:VoidRenderer;users:number}|undefined;
function acquire(Type:typeof VoidRenderer,face:HTMLCanvasElement){
 const entry=pool??={renderer:new Type(),users:0};
 try{entry.renderer.warmup(face);}catch(error){entry.renderer.releaseFace(face);if(!entry.users){entry.renderer.dispose();pool=undefined;}throw error;}
 entry.users++;let released=false;return{renderer:entry.renderer,release(){if(released)return;released=true;entry.renderer.releaseFace(face);if(--entry.users===0){entry.renderer.dispose();if(pool===entry)pool=undefined;}}};
}
export function cancelVoidSummon(source:HTMLElement){jobs.get(source)?.cancel();}
export function cancelVoidSummons(root?:HTMLElement){for(const[source,j]of [...jobs])if(!root||root.contains(source)||root.contains(j.anchor))j.cancel();}
/** One clock from an empty destination through aperture, emergence and contact. */
export function playVoidSummon(source:HTMLElement,options:Options={}):Promise<boolean>{
 cancelVoidSummon(source);const id=source.dataset.cardId,anchor=options.anchor??source;
 if(!isVoidSummon(id)||!source.isConnected||!anchor.isConnected||document.hidden||options.signal?.aborted)return Promise.resolve(false);
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){options.onImpact?.();return Promise.resolve(true);}
 const visibility=source.style.visibility;source.style.visibility='hidden';
 return new Promise(resolve=>{
  let ended=false,frame=0,impacted=false,host:HTMLElement|undefined,captureHost:HTMLElement|undefined,lease:ReturnType<typeof acquire>|undefined;
  const impact=()=>{if(!impacted){impacted=true;options.onImpact?.();}};
  const finish=(complete=false)=>{if(ended)return;ended=true;clearTimeout(timeout);cancelAnimationFrame(frame);options.signal?.removeEventListener('abort',abort);host?.remove();captureHost?.remove();lease?.release();source.style.visibility=visibility;jobs.delete(source);resolve(complete);};
  const abort=()=>finish(),timeout=setTimeout(abort,10000);
  const fallback=(error:unknown)=>{if(ended)return;console.warn('[void-summon] Native card fallback',error);try{impact();}finally{finish();}};
  jobs.set(source,{anchor,cancel:abort});options.signal?.addEventListener('abort',abort,{once:true});
  void(async()=>{
   const {VoidRenderer}=await import('./renderer');if(ended)return;
   captureHost=document.createElement('div');captureHost.className='game';captureHost.dataset.voidCapture='true';captureHost.style.cssText='position:fixed;left:-4000px;top:0;width:180px;pointer-events:none';
   const copy=source.cloneNode(true) as HTMLElement;copy.removeAttribute('id');copy.removeAttribute('data-uid');copy.classList.remove('fx-field-ghost','fx-card-flight','cast-reveal');copy.style.cssText='position:relative;width:180px;height:270px;--cw:180px;--ch:270px;transform:none;opacity:1;visibility:visible';captureHost.append(copy);document.body.append(captureHost);
   const surface=await captureCardSurface(copy,FRAME_BACK,true,false);captureHost.remove();captureHost=undefined;if(ended)return;
   if(!source.isConnected||!anchor.isConnected||document.hidden||options.signal?.aborted){finish();return;}if(!surface.face)throw Error('Public void card face unavailable');
   const face=document.createElement('canvas');face.width=540;face.height=810;const pad=surface.face.width*CARD_PADDING/(1+2*CARD_PADDING);face.getContext('2d')!.drawImage(surface.face,pad,pad,surface.face.width-pad*2,surface.face.height-pad*2,0,0,540,810);
   lease=acquire(VoidRenderer,face);host=document.createElement('div');host.className='void-summon';host.dataset.cardId=id;host.dataset.variant='1';host.setAttribute('aria-hidden','true');host.style.cssText='position:fixed;left:0;top:0;width:180px;height:270px;transform-origin:0 0;pointer-events:none;z-index:136';
   const canvas=document.createElement('canvas');canvas.width=canvas.height=512;canvas.style.cssText='position:absolute;left:-342px;top:-297px;width:864px;height:864px';host.append(canvas);
   const paint=(ms:number)=>{host!.style.transform=voidPlacement(anchor).toString();lease!.renderer.render(canvas,face,id,ms);host!.dataset.time=String(Math.round(ms));settleSummonFace(source,host!,ms,VOID_SUMMON_DURATION);};
   paint(0);document.body.append(host);const start=performance.now();
   const tick=(now:number)=>{try{if(ended)return;if(!source.isConnected||!anchor.isConnected||document.hidden||options.signal?.aborted){finish();return;}if(matchMedia('(prefers-reduced-motion: reduce)').matches){impact();finish(true);return;}const ms=Math.min(VOID_SUMMON_DURATION,now-start);paint(ms);if(ms>=VOID_SUMMON_IMPACT){impact();if(ended)return;}if(ms===VOID_SUMMON_DURATION){finish(true);return;}frame=requestAnimationFrame(tick);}catch(error){fallback(error);}};
   frame=requestAnimationFrame(tick);
  })().catch(fallback);
 });
}
window.addEventListener('resize',()=>cancelVoidSummons());
window.addEventListener('pagehide',()=>cancelVoidSummons());
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelVoidSummons();});
