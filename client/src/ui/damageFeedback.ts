import {combatRect} from './combatAnchor';
import './damageFeedback.css';

/** Damage belongs to the frame at contact, including renderer-owned invisible DOM anchors. */
const live=new Set<()=>void>();
export function clearDamageFeedback(){for(const stop of [...live])stop();}
export function damageNumber(anchor:HTMLElement|null,amount:number,follow?:()=>DOMRect|null):void{
 if(!combatRect(anchor)||!Number.isFinite(amount)||amount<0||document.hidden)return;
 const heavy=amount>=10;
 const node=document.createElement('div');
 node.className=`combat-damage in${heavy?' combat-damage-heavy':''}`;
 node.dataset.damageUid=anchor?.dataset.uid??'';node.dataset.amount=String(amount);
 node.setAttribute('aria-hidden','true');
 node.innerHTML='<div class="combat-damage-local"><svg class="combat-damage-mark" viewBox="0 0 180 100" aria-hidden="true"><path class="combat-damage-cut" d="M8 69 132 28 173 19 140 39 31 76 58 59Z"/><path class="combat-damage-edge" d="M17 66 145 27 122 39 44 63Z"/></svg><span class="combat-damage-number"></span><span class="combat-damage-spacer"></span></div>';
 const local=node.querySelector<HTMLElement>('.combat-damage-local')!;
 const digit=node.querySelector<HTMLElement>('.combat-damage-number')!;
 const mark=node.querySelector<SVGElement>('.combat-damage-mark')!;
 digit.textContent=String(amount);
 document.body.append(node);
 let timer=0,frame=0;
 const animations:Animation[]=[];
 const stop=()=>{clearTimeout(timer);cancelAnimationFrame(frame);animations.forEach(a=>a.cancel());node.remove();live.delete(stop);};
 live.add(stop);
 const track=()=>{
  const r=follow?.()??combatRect(anchor);
  if(!anchor?.isConnected||!r||r.width<=0||r.height<=0||![r.x,r.y,r.width,r.height].every(Number.isFinite)){stop();return;}
  const size=Math.max(24,Math.min(86,r.width*.76/(String(amount).length>2?1.3:1)));
  node.style.left=`${r.x+r.width/2}px`;node.style.top=`${r.y+r.height*.54}px`;
  node.style.fontSize=`${size}px`;
  frame=requestAnimationFrame(track);
 };
 track();if(!node.isConnected)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const duration=1250;
 animations.push(local.animate(reduced?[
  {opacity:1},{opacity:1,offset:.8},{opacity:0}
 ]:[
  {transform:'translate(-17px,12px) skewX(-16deg) scale(.58)',opacity:0},
  {transform:'translate(2px,-3px) skewX(-8deg) scale(1.17)',opacity:1,offset:.10},
  {transform:'translate(0,0) skewX(-8deg) scale(1)',offset:.23},
  {transform:'translate(0,0) skewX(-8deg)',opacity:1,offset:.72},
  {transform:'translate(9px,-12px) skewX(-8deg) scale(.96)',opacity:0}
 ],{duration,easing:'linear',fill:'both'}));
 if(!reduced){
  animations.push(mark.animate([
   {clipPath:'inset(0 100% 0 0)',opacity:0,transform:'scale(.9)'},
   {clipPath:'inset(0 0 0 0)',opacity:heavy?.62:.22,transform:'scale(1)',offset:.20},
   {clipPath:'inset(0 0 0 0)',opacity:heavy?.42:.12,transform:'scale(1)',offset:.52},
   {clipPath:'inset(0 0 0 100%)',opacity:0,transform:'scale(1.02)'}
  ],{duration:heavy?850:520,fill:'both'}));
  animations.push(digit.animate([
   {clipPath:'inset(0 0 0 0)'},{clipPath:'inset(0 0 0 0)',offset:.79},{clipPath:'inset(0 0 100% 0)'}
  ],{duration,fill:'both'}));
 }else mark.style.display='none';
 timer=window.setTimeout(stop,duration+40);
}
/** The whole portrait frame reacts, whether it contains a seeker canvas or a BOT image. */
export function portraitImpact(side:'me'|'opp'){
 const root=document.getElementById(side==='me'?'portraitMe':'portraitOpp');
 const ring=root?.querySelector<HTMLElement>('.pt-ring');if(!ring||document.hidden)return;
 // The seeker owns this same movement when present. Static NPC portraits need it too.
 if(ring.querySelector('.seeker-motion') || /^(NPC_|STORY_)/.test(ring.dataset.avatar ?? ''))return;
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 ring.getAnimations().filter(a=>a.id==='portrait-impact').forEach(a=>a.cancel());
 const kick=Math.min(7,Math.max(3,ring.getBoundingClientRect().width*.045));
 const motion=ring.animate([{translate:'0px 0px',rotate:'0deg'},{translate:`${-kick}px 1px`,rotate:'-1.6deg',offset:.12},{translate:`${kick*.7}px -1px`,rotate:'1deg',offset:.32},{translate:`${-kick*.4}px 0px`,rotate:'-.6deg',offset:.55},{translate:'0px 0px',rotate:'0deg'}],{duration:360,easing:'ease-out'});
 motion.id='portrait-impact';
 const stop=()=>{motion.cancel();live.delete(stop);};live.add(stop);void motion.finished.then(stop,stop);
}
if(typeof window!=='undefined'){
 window.addEventListener('resize',clearDamageFeedback);window.addEventListener('pagehide',clearDamageFeedback);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clearDamageFeedback();});
}
