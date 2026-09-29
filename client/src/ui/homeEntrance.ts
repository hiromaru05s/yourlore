import {loadingSigil} from './loadingSigil';
import {loungeText} from './loungeText';
import {entranceEase as ease,entranceOut as out,silverFanPose} from './homeEntranceMotion';
import '../styles/homeEntrance.css';

/** Transfers the loaded screen's real loading card into approved fan 01.
 * No fixtures, page remounts, data changes, sound instances or new image requests. */
export function playHomeEntrance(root:HTMLElement,cover:HTMLElement,signal:AbortSignal):Promise<void>{
 if(signal.aborted||!root.querySelector('.lounge-home'))return Promise.resolve();
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 const chrome=['.lounge-topbar','.lounge-play','.lounge-active-deck','.lounge-rail'].map(s=>root.querySelector<HTMLElement>(s)).filter((e):e is HTMLElement=>!!e);
 const ritual=cover.querySelector<HTMLElement>('.loading-ritual');
 const sourceCard=cover.querySelector<HTMLElement>('.loading-card--hero');
 if(!ritual||!sourceCard)return Promise.resolve();
 const preserved=[cover,ritual,...chrome].map(el=>({el,style:el.getAttribute('style')}));
 // Keep the loader at its current phase until handoff; don't reset a mid-load card.
 const loaderAnimations=cover.getAnimations({subtree:true});
 loaderAnimations.forEach(a=>a.pause());
 const sourceRect=sourceCard.getBoundingClientRect();
 let source={x:sourceRect.x+sourceRect.width/2,y:sourceRect.y+sourceRect.height/2,scale:sourceRect.width/180};
 const veil=document.createElement('div');veil.className='home-entrance-veil';veil.setAttribute('aria-hidden','true');
 const stage=document.createElement('div');stage.className='home-entrance-stage';stage.dataset.variant='silver-fan';stage.setAttribute('aria-hidden','true');
 const face=loadingSigil();
 stage.innerHTML=Array.from({length:7},(_,i)=>`<div class="home-entrance-card" data-card="${i}"><div class="home-entrance-face front">${face}<div class="home-entrance-etch">${face}</div><div class="home-entrance-sheen"></div></div><div class="home-entrance-face back">${face}</div></div>`).join('');
 const cards=[...stage.querySelectorAll<HTMLElement>('.home-entrance-card')].map(el=>({el,etch:el.querySelector<HTMLElement>('.home-entrance-etch')!,sheen:el.querySelector<HTMLElement>('.home-entrance-sheen')!}));
 const skip=document.createElement('button');skip.className='home-entrance-skip';skip.textContent=loungeText('スキップ','Skip','건너뛰기');
 document.body.append(veil,stage,skip);
 return new Promise(resolve=>{
  let frame=0,finished=false,elapsed=0,last=performance.now();
  const wasFocused=document.activeElement;
  const finish=()=>{
   if(finished)return;finished=true;cancelAnimationFrame(frame);
   window.removeEventListener('resize',resize);window.removeEventListener('pagehide',finish);document.removeEventListener('visibilitychange',visibility);document.removeEventListener('keydown',keyboard);motion.removeEventListener('change',finish);signal.removeEventListener('abort',finish);
   const restoreFocus=document.activeElement===skip;
   stage.remove();veil.remove();skip.remove();
   for(const {el,style} of preserved){if(style===null)el.removeAttribute('style');else el.setAttribute('style',style);}
   loaderAnimations.forEach(a=>a.cancel());
   resolve();
   if(restoreFocus&&!signal.aborted)queueMicrotask(()=>{if(root.isConnected&&!root.inert){const focus=wasFocused instanceof HTMLElement&&root.contains(wasFocused)?wasFocused:root.querySelector<HTMLElement>('#ranked');focus?.focus({preventScroll:true});}});
  };
  const keyboard=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();finish();}};
  const visibility=()=>{last=performance.now();};
  const resize=()=>{const old=cover.style.transform;cover.style.transform='none';const r=sourceCard.getBoundingClientRect();source={x:r.x+r.width/2,y:r.y+r.height/2,scale:r.width/180};cover.style.transform=old;};
  skip.onclick=finish;document.addEventListener('keydown',keyboard);document.addEventListener('visibilitychange',visibility);window.addEventListener('resize',resize);window.addEventListener('pagehide',finish,{once:true});motion.addEventListener('change',finish);signal.addEventListener('abort',finish,{once:true});
  const paint=(t:number)=>{
   stage.dataset.elapsed=String(Math.round(t*1000));
   if(motion.matches){stage.hidden=true;veil.style.opacity='0';cover.style.opacity=String(1-ease(0,.25,t));return;}
   const leave=ease(.58,1,t);cover.style.opacity=String(1-leave);cover.style.transform=`translateY(${-leave*12}px)`;ritual.style.visibility=t>=.57?'hidden':'visible';
   veil.style.opacity=String(1-ease(.9,1.92,t));stage.style.display=t>=3.8?'none':'block';
   chrome.forEach((c,i)=>{const p=out(1.9+i*.105,2.6+i*.105,t);c.style.opacity=String(p);c.style.transform=`translateY(${(1-p)*(i===0?-14:18)}px)`;});
   cards.forEach(({el,etch,sheen},i)=>{
    const n=i-3,p=silverFanPose(i,t,innerWidth,innerHeight),blend=p.spread;
    el.style.left=source.x*(1-blend)+innerWidth/2*blend+p.x+(Math.abs(n)===1?n*26:0)*(1-blend)+'px';
    el.style.top=source.y*(1-blend)+innerHeight*.5*blend+p.y+'px';
    el.style.transform=`translate(-50%,-50%) rotateZ(${p.rz+(n===0?-4:n*17)*(1-blend)}deg) rotateY(${p.ry}deg) rotateX(${p.rx}deg) scale(${source.scale*(1-blend)+p.scale*blend})`;
    el.style.opacity=String(ease(.54,.59,t)*(Math.abs(n)>1?ease(.64,.95,t):1));el.style.zIndex=String(20-Math.abs(n));
    const charge=ease(.72+i*.045,1.22+i*.045,t),pass=ease(1.3+i*.045,1.97+i*.045,t);
    etch.style.clipPath=`inset(${(1-charge)*100}% 0 ${pass*100}% 0)`;etch.style.opacity=String(.9*(1-ease(2,2.6,t)));sheen.style.transform=`translateX(${-130+ease(.7+i*.04,1.7+i*.04,t)*280}%) rotate(-15deg)`;el.style.setProperty('--edge',String(.2+.55*Math.sin(charge*Math.PI)));
   });
  };
  const tick=(now:number)=>{if(finished)return;if(!document.hidden)elapsed+=Math.min(now-last,100);last=now;paint(elapsed/1000);if(elapsed>=(motion.matches?250:3800)){finish();return;}frame=requestAnimationFrame(tick);};
  paint(0);frame=requestAnimationFrame(tick);
 });
}
