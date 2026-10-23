import {SPECIAL_FX} from '../animationTempo';
import {NativeMarketBreak} from './nativeBreak';
import {SPLIT,revealAt,ease} from './motion';
const active=new WeakMap<HTMLElement,MarketCrisisTransition>();
export type MarketCrisisTransition={destroy:()=>Promise<void>;reveal:()=>Promise<void>;cancel:()=>void};
/** One presentation transaction around the controller's authoritative render.
 * Before destroy resolves, only old cards exist. Reveal begins after commit.
 * The original DOM art is used throughout; no texture capture or white light. */
export function createMarketCrisis(root:HTMLElement):MarketCrisisTransition{
 active.get(root)?.cancel();
 const old=[...root.querySelectorAll<HTMLElement>('#fixedMarket > .card')];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const saved=new Map<HTMLElement,string>();
 let visual:NativeMarketBreak|undefined,raf=0,timer=0,cancelled=false,closed=false,resolveStep:(()=>void)|undefined;
 const remember=(node:HTMLElement)=>{if(!saved.has(node))saved.set(node,node.style.cssText)};
 const restore=()=>{saved.forEach((css,node)=>{node.style.cssText=css});saved.clear()};
 const clearStep=()=>{cancelAnimationFrame(raf);clearTimeout(timer);raf=timer=0;const resolve=resolveStep;resolveStep=undefined;resolve?.()};
 const finish=()=>{if(closed)return;closed=true;clearStep();visual?.dispose();visual=undefined;restore();observer.disconnect();window.removeEventListener('resize',cancel);document.removeEventListener('visibilitychange',hidden);if(active.get(root)===transition)active.delete(root);};
 const cancel=()=>{cancelled=true;finish()};
 const hidden=()=>{if(document.hidden)cancel()};
 const observer=new MutationObserver(()=>{if(!root.isConnected)cancel()});
 const run=(duration:number,paint:(age:number)=>void)=>new Promise<void>(resolve=>{
  if(cancelled||document.hidden||!root.isConnected){cancel();resolve();return}
  resolveStep=resolve;const start=SPECIAL_FX.now();
  const frame=(now:number)=>{if(closed)return;try{paint(Math.min(duration,now-start))}catch{cancel();return}if(now-start>=duration)clearStep();else raf=SPECIAL_FX.requestFrame(frame)};
  timer=window.setTimeout(cancel,duration+500);frame(start);
 });
 const transition:MarketCrisisTransition={
  async destroy(){
   if(!old.length||document.hidden){cancel();return}
   if(!reduced)visual=new NativeMarketBreak(old);
   await run(revealAt(reduced),age=>{
    visual?.paint(old,age,false);
    if(age>=(reduced?500:SPLIT))old.forEach(card=>{remember(card);card.style.setProperty('visibility','hidden','important')});
   });
  },
  async reveal(){
   visual?.dispose();visual=undefined;restore();
   if(cancelled){finish();return}
   const fresh=[...root.querySelectorAll<HTMLElement>('#fixedMarket > .card')];
   fresh.forEach(card=>{remember(card);card.querySelectorAll('img').forEach(img=>{img.decoding='sync';img.loading='eager'});card.style.transition='none';card.style.opacity='0'});
   try{await run(200,age=>fresh.forEach(card=>{card.style.opacity=String(ease(age/200))}))}finally{finish()}
  },cancel,
 };
 active.set(root,transition);observer.observe(document.body,{childList:true,subtree:true});window.addEventListener('resize',cancel);document.addEventListener('visibilitychange',hidden);
 return transition;
}
