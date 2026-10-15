import {drawErosion,erosionActivation,erosionImpact,EROSION_HIT,EROSION_DURATION} from './visual';
type Pulse={age:number;reduced:boolean};
type Pose={saved:{translate:string;scale:string;filter:string;zIndex:string};lift:number;target:boolean;pulses:Map<symbol,Pulse>};
const poses=new Map<HTMLElement,Pose>();
function update(el:HTMLElement,p:Pose){
 if(!p.pulses.size){Object.assign(el.style,p.saved);poses.delete(el);return;}
 const values=[...p.pulses.values()];
 if(p.target){const best=values.map(v=>erosionImpact(v.age,v.reduced)).sort((a,b)=>b.power-a.power)[0];if(best.power===0){Object.assign(el.style,p.saved);return;}el.style.scale=String(best.scale);el.style.translate=`${best.dx}px ${best.dy}px`;el.style.filter=`brightness(${1+.8*best.power}) saturate(${1+.6*best.power})`;}
 else{const a=Math.max(...values.map(v=>erosionActivation(v.age))),motion=Math.max(...values.map(v=>v.reduced?0:erosionActivation(v.age)));el.style.translate=`0 ${-p.lift*motion}px`;el.style.scale=String(1+.075*motion);el.style.filter=`brightness(${1+.07*a})`;el.style.zIndex='12';}
}
export function playErosion(side:'me'|'opp',uid:string,amount:number,onDamage:()=>void,signal:AbortSignal):Promise<boolean>{
 const target=document.getElementById(`hp-${side}`)?.closest<HTMLElement>('.pt-hp');
 if(signal.aborted||document.hidden||!target)return Promise.resolve(false);
 const source=document.querySelector<HTMLElement>(`.buff-icon[data-uid="${CSS.escape(uid)}"]`);
 const nodes=[target,...(source?[source]:[])],key=Symbol('erosion'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 for(const el of nodes){if(!poses.has(el)){const r=el.getBoundingClientRect();poses.set(el,{saved:{translate:el.style.translate,scale:el.style.scale,filter:el.style.filter,zIndex:el.style.zIndex},lift:Math.max(2,Math.min(6,r.height*.075))/Math.max(.1,r.height/Math.max(1,el.offsetHeight)),target:el===target,pulses:new Map()});}poses.get(el)!.pulses.set(key,{age:0,reduced});}
 const canvas=document.createElement('canvas');canvas.className='erosion-microfracture-fx';canvas.setAttribute('aria-hidden','true');canvas.style.cssText='position:fixed;pointer-events:none;z-index:125';const c=canvas.getContext('2d');
 return new Promise(resolve=>{
  let raf=0,done=false,applied=false;const start=performance.now();
  const finish=(completed=false)=>{if(done)return;done=true;cancelAnimationFrame(raf);canvas.remove();signal.removeEventListener('abort',abort);window.removeEventListener('resize',abort);document.removeEventListener('visibilitychange',hidden);observer.disconnect();for(const el of nodes){const p=poses.get(el);if(p){p.pulses.delete(key);update(el,p);}}resolve(completed);};
  const abort=()=>finish(false),hidden=()=>{if(document.hidden)abort();};
  const observer=new MutationObserver(()=>{if(!target.isConnected||source&&!source.isConnected)abort();});observer.observe(document.body,{childList:true,subtree:true});
  signal.addEventListener('abort',abort,{once:true});window.addEventListener('resize',abort);document.addEventListener('visibilitychange',hidden);
  if(!c){finish();return;}document.body.append(canvas);
  const frame=(now:number)=>{
   if(done)return;if(signal.aborted||document.hidden||!target.isConnected){finish();return;}
   const age=now-start;
   if(age>=EROSION_HIT&&!applied){applied=true;try{onDamage();}catch{finish(false);return;}}
   if(age>=EROSION_DURATION){finish(true);return;}
   for(const el of nodes){const p=poses.get(el)!;p.pulses.set(key,{age,reduced});update(el,p);}
   const r=target.getBoundingClientRect(),padding=52,w=Math.ceil(r.width+padding*2),h=Math.ceil(r.height+padding*2),dpr=Math.min(2,devicePixelRatio||1);
   canvas.width=Math.ceil(w*dpr);canvas.height=Math.ceil(h*dpr);canvas.style.width=`${w}px`;canvas.style.height=`${h}px`;canvas.style.left=`${r.left-padding}px`;canvas.style.top=`${r.top-padding}px`;c.setTransform(dpr,0,0,dpr,0,0);
   drawErosion(c,{x:padding+r.width/2,y:padding+r.height/2,w:r.width,h:r.height},age-EROSION_HIT,reduced,Math.min(.9,innerWidth/1050,innerHeight/650),amount);
   canvas.dataset.age=String(Math.round(age));raf=requestAnimationFrame(frame);
  };raf=requestAnimationFrame(frame);
 });
}
