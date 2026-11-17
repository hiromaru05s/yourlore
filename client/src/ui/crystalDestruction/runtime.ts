import type {CardInst} from '../../shared/types';
import {combatVisualRect,monsterPresentationNodes,releaseMonsterFace} from '../monster/runtime';
import {sfx} from '../sound';
import {CONTACT_MS,drawSeams,fracture,paintContactFlash,type Fracture} from './crystalImpact';
import {prepareShelfLanding} from './shelfLanding';

export function strikeFracture(attacker:HTMLElement,defender:HTMLElement){
 return fracture(attacker.getBoundingClientRect(),defender.getBoundingClientRect());
}

/** Keep the original face and its current HP visible under the expanding cracks. */
export function holdCrystalHit(victim:HTMLElement,hit:Fracture,signal:AbortSignal):Promise<boolean>{
 if(signal.aborted||document.hidden||matchMedia('(prefers-reduced-motion:reduce)').matches)return Promise.resolve(false);
 const owners=monsterPresentationNodes(victim);
 const marks=owners.map(node=>{
  const mark=document.createElement('canvas');
  mark.width=192;mark.height=Math.round(192*(victim.offsetHeight/victim.offsetWidth));
  mark.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:24';
  mark.dataset.crystalContact=victim.dataset.uid;node.append(mark);
  return {mark,ctx:mark.getContext('2d')!};
 });
 sfx('facehit',{rate:.66,gain:.74,signal});
 const squash=owners.map(node=>node.animate([
  {scale:'1',offset:0},{scale:'.90 1.09',offset:.12},{scale:'.96 1.035',offset:.47},
  {scale:'.985 1.012',offset:.78},{scale:'1',offset:1}
 ],{duration:CONTACT_MS,easing:'ease-out'}));
 return new Promise(resolve=>{
  const start=performance.now();let frame=0;
  const finish=()=>{
   cancelAnimationFrame(frame);signal.removeEventListener('abort',finish);
   squash.forEach(a=>a.cancel());
   for(const {mark} of marks){delete mark.dataset.crystalContact;if(signal.aborted)mark.remove()}
   resolve(!signal.aborted);
  };
  const tick=(now:number)=>{
   const ms=Math.max(0,now-start);
   for(const {mark,ctx} of marks){
    ctx.clearRect(0,0,mark.width,mark.height);
    drawSeams(ctx,hit,mark.width,mark.height,ms);paintContactFlash(ctx,hit,mark.width,mark.height,ms);
   }
   if(ms>=CONTACT_MS)finish();else frame=requestAnimationFrame(tick);
  };
  signal.addEventListener('abort',finish,{once:true});tick(start);
 });
}

export async function landCrystal(source:HTMLElement,pile:HTMLElement,card:CardInst,count:number,hit:Fracture|undefined,signal:AbortSignal){
 if(signal.aborted||document.hidden)return false;
 const box=combatVisualRect(source)??source.getBoundingClientRect();
 const shape=hit??fracture({x:box.x,y:box.bottom,width:box.width,height:0},box);
 const flight=prepareShelfLanding(pile,card,count,source,shape);
 releaseMonsterFace(source);
 await flight(box,signal);
 return !signal.aborted;
}
