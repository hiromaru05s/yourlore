import {drawGrowth,GROWTH_START,GROWTH_HEAL,GROWTH_DURATION} from './visual';
import type {Anchor} from './visual';
import type {GrowthPulse} from './plan';
import {handCardMatrix} from '../handGeometry';
import {cardName} from '../../i18n';
import {DB} from '../../shared/cards';
function anchor(node:HTMLElement,project=false):Anchor{
 const r=node.getBoundingClientRect();if(!project)return{x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height};
 const m=handCardMatrix(node),w=node.offsetWidth,h=node.offsetHeight;
 const corners=[[0,0],[w,0],[w,h],[0,h]].map(([x,y])=>{const p=m.transformPoint(new DOMPoint(x,y));return{x:p.x,y:p.y}});
 return{x:r.x+r.width/2,y:r.y+r.height/2,w,h,corners,bottom:r.bottom};
}
export async function playGrowth(side:'me'|'opp',pulses:readonly GrowthPulse[],onHeal:(index:number)=>void,signal:AbortSignal):Promise<boolean>{
 const target=document.getElementById(`hp-${side}`)?.closest<HTMLElement>('.pt-hp');
 if(!target||signal.aborted||document.hidden)return false;
 const sources=pulses.map(p=>document.querySelector<HTMLElement>(`.buff-icon[data-uid="${CSS.escape(p.uid)}"]`));
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const canvas=document.createElement('canvas');canvas.className='growth-leaf-fx';canvas.setAttribute('aria-hidden','true');
 Object.assign(canvas.style,{position:'fixed',inset:'0',width:'100vw',height:'100vh',pointerEvents:'none',zIndex:'125'});
 const c=canvas.getContext('2d');if(!c)return false;
 const dpr=Math.min(2,devicePixelRatio||1);canvas.width=Math.ceil(innerWidth*dpr);canvas.height=Math.ceil(innerHeight*dpr);
 const hp=anchor(target),anchors=sources.map(node=>node?anchor(node,true):null),applied=new Set<number>();
 const end=Math.max(0,...pulses.map(p=>p.delay))+GROWTH_DURATION;
 return new Promise(resolve=>{
  let raf=0,done=false;const start=performance.now();
  const finish=(success=false)=>{if(done)return;done=true;cancelAnimationFrame(raf);canvas.remove();signal.removeEventListener('abort',abort);window.removeEventListener('resize',abort);document.removeEventListener('visibilitychange',hidden);observer.disconnect();resolve(success);};
  const abort=()=>finish(false),hidden=()=>{if(document.hidden)abort();};
  const observer=new MutationObserver(()=>{if(!target.isConnected||sources.some(node=>node&&!node.isConnected))abort();});
  observer.observe(document.body,{childList:true,subtree:true});signal.addEventListener('abort',abort,{once:true});window.addEventListener('resize',abort);document.addEventListener('visibilitychange',hidden);document.body.append(canvas);
  const frame=(now:number)=>{
   if(done)return;if(signal.aborted||document.hidden||!target.isConnected){finish(false);return;}
   const age=now-start;c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,canvas.width,canvas.height);c.setTransform(dpr,0,0,dpr,0,0);
   pulses.forEach((p,i)=>{
    const t=age-p.delay;if(t<0)return;
    if(t>=GROWTH_HEAL&&!applied.has(i)){applied.add(i);onHeal(i);}
    const source=anchors[i];if(source)drawGrowth(c,{source,hp,dark:false,reduced,sourceName:cardName({...DB.GROWTH,uid:p.uid})},t+GROWTH_START,p.amount>0);
   });
   if(age>=end){finish(true);return;}raf=requestAnimationFrame(frame);
  };raf=requestAnimationFrame(frame);
 });
}
