import type { App } from '../router';
import { api } from '../net/api';
import { cardName, esc, t } from '../i18n';
import { loungeText as L } from './loungeText';
import { DB, STARTERS } from '../shared/cards';
import { homeIcon } from './homeIcons';
import { BOT_REWARDS, MATCH_REWARDS, type DailyQuest, type ProgressionState } from '../shared/progression';
import '../styles/dailyRewards.css';
import '../styles/dailyQuestCard.css';
export function questLabel(q:DailyQuest):string {
 const def=q.card?(DB[q.card]??STARTERS[q.card]):null;
 const name=def?cardName({...def,uid:'quest-name'}):q.card??'';
 const labels:Record<DailyQuest['kind'],string>={
 starterWin:L(`「${name}」をデッキに含めて3回勝利`,`Win 3 games with ${name} in your starting deck`,`시작 덱에 ${name}을 넣고 3회 승리`),
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
export function mountDailyRewards(app:App,button:HTMLButtonElement):()=>void {
 let request=0;let dead=false,data:ProgressionState|undefined,timer:ReturnType<typeof setTimeout>|undefined;
 const guest=!app.user||app.user.id==='local-guest-user',account=app.user?.id;
 const render=()=>{
  const daily=data?.daily,claimed=daily?.claimed??false;
  const label=daily?questLabel(daily.quest):guest?L('ログインして報酬を獲得','Log in to earn rewards','로그인하고 보상 받기'):L('クエスト・対戦報酬を確認','View quests and duel rewards','퀘스트・대전 보상 보기');
  const progress=daily?Math.min(daily.quest.target,Math.max(0,daily.progress)):0;
  const status=claimed?L('達成・受取済み','Reward received','달성・수령 완료'):progress?L('進行中','In progress','진행 중'):L('未着手','Not started','시작 전');
  button.classList.toggle('is-complete',claimed);
  button.innerHTML=`<span class="dq-insignia" aria-hidden="true"><svg viewBox="0 0 40 48" fill="none"><path d="M10 5h23v29H14M10 5a4 4 0 0 0-4 4v5h8V9a4 4 0 0 0-4-4ZM14 14v23a4 4 0 0 0 8 0v-3h15v3a4 4 0 0 1-4 4H18"/><path d="M19 14h9M19 19h9M19 24h5"/><path class="dq-quill" d="m7 36 17-23-4 12-13 11Z"/></svg><span class="dq-seal">${claimed?'✓':'!'}</span></span><span class="dq-body"><span class="dq-kicker">${L('デイリークエスト','Daily quest','일일 퀘스트')}</span><strong class="dq-title">${esc(label)}</strong>${daily?`<span class="dq-progress"><span>${status}</span><span><b>${progress}</b> / ${daily.quest.target}</span></span><progress class="dq-meter" value="${progress}" max="${daily.quest.target}" aria-label="${esc(L('クエスト進捗','Quest progress','퀘스트 진행'))}"></progress>`:''}</span><span class="dq-footer">${daily?`<span class="dq-reward">${homeIcon('shard')}<b>${daily.quest.reward}</b><span>${L('シャード','Shards','샤드')}</span></span>`:`<span class="dq-status">${guest?L('ログインへ','Log in','로그인'):L('詳細を開く','View details','자세히 보기')}</span>`}<span class="dq-arrow" aria-hidden="true">›</span></span>`;
 };
 const load=()=>{if(guest)return;const serial=++request;void api.progression().then(next=>{if(dead||serial!==request||app.user?.id!==account)return;data=next;render();syncCredits(app,next);clearTimeout(timer);timer=setTimeout(load,Math.max(1000,next.resetsAt-Date.now()+100));}).catch(()=>{});};
 button.onclick=()=>{if(guest){app.login();return;}showDailyRewards(app);};
 const focus=()=>load();window.addEventListener('focus',focus);document.addEventListener('lore:rewards',load);render();load();
 return()=>{dead=true;clearTimeout(timer);window.removeEventListener('focus',focus);document.removeEventListener('lore:rewards',load);};
}
export function showDailyRewards(app:App):void {
 if(document.querySelector('.daily-rewards-overlay'))return;
 const account=app.user?.id,ov=document.createElement('div');ov.className='overlay daily-rewards-overlay';
 const previous=document.activeElement as HTMLElement|null;
 ov.innerHTML=`<div class="modal support-dialog daily-rewards" role="dialog" aria-modal="true" aria-labelledby="dailyTitle"><header class="support-dialog-heading"><h2 id="dailyTitle">${L('クエストと報酬','Quests & rewards','퀘스트와 보상')}</h2><button id="dailyRewardsClose" data-close class="btn btn-ghost">${t('common.back')}</button></header><div data-body role="status">${L('読み込み中…','Loading…','불러오는 중…')}</div></div>`;
 document.body.append(ov);let dead=false;
 const close=()=>{dead=true;ov.remove();previous?.focus();};ov.querySelector<HTMLButtonElement>('[data-close]')!.onclick=close;
 ov.onclick=e=>{if(e.target===ov)close();};ov.onkeydown=e=>{if(e.key==='Escape')close();};
 const paint=(data:ProgressionState)=>{
 if(dead||!ov.isConnected||app.user?.id!==account)return;syncCredits(app,data);
 const {daily}=data;
 ov.querySelector('[data-body]')!.innerHTML=`<section class="daily-task"><p class="daily-reset">${L('1日1件 · 毎日0:00更新（日本・韓国時間）','One per day · Resets at 00:00 UTC+9','하루 1개 · 매일 0:00 초기화 (한국・일본 시간)')}</p><h3>${esc(questLabel(daily.quest))}</h3><div class="daily-task-total"><b>${shardLabel(daily.quest.reward)}</b><span>${daily.progress} / ${daily.quest.target}</span></div><progress value="${daily.progress}" max="${daily.quest.target}" aria-label="${esc(L('クエスト進捗','Quest progress','퀘스트 진행'))}"></progress><p>${daily.claimed?L('達成・受取済み','Completed · Reward received','달성・보상 수령 완료'):L('BOT・ノーマル・Rankedの対戦終了時に進捗を反映。達成すると自動で受け取ります。','Progress is saved after BOT, Casual and Ranked games. Rewards are granted automatically.','BOT・일반・랭크 대전 종료 시 진행도를 반영하며 달성 보상은 자동 지급됩니다.')}</p><button class="btn btn-ghost" data-reroll ${daily.claimed||daily.rerollsLeft===0?'disabled':''}>${L(`変更する（残り${daily.rerollsLeft}回）`,`Replace (${daily.rerollsLeft} left)`,`변경 (남은 횟수 ${daily.rerollsLeft})`)}</button><small>${L('変更すると現在の進捗はリセットされます。対戦開始前に変更してください。','Replacing resets progress. Replace before starting a duel.','변경하면 현재 진행도가 초기화됩니다. 대전 시작 전에 변경해 주세요.')}</small><p data-error role="alert"></p></section><section class="daily-duels"><h3>${L('対戦報酬','Duel rewards','대전 보상')}</h3>${(['online','ranked'] as const).map(mode=>{const r=MATCH_REWARDS[mode];return `<div><strong>${mode==='online'?L('ノーマル','Casual','일반'):'Ranked'}</strong><span>${L(`勝利 ${r.win} / 敗北 ${r.loss} シャード`,`Win ${r.win} / Loss ${r.loss} Shards`,`승리 ${r.win} / 패배 ${r.loss} 샤드`)}</span><small>${L('本日','Today','오늘')} ${data[mode]} / ${r.cap}</small></div>`;}).join('')}<p>${L('引き分けは対戦報酬なし。デイリー・初回クリア報酬は日次上限の対象外。','Draws have no match reward. Daily and first-clear rewards are separate from the caps.','무승부 대전 보상 없음. 일일 퀘스트・첫 클리어 보상은 일일 상한과 별도입니다.')}</p></section><section class="daily-bots"><h3>${L('BOT 初回クリア','BOT first clears','BOT 첫 클리어')}</h3>${Object.entries(BOT_REWARDS).map(([diff,amount])=>`<div><span>${t('bot.diff.'+diff)}</span><b>${shardLabel(amount)}</b><small>${data.bot[diff as keyof typeof BOT_REWARDS]?L('受取済み','Received','수령 완료'):L('未クリア','Not cleared','미클리어')}</small></div>`).join('')}<p>${L('各難易度につき、1アカウント1回のみ。','Once per difficulty, per account.','난이도별 계정당 1회만 지급됩니다.')}</p></section>`;
 ov.querySelector<HTMLButtonElement>('[data-reroll]:not(:disabled), [data-close]')?.focus();
 ov.querySelector<HTMLButtonElement>('[data-reroll]')!.onclick=async e=>{
 const b=e.currentTarget as HTMLButtonElement;b.disabled=true;
 try{paint(await api.rerollDaily(daily.day,daily.revision));document.dispatchEvent(new Event('lore:rewards'));}
 catch{if(dead)return;const latest=await api.progression().catch(()=>null);if(latest)paint(latest);ov.querySelector('[data-error]')!.textContent=L('変更できませんでした。現在の状態を確認して再度お試しください。','Could not replace the quest. Check its current status and retry.','변경하지 못했습니다. 현재 상태를 확인하고 다시 시도해 주세요.');b.disabled=false;}
 };
 };
 void api.progression().then(paint).catch(()=>{if(!dead)ov.querySelector('[data-body]')!.textContent=L('取得できませんでした。閉じて再度お試しください。','Could not load. Close and try again.','불러오지 못했습니다. 닫은 후 다시 시도해 주세요.');});
 ov.querySelector<HTMLButtonElement>('[data-close]')!.focus();
}
