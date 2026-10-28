import {loadingCardFace} from './loadingSigil';
import {entranceEase as ease,azureFanPose} from './homeEntranceMotion';
import '../styles/homeEntrance.css';

// Gate the stable HOME shell, including its background. User refreshes rebuild
// the header and responsive layout moves the companion during loading; fading
// captured child nodes lets their replacements appear before the entrance.
export const homeEntranceChrome='.lounge-home';

/** Transfer the three loaded cards into the selected seven-card fan, in front of
 * the real HOME. Only opacity is changed on the HOME shell: renderer/layout
 * transforms must survive both completion and navigation cancellation. */
export function playHomeEntrance(root:HTMLElement,cover:HTMLElement,signal:AbortSignal):Promise<void>{
 if(signal.aborted||!root.querySelector('.lounge-home'))return Promise.resolve();
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 const chrome=[...root.querySelectorAll<HTMLElement>(homeEntranceChrome)];
 const ritual=cover.querySelector<HTMLElement>('.loading-ritual');
 const sourceCard=cover.querySelector<HTMLElement>('.loading-card--hero');
 if(!ritual||!sourceCard)return Promise.resolve();
 const heading=[...cover.querySelectorAll<HTMLElement>('.loading-logo,.loading-title,.loading-progress,.loading-phase')];
 const preserved=[cover,ritual,...heading,...chrome].map(el=>({el,opacity:el.style.opacity,visibility:el.style.visibility}));
 const loaderAnimations=cover.getAnimations({subtree:true});loaderAnimations.forEach(a=>a.pause());
 const measure=()=>{const r=sourceCard.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,height:sourceCard.offsetHeight};};
 let source=measure();
 const stage=document.createElement('div');stage.className='home-entrance-stage';stage.dataset.variant='azure-fan';stage.setAttribute('aria-hidden','true');
 stage.innerHTML=Array.from({length:7},(_,i)=>`<div class="home-entrance-card" data-card="${i}">${loadingCardFace()}</div>`).join('');
 const cards=[...stage.querySelectorAll<HTMLElement>('.home-entrance-card')];
 document.body.append(stage);
 return new Promise(resolve=>{
  let frame=0,finished=false,elapsed=0,last=performance.now();
  const finish=()=>{
   if(finished)return;finished=true;cancelAnimationFrame(frame);
   window.removeEventListener('resize',resize);window.removeEventListener('pagehide',finish);document.removeEventListener('visibilitychange',visibility);motion.removeEventListener('change',finish);signal.removeEventListener('abort',finish);
   stage.remove();
   for(const {el,opacity,visibility} of preserved){el.style.opacity=opacity;el.style.visibility=visibility;}
   loaderAnimations.forEach(a=>a.cancel());resolve();
  };
  const visibility=()=>{last=performance.now();};
  const resize=()=>{source=measure();};
  document.addEventListener('visibilitychange',visibility);window.addEventListener('resize',resize);window.addEventListener('pagehide',finish,{once:true});motion.addEventListener('change',finish);signal.addEventListener('abort',finish,{once:true});
  const paint=(t:number)=>{
   stage.dataset.elapsed=String(Math.round(t*1000));
   if(motion.matches){stage.hidden=true;cover.style.opacity=String(1-ease(0,.25,t));chrome.forEach(c=>c.style.opacity=String(ease(0,.25,t)));return;}
   ritual.style.visibility='hidden';cover.style.opacity=String(1-ease(.6,3.4,t));
   heading.forEach(el=>el.style.opacity=String(1-ease(.05,.65,t)));
   chrome.forEach(el=>el.style.opacity=String(ease(2.5,3.8,t)));
   cards.forEach((el,i)=>{
    const p=azureFanPose(i,t,innerWidth,innerHeight,source.height);
    el.style.width=source.height*.68013+'px';el.style.height=source.height+'px';
    el.style.left=source.x+p.x+'px';el.style.top=source.y+p.y+'px';
    el.style.transform=`translate(-50%,-50%) rotateZ(${p.rz}rad) rotateY(${p.ry}rad) rotateX(${p.rx}rad) scale(${p.scale})`;
    el.style.opacity=String(p.alpha);el.style.zIndex=String(20-Math.abs(i-3));
    el.style.filter=`brightness(${1-Math.min(1,Math.abs(i-3))*.14*(1-p.spread)}) drop-shadow(0 12px 10px #00122255)`;
   });
  };
  const tick=(now:number)=>{if(finished)return;if(!document.hidden)elapsed+=Math.min(now-last,100);last=now;paint(elapsed/1000);if(elapsed>=(motion.matches?250:4000)){finish();return;}frame=requestAnimationFrame(tick);};
  paint(0);frame=requestAnimationFrame(tick);
 });
}
