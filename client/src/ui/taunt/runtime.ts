import {projectedPlacement,layoutRect} from '../boardProjection';
import {combatRect} from '../combatAnchor';
import {prepareSurface} from './surface';
import {DURATION,pose} from './timing';
import type {Renderer} from './renderer';
export type TauntPlayback={play:()=>Promise<boolean>;cancel:()=>void};
const jobs=new Map<HTMLElement,()=>void>();
let pool:{renderer:Renderer;users:number}|undefined;
const loadRenderer=()=>import('./renderer');
export function warmTaunt(){void loadRenderer().catch(()=>{});}
function acquire(Type:new()=>Renderer){
 const entry=pool??={renderer:new Type(),users:0};entry.users++;let released=false;
 return {renderer:entry.renderer,release(){if(released)return;released=true;if(--entry.users===0){entry.renderer.dispose();if(pool===entry)pool=undefined;}}};
}
export function cancelTaunts(){for(const cancel of [...jobs.values()])cancel();}
/** The approved shield is owned by the exact public monster UID, before its dice. */
export function prepareTaunt(source:HTMLElement|null,options:{signal?:AbortSignal}={}):TauntPlayback{
 const noop={play:()=>Promise.resolve(false),cancel:()=>{}};
 if(typeof window==='undefined'||!combatRect(source)||document.hidden||options.signal?.aborted)return noop;
 const card=source!;jobs.get(card)?.();
 let done=false,started=false,frame=0,host:HTMLCanvasElement|undefined,face:HTMLCanvasElement|undefined;
 let capture:ReturnType<typeof prepareSurface>|undefined,lease:ReturnType<typeof acquire>|undefined,native:Animation|undefined;
 let resolve!:(complete:boolean)=>void;const finished=new Promise<boolean>(r=>resolve=r);
 const transform=card.style.transform,willChange=card.style.willChange;
 const finish=(complete=false)=>{
  if(done)return;done=true;clearTimeout(deadline);cancelAnimationFrame(frame);native?.cancel();host?.remove();capture?.cancel();
  options.signal?.removeEventListener('abort',abort);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('resize',abort);window.removeEventListener('pagehide',abort);
  card.style.transform=transform;card.style.willChange=willChange;delete card.dataset.tauntActive;
  if(face)lease?.renderer.releaseFace(face);lease?.release();if(jobs.get(card)===abort)jobs.delete(card);resolve(complete);
 };
 const abort=()=>finish(),hidden=()=>{if(document.hidden)abort();},deadline=setTimeout(abort,8000);
 jobs.set(card,abort);options.signal?.addEventListener('abort',abort,{once:true});document.addEventListener('visibilitychange',hidden);window.addEventListener('resize',abort);window.addEventListener('pagehide',abort);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const ready=(async()=>{
  if(reduced)return;capture=prepareSurface(card);
  const [visual,surface]=await Promise.all([loadRenderer(),capture.ready]);if(done)return;
  face=surface;lease=acquire(visual.Renderer);
 })().catch(error=>{if(!done)console.warn('[taunt] Native surface fallback',error);});
 function play(){
  if(started||done)return finished;started=true;
  void ready.then(()=>{
   if(done)return;if(!combatRect(card)||document.hidden||options.signal?.aborted){finish();return;}
   const ctx=lease&&face&&!reduced?document.createElement('canvas').getContext('2d'):null;
   if(ctx){host=ctx.canvas;host.className='taunt-shield';host.dataset.variant='3';host.dataset.uid=card.dataset.uid??'';host.setAttribute('aria-hidden','true');host.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:180';host.width=innerWidth;host.height=innerHeight;document.body.append(host);}
   else native=card.animate?.([{filter:'brightness(1)'},{filter:'brightness(1.13)',offset:.4},{filter:'brightness(1)'}],{duration:DURATION,easing:'ease-in-out'});
   card.dataset.tauntActive='3';
   const paint=(ms:number)=>{
    if(!host||!ctx||!lease||!face)return;
    card.style.transform=transform;const matrix=projectedPlacement(card,180,270),box=layoutRect(card),p=pose(0,ms);
    card.style.willChange='transform';card.style.transform=`${transform} translate3d(0,0,${p.lift*box.width/180}px)`;
    ctx.clearRect(0,0,host.width,host.height);lease.renderer.renderBoard(ctx,face,ms,host.width,host.height,matrix);
    host.dataset.time=String(Math.round(ms));
   };
   try{
    paint(0);const start=performance.now();
    const tick=(now:number)=>{
     if(done)return;if(!combatRect(card)||document.hidden||options.signal?.aborted){finish();return;}
     try{const ms=Math.min(DURATION,Math.max(0,now-start));paint(ms);if(ms===DURATION){finish(true);return;}frame=requestAnimationFrame(tick);}catch(error){console.warn('[taunt] Playback fallback',error);finish();}
    };
    frame=requestAnimationFrame(tick);
   }catch(error){console.warn('[taunt] Renderer fallback',error);finish();}
  });
  return finished;
 }
 return {play,cancel:abort};
}
