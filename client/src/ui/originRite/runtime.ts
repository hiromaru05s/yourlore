import type {OriginRiteReaction} from '../../shared/types';
import type {Anchor,Layout} from './renderer';
import {originSurface} from './surface';
export const ORIGIN_RITE_VARIANT=0;
export const ORIGIN_RITE_CONTACT=1330; // Approved 1750ms contact, after the already-completed 420ms summon.
const active=new Map<HTMLElement,()=>void>();
export const cancelOriginRites=()=>{for(const stop of [...active.values()])stop();};
type Options={source:HTMLElement;summon:HTMLElement;target:HTMLElement;grave:HTMLElement;reaction:OriginRiteReaction;name:string;onImpact:()=>void;signal?:AbortSignal};
const anchor=(node:HTMLElement):Anchor=>{const r=node.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height};};
export function playOriginRite(o:Options):Promise<boolean>{
 active.get(o.target)?.();
 if(o.signal?.aborted||document.hidden||![o.source,o.summon,o.target,o.grave].every(n=>n.isConnected))return Promise.resolve(false);
 return new Promise(resolve=>{
  let done=false,raf=0,canvas:HTMLCanvasElement|undefined,hit=false;const visibility=o.target.style.visibility;
  const finish=(complete:boolean)=>{if(done)return;done=true;clearTimeout(timeout);cancelAnimationFrame(raf);canvas?.remove();if(active.get(o.target)===abort){active.delete(o.target);o.target.style.visibility=visibility;}o.signal?.removeEventListener('abort',abort);window.removeEventListener('resize',abort);window.removeEventListener('pagehide',abort);document.removeEventListener('visibilitychange',hidden);resolve(complete);};
  const abort=()=>finish(false),hidden=()=>{if(document.hidden)abort();};
  const timeout=setTimeout(abort,6500);active.set(o.target,abort);o.signal?.addEventListener('abort',abort,{once:true});window.addEventListener('resize',abort);window.addEventListener('pagehide',abort);document.addEventListener('visibilitychange',hidden);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  void Promise.all([import('./renderer'),!reduced&&o.reaction.outcome==='destroy'&&o.reaction.target?originSurface(o.target,o.reaction.target.kind):Promise.resolve(undefined)]).then(([render,face])=>{
   if(done)return;
   const l:Layout={summon:anchor(o.summon),source:anchor(o.source),target:anchor(o.target),grave:anchor(o.grave),name:o.name};
   if([l.summon,l.source,l.target,l.grave].some(a=>a.w<=0||a.h<=0)){abort();return;}
   canvas=document.createElement('canvas');canvas.className='origin-rite-fx';canvas.dataset.variant='golden-01';canvas.setAttribute('aria-hidden','true');canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:180';const d=Math.min(2,devicePixelRatio||1);canvas.width=Math.ceil(innerWidth*d);canvas.height=Math.ceil(innerHeight*d);const c=canvas.getContext('2d');if(!c){abort();return;}document.body.append(canvas);const start=performance.now();
   const tick=(now:number)=>{
    if(done)return;if(o.signal?.aborted||document.hidden||![o.source,o.summon,o.target,o.grave].every(n=>n.isConnected)){abort();return;}
    try{
     const age=now-start,ms=reduced?(age<90?1000:render.HIT+age-90):Math.min(render.END,420+age);
     if(!hit&&ms>=render.HIT){hit=true;if(o.reaction.outcome==='destroy')o.target.style.visibility='hidden';o.onImpact();if(done)return;}
     c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,innerWidth,innerHeight);render.renderGolden(c,ms,l,face,o.reaction.outcome,reduced);canvas!.dataset.time=String(Math.round(ms));
     if(reduced?age>=240:ms>=render.END)finish(true);else raf=requestAnimationFrame(tick);
    }catch{abort();}
   };tick(start);
  }).catch(abort);
 });
}
