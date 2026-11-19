import {mountVictoryAtmosphere,VICTORY_LENGTH} from './resultAtmosphere';
import {sfx,playMmrCount} from './sound';
import {COUNT_MS} from './resultCountSound';
import type {RankChange} from '../shared/rank';
import {tierOf} from '../shared/rank';
import {rankEmblem} from './rankEmblem';
import {rankProgress,tierLabel} from './tier';
import {loungeText as tr} from './loungeText';

const ease=(a:number,b:number,t:number)=>{const p=Math.max(0,Math.min(1,(t-a)/(b-a)));return p*p*(3-2*p);};
/** Owns only presentation. Navigation, receipts and rewards stay with the controller. */
export function mountResultCeremony(host:HTMLElement,won:boolean|null,replay=false){
 const abort=new AbortController(),progress=host.querySelector<HTMLElement>('.finale-progress')!,actions=host.querySelector<HTMLElement>('.finale-actions')!;
 let disposed=false;
 const draw=(time:number)=>{
  host.dataset.time=String(time);
  const ranked=host.classList.contains('has-rank');
  const p=ease(3100,3650,time),a=ease(ranked?5500:3500,ranked?6100:4100,time);
  progress.style.opacity=String(p);progress.style.visibility=p?'visible':'hidden';progress.inert=p<1;
  actions.style.opacity=String(a);actions.style.visibility=a?'visible':'hidden';actions.inert=a<1;
 };
 const motion=mountVictoryAtmosphere(host,1,draw,won===null?'draw':won?'victory':'defeat');
 if(replay||document.hidden)motion.seek(VICTORY_LENGTH);
 else sfx(won===null?'drawGame':won?'win':'lose',{signal:abort.signal});
 const hidden=()=>{if(document.hidden){abort.abort();motion.seek(VICTORY_LENGTH);}};
 document.addEventListener('visibilitychange',hidden);
 const observer=new MutationObserver(()=>{if(!host.isConnected)destroy();});
 observer.observe(document.getElementById('overlayRoot')??document.body,{childList:true,subtree:true});
 function destroy(){if(disposed)return;disposed=true;abort.abort();motion.destroy();observer.disconnect();document.removeEventListener('visibilitychange',hidden);}
 return {destroy};
}

/** Rating may arrive before the verdict or after it has settled. */
export function mountCeremonyRank(el:HTMLElement,change:RankChange,alreadyPlayed:boolean){
 const host=el.closest<HTMLElement>('.result-ceremony')!,delta=change.after-change.before;
 const before=change.tierBefore??tierOf(change.before),after=change.tierAfter??tierOf(change.after);
 el.className='win-rank rank-result ceremony-rank';el.dataset.direction=delta>0?'up':delta<0?'down':'flat';
 el.innerHTML=`<div class="rank-medal">${rankEmblem(before)}</div><div class="rank-copy"><div class="rank-tier-name"></div><div class="rank-score"><b></b><span>MMR</span><strong class="rank-delta"></strong></div><div class="rank-track" role="meter" aria-label="MMR"><i></i><span class="rank-track-head"></span></div><div class="rank-target"></div><div class="rank-verdict" aria-live="polite"></div></div>`;
 const score=el.querySelector('b')!,name=el.querySelector('.rank-tier-name')!,medal=el.querySelector('.rank-medal')!,track=el.querySelector<HTMLElement>('.rank-track')!,fill=track.querySelector<HTMLElement>('i')!,head=track.querySelector<HTMLElement>('span')!,target=el.querySelector('.rank-target')!,verdict=el.querySelector('.rank-verdict')!;
 el.querySelector('.rank-delta')!.textContent=`${delta>0?'+':delta<0?'−':'±'}${Math.abs(delta)}`;
 name.textContent=tierLabel(before);
 let raf=0,dead=false,sounded=false;const abort=new AbortController();
 const initial=Number(host.dataset.time)||0,delay=Math.max(0,3750-initial),start=performance.now();
 const paint=(p:number)=>{
  const value=Math.round(change.before+delta*p),r=rankProgress(value),tier=p>=1?after:tierOf(value);
  score.textContent=value.toLocaleString('en-US');fill.style.width=`${r.fraction*100}%`;head.style.left=`${r.fraction*100}%`;head.style.opacity=String(Math.sin(p*Math.PI));
  track.setAttribute('aria-valuemin',String(r.current.min));track.setAttribute('aria-valuemax',String(r.next?.min??Math.max(1550,value)));track.setAttribute('aria-valuenow',String(value));track.setAttribute('aria-valuetext',`${value} MMR`);
  target.textContent=tier==='gm'?tr('グランドマスター · TOP 25','Grandmaster · TOP 25','그랜드마스터 · TOP 25'):r.next?tr(`${tierLabel(r.next.key)}まで ${r.next.min-value} MMR`,`${r.next.min-value} MMR to ${tierLabel(r.next.key)}`,`${tierLabel(r.next.key)}까지 ${r.next.min-value} MMR`):tr('最高ランク帯','Highest tier','최고 티어');
 };
 const complete=()=>{cancelAnimationFrame(raf);raf=0;paint(1);name.textContent=tierLabel(after);if(before!==after){medal.innerHTML=rankEmblem(after);verdict.textContent=tr('ランク更新','Rank updated','랭크 갱신');}else if(!delta)verdict.textContent=tr('MMR変動なし','MMR unchanged','MMR 변동 없음');el.dataset.phase='settled';};
 const tick=(now:number)=>{
  if(dead||!el.isConnected){destroy();return;}
  const time=now-start-delay;
  if(!sounded&&time>=0){sounded=true;if(delta&&time<COUNT_MS)playMmrCount(change.before,change.after,{signal:abort.signal});}
  paint(ease(0,COUNT_MS,time));el.dataset.phase=time<0?'inscribe':'count';
  if(time>=COUNT_MS){complete();return;}raf=requestAnimationFrame(tick);
 };
 const hidden=()=>{if(document.hidden){abort.abort();complete();}};
 document.addEventListener('visibilitychange',hidden);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const reduce=()=>{if(reduced.matches){abort.abort();complete();}};reduced.addEventListener('change',reduce);
 paint(0);
 if(alreadyPlayed||document.hidden||reduced.matches){complete();if(!alreadyPlayed&&!document.hidden&&delta)playMmrCount(change.before,change.after,{signal:abort.signal},true);}
 else raf=requestAnimationFrame(tick);
 function destroy(){if(dead)return;dead=true;abort.abort();cancelAnimationFrame(raf);document.removeEventListener('visibilitychange',hidden);reduced.removeEventListener('change',reduce);}
 return {destroy};
}
