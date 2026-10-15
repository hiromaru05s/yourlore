import type {GameState} from '../shared/types';
import {cardEffectId,isCardEffect,CRYSTAL_EFFECT} from '../shared/cardEffects';
import {CrystalRenderer} from './cardFinishCrystal';
import {drawStardustFinish,STARDUST_FINISH_EDGE} from './cardFinishStardust';
import {createPrismVeil} from './cardEffects/prismVeil';
const ownership=new Map<string,string>();
let localEffect='default';
export function localCardEffect(){return localEffect;}
export function setLocalCardEffect(id?:string){localEffect=cardEffectId(id);}
/** Remember departed cards for their exit animation; never inspect market/supply offers. */
export function syncCardEffects(g:GameState,you=0){
 for(const side of [0,1] as const){
  const effect=cardEffectId(g.effects?.[side]??(side===you?localEffect:'default')),p=g.players[side];
  const cards=[...p.deck,...p.hand,...p.discard,...p.field,...(p.removed??[]),...p.exile.map(e=>e.card),...p.traps.map(e=>e.card),...p.enchants.map(e=>e.card),...(p.quests??[]).map(e=>e.card)];
  for(const card of cards)if(card.uid)ownership.set(card.uid,effect);
 }
}
export function clearCardEffectContext(){ownership.clear();localEffect='default';}
export function effectForCard(uid:string):string{return ownership.get(uid)??'default';}
interface Entry {node:HTMLElement;visible:boolean;connected:boolean;draw:(t:number)=>void;dispose:()=>void}
const entries=new Map<HTMLElement,Entry>();
let mutation:MutationObserver|undefined;
let crystal:CrystalRenderer|undefined,observer:IntersectionObserver|undefined,raf=0,last=0,installed=false;
const motion=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
const reduced=()=>motion?.matches??false;
const wake=()=>{last=0;schedule();};
const visibility=()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else wake();};
function release(){if(entries.size)return;cancelAnimationFrame(raf);raf=0;observer?.disconnect();mutation?.disconnect();crystal?.dispose();crystal=undefined;document.removeEventListener('visibilitychange',visibility);document.removeEventListener('load',wake,true);motion?.removeEventListener('change',wake);installed=false;}
function detach(e:Entry){e.dispose();observer?.unobserve(e.node);entries.delete(e.node);delete e.node.dataset.cardEffect;release();}
function schedule(){if(!raf&&entries.size&&!document.hidden)raf=requestAnimationFrame(frame);}
function frame(now:number){
 raf=0;if(document.hidden)return;
 if(reduced()||now-last>=1000/30){last=now;const t=reduced()?1.5:now/1000;let visibleCrystal=false;
  for(const e of entries.values()){
   if(!e.node.isConnected){if(e.connected)detach(e);continue;}e.connected=true;
   if(!e.visible)continue;
   if(e.node.dataset.cardEffect===CRYSTAL_EFFECT)visibleCrystal=true;else e.draw(t);
  }
  if(visibleCrystal)crystal?.draw(t);
 }
 if(!reduced())schedule();
}
function initialize(){
 if(installed)return;installed=true;
 observer=new IntersectionObserver(items=>{for(const item of items){const e=entries.get(item.target as HTMLElement);if(e)e.visible=item.isIntersecting;wake();}},{rootMargin:'50px'});
 mutation=new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes){if(!(node instanceof HTMLElement))continue;const faces=[...(node.matches('[data-card-effect]')?[node]:[]),...node.querySelectorAll<HTMLElement>('[data-card-effect]')];for(const face of faces)if(!entries.has(face)){const id=face.dataset.cardEffect;face.querySelectorAll('.card-effect-surface').forEach(c=>c.remove());attachCardEffect(face,face.dataset.uid??'',id);}}for(const e of entries.values())if(!e.node.isConnected&&e.connected)detach(e);schedule();});mutation.observe(document.body,{childList:true,subtree:true});
 motion?.addEventListener('change',wake);
 document.addEventListener('load',wake,true);
 document.addEventListener('visibilitychange',visibility);
}
/** The common builder calls this only for public faces, below text and seals. */
export function attachCardEffect(node:HTMLElement,uid:string,explicit?:string){
 const id=cardEffectId(explicit??effectForCard(uid));if(!isCardEffect(id))return;
 if(entries.has(node))return;initialize();
 const art=node.querySelector<HTMLElement>('.card-art');if(!art){release();return;}
 node.dataset.cardEffect=id;
 let draw=(_t:number)=>{},dispose=()=>{};
 if(id===CRYSTAL_EFFECT){crystal??=new CrystalRenderer();crystal.attach(node,2);dispose=()=>crystal?.detach(node);}
 else if(id==='effect:prism-veil'){const material=createPrismVeil(node,hashUid(uid));draw=t=>material.draw(t);dispose=()=>material.dispose();}
 else{
  const canvas=document.createElement('canvas');canvas.className='card-effect-surface';canvas.width=256;canvas.height=node.matches('.card--field,.buff-icon')?256:400;canvas.setAttribute('aria-hidden','true');canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2';art.append(canvas);
  const ctx=canvas.getContext('2d')!,seed=hashUid(uid),h=canvas.height;
  draw=t=>{
   ctx.clearRect(0,0,256,h);ctx.save();
   const path=document.querySelector(node.matches('.card--field,.buff-icon')?'#celestial-field-spell path':'#celestial-base-spell path')?.getAttribute('d');
   if(path){ctx.scale(256,h);ctx.clip(new Path2D(path));ctx.scale(1/256,1/h);}
   drawStardustFinish(ctx,256,h,t,seed);
   if(path){ctx.save();ctx.scale(256,h);ctx.globalAlpha=.58;ctx.strokeStyle=STARDUST_FINISH_EDGE;ctx.lineWidth=1.6/256;ctx.stroke(new Path2D(path));ctx.restore();}
   ctx.restore();
  };dispose=()=>{canvas.remove();canvas.width=0;};
 }
 const e={node,visible:true,connected:node.isConnected,draw,dispose};entries.set(node,e);observer!.observe(node);draw(reduced()?1.5:performance.now()/1000);schedule();
}
function hashUid(uid:string){let n=0;for(const c of uid)n=(n*31+c.charCodeAt(0))>>>0;return n%10007;}
/** Explicit teardown also handles canvases built but never inserted during cancellation. */
export function disposeCardEffects(root?:HTMLElement){for(const e of entries.values())if(!root||root.contains(e.node)||!e.node.isConnected)detach(e);if(!entries.size){cancelAnimationFrame(raf);raf=0;}}
