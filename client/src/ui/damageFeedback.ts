import {combatRect} from './combatAnchor';
import './damageFeedback.css';

/** Damage belongs to the frame at contact, including renderer-owned invisible DOM anchors. */
const live=new Set<()=>void>();
export function clearDamageFeedback(){for(const stop of [...live])stop();}
export function damageNumber(anchor:HTMLElement|null,amount:number,follow?:()=>DOMRect|null):void{
 const r=combatRect(anchor);if(!r||!Number.isFinite(amount)||amount<0||document.hidden)return;
 const node=document.createElement('div');node.className='combat-damage';node.textContent=String(amount);
 node.dataset.damageUid=anchor?.dataset.uid??'';node.dataset.amount=String(amount);node.setAttribute('aria-hidden','true');
 const digits=String(amount).length,size=Math.min(r.height*.82,r.width/(digits*.61+.18));
 node.style.cssText=`left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;font-size:${size}px`;
 document.body.append(node);
 let timer=0,frame=0;const stop=()=>{clearTimeout(timer);cancelAnimationFrame(frame);node.remove();live.delete(stop);};live.add(stop);
 const tick=()=>{const at=follow?.()??(anchor?.isConnected?anchor.getBoundingClientRect():null);if(at&&at.width>0){node.style.left=`${at.left+at.width/2-r.width/2}px`;node.style.top=`${at.top+at.height/2-r.height/2}px`;}frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(()=>{node.classList.add('in');timer=window.setTimeout(stop,500);tick();});
}
/** The whole portrait frame reacts, whether it contains a seeker canvas or a BOT image. */
export function portraitImpact(side:'me'|'opp'){
 const root=document.getElementById(side==='me'?'portraitMe':'portraitOpp');
 const ring=root?.querySelector<HTMLElement>('.pt-ring');if(!ring||document.hidden)return;
 // The seeker owns this same movement when present. Static NPC portraits need it too.
 if(ring.querySelector('.seeker-motion'))return;
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
