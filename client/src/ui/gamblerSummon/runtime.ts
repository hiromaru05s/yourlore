import {FRAME_BACK} from '../../shared/cards';
import {captureCardSurface} from '../cardSurface';
import {projectedPlacement} from '../boardProjection';
import {Renderer} from './renderer';
import {DURATION,IMPACT} from './catalog';
import {isGambler,GAMBLER_VARIANTS} from './selection';

type Options={anchor?:HTMLElement;signal?:AbortSignal;onImpact?:()=>void};
const jobs=new Map<HTMLElement,{anchor:HTMLElement;cancel:()=>void}>();
let pool:{renderer:Renderer;users:number}|undefined;
function acquire(){
 const entry=pool??={renderer:new Renderer(),users:0};entry.users++;let released=false;
 return {renderer:entry.renderer,release(){if(released)return;released=true;if(--entry.users===0){entry.renderer.dispose();if(pool===entry)pool=undefined;}}};
}
export function cancelGamblerSummon(source:HTMLElement){jobs.get(source)?.cancel();}
export function cancelGamblerSummons(root?:HTMLElement){for(const [source,j]of [...jobs])if(!root||root.contains(source)||root.contains(j.anchor))j.cancel();}

/** The opaque wheel is painted and mounted synchronously, before face capture.
 * Only the return to the native card needs its texture. No raw reveal or flight. */
export function playGamblerSummon(source:HTMLElement,options:Options={}):Promise<boolean>{
 cancelGamblerSummon(source);
 const id=source.dataset.cardId,anchor=options.anchor??source;
 if(!isGambler(id)||!source.isConnected||!anchor.isConnected||document.hidden||options.signal?.aborted)return Promise.resolve(false);
 if(matchMedia('(prefers-reduced-motion:reduce)').matches){options.onImpact?.();return Promise.resolve(true);}
 const visibility=source.style.visibility;source.style.visibility='hidden';
 return new Promise(resolve=>{
  let ended=false,frame=0,impacted=false,faceReady=false,host:HTMLElement|undefined,captureHost:HTMLElement|undefined,face:HTMLCanvasElement|undefined,lease:ReturnType<typeof acquire>|undefined;
  const impact=()=>{if(!impacted){impacted=true;options.onImpact?.();}};
  const finish=(complete=false)=>{
   if(ended)return;ended=true;clearTimeout(timeout);cancelAnimationFrame(frame);
   options.signal?.removeEventListener('abort',abort);host?.remove();captureHost?.remove();
   if(face)lease?.renderer.releaseFace(face);lease?.release();
   source.style.visibility=visibility;jobs.delete(source);resolve(complete);
  };
  const abort=()=>finish(),timeout=setTimeout(abort,10000);
  const fallback=(error:unknown)=>{if(ended)return;console.warn('[gambler-summon] Native card fallback',error);try{impact();}finally{finish();}};
  jobs.set(source,{anchor,cancel:abort});options.signal?.addEventListener('abort',abort,{once:true});
  try{
   lease=acquire();face=document.createElement('canvas');face.width=540;face.height=810;
   host=document.createElement('div');host.className='gambler-summon';host.dataset.cardId=id;host.dataset.variant=String(GAMBLER_VARIANTS[id]+1);host.setAttribute('aria-hidden','true');
   host.style.cssText='position:fixed;left:0;top:0;width:180px;height:270px;transform-origin:0 0;pointer-events:none;z-index:136';
   const canvas=document.createElement('canvas');canvas.style.cssText='position:absolute;left:-180px;top:-69.23px;width:540px;height:408.46px';host.append(canvas);
   const paint=(ms:number)=>{
    host!.style.transform=projectedPlacement(anchor,180,270).toString();
    lease!.renderer.draw(canvas,face!,GAMBLER_VARIANTS[id],ms,id==='LEGEND_GAMBLER',false,true);
    host!.dataset.time=String(Math.round(ms));
   };
   paint(0);document.body.append(host);
   let clock=0,last=performance.now();
   const tick=(now:number)=>{
    try{
     if(ended)return;
     if(!source.isConnected||!anchor.isConnected||document.hidden||options.signal?.aborted){finish();return;}
     // A slow face capture may hold the wheel, but never reveal an empty texture.
     clock=Math.min(faceReady?DURATION:1600,clock+Math.max(0,now-last));last=now;paint(clock);
     if(clock>=IMPACT){impact();if(ended)return;}
     if(clock===DURATION){finish(true);return;}frame=requestAnimationFrame(tick);
    }catch(error){fallback(error);}
   };
   frame=requestAnimationFrame(tick);
   captureHost=document.createElement('div');captureHost.className='game';captureHost.style.cssText='position:fixed;left:-4000px;top:0;width:180px;pointer-events:none';
   const copy=source.cloneNode(true) as HTMLElement;copy.removeAttribute('id');copy.removeAttribute('data-uid');copy.classList.remove('fx-field-ghost','fx-card-flight','cast-reveal');
   copy.style.cssText='position:relative;width:180px;height:270px;--cw:180px;--ch:270px;transform:none;opacity:1;visibility:visible';captureHost.append(copy);document.body.append(captureHost);
   void captureCardSurface(copy,FRAME_BACK,true,false).then(surface=>{
    captureHost?.remove();captureHost=undefined;if(ended)return;
    if(!surface.face)throw Error('Public face unavailable');
    face!.getContext('2d')!.drawImage(surface.face,0,0,540,810);lease!.renderer.refreshFace(face!);faceReady=true;
   }).catch(fallback);
  }catch(error){fallback(error);}
 });
}
window.addEventListener('resize',()=>cancelGamblerSummons());
window.addEventListener('pagehide',()=>cancelGamblerSummons());
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelGamblerSummons();});
