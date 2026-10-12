import {projectedPlacement} from '../boardProjection';
import {combatRect} from '../combatAnchor';
import {prepareSurface} from './surface';
import {EVADE_DURATION,WIDTH,HEIGHT} from './timing';
import type {Renderer} from './renderer';
type Options={side:'me'|'opp';success:boolean;signal?:AbortSignal};
export type EvadePlayback={play:()=>Promise<boolean>;cancel:()=>void};
const jobs=new Map<HTMLElement,()=>void>();
let pool:{renderer:Renderer;users:number}|undefined;
function acquire(Type:new()=>Renderer){
 const entry=pool??={renderer:new Type(),users:0};entry.users++;let released=false;
 return {renderer:entry.renderer,release(){if(released)return;released=true;if(--entry.users===0){entry.renderer.dispose();if(pool===entry)pool=undefined;}}};
}
export function cancelEvades(){for(const cancel of [...jobs.values()])cancel();}
/** Prepare during the roll. The original stays visible until play() paints frame zero. */
export function prepareEvade(source:HTMLElement|null,options:Options):EvadePlayback{
 const noop={play:()=>Promise.resolve(false),cancel:()=>{}};
 if(typeof window==='undefined'||!combatRect(source)||document.hidden||options.signal?.aborted)return noop;
 const card=source!;jobs.get(card)?.();
 let done=false,started=false,frame=0,host:HTMLCanvasElement|undefined,face:HTMLCanvasElement|undefined;
 let capture:ReturnType<typeof prepareSurface>|undefined,lease:ReturnType<typeof acquire>|undefined,native:Animation|undefined;
 let resolve!:(complete:boolean)=>void;
 const finished=new Promise<boolean>(r=>resolve=r),visibility=card.style.visibility;
 const finish=(complete=false)=>{
  if(done)return;done=true;clearTimeout(deadline);cancelAnimationFrame(frame);native?.cancel();host?.remove();capture?.cancel();
  options.signal?.removeEventListener('abort',abort);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('resize',abort);window.removeEventListener('pagehide',abort);
  if(face)lease?.renderer.releaseFace(face);lease?.release();card.style.visibility=visibility;
  if(jobs.get(card)===abort)jobs.delete(card);resolve(complete);
 };
 const abort=()=>finish(),hidden=()=>{if(document.hidden)abort();},deadline=setTimeout(abort,15000);
 jobs.set(card,abort);options.signal?.addEventListener('abort',abort,{once:true});
 document.addEventListener('visibilitychange',hidden);window.addEventListener('resize',abort);window.addEventListener('pagehide',abort);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const ready=(async()=>{
  if(reduced)return;
  capture=prepareSurface(card);
  const [visual,surface]=await Promise.all([import('./renderer'),capture.ready]);if(done)return;
  face=surface;lease=acquire(visual.Renderer);
 })().catch(error=>{if(!done)console.warn('[evade] Native surface fallback',error);});
 function play(){
  if(started||done)return finished;started=true;
  void ready.then(()=>{
   if(done)return;if(!combatRect(card)||document.hidden||options.signal?.aborted){finish();return;}
   const c=lease&&face&&!reduced?document.createElement('canvas').getContext('2d'):null;
   if(c){host=c.canvas;host.className='evade-refraction';host.dataset.variant='3';host.dataset.uid=card.dataset.uid??'';host.dataset.result=options.success?'success':'failure';host.setAttribute('aria-hidden','true');host.style.cssText='position:fixed;pointer-events:none;z-index:185';}
   else native=card.animate?.([{filter:'brightness(1)'},{filter:'brightness(1.12)',offset:.36},{filter:'brightness(1)'}],{duration:EVADE_DURATION,easing:'ease-in-out'});
   const paint=(ms:number)=>{
    if(!host||!c||!lease||!face)return;
    const r=combatRect(card);if(!r){finish();return;}
    const x=Math.floor(r.left-r.width*.85),y=Math.floor(r.top-r.height*.55),w=Math.ceil(r.width*2.7),h=Math.ceil(r.height*2.1),d=Math.min(devicePixelRatio||1,1.5);
    if(host.width!==Math.round(w*d)||host.height!==Math.round(h*d)){host.width=Math.round(w*d);host.height=Math.round(h*d);}
    host.style.left=`${x}px`;host.style.top=`${y}px`;host.style.width=`${w}px`;host.style.height=`${h}px`;
    c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,w,h);
    const matrix=new DOMMatrix().translate(-x,-y).multiply(projectedPlacement(card,WIDTH,HEIGHT));
    lease.renderer.drawBoard(c,face,ms,matrix,w,h,options.success,false,options.side==='opp'?-1:1);
    host.dataset.time=String(Math.round(ms));
   };
   try{
    paint(0);if(done)return;
    if(host){document.body.append(host);card.style.visibility='hidden';}
    const start=performance.now();
    const tick=(now:number)=>{
     if(done)return;if(!combatRect(card)||document.hidden||options.signal?.aborted){finish();return;}
     try{const ms=Math.min(EVADE_DURATION,Math.max(0,now-start));paint(ms);if(ms===EVADE_DURATION){finish(true);return;}frame=requestAnimationFrame(tick);}catch(error){console.warn('[evade] Playback fallback',error);finish();}
    };
    frame=requestAnimationFrame(tick);
   }catch(error){console.warn('[evade] Renderer fallback',error);finish();}
  });
  return finished;
 }
 return {play,cancel:abort};
}
