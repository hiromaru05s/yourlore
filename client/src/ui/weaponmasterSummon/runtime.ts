import {settleSummonFace,sizeSummonPlane} from '../summon/quality';
import {FRAME_BACK} from '../../shared/cards';
import {captureCardSurface} from '../cardSurface';
import {projectedPlacement} from '../boardProjection';
import {DURATION,CONTACT,CARD_WIDTH,CARD_HEIGHT,ease} from './catalog';
import {isWeaponmaster} from './selection';
import type {Renderer} from './renderer';

type Options={anchor?:HTMLElement;signal?:AbortSignal;onImpact?:()=>void;from?:DOMRect};
const jobs=new Map<HTMLElement,{anchor:HTMLElement;cancel:()=>void}>();
// Simultaneous summons share one GPU context; every captured face remains job-owned.
let pool:{renderer:Renderer;users:number}|undefined;
function acquire(rendererType:new()=>Renderer){
 const entry=pool??=( {renderer:new rendererType(),users:0} );entry.users++;
 let released=false;
 return{renderer:entry.renderer,release(){if(released)return;released=true;if(--entry.users===0){entry.renderer.dispose();if(pool===entry)pool=undefined;}}};
}
export function cancelWeaponmasterSummon(source:HTMLElement){jobs.get(source)?.cancel();}
export function cancelWeaponmasterSummons(root?:HTMLElement){for(const [source,j] of [...jobs])if(!root||root.contains(source)||root.contains(j.anchor))j.cancel();}
export function playWeaponmasterSummon(source:HTMLElement,options:Options={}):Promise<boolean>{
 cancelWeaponmasterSummon(source);
 const anchor=options.anchor??source;
 if(!isWeaponmaster(source.dataset.cardId)||!source.isConnected||!anchor.isConnected||document.hidden||options.signal?.aborted)return Promise.resolve(false);
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){options.onImpact?.();return Promise.resolve(true);}
 const visibility=source.style.visibility;source.style.visibility='hidden';
 return new Promise(resolve=>{
  let ended=false,frame=0,impacted=false,host:HTMLElement|undefined,captureHost:HTMLElement|undefined,face:HTMLCanvasElement|undefined,lease:ReturnType<typeof acquire>|undefined;
  const impact=()=>{if(!impacted){impacted=true;options.onImpact?.();}};
  const finish=(complete=false)=>{
   if(ended)return;ended=true;clearTimeout(timeout);cancelAnimationFrame(frame);options.signal?.removeEventListener('abort',abort);
   host?.remove();captureHost?.remove();if(face)lease?.renderer.releaseFace(face);lease?.release();source.style.visibility=visibility;jobs.delete(source);resolve(complete);
  };
  const abort=()=>finish(false),timeout=setTimeout(abort,10000);
  const fallback=(error:unknown)=>{if(ended)return;console.warn('[weaponmaster-summon] Native card fallback',error);try{impact();}finally{finish(false);}};
  jobs.set(source,{anchor,cancel:abort});options.signal?.addEventListener('abort',abort,{once:true});
  void(async()=>{
   const {Renderer}=await import('./renderer');if(ended)return;
   lease=acquire(Renderer);
   captureHost=document.createElement('div');captureHost.className='game';captureHost.style.cssText='position:fixed;left:-4000px;top:0;width:180px;pointer-events:none';
   const copy=source.cloneNode(true) as HTMLElement;copy.removeAttribute('id');copy.removeAttribute('data-uid');copy.classList.remove('fx-field-ghost','fx-card-flight','cast-reveal');
   copy.style.cssText=`position:relative;width:${CARD_WIDTH}px;height:${CARD_HEIGHT}px;--cw:${CARD_WIDTH}px;--ch:${CARD_HEIGHT}px;transform:none;opacity:1;visibility:visible`;captureHost.append(copy);document.body.append(captureHost);
   const surface=await captureCardSurface(copy,FRAME_BACK,true,false,source);captureHost?.remove();captureHost=undefined;if(ended)return;
   if(!source.isConnected||!anchor.isConnected||document.hidden||options.signal?.aborted){finish();return;}if(!surface.face)throw Error('Public card surface unavailable');
   face=surface.face;
   host=document.createElement('div');host.className='weaponmaster-summon';host.dataset.cardId=source.dataset.cardId;host.dataset.variant='4';host.setAttribute('aria-hidden','true');host.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:136;isolation:isolate';
   const el=document.createElement('div');el.style.cssText=`position:absolute;left:0;top:0;width:${CARD_WIDTH}px;height:${CARD_HEIGHT}px;transform-origin:0 0`;
   const canvas=document.createElement('canvas');sizeSummonPlane(canvas,800);canvas.style.cssText=`position:absolute;left:${CARD_WIDTH/2-400}px;top:${CARD_HEIGHT/2-400}px;width:800px;height:800px`;el.append(canvas);host.append(el);const c=canvas.getContext('2d')!;
   const transfer=options.from?420:0,total=DURATION+transfer;
   const paint=(ms:number)=>{let matrix=projectedPlacement(anchor,CARD_WIDTH,CARD_HEIGHT);if(options.from&&ms<transfer){const f=options.from,start=new DOMMatrix().translate(f.left,f.top).scale(f.width/CARD_WIDTH,f.height/CARD_HEIGHT),a=Array.from(start.toFloat64Array()),b=Array.from(matrix.toFloat64Array()),q=ease(0,transfer,ms);matrix=new DOMMatrix(a.map((n,i)=>n+(b[i]-n)*q));}el.style.transform=matrix.toString();c.clearRect(0,0,800,800);lease!.renderer.draw(c,face!,Math.max(0,ms-transfer),400,400,CARD_WIDTH);if(lease!.renderer.shaderErrors.length)throw Error(lease!.renderer.shaderErrors.join('\n'));};
   paint(0);document.body.append(host);const start=performance.now();
   const tick=(now:number)=>{try{
    if(ended)return;if(!source.isConnected||!anchor.isConnected||document.hidden||options.signal?.aborted){finish();return;}
    const ms=Math.min(total,now-start);host!.dataset.time=String(Math.round(ms));if(ms>=CONTACT+transfer){impact();if(ended)return;}
    paint(ms);settleSummonFace(source,host!,ms,total);
    if(ms===total){finish(true);return;}frame=requestAnimationFrame(tick);
   }catch(error){fallback(error);}};tick(start);
  })().catch(fallback);
 });
}
window.addEventListener('resize',()=>cancelWeaponmasterSummons());
window.addEventListener('pagehide',()=>cancelWeaponmasterSummons());
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelWeaponmasterSummons();});
