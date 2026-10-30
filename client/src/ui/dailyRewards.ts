import type { App } from '../router';
import { api } from '../net/api';
import { cardName, esc } from '../i18n';
import { loungeText as L } from './loungeText';
import { DB, STARTERS } from '../shared/cards';
import { MATCH_REWARDS, type DailyQuest, type QuestState, type ProgressionState } from '../shared/progression';
import '../styles/dailyRewards.css';
import '../styles/dailyQuestCard.css';
export function questLabel(q:DailyQuest):string {
 const def=q.card?(DB[q.card]??STARTERS[q.card]):null;
 const name=def?cardName({...def,uid:'quest-name'}):q.card??'';
 const labels:Record<DailyQuest['kind'],string>={
 starterWin:L(`「${name}」を含むデッキで3勝`,`Win 3 with ${name} in your starting deck`,`시작 덱에 ${name}을 넣고 3회 승리`),
 shield:L('シールドを合計20獲得','Gain 20 Shield','실드 총 20 획득'),
 heal:L('体力を合計40回復','Restore 40 health','체력 총 40 회복'),
 damage:L('相手プレイヤーに合計150ダメージ','Deal 150 damage to opponents','상대 플레이어에게 총 150 피해'),
 buySpell:L('魔法カードを合計30枚購入','Buy 30 spell cards','마법 카드 총 30장 구매'),
 buyMonster:L('モンスターカードを合計20枚購入','Buy 20 monster cards','몬스터 카드 총 20장 구매'),
 decay:L('腐敗で相手モンスターを合計3体破壊','Destroy 3 enemy monsters with Decay','부패로 상대 몬스터 총 3체 파괴'),
 rift:L('リフトにカードを合計30枚送る','Send 30 cards to your Rift','리프트에 카드 총 30장 보내기'),
 draw:L('合計10枚の追加ドロー','Draw 10 extra cards','추가 드로우 총 10장'),
 counter:L('反撃で相手モンスターを合計3体破壊','Destroy 3 enemy monsters with Counter','반격으로 상대 몬스터 총 3체 파괴'),
 playSpell:L('魔法を合計50回プレイ','Play 50 spells','마법 총 50회 플레이'),
 playExpensive:L('コスト5以上のカードを合計20回プレイ','Play cards costing 5+ a total of 20 times','비용 5 이상 카드 총 20회 플레이'),
 playCard:L(`「${name}」を1回プレイ`,`Play ${name} once`,`${name} 1회 플레이`),
 };return labels[q.kind];
}
export const shardLabel=(n:number)=>L(`${n} シャード`,`${n} Shards`,`${n} 샤드`);
export const firstClearLabel=(n:number)=>L(`初回クリア ${shardLabel(n)}`,`First clear: ${shardLabel(n)}`,`첫 클리어 ${shardLabel(n)}`);
export function syncCredits(app:App,state:ProgressionState):void {if(app.user){app.user.credits=state.credits;document.dispatchEvent(new Event('lore:user'));}}
export function rewardProgressHtml(data:ProgressionState|undefined,mode:'ranked'|'online'|'bot'):string {
 const hidden=mode==='bot';
 const rewardMode=hidden?'ranked':mode,cap=MATCH_REWARDS[rewardMode].cap,value=data?Math.min(cap,Math.max(0,data[rewardMode])):0;
 const label=L('本日のシャード','Shards today','오늘의 샤드');
 return `<div class="mode-reward-content"${hidden?' aria-hidden="true" style="visibility:hidden"':''}><span class="mode-reward-label"><span>${label}</span><b>${data?value:'—'} / ${cap}</b></span><progress value="${value}" max="${cap}" aria-label="${esc(label)}"></progress></div>`;
}
export function mountDailyRewards(app:App,host:HTMLElement,onState?:(state:ProgressionState)=>void):()=>void {
 let request=0,dead=false,data:ProgressionState|undefined,timer:ReturnType<typeof setTimeout>|undefined;
 let closeConfirm:(()=>void)|undefined;
 const guest=!app.user||app.user.id==='local-guest-user',account=app.user?.id;
 const render=()=>{
  const quests=data?.dailies??(data?[data.daily]:[]),remaining=quests[0]?.rerollsLeft;
  host.innerHTML=`<div class="dq-heading"><strong>${L('デイリークエスト','Daily quests','일일 퀘스트')}</strong><span>${remaining===undefined?'':L(`変更可能回数（残り${remaining}）`,`Changes left: ${remaining}`,`변경 가능 횟수 (남은 ${remaining})`)}</span></div><div class="dq-list">${quests.length?quests.map((q,i)=>{
   const progress=Math.min(q.quest.target,Math.max(0,q.progress));
   return `<button type="button" class="dq-task ${q.claimed?'is-complete':''}" data-quest="${i}" ${q.claimed||!remaining?'disabled':''}><strong class="dq-title">${esc(questLabel(q.quest))}</strong><span class="dq-meta"><span class="dq-reward">${shardLabel(q.quest.reward)}</span><span class="dq-progress">${q.claimed?L('受取済み','Received','수령 완료'):`${progress} / ${q.quest.target}`}</span></span><progress class="dq-meter" value="${progress}" max="${q.quest.target}" aria-label="${esc(questLabel(q.quest))}"></progress></button>`;
  }).join(''):`<button type="button" class="dq-load">${guest?L('ログイン','Log in','로그인'):L('読み込み中…','Loading…','불러오는 중…')}</button>`}</div>`;
  host.querySelectorAll<HTMLButtonElement>('[data-quest]').forEach(button=>button.onclick=()=>{
   const q=quests[Number(button.dataset.quest)];
   closeConfirm=confirmReplacement(app,q,button,next=>{if(dead)return;data=next;render();onState?.(next);syncCredits(app,next);document.dispatchEvent(new Event('lore:rewards'));});
  });
  const empty=host.querySelector<HTMLButtonElement>('.dq-load');if(empty)empty.onclick=()=>guest?app.login():load();
 };
 const load=()=>{if(guest)return;const serial=++request;void api.progression().then(next=>{
  if(dead||serial!==request||app.user?.id!==account)return;data=next;render();onState?.(next);syncCredits(app,next);
  clearTimeout(timer);timer=setTimeout(load,Math.max(1000,next.resetsAt-Date.now()+100));
 }).catch(()=>{const button=host.querySelector('.dq-load');if(button)button.textContent=L('再読み込み','Retry','다시 시도');});};
 window.addEventListener('focus',load);document.addEventListener('lore:rewards',load);render();load();
 return()=>{dead=true;clearTimeout(timer);closeConfirm?.();window.removeEventListener('focus',load);document.removeEventListener('lore:rewards',load);};
}
function confirmReplacement(app:App,q:QuestState,previous:HTMLElement,onChange:(state:ProgressionState)=>void):()=>void {
 if(document.querySelector('.daily-replace-overlay'))return()=>{};
 const account=app.user?.id,ov=document.createElement('div');ov.className='overlay daily-replace-overlay';
 ov.innerHTML=`<div class="modal daily-replace" role="dialog" aria-modal="true" aria-labelledby="dailyReplaceTitle"><h2 id="dailyReplaceTitle">${L('このクエストを変更しますか？','Replace this quest?','이 퀘스트를 변경할까요?')}</h2><p>${esc(questLabel(q.quest))}</p><div class="modal-row"><button class="btn btn-ghost" data-no>NO</button><button class="btn btn-gold" data-yes>YES</button></div><p data-error role="alert"></p></div>`;
 document.body.append(ov);let dead=false,busy=false;
 const close=()=>{dead=true;ov.remove();if(previous.isConnected)previous.focus();};
 ov.querySelector<HTMLButtonElement>('[data-no]')!.onclick=close;
 ov.onclick=e=>{if(e.target===ov)close();};
 ov.onkeydown=e=>{if(e.key==='Escape')close();if(e.key==='Tab'){const buttons=[...ov.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];if(!buttons.length)return;e.preventDefault();const at=buttons.indexOf(document.activeElement as HTMLButtonElement);buttons[(at+(e.shiftKey?-1:1)+buttons.length)%buttons.length].focus();}};
 ov.querySelector<HTMLButtonElement>('[data-yes]')!.onclick=async e=>{
  if(busy||app.user?.id!==account)return;busy=true;(e.currentTarget as HTMLButtonElement).disabled=true;
  try{const next=await api.rerollDaily(q.day,q.revision,q.slot??0);if(app.user?.id!==account)return;if(!dead)close();onChange(next);}
  catch{if(dead)return;ov.querySelector('[data-error]')!.textContent=L('変更できませんでした。閉じて再度お試しください。','Could not replace. Close and try again.','변경하지 못했습니다. 닫고 다시 시도해 주세요.');document.dispatchEvent(new Event('lore:rewards'));}
 };
 ov.querySelector<HTMLButtonElement>('[data-no]')!.focus();return close;
}
