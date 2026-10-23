import {SPECIAL_FX} from '../animationTempo';
import type {CardInst} from '../../shared/types';
import {FRAME_BACK} from '../../shared/cards';
import {cardEl} from '../cardView';
import {captureCardSurface,CARD_PADDING} from '../cardSurface';
import {playVoidGrant} from '../dimensionVoid/runtime';
import {render,CONTACT,DEPART} from './renderer';
import type {Surface} from './renderer';

/** Project the face itself, never the graveyard container's bounding box. */
function surface(el:HTMLElement):Surface{
 const corners=[[0,0],[100,0],[100,100],[0,100]].map(([x,y])=>{
  const n=document.createElement('i');n.style.cssText=`position:absolute;left:${x}%;top:${y}%;width:0;height:0;pointer-events:none`;
  el.append(n);const r=n.getBoundingClientRect();n.remove();return{x:r.x,y:r.y};
 });
 const r=el.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height,corners};
}
async function capture(node:HTMLElement,dimensions:HTMLElement,signal:AbortSignal){
 const clone=node.cloneNode(true) as HTMLElement,css=getComputedStyle(dimensions),w=parseFloat(css.width),h=parseFloat(css.height);
 clone.style.cssText=`position:fixed;left:-4000px;top:0;width:${w}px;height:${h}px;--cw:${w}px;--ch:${h}px;transform:none;visibility:visible`;
 clone.dataset.rebirthCapture='';document.body.append(clone);
 const remove=()=>clone.remove();signal.addEventListener('abort',remove,{once:true});
 try{
  const shot=await captureCardSurface(clone,FRAME_BACK,true,false);if(!shot.face||signal.aborted)return null;
  const width=shot.face.width/(1+CARD_PADDING*2),pad=width*CARD_PADDING,height=shot.face.height-pad*2;
  const out=document.createElement('canvas');out.width=384;out.height=Math.round(384*height/width);
  out.getContext('2d')!.drawImage(shot.face,pad,pad,width,height,0,0,out.width,out.height);return out;
 }finally{remove();signal.removeEventListener('abort',remove);}
}
const owners=new Map<string,()=>void>();
export async function playRebirth(original:CardInst,face:HTMLElement,side:'me'|'opp',signal:AbortSignal,onContact:()=>void):Promise<boolean>{
 if(signal.aborted||document.hidden)return false;
 owners.get(original.uid)?.();
 const abort=new AbortController(),cancel=()=>abort.abort();owners.set(original.uid,cancel);
 signal.addEventListener('abort',cancel,{once:true});
 const hidden=()=>{if(document.hidden)cancel();};
 window.addEventListener('resize',cancel);window.addEventListener('pagehide',cancel);document.addEventListener('visibilitychange',hidden);
 const pile=document.querySelector<HTMLElement>(`#pile-${side==='me'?'myDisc':'oppDisc'} .pile-print .card`);
 let canvas:HTMLCanvasElement|undefined,raf=0,timer=0,sourceVisibility=pile?.style.visibility??'';
 let contacted=false;
 const contact=()=>{face.style.removeProperty('visibility');if(!contacted){contacted=true;onContact();}};
 try{
  if(!pile||matchMedia('(prefers-reduced-motion: reduce)').matches){contact();return await playVoidGrant([original.uid],abort.signal);}
  const source=surface(pile);
  // Even a buried selection uses its own portrait and UID, at the genuine grave face geometry.
  const [portrait,arrival]=await Promise.all([capture(cardEl(original,{size:'hand'}),pile,abort.signal),capture(face,face,abort.signal)]).catch(()=>[null,null]);
  if(abort.signal.aborted)return false;
  if(!portrait||!arrival){contact();return await playVoidGrant([original.uid],abort.signal);}
  canvas=document.createElement('canvas');canvas.dataset.rebirthFx=original.uid;canvas.setAttribute('aria-hidden','true');
  Object.assign(canvas.style,{position:'fixed',inset:'0',width:'100vw',height:'100vh',pointerEvents:'none',zIndex:'135'});
  const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.ceil(innerWidth*dpr);canvas.height=Math.ceil(innerHeight*dpr);
  const c=canvas.getContext('2d');if(!c)return false;
  document.body.append(canvas);pile.style.visibility='hidden';
  const completed=await new Promise<boolean>(resolve=>{
   let done=false;const start=SPECIAL_FX.now();
   const finish=(ok:boolean)=>{if(done)return;done=true;cancelAnimationFrame(raf);clearTimeout(timer);abort.signal.removeEventListener('abort',stop);resolve(ok);};
   const stop=()=>finish(false);abort.signal.addEventListener('abort',stop,{once:true});timer=window.setTimeout(stop,2800);
   const frame=(now:number)=>{
    if(abort.signal.aborted||!face.isConnected){finish(false);return;}
    const ms=now-start;canvas!.dataset.time=String(Math.round(ms));
    if(ms>=CONTACT){contact();finish(true);return;}
    // A non-top selected card leaves the top grave face in place after departure.
    if(ms>=DEPART&&pile.dataset.uid!==original.uid)pile.style.visibility=sourceVisibility;
    c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,canvas!.width,canvas!.height);c.setTransform(dpr,0,0,dpr,0,0);
    try{render(c,{source,target:surface(face),face:portrait,targetFace:arrival,reduced:false,dark:false,outcome:'return',board:true},ms);}catch{finish(false);return;}
    raf=SPECIAL_FX.requestFrame(frame);
   };frame(start);
  });
  canvas.remove();if(!completed||abort.signal.aborted)return false;
  // Same runtime and material as 次元術式, on the exact live landing face.
  return await playVoidGrant([original.uid],abort.signal);
 }finally{
  cancelAnimationFrame(raf);clearTimeout(timer);canvas?.remove();face.style.removeProperty('visibility');
  if(pile)pile.style.visibility=sourceVisibility;
  cancel();if(owners.get(original.uid)===cancel)owners.delete(original.uid);
  signal.removeEventListener('abort',cancel);window.removeEventListener('resize',cancel);window.removeEventListener('pagehide',cancel);document.removeEventListener('visibilitychange',hidden);
 }
}
