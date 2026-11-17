import {cloneCardNode} from '../cardClone';
import {cardEl} from '../cardView';
import {cardUnit} from '../boardProjection';
import {pileFace} from '../readingBoardLayout';
import type {CardInst} from '../../shared/types';
import {type Fracture} from './crystalImpact';

const duration=670;
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const smooth=(x:number)=>{const t=clamp(x);return t*t*(3-2*t)};
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;

// Sample the real projected shelf. Its CSS perspective changes across the table.
function shelfPlane(node:HTMLElement){
 const w=node.offsetWidth,h=node.offsetHeight;
 const pins=[[0,0],[1,0],[1,1],[0,1]].map(([x,y])=>{
  const pin=document.createElement('i');pin.style.cssText=`position:absolute;left:${x*100}%;top:${y*100}%;width:0;height:0;pointer-events:none`;
  node.append(pin);return pin;
 });
 const [a,b,c,d]=pins.map(pin=>pin.getBoundingClientRect());pins.forEach(pin=>pin.remove());
 const ex=b.x-c.x,ey=b.y-c.y,fx=d.x-c.x,fy=d.y-c.y;
 const gx=a.x-b.x+c.x-d.x,gy=a.y-b.y+c.y-d.y,det=ex*fy-fx*ey;
 const u=(gx*fy-fx*gy)/det,v=(ex*gy-gx*ey)/det;
 const map=new DOMMatrix();
 map.m11=(b.x*(1+u)-a.x)/w;map.m12=(b.y*(1+u)-a.y)/w;map.m14=u/w;
 map.m21=(d.x*(1+v)-a.x)/h;map.m22=(d.y*(1+v)-a.y)/h;map.m24=v/h;
 map.m41=a.x;map.m42=a.y;
 const inverse=map.inverse();
 return {w,h,local(x:number,y:number){const p=inverse.transformPoint(new DOMPoint(x,y));return {x:p.x/p.w,y:p.y/p.w}}};
}

export function prepareShelfLanding(pile:HTMLElement,card:CardInst,count:number,source:HTMLElement,fracture:Fracture){
 const previous=pile.querySelector<HTMLElement>(':scope > .pile-print');
 const mount=document.createElement('div');mount.className='pile-print';mount.dataset.incomingShelf=card.uid;
 mount.setAttribute('aria-hidden','true');mount.style.opacity='0';
 const elevation=cardUnit(pile)*pileFace(count,true)+'px';mount.style.setProperty('--shelf-elevation',elevation);
 const carrier=document.createElement('div');carrier.style.cssText='position:absolute;inset:0;transform-origin:50% 50%;will-change:transform';
 const face=cardEl(card,{size:'hand'});
 const originalStyle=face.style.cssText;face.style.cssText+='--cw:var(--card-w);--ch:var(--card-h);width:100%;height:100%;opacity:0';
 // The live UID belongs to the field until contact.
 face.removeAttribute('data-uid');carrier.append(face);
 // Clip copies of the actual printed face. Browser image layers are already decoded.
 const pieces=fracture.plates.map(plate=>{
  const piece=document.createElement('div');
  piece.style.cssText='position:absolute;inset:0;pointer-events:none;will-change:transform,opacity';
  piece.style.clipPath='polygon('+plate.outline.map(p=>((p.x*100)+'% '+(p.y*100)+'%')).join(',')+')';
  const print=cloneCardNode(source);
  print.removeAttribute('data-uid');print.removeAttribute('id');
  print.classList.remove('is-targetable','is-atk-target','is-attacker','mhit');
  print.style.cssText='--cw:var(--card-w);--ch:var(--card-h);width:100%;height:100%;opacity:1;visibility:visible;transform:none;animation:none';
  piece.append(print);carrier.append(piece);return piece;
 });
 mount.append(carrier);pile.append(mount);
 const preparedPlane=shelfPlane(carrier);
 const preparedWidth=innerWidth,preparedHeight=innerHeight;
 return async function fly(origin:DOMRect,signal:AbortSignal){
  if(signal.aborted||!mount.isConnected){mount.remove();return}
  const {w,h,local}=innerWidth===preparedWidth&&innerHeight===preparedHeight?preparedPlane:shelfPlane(carrier);
  const center=local(origin.x+origin.width/2,origin.y+origin.height/2);
  const left=local(origin.left,origin.top+origin.height/2),right=local(origin.right,origin.top+origin.height/2);
  const top=local(origin.left+origin.width/2,origin.top),bottom=local(origin.left+origin.width/2,origin.bottom);
  const sx=Math.abs(right.x-left.x)/w,sy=Math.abs(bottom.y-top.y)/h;
  const dx=center.x-w/2,dy=center.y-h/2;
  const handles:Animation[]=[];
  const clock=(el:HTMLElement,frames:Keyframe[])=>{
   const anim=el.animate(frames,{duration,fill:'both'});anim.pause();handles.push(anim);return anim;
  };
  const samples=Array.from({length:41},(_,i)=>i/40);
  const motion=clock(carrier,samples.map(t=>{
   const carry=smooth((t-.105)/.885),kick=(1-(1-clamp(t/.18))**3)*(1-carry);
   // Rise out of the lane; glide nearly parallel to the print, then lower onto the stack.
   const lift=Math.sin(carry*Math.PI)*h*.43;
   const x=dx*(1-carry)+fracture.dir.x*w*.29*kick;
   const y=dy*(1-carry)+fracture.dir.y*w*.29*kick-lift;
   const angle=(dx>=0?-1:1)*9*Math.sin(Math.PI*carry);
   return {offset:t,transform:`translate(${x}px,${y}px) rotate(${angle}deg) scale(${mix(sx,1,carry)},${mix(sy,1,carry)})`};
  }));
  for(const [i,piece] of pieces.entries()){
   const p=fracture.plates[i].center;
   clock(piece,samples.map(t=>{
    const spread=(1-(1-clamp(t/(.16+.009*(i%3))))**3)*(1-smooth((t-.17)/(.52+.014*(i%4))));
    const x=(p.x-fracture.h.x)*w*.74*spread,y=(p.y-fracture.h.y)*h*.74*spread;
    const turn=(i%2?1:-1)*(7+i*3)*spread;
    return {offset:t,transform:`translate(${x}px,${y}px) rotate(${turn}deg)`,opacity:1-smooth((t-.66)/.16)};
   }));
  }
  clock(face,[{offset:0,opacity:0},{offset:.66,opacity:0},{offset:.82,opacity:1},{offset:1,opacity:1}]);
  mount.dataset.crystalExit=card.uid;
  const oldZ=pile.style.zIndex;pile.style.zIndex='185';mount.style.opacity='1';
  const cancelled=()=>handles.forEach(a=>a.cancel());
  signal.addEventListener('abort',cancelled,{once:true});
  document.addEventListener('visibilitychange',cancelled);window.addEventListener('resize',cancelled);
  try{
   const start=document.timeline.currentTime;
   for(const anim of handles){anim.play();anim.startTime=start}
   if(!matchMedia('(prefers-reduced-motion:reduce)').matches&&!document.hidden)await motion.finished.catch(()=>{});
  }finally{
   signal.removeEventListener('abort',cancelled);document.removeEventListener('visibilitychange',cancelled);window.removeEventListener('resize',cancelled);
   if(!signal.aborted && mount.isConnected){
    // The same print that finished the glide now owns the actual top slot.
    face.style.cssText=originalStyle;face.dataset.uid=card.uid;mount.replaceChildren(face);previous?.remove();
    pile.style.setProperty('--shelf-elevation',elevation);pile.dataset.count=String(count);
    const badge=pile.querySelector('.pile-count');if(badge)badge.textContent=String(count);
    delete mount.dataset.crystalExit;delete mount.dataset.incomingShelf;mount.style.opacity='';
   }else mount.remove();
   cancelled();pile.style.zIndex=oldZ;
  }
 };
}
