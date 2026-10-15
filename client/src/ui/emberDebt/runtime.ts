import {combatPortrait,combatRect} from '../combatAnchor';
import {drawEmber} from './visual';
import type {GameEvent,Side} from '../../shared/types';
import type {Playback} from '../elemental/runtime';
const url=new URL('./assets/coiling-fire.webp',import.meta.url).href;
let image:HTMLImageElement|undefined,loading:Promise<HTMLImageElement>|undefined;
export function prepareEmberDebt():Promise<HTMLImageElement>{
 if(image)return Promise.resolve(image);
 return loading??=(async()=>{const img=new Image();img.src=url;await img.decode();image=img;return img;})().catch(error=>{loading=undefined;throw error;});
}
/** Typed reducer impacts gate the existing damage/heal/reverse handlers. */
export function startEmberDebt(event:Extract<GameEvent,{type:'elementalStart'}>,you:Side,source?:HTMLElement):Playback{
 const nodes=event.targets.map(t=>combatPortrait(t.player===you?'me':'opp'));
 const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
 const due=event.targets.map((_,i)=>(reduced?120:300)+i*80),duration=reduced?650:1040+Math.max(0,event.targets.length-1)*80;
 const resolvers:Array<()=>void>=[],impacts=event.targets.map((_,i)=>new Promise<void>(r=>resolvers[i]=r));
 let resolve!:()=>void;const finished=new Promise<void>(r=>resolve=r);
 let closed=false,raf=0,deadline=0,canvas:HTMLCanvasElement|undefined,next=0;
 function cancel(){if(closed)return;closed=true;cancelAnimationFrame(raf);clearTimeout(deadline);canvas?.remove();window.removeEventListener('resize',cancel);document.removeEventListener('visibilitychange',hidden);resolvers.forEach(r=>r());resolve();}
 function hidden(){if(document.hidden)cancel();}
 window.addEventListener('resize',cancel);document.addEventListener('visibilitychange',hidden);
 // Asset failure/slow decoding cannot hold the controller or its impact promises.
 deadline=window.setTimeout(cancel,1500);
 void prepareEmberDebt().then(sheet=>{
  if(closed)return;
  if(document.hidden||!nodes.some(n=>combatRect(n))){cancel();return;}
  clearTimeout(deadline);deadline=window.setTimeout(cancel,duration+1500);
  canvas=document.createElement('canvas');canvas.className='ember-debt-fx';canvas.dataset.elemental='ember-debt-02';canvas.dataset.hits=String(event.targets.length);canvas.dataset.duration=String(duration);canvas.setAttribute('aria-hidden','true');
  Object.assign(canvas.style,{position:'fixed',inset:'0',width:'100vw',height:'100vh',pointerEvents:'none',zIndex:'125'});
  const dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(innerWidth*dpr);canvas.height=Math.round(innerHeight*dpr);
  const ctx=canvas.getContext('2d');if(!ctx){cancel();return;}ctx.setTransform(dpr,0,0,dpr,0,0);document.body.append(canvas);
  const start=performance.now();
  function tick(now:number){
   if(closed)return;if(document.hidden||(source&&!source.isConnected)||!nodes.some(n=>combatRect(n))){cancel();return;}
   const elapsed=now-start;ctx!.clearRect(0,0,innerWidth,innerHeight);
   nodes.forEach((node,i)=>{const r=combatRect(node);if(!r)return;const t=reduced?elapsed/650*1120:elapsed;
    drawEmber(ctx!,sheet,{x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height},t,300+i*80,i===0?1:.55,reduced);
   });
   while(next<due.length&&elapsed>=due[next]){canvas!.dataset.impact=String(next);resolvers[next++]();}
   if(elapsed>=duration){cancel();return;}raf=requestAnimationFrame(tick);
  }
  raf=requestAnimationFrame(tick);
 }).catch(cancel);
 return {impact:index=>impacts[index]??Promise.resolve(),finished,cancel};
}
