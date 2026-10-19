import {settleSummonFace,sizeSummonPlane} from '../summon/quality';
import {FRAME_BACK} from '../../shared/cards';
import {captureCardSurface} from '../cardSurface';
import {silencePlacement} from './placement';
import {isSilenceSummon,SILENCE_VARIANT} from './selection';
import {DURATION,designs} from './catalog';
import type {Renderer} from './renderer';
type Options={anchor?:HTMLElement;signal?:AbortSignal;onImpact?:()=>void};
const jobs=new Map<HTMLElement,{anchor:HTMLElement;cancel:()=>void}>();
let pool:{renderer:Renderer;users:number}|undefined;
function acquire(Type:typeof Renderer,face:HTMLCanvasElement){
 const entry=pool??={renderer:new Type(),users:0};entry.users++;let released=false;
 return{renderer:entry.renderer,release(){if(released)return;released=true;entry.renderer.releaseFace(face);if(--entry.users===0){entry.renderer.dispose();if(pool===entry)pool=undefined;}}};
}
export function cancelSilenceSummon(source:HTMLElement){jobs.get(source)?.cancel();}
export function cancelSilenceSummons(root?:HTMLElement){for(const[source,j]of [...jobs])if(!root||root.contains(source)||root.contains(j.anchor))j.cancel();}
/** Approved purple study 04, including the complete padded card frame. */
export function playSilenceSummon(source:HTMLElement,options:Options={}):Promise<boolean>{
 cancelSilenceSummon(source);const id=source.dataset.cardId,anchor=options.anchor??source;
 if(!isSilenceSummon(id)||!source.isConnected||!anchor.isConnected||document.hidden||options.signal?.aborted)return Promise.resolve(false);
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){options.onImpact?.();return Promise.resolve(true);}
 const visibility=source.style.visibility;source.style.visibility='hidden';
 return new Promise(resolve=>{
  let ended=false,frame=0,impacted=false,host:HTMLElement|undefined,captureHost:HTMLElement|undefined,lease:ReturnType<typeof acquire>|undefined;
  const impact=()=>{if(!impacted){impacted=true;options.onImpact?.();}};
  const finish=(complete=false)=>{if(ended)return;ended=true;clearTimeout(timeout);cancelAnimationFrame(frame);options.signal?.removeEventListener('abort',abort);host?.remove();captureHost?.remove();lease?.release();source.style.visibility=visibility;jobs.delete(source);resolve(complete);};
  const abort=()=>finish(),timeout=setTimeout(abort,10000);
  const fallback=(error:unknown)=>{if(ended)return;console.warn('[silence-summon] Native card fallback',error);try{impact();}finally{finish();}};
  jobs.set(source,{anchor,cancel:abort});options.signal?.addEventListener('abort',abort,{once:true});
  void(async()=>{
   const {Renderer}=await import('./renderer');if(ended)return;
   captureHost=document.createElement('div');captureHost.className='game';captureHost.dataset.silenceCapture='true';captureHost.style.cssText='position:fixed;left:-4000px;top:0;width:180px;pointer-events:none';
   const copy=source.cloneNode(true) as HTMLElement;
   for(const node of [copy,...copy.querySelectorAll<HTMLElement>('[id],[data-uid]')]){node.removeAttribute('id');node.removeAttribute('data-uid');}
   copy.classList.remove('fx-field-ghost','fx-card-flight','cast-reveal');copy.style.cssText='position:relative;width:180px;height:270px;--cw:180px;--ch:270px;transform:none;opacity:1;visibility:visible';captureHost.append(copy);document.body.append(captureHost);
   const surface=await captureCardSurface(copy,FRAME_BACK,true,false,source);captureHost.remove();captureHost=undefined;if(ended)return;
   if(!source.isConnected||!anchor.isConnected||document.hidden||options.signal?.aborted){finish();return;}if(!surface.face)throw Error('Public silence card face unavailable');
   const face=surface.face;
   lease=acquire(Renderer,face);host=document.createElement('div');host.className='silence-summon';host.dataset.cardId=id;host.dataset.variant='4';host.setAttribute('aria-hidden','true');host.style.cssText='position:fixed;left:0;top:0;width:180px;height:270px;transform-origin:0 0;pointer-events:none;z-index:136';
   // The study's two passes share the same board transform; its camera owns lift.
   const planes=(['ground','card'] as const).map(pass=>{const canvas=document.createElement('canvas');canvas.dataset.silencePass=pass;sizeSummonPlane(canvas,576);canvas.style.cssText='position:absolute;left:-198px;top:-153px;width:576px;height:576px';host!.append(canvas);const c=canvas.getContext('2d')!;return{pass,c};});
   const paint=(ms:number)=>{host!.style.transform=silencePlacement(anchor).toString();for(const{c,pass}of planes){c.clearRect(0,0,576,576);lease!.renderer.draw(c,face,SILENCE_VARIANT,ms,288,288,180,false,pass,false,id==='NT_SEAL5');}host!.dataset.time=String(Math.round(ms));settleSummonFace(source,host!,ms,DURATION);};
   // Compile and paint frame zero before the clock starts or the source is replaced.
   paint(0);document.body.append(host);const start=performance.now();
   const tick=(now:number)=>{try{if(ended)return;if(!source.isConnected||!anchor.isConnected||document.hidden||options.signal?.aborted){finish();return;}if(matchMedia('(prefers-reduced-motion: reduce)').matches){impact();finish(true);return;}const ms=Math.min(DURATION,now-start);paint(ms);if(ms>=designs[SILENCE_VARIANT].hit){impact();if(ended)return;}if(ms===DURATION){finish(true);return;}frame=requestAnimationFrame(tick);}catch(error){fallback(error);}};
   frame=requestAnimationFrame(tick);
  })().catch(fallback);
 });
}
window.addEventListener('resize',()=>cancelSilenceSummons());
window.addEventListener('pagehide',()=>cancelSilenceSummons());
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelSilenceSummons();});
