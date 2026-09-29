import {CrownRenderer,DURATION,smooth} from './crownRenderer';
import type {Anchor,Side} from './crownRenderer';
import {captureOutcomeSurface,outcomeAnchor,outcomeParts} from './outcomeSurface';
import {t} from '../i18n';
import {sfx} from './sound';
/** Selected 01: only the losing emblem breaks; the board remains visible. */
export async function playCrownOutcome(target:HTMLElement|null,won:boolean,cause:string|null,signal:AbortSignal):Promise<void>{
 if(signal.aborted)return;
 const loser=target?.closest<HTMLElement>('.portrait')??null,side:Side=loser?.id==='portraitMe'?'me':'opp';
 const winner=document.querySelector<HTMLElement>(side==='me'?'#portraitOpp':'#portraitMe');
 const host=document.createElement('div');host.className='crown-outcome';host.dataset.variant='crown';host.dataset.side=side;host.dataset.phase='preparing';host.setAttribute('role','status');host.setAttribute('aria-live','polite');host.setAttribute('aria-label',[t(won?'modal.win':'modal.lose'),cause].filter(Boolean).join(' · '));
 host.style.cssText='position:fixed;inset:0;z-index:130;pointer-events:none;overflow:hidden';
 const cv=document.createElement('canvas');cv.className='crown-outcome-canvas';cv.style.cssText='position:absolute;inset:0;width:100%;height:100%';const c=cv.getContext('2d');
 const verdict=document.createElement('div');verdict.textContent=t(won?'modal.win':'modal.lose');verdict.style.cssText=`position:absolute;left:50%;top:51%;transform:translate(-50%,-50%);width:min(330px,64vw);padding:10px 0;text-align:center;font:28px Georgia,serif;color:${won?'#ead3a1':'#cbd7e4'};background:linear-gradient(90deg,#13202b00,#13202bdd 20%,#13202bdd 80%,#13202b00);opacity:0`;
 host.append(cv,verdict);document.body.append(host);
 const motion=matchMedia('(prefers-reduced-motion:reduce)');const visibility=new Map<HTMLElement,string>();let raf=0,timer=0,finished=false,resolve!:()=>void;
 const done=new Promise<void>(r=>resolve=r);
 const cleanup=()=>{if(finished)return;finished=true;cancelAnimationFrame(raf);clearTimeout(timer);signal.removeEventListener('abort',cleanup);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',cleanup);motion.removeEventListener('change',cleanup);for(const [n,v] of visibility)n.style.visibility=v;visibility.clear();host.remove();cv.width=cv.height=1;resolve();};
 const hidden=()=>{if(document.hidden)cleanup();};
 signal.addEventListener('abort',cleanup,{once:true});document.addEventListener('visibilitychange',hidden);window.addEventListener('pagehide',cleanup,{once:true});motion.addEventListener('change',cleanup,{once:true});
 // Bounds image loading and background-tab rAF suspension. No result can be stranded.
 timer=window.setTimeout(cleanup,10000);
 try {
  if(!c||motion.matches||!loser||!winner||document.hidden){host.dataset.phase='static';verdict.style.opacity='1';sfx(won?'win':'lose');clearTimeout(timer);timer=window.setTimeout(cleanup,250);return await done;}
  const surfaces=await Promise.race([Promise.all([captureOutcomeSurface(loser,signal),captureOutcomeSurface(winner,signal)]),done.then(()=>null)]);
  if(finished||signal.aborted)return;
  if(!surfaces?.[0]||!surfaces[1]){host.dataset.phase='static';verdict.style.opacity='1';sfx(won?'win':'lose');clearTimeout(timer);timer=window.setTimeout(cleanup,250);return await done;}
  const renderer=new CrownRenderer();renderer.setSurface(side,surfaces[0]);renderer.setSurface(side==='me'?'opp':'me',surfaces[1]);
  for(const n of outcomeParts(loser)){visibility.set(n,n.style.visibility);n.style.visibility='hidden';}
  host.dataset.phase='playing';const start=performance.now();sfx(won?'win':'lose');clearTimeout(timer);timer=window.setTimeout(cleanup,DURATION+100);
  const draw=(now:number)=>{if(finished)return;if(!loser.isConnected||!winner.isConnected){cleanup();return;}const time=Math.min(DURATION,now-start),w=innerWidth,h=innerHeight,d=Math.min(devicePixelRatio,1.5);if(cv.width!==Math.round(w*d)||cv.height!==Math.round(h*d)){cv.width=Math.round(w*d);cv.height=Math.round(h*d);c.setTransform(d,0,0,d,0,0);}
   const anchors={} as Record<Side,Anchor>;anchors[side]=outcomeAnchor(loser);anchors[side==='me'?'opp':'me']=outcomeAnchor(winner);
   // The bottom portrait can nearly touch the viewport. Move its landing area inward
   // during flight, applying one projection offset to face, frame and every counter.
   const a=anchors[side];a.y+=Math.min(0,h-12-(a.y+a.height*.66))*smooth(1580,2400,time);
   // Rendering can replace portrait children (language switch / final state sync).
   for(const n of outcomeParts(loser))if(!visibility.has(n)){visibility.set(n,n.style.visibility);n.style.visibility='hidden';}
   renderer.draw(c,w,h,'crown',Math.max(.001,time),side,anchors,false,false);verdict.style.opacity=String(smooth(3700,4070,time));host.dataset.time=String(Math.round(time));
   if(time>=DURATION)cleanup();else raf=requestAnimationFrame(draw);
  };draw(start);await done;
 } finally {cleanup();}
}
