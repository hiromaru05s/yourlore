import {END,HIT,ease} from './motion';
import type {MotionScene} from './motion';
import type {ReverseFlow} from './visual';
let renderer:ReverseFlow|undefined,users=0;
export const warmReverse=()=>{void import('./visual').catch(()=>{});};
type Pose={saved:{translate:string;scale:string;zIndex:string;filter:string};pulses:Map<symbol,number>;ratio:number};
const poses=new Map<HTMLElement,Pose>();
function pose(el:HTMLElement,p:Pose,reduced:boolean){
 const a=Math.max(0,...p.pulses.values());if(!a){Object.assign(el.style,p.saved);return;}
 el.style.translate=`0 ${reduced?0:-7*a/p.ratio}px`;el.style.scale=String(1+(reduced?0:.085*a));el.style.zIndex='12';el.style.filter=`drop-shadow(0 ${3+5*a}px ${3+4*a}px #100b1855)`;
}
const anchor=(n:HTMLElement)=>{const r=n.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height};};
/** One selected material and one contact; no incoming attack, labels or HP mutation. */
export async function playReverse(from:'me'|'opp',to:'me'|'opp',uids:string[],onContact:()=>void,signal:AbortSignal):Promise<boolean>{
 const find=(side:string)=>document.querySelector<HTMLElement>(`#portrait${side==='me'?'Me':'Opp'} .pt-ring`),source=find(from),target=find(to);
 if(signal.aborted||document.hidden||!source||!target)return false;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let ready=false;try{const module=await import('./visual');if(signal.aborted||!source.isConnected||!target.isConnected)return false;renderer??=new module.ReverseFlow();ready=true;}catch{/* Static, non-WebGL accessibility fallback. */}
 if(signal.aborted||document.hidden)return false;
 const key=Symbol('reverse'),cards=[...new Set(uids)].map(uid=>document.querySelector<HTMLElement>(`.buff-icon[data-uid="${CSS.escape(uid)}"]`)).filter((n):n is HTMLElement=>!!n);
 for(const n of cards){if(!poses.has(n))poses.set(n,{saved:{translate:n.style.translate,scale:n.style.scale,zIndex:n.style.zIndex,filter:n.style.filter},pulses:new Map(),ratio:Math.max(.1,n.getBoundingClientRect().height/Math.max(1,n.offsetHeight))});poses.get(n)!.pulses.set(key,0);}
 users++;
 const canvas=document.createElement('canvas');canvas.className='reverse-pitch-fx';canvas.dataset.variant='02';canvas.setAttribute('aria-hidden','true');canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:180';
 const c=canvas.getContext('2d');
 return new Promise(resolve=>{
  let raf=0,done=false,contacted=false;const start=performance.now();
  const finish=(ok=false)=>{if(done)return;done=true;cancelAnimationFrame(raf);clearTimeout(deadline);canvas.remove();observer.disconnect();signal.removeEventListener('abort',abort);window.removeEventListener('resize',abort);window.removeEventListener('pagehide',abort);document.removeEventListener('visibilitychange',hidden);for(const n of cards){const p=poses.get(n);if(!p)continue;p.pulses.delete(key);pose(n,p,reduced);if(!p.pulses.size)poses.delete(n);}if(--users===0){renderer?.dispose();renderer=undefined;}resolve(ok);};
  const abort=()=>finish(),hidden=()=>{if(document.hidden)abort();},deadline=setTimeout(abort,4500);
  const observer=new MutationObserver(()=>{if(!source.isConnected||!target.isConnected)abort();});observer.observe(document.body,{childList:true,subtree:true});
  signal.addEventListener('abort',abort,{once:true});window.addEventListener('resize',abort);window.addEventListener('pagehide',abort);document.addEventListener('visibilitychange',hidden);
  if(!c){abort();return;}document.body.append(canvas);
  const frame=(now:number)=>{
   if(done)return;if(signal.aborted||!source.isConnected||!target.isConnected||document.hidden){abort();return;}
   const t=Math.min(END,(now-start)*(reduced?END/620:1));canvas.dataset.elapsed=String(t);
   const s:MotionScene={original:anchor(source),destination:anchor(target),scale:Math.max(.34,Math.min(.9,innerWidth/1200,Math.abs(anchor(source).y-anchor(target).y)/340))};
   const dpr=Math.min(devicePixelRatio||1,1.5);const width=Math.round(innerWidth*dpr),height=Math.round(innerHeight*dpr);if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,innerWidth,innerHeight);
   if(t>0&&t<END){
    try{if(ready&&renderer)c.drawImage(renderer.draw(s,1,t,innerWidth,innerHeight,reduced),0,0);else throw Error('fallback');}
    catch{ready=false;canvas.dataset.fallback='true';const p=t<HIT?s.original:s.destination;c.strokeStyle='#17111c66';c.lineWidth=2;c.beginPath();c.arc(p.x,p.y,Math.min(p.w??100,p.h??100)*.5,0,Math.PI*2);c.stroke();}
   }
   const amount=t<=0||t>=END?0:ease(t/260)*(1-ease((t-2100)/550));for(const n of cards){const p=poses.get(n)!;p.pulses.set(key,amount);pose(n,p,reduced);}
   if(t>=HIT&&!contacted){contacted=true;onContact();}
   if(t>=END)finish(true);else raf=requestAnimationFrame(frame);
  };raf=requestAnimationFrame(frame);
 });
}
