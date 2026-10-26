import type {Enchant,GameState,PlayerState} from '../shared/types';
import {enchantHasTurnCountdown} from '../shared/cards';
import {ENCH_TURN_LIMITS} from '../shared/cardText';
import {getLang} from '../i18n';
import './enchantTime.css';

export type EnchantTime={remaining:number;limit:number;elapsed:number;fill:number;mode:'fill'|'drain';timing:'both-start'|'own-start'|'own-end'|'delayed-own'|'deadline'};
const natural=(n:number)=>Number.isFinite(n)?Math.max(0,Math.floor(n)):0;
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const delayed=new Set(['ancientCiv','farm','nightCastleGift','brewing']);
/** Read authoritative clocks; never infer owner upkeeps from the global turn. */
export function enchantTimeState(e:Enchant,g:Pick<GameState,'turn'>,owner:Pick<PlayerState,'tribesFired'>):EnchantTime|null {
 const kind=e.card.ench??'';
 let limit=ENCH_TURN_LIMITS[kind],remaining:number,timing:EnchantTime['timing'];
 if(kind==='tribeContract'){
  if(owner.tribesFired.length)return null;
  limit=45;remaining=Math.max(0,limit-natural(g.turn));timing='deadline';
 }else if(limit!=null){
  remaining=Math.max(0,limit-Math.max(0,natural(g.turn)-natural(e.bornTurn??0)));timing=kind==='ancientCiv'?'delayed-own':'both-start';
 }else if(enchantHasTurnCountdown(e.card)){
  limit=Math.max(1,natural(e.card.val??1));remaining=natural(e.turns);timing=kind==='noAttack'?'both-start':kind==='magicBank'?'own-end':'own-start';
 }else return null;
 const elapsed=Math.max(0,limit-remaining),mode=delayed.has(kind)?'fill':'drain';
 return {remaining,limit,elapsed,mode,timing,fill:clamp((mode==='fill'?elapsed:remaining)/limit)};
}
export function enchantTimeDescription(s:EnchantTime):string {
 const lang=getLang(),{remaining:r,elapsed,limit,mode,timing}=s;
 const clock={ja:{'both-start':'両者のターン開始','own-start':'自分のターン開始','own-end':'自分のターン終了','delayed-own':'両者のターン開始で経過・発動は自分のターン開始','deadline':'第45ターン以降の自分のターン開始'},en:{'both-start':'Each player’s turn start','own-start':'Your turn start','own-end':'Your turn end','delayed-own':'Each turn advances time; resolves at your turn start','deadline':'Your turn start on or after game turn 45'},ko:{'both-start':'양쪽 턴 시작','own-start':'자신의 턴 시작','own-end':'자신의 턴 종료','delayed-own':'양쪽 턴 경과 후 자신의 턴 시작에 발동','deadline':'게임 45턴 이후 자신의 턴 시작'}};
 if(timing==='deadline')return lang==='ja'?`種族シナジーの期限まで ${r}ターン · ${clock.ja.deadline}`:lang==='en'?`Tribe synergy deadline in ${r} turns · ${clock.en.deadline}`:`종족 시너지 기한까지 ${r}턴 · ${clock.ko.deadline}`;
 const action=lang==='ja'?(mode==='fill'?'発動':'終了'):lang==='en'?(mode==='fill'?'resolution':'expiry'):(mode==='fill'?'발동':'종료');
 if(lang==='ja')return `${action}まで ${r}ターン · 経過 ${Math.min(elapsed,limit)}/${limit}ターン · ${clock.ja[timing]}`;
 if(lang==='en')return `${r} turns until ${action} · ${Math.min(elapsed,limit)}/${limit} elapsed · ${clock.en[timing]}`;
 return `${action}까지 ${r}턴 · ${Math.min(elapsed,limit)}/${limit} 경과 · ${clock.ko[timing]}`;
}
let sequence=0;
function paint(badge:HTMLElement,fill:number){
 const h=46*clamp(fill),y=54-h;
 const rect=badge.querySelector('.enchant-time-level')!;rect.setAttribute('height',String(h));rect.setAttribute('y',String(y));
 const surface=badge.querySelector('.enchant-time-surface')!;surface.setAttribute('d',`M8 ${y}h48`);surface.setAttribute('opacity',fill>0&&fill<1?'1':'0');badge.dataset.timePosition=String(fill);
}
export function createEnchantTime(s:EnchantTime):HTMLElement {
 const badge=document.createElement('span'),id='enchant-time-clip-'+(++sequence),color=s.mode==='fill'?'#bcd6bc':'#d4bdab';
 badge.className='enchant-time';badge.dataset.timeFill=String(s.fill);badge.dataset.timeMode=s.mode;badge.dataset.timeRemaining=String(s.remaining);badge.dataset.timeLimit=String(s.limit);
 badge.setAttribute('role','img');badge.setAttribute('aria-label',enchantTimeDescription(s));
 const digits=String(s.remaining).length,size=digits===1?24:digits===2?22:digits===3?18:54/digits;
 // Numerals stay numerals at zero/full. No glyph under the number or completion substitute.
 badge.innerHTML=`<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><defs><clipPath id="${id}"><circle cx="32" cy="31" r="23"/></clipPath></defs><circle cx="32" cy="31" r="27" fill="#192a2e" stroke="#9baaa0"/><g clip-path="url(#${id})"><rect class="enchant-time-level" x="8" width="48" fill="${color}" opacity=".42"/><path class="enchant-time-surface" stroke="${color}" fill="none"/></g><text x="32" y="31" text-anchor="middle" dominant-baseline="central" font-family="Georgia,serif" font-weight="700" font-size="${size}" fill="#f5ecd6">${s.remaining}</text></svg>`;
 paint(badge,s.fill);return badge;
}

type Motion={node:HTMLElement;from:number;to:number;start:number;duration:number};
export const ENCHANT_TIME_MS=520;
/** Preserve the fill's current position and deadline across GameView DOM rebuilds. */
export function createBoardEnchantTimes(root:HTMLElement){
 let previous=new Map<string,Motion>(),raf=0,disposed=false;
 const now=()=>performance.now();
 const reduced=()=>document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches;
 const sample=(m:Motion,t:number)=>{const p=clamp((t-m.start)/m.duration);return m.from+(m.to-m.from)*p*p*(3-2*p);};
 function stop(){if(raf)cancelAnimationFrame(raf);raf=0;}
 function settle(){stop();for(const m of previous.values()){m.from=m.to;paint(m.node,m.to);}}
 function tick(t:number){raf=0;let moving=false;for(const m of previous.values()){if(!m.node.isConnected)continue;const done=reduced()||t-m.start>=m.duration||m.from===m.to;paint(m.node,done?m.to:sample(m,t));if(done)m.from=m.to;else moving=true;}if(moving)raf=requestAnimationFrame(tick);}
 const visibility=()=>{if(document.hidden)settle();};
 document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',settle);
 return {
  sync(ended=false){
   if(disposed)return;const t=now(),next=new Map<string,Motion>();let moving=false;
   root.querySelectorAll<HTMLElement>('.zone-st .buff-icon[data-uid] > .enchant-time').forEach(node=>{
    const host=node.parentElement!,side=host.closest('#oppRow')?'opp':'me',key=`${side}:${host.dataset.uid}:${host.dataset.cardId}:${node.dataset.timeMode}:${node.dataset.timeLimit}`,to=Number(node.dataset.timeFill),old=previous.get(key);
    let m:Motion={node,from:to,to,start:t,duration:ENCHANT_TIME_MS};
    if(old&&!ended&&!reduced())m=old.to===to?{...old,node}:{node,from:sample(old,t),to,start:t,duration:ENCHANT_TIME_MS};
    paint(node,sample(m,t));moving ||= m.from!==m.to&&t-m.start<m.duration;next.set(key,m);
   });
   previous=next;stop();if(moving)raf=requestAnimationFrame(tick);
  },
  dispose(){disposed=true;stop();previous.clear();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',settle);}
 };
}
