import {SPECIAL_FX} from '../animationTempo';
import {drawBloodRite,bloodRiteActivation,BLOOD_RITE_DURATION,BLOOD_RITE_HEAL} from './visual';

// Shared sources use the largest current pulse; simultaneous heals never compound scale.
type SourceState={saved:{translate:string;scale:string;zIndex:string;filter:string};lift:number;pulses:Map<symbol,number>};
const activeSources=new Map<HTMLElement,SourceState>();
function sourcePose(el:HTMLElement,state:SourceState){
 const a=Math.max(0,...state.pulses.values());
 if(a===0){Object.assign(el.style,state.saved);return;}
 el.style.translate=`0 ${-state.lift*a}px`;
 el.style.scale=String(1+.075*a);el.style.zIndex='12';el.style.filter=`brightness(${1+.12*a})`;
}
export function playBloodRite(side:'me'|'opp',uids:string[],onHeal:()=>void,signal:AbortSignal):Promise<boolean>{
 const target=document.getElementById(`hp-${side}`)?.closest<HTMLElement>('.pt-hp');
 if(signal.aborted||document.hidden||!target)return Promise.resolve(false);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const key=Symbol('blood-rite');
 const sources=[...new Set(uids)].map(uid=>document.querySelector<HTMLElement>(`.buff-icon[data-uid="${CSS.escape(uid)}"]`)).filter((el):el is HTMLElement=>!!el);
 for(const el of sources){
  if(!activeSources.has(el)){
   const r=el.getBoundingClientRect(),ratio=r.height/Math.max(1,el.offsetHeight);
   activeSources.set(el,{saved:{translate:el.style.translate,scale:el.style.scale,zIndex:el.style.zIndex,filter:el.style.filter},lift:reduced?0:Math.max(2,Math.min(6,r.height*.075))/Math.max(.1,ratio),pulses:new Map()});
  }
  activeSources.get(el)!.pulses.set(key,0);
 }
 const canvas=document.createElement('canvas');canvas.className='blood-rite-vein-fx';canvas.setAttribute('aria-hidden','true');
 Object.assign(canvas.style,{position:'fixed',pointerEvents:'none',zIndex:'125'});
 const c=canvas.getContext('2d');
 return new Promise(resolve=>{
  let raf=0,done=false,applied=false;const start=SPECIAL_FX.now();
  const finish=(completed=false)=>{
   if(done)return;done=true;cancelAnimationFrame(raf);canvas.remove();
   signal.removeEventListener('abort',abort);window.removeEventListener('resize',abort);document.removeEventListener('visibilitychange',hidden);
   observer.disconnect();
   for(const el of sources){const state=activeSources.get(el);if(!state)continue;state.pulses.delete(key);sourcePose(el,state);if(!state.pulses.size)activeSources.delete(el);}
   resolve(completed);
  };
  const abort=()=>finish(false),hidden=()=>{if(document.hidden)abort();};
  const observer=new MutationObserver(()=>{if(!target.isConnected)abort();});
  observer.observe(document.body,{childList:true,subtree:true});
  signal.addEventListener('abort',abort,{once:true});window.addEventListener('resize',abort);document.addEventListener('visibilitychange',hidden);
  if(!c){finish(false);return;}document.body.appendChild(canvas);
  const frame=(now:number)=>{
   if(done)return;if(signal.aborted||document.hidden||!target.isConnected){finish(false);return;}
   const age=now-start;
   if(age>=BLOOD_RITE_HEAL&&!applied){applied=true;onHeal();}
   if(age>=BLOOD_RITE_DURATION){finish(true);return;}
   const r=target.getBoundingClientRect(),scale=Math.max(.24,Math.min(1.1,r.width/72)),size=220*scale,dpr=Math.min(2,devicePixelRatio||1);
   const pixels=Math.ceil(size*dpr);if(canvas.width!==pixels){canvas.width=canvas.height=pixels;canvas.style.width=canvas.style.height=`${size}px`;}
   canvas.style.left=`${r.left+r.width/2-size/2}px`;canvas.style.top=`${r.top+r.height/2-size/2}px`;
   c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,pixels,pixels);c.setTransform(dpr*scale,0,0,dpr*scale,pixels/2,pixels/2);drawBloodRite(c,age,reduced);
   for(const el of sources){const state=activeSources.get(el)!;state.pulses.set(key,bloodRiteActivation(age));sourcePose(el,state);}
   raf=SPECIAL_FX.requestFrame(frame);
  };raf=SPECIAL_FX.requestFrame(frame);
 });
}
