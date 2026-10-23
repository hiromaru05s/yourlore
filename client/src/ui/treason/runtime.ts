import {SPECIAL_FX} from '../animationTempo';
import {Chains,BREAK,type Anchor} from './chains';
import {monsterRect} from '../monster/runtime';
import {prepareManaDestruction} from '../manaDestruction/runtime';

function anchors(nodes:HTMLElement[]):Anchor[]{return nodes.map(node=>{
 const r=monsterRect(node),m=r.matrix!;
 const point=(x:number,y:number)=>{const p=m.transformPoint(new DOMPoint(x,y));return{x:p.x/p.w,y:p.y/p.w};};
 const a=point(0,0),b=point(r.w,0),d=point(0,r.h),center=point(r.w/2,r.h/2),h=100*r.h/r.w;
 return{x:center.x,y:center.y,w:r.w,h:r.h,basis:[(b.x-a.x)/100,-(b.y-a.y)/100,-(d.x-a.x)/h,(d.y-a.y)/h]};
});}
/** All material work precedes the visible chain clock. Native exits share the release. */
export async function playTreason(targets:{node:HTMLElement;voided:boolean}[],signal:AbortSignal,destroy:()=>Promise<void>):Promise<boolean>{
 if(signal.aborted||document.hidden)return false;
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){await destroy();return !signal.aborted;}
 const prep=new AbortController(),cancel=()=>prep.abort();signal.addEventListener('abort',cancel,{once:true});
 let chains:Chains|undefined,raf=0,finishFrame:(()=>void)|undefined;
 const stopped=()=>signal.aborted||document.hidden||targets.some(t=>!t.node.isConnected);
 const stopFrame=()=>{cancelAnimationFrame(raf);finishFrame?.();finishFrame=undefined;};
 const clear=()=>{stopFrame();chains?.dispose();chains=undefined;};signal.addEventListener('abort',clear,{once:true});
 const motion=(from:number,to:number)=>new Promise<void>(resolve=>{
  let start:number|undefined;finishFrame=resolve;
  const tick=(now:number)=>{if(stopped()){resolve();return;}start??=now;const ms=Math.min(to,from+now-start);chains!.paint(ms);chains!.canvas.dataset.elapsed=String(Math.round(ms));
   if(ms<to)raf=SPECIAL_FX.requestFrame(tick);else{finishFrame=undefined;resolve();}};
  raf=SPECIAL_FX.requestFrame(tick);
 });
 try{
  // A missing WebGL context keeps the authoritative native destruction available.
  try{chains=new Chains();chains.configure(anchors(targets.map(t=>t.node)));chains.paint(BREAK);chains.paint(0);}catch{chains?.dispose();chains=undefined;}
  let prepared=true;
  for(const target of targets){
   if(stopped())return false;
   if(!target.voided){
    let ready=await prepareManaDestruction(target.node,prep.signal);
    // Image decoding can miss its short cold-load deadline on a busy device.
    // Retry while the sequence is still invisible, never after binding starts.
    if(!ready&&!stopped())ready=await prepareManaDestruction(target.node,prep.signal);
    prepared=prepared&&ready;
   }
   await new Promise<void>(resolve=>setTimeout(resolve,0));
  }
  if(stopped())return false;
  // Failed capture falls back before any visible binding, never in the handoff.
  if(!prepared){chains?.dispose();chains=undefined;}
  if(chains){chains.canvas.dataset.phase='binding';await motion(0,BREAK);}
  if(stopped())return false;
  if(chains)chains.canvas.dataset.phase='destroying';
  await Promise.all([destroy(),chains?motion(BREAK,BREAK+240):Promise.resolve()]);
  return !stopped();
 }finally{clear();prep.abort();signal.removeEventListener('abort',cancel);signal.removeEventListener('abort',clear);}
}
