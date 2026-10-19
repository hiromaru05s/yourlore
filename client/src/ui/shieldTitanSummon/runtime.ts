import {summonPixelRatio,settleSummonFace} from '../summon/quality';
import {FRAME_BACK} from '../../shared/cards';
import {captureCardSurface,CARD_PADDING} from '../cardSurface';
import {projectedPlacement} from '../boardProjection';
import {DURATION,CONTACT,VARIANT} from './catalog';
import {isShieldTitan} from './selection';
import type {Renderer} from './renderer';
type Options={anchor?:HTMLElement;signal?:AbortSignal;onImpact?:()=>void;from?:DOMRect};
const jobs=new Map<HTMLElement,{anchor:HTMLElement;cancel:()=>void}>();
let pool:{renderer:Renderer;users:number}|undefined;
function acquire(Type:new()=>Renderer){const entry=pool??={renderer:new Type(),users:0};entry.users++;let released=false;return{renderer:entry.renderer,release(){if(released)return;released=true;if(--entry.users===0){entry.renderer.dispose();if(pool===entry)pool=undefined;}}};}
export function cancelShieldTitanSummon(source:HTMLElement){jobs.get(source)?.cancel();}
export function cancelShieldTitanSummons(root?:HTMLElement){for(const [source,j] of [...jobs])if(!root||root.contains(source)||root.contains(j.anchor))j.cancel();}
/** Hide synchronously, rasterize offscreen, paint frame zero before mounting.
 * There is no native face/reveal/transfer between summon intent and this clock. */
export function playShieldTitanSummon(source:HTMLElement,options:Options={}):Promise<boolean>{
 cancelShieldTitanSummon(source);const id=source.dataset.cardId,anchor=options.anchor??source;
 if(!isShieldTitan(id)||!source.isConnected||!anchor.isConnected||document.hidden||options.signal?.aborted)return Promise.resolve(false);
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){options.onImpact?.();return Promise.resolve(true);}
 const visibility=source.style.visibility;source.style.visibility='hidden';
 return new Promise(resolve=>{
  let ended=false,frame=0,impacted=false,host:HTMLCanvasElement|undefined,captureHost:HTMLElement|undefined,face:HTMLCanvasElement|undefined,lease:ReturnType<typeof acquire>|undefined;
  const impact=()=>{if(!impacted){impacted=true;options.onImpact?.();}};
  const finish=(complete=false)=>{if(ended)return;ended=true;clearTimeout(timeout);cancelAnimationFrame(frame);options.signal?.removeEventListener('abort',abort);host?.remove();captureHost?.remove();if(face)lease?.renderer.releaseFace(face);lease?.release();source.style.visibility=visibility;jobs.delete(source);resolve(complete);};
  const abort=()=>finish(),timeout=setTimeout(abort,10000);
  const fallback=(error:unknown)=>{if(ended)return;console.warn('[shield-titan-summon] Native card fallback',error);try{impact();}finally{finish();}};
  jobs.set(source,{anchor,cancel:abort});options.signal?.addEventListener('abort',abort,{once:true});
  void(async()=>{
   const {Renderer}=await import('./renderer');if(ended)return;lease=acquire(Renderer);
   captureHost=document.createElement('div');captureHost.className='game';captureHost.style.cssText='position:fixed;left:-4000px;top:0;width:180px;pointer-events:none';
   const copy=source.cloneNode(true) as HTMLElement;copy.removeAttribute('id');copy.removeAttribute('data-uid');copy.classList.remove('fx-field-ghost','fx-card-flight','cast-reveal');copy.style.cssText='position:relative;width:180px;height:281.25px;--cw:180px;--ch:281.25px;transform:none;opacity:1;visibility:visible';captureHost.append(copy);document.body.append(captureHost);
   const surface=await captureCardSurface(copy,FRAME_BACK,true,false,source);captureHost?.remove();captureHost=undefined;if(ended)return;
   if(!source.isConnected||!anchor.isConnected||document.hidden||options.signal?.aborted){finish();return;}if(!surface.face)throw Error('Public face unavailable');
   const width=surface.face.width/(1+2*CARD_PADDING),pad=width*CARD_PADDING,height=surface.face.height-2*pad;
   face=document.createElement('canvas');face.width=1536;face.height=2400;face.getContext('2d')!.drawImage(surface.face,pad,pad,width,height,0,0,face.width,face.height);
   host=document.createElement('canvas');host.className='shield-titan-summon';host.dataset.cardId=id;host.dataset.variant='5';host.setAttribute('aria-hidden','true');host.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:136';
   const density=summonPixelRatio();host.width=Math.round(innerWidth*density);host.height=Math.round(innerHeight*density);const c=host.getContext('2d')!;
   const paint=(ms:number)=>{
    const width=anchor.offsetWidth||anchor.getBoundingClientRect().width,H=1.5625;
    let placement=projectedPlacement(anchor,1,H).translate(.5,H/2).scale(1,-1,width);
    const from=options.from;if(from&&ms<450){const start=new DOMMatrix().translate(from.left+from.width/2,from.top+from.height/2).scale(from.width,-from.height/H,from.width),a=Array.from(start.toFloat64Array()),b=Array.from(placement.toFloat64Array()),q=ms/450,f=q*q*(3-2*q);placement=new DOMMatrix(a.map((n,j)=>n+(b[j]-n)*f));}
    c.clearRect(0,0,host!.width,host!.height);lease!.renderer.setFace(face!);lease!.renderer.drawBoard(host!,VARIANT,ms,placement);host!.dataset.time=String(Math.round(ms));
   };
   paint(0);document.body.append(host);const start=performance.now();
   const tick=(now:number)=>{try{if(ended)return;if(!source.isConnected||!anchor.isConnected||document.hidden||options.signal?.aborted){finish();return;}const ms=Math.min(DURATION,now-start);paint(ms);settleSummonFace(source,host!,ms,DURATION);if(ms>=CONTACT){impact();if(ended)return;}if(ms===DURATION){finish(true);return;}frame=requestAnimationFrame(tick);}catch(error){fallback(error);}};
   frame=requestAnimationFrame(tick);
  })().catch(fallback);
 });
}
window.addEventListener('resize',()=>cancelShieldTitanSummons());
window.addEventListener('pagehide',()=>cancelShieldTitanSummons());
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelShieldTitanSummons();});
