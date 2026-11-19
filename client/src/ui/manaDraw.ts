import {ensureCardFrameReady} from './cardFrame';
import {ManaDrawPresentation} from './manaDrawPresentation';
import {drawDuration} from './manaDrawTiming';
import type {HandLayout} from './handGeometry';
import {sfx} from './sound';
export interface ManaDrawOptions {cards:HTMLElement[];origin:DOMRect;sleeve:string;reveal:boolean;signal:AbortSignal;onLand:(node:HTMLElement)=>void;previousHand?:HandLayout;releaseHand?:()=>void;durationScale?:number;}

/** Production lifecycle for the approved 1.15x draw; the native card never changes owners. */
export async function drawManaCards({cards,origin,sleeve,reveal,signal,onLand,previousHand,releaseHand,durationScale=1}:ManaDrawOptions):Promise<void>{
 if(signal.aborted||!cards.length||cards.some(n=>!n.isConnected))return;
 const width=innerWidth,height=innerHeight,speed=Math.max(.5,Math.min(5,durationScale));
 let presentation:ManaDrawPresentation|undefined,raf=0,timer:ReturnType<typeof setTimeout>|undefined,finish=()=>{};
 let cancelDecode=()=>{};const cancelled=new Promise<void>(resolve=>{cancelDecode=resolve;});
 const cancel=()=>{cancelDecode();finish();};signal.addEventListener('abort',cancel,{once:true});
 try{
  const images=reveal?cards.flatMap(n=>[...n.querySelectorAll('img')]).filter(i=>!i.complete||!i.naturalWidth):[];
  await Promise.race([cancelled,Promise.all([
   ...cards.filter(n=>reveal&&n.dataset.cardFrame).map(n=>ensureCardFrameReady(n)),
   ...images.map(i=>i.decode().catch(()=>{}))
  ]),new Promise<void>(r=>{timer=setTimeout(r,180);})]);clearTimeout(timer);
  if(signal.aborted||cards.some(n=>!n.isConnected)||typeof DOMMatrix==='undefined')return;
  releaseHand?.();
  // Complete only layout transitions, then restore the previous fan in the same
  // paint. Decorative clocks and the decoded print keep running uninterrupted.
  for(const animation of cards[0].parentElement!.getAnimations({subtree:true}))if(animation instanceof CSSTransition)animation.finish();
  presentation=new ManaDrawPresentation();presentation.prepare(cards,origin,sleeve,reveal,previousHand,onLand,()=>sfx('draw'));
  presentation.render(0);
  const start=performance.now(),duration=drawDuration(cards.length);
  await new Promise<void>(resolve=>{
   let done=false;finish=()=>{if(done)return;done=true;cancelAnimationFrame(raf);resolve();};
   const tick=(now:number)=>{
    if(signal.aborted||document.hidden||innerWidth!==width||innerHeight!==height||cards.some(n=>!n.isConnected)){finish();return;}
    const time=(now-start)/1000/speed;presentation!.render(time);
    if(time>=duration)finish();else raf=requestAnimationFrame(tick);
   };raf=requestAnimationFrame(tick);
  });
 }finally{clearTimeout(timer);cancelAnimationFrame(raf);signal.removeEventListener('abort',cancel);presentation?.dispose();releaseHand?.();}
}
