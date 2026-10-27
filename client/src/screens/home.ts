import {mountGiftInbox} from '../ui/giftInbox';
import { BOT_FIRST_CLEAR_EXP } from '../shared/progression';
import { mountDailyRewards, firstClearLabel, rewardProgressHtml } from '../ui/dailyRewards';
import { BOT_REWARDS, type ProgressionState } from '../shared/progression';
// ============================================================
// LORE — post-login HOME. Choose Random Online or Bot match.
// ============================================================
import type { App, Screen } from "../router";
import type { BotDifficulty } from "../shared/bot";
import { BOT_NPCS, botNpc } from "../shared/botNpcs";
import { getLang } from "../i18n";
import { api } from "../net/api";
import { t, onLangChange, esc } from "../i18n";
import { homeRankHtml } from "../ui/rankPresentation";
import { loungeText } from "../ui/loungeText";
import { sanitizeDecks } from "../shared/cards";
import { artUrl } from "../ui/cardArt";
import { mountHomeSpirit } from '../ui/homeSpirit';
import '../styles/homeTutorial.css';
import { homeIcon } from "../ui/homeIcons";
import {scheduleGameWarmup,warmGame} from './lazyGame';
import {mountHomeDuelButton} from '../ui/homeDuelButton';


export function mountHome(app: App): Screen {
  const u = app.user;
  const wrap = document.createElement("div");
  wrap.className = "screen lounge-home-screen";
  const store=sanitizeDecks(u?.decks ?? null);
  wrap.innerHTML = `
    <section class="home-companion" aria-label="${esc(loungeText('ゼノ','Zeno','제노'))}">
      <button class="home-spirit-touch" type="button" aria-label="${esc(loungeText('ゼノに挨拶する','Greet Zeno','제노에게 인사하기'))}"><span class="home-spirit-host"></span></button>
    </section>
    <section class="lounge-home-main">
      <section class="lounge-play" aria-label="${esc(t("home.ranked.title"))}">
        <button class="gift-mail" id="homeGifts" type="button"></button>
        <div class="lounge-mode-tabs" role="group" aria-label="${esc(loungeText('対戦モード','Duel mode','대전 모드'))}">
          <button id="rankedMode" aria-pressed="true">${loungeText('ランク','Ranked','랭크')}</button>
          <button id="online" aria-pressed="false">${loungeText('ノーマル','Casual','일반')}</button>
          <button id="bot" aria-pressed="false">${t("home.bot.title")}</button>
        </div>
        <div class="mode-reward" id="modeReward"></div>
        <button class="lounge-play-button home-duel-button" id="ranked"><small aria-hidden="true">DUEL</small><strong>${t("home.ranked.title")}</strong><span>${t("home.enterDuel")} →</span></button>
        <button id="myTier" class="lounge-rank-info" aria-live="polite" aria-label="${t("lb.title")}">${t("lb.title")}</button>
      </section>
      <button class="lounge-active-deck" id="deck" aria-label="${esc(t("home.deck.title"))}">
        <span class="lounge-deck-preview" aria-hidden="true">${["STARTER_MANA",...store.list[store.sel].cards].slice(0,3).map(id=>`<img src="${artUrl.sm(id)}" alt="" loading="lazy">`).join("")}</span>
        <span class="lounge-deck-label"><small>${t("deck.inuse")}</small><strong>${esc(store.list[store.sel].name || t("deck.slot").replace("{n}",String(store.sel+1)))}</strong><span>${t("home.deck.title")}</span></span>${homeIcon("arrow")}
      </button>
      <section class="home-daily-reward" id="dailyReward"></section>
    </section>`;
  app.root.appendChild(wrap);
  const stopGifts=mountGiftInbox(app,wrap.querySelector<HTMLButtonElement>('#homeGifts')!);
  const stopSpirit=mountHomeSpirit(app,wrap.querySelector<HTMLButtonElement>('.home-spirit-touch')!);
  const q=(id:string)=>wrap.querySelector<HTMLButtonElement>('#'+id)!;
  const duelButton=mountHomeDuelButton(q('ranked'));
  let mode: 'ranked'|'online'|'bot'='ranked';
  let rewards:ProgressionState|undefined;
  const stopDaily=mountDailyRewards(app,wrap.querySelector<HTMLElement>('#dailyReward')!,state=>{rewards=state;wrap.querySelector('#modeReward')!.innerHTML=rewardProgressHtml(rewards,mode);});
  const selectMode=(next:typeof mode)=>{
    mode=next;
    wrap.querySelector('#modeReward')!.innerHTML=rewardProgressHtml(rewards,mode);
    for(const [id,key] of [['rankedMode','ranked'],['online','online'],['bot','bot']])q(id).setAttribute('aria-pressed',String(mode===key));
    duelButton.setMode(mode);
    wrap.querySelector('.lounge-play')!.setAttribute('aria-label',t(`home.${mode}.title`));
  };
  selectMode('ranked');
  q('rankedMode').onclick=()=>selectMode('ranked');
  q('online').onclick=()=>selectMode('online');q('bot').onclick=()=>selectMode('bot');
  q('ranked').onclick=()=>mode==='ranked'?app.rankedLobby():mode==='online'?app.onlineLobby():showBotNpcModal(app);
  q('deck').onclick=()=>app.deck();
  q('myTier').onclick=()=>app.leaderboard();
  let disposed=false;
  const loadRank = () => void api.rankMe().then(r=>{
    if(disposed)return;
    const el=q('myTier');
    el.innerHTML=r?homeRankHtml(r):loungeText('ティアを取得できませんでした · クリックして再読み込み','Could not load rank · Click to retry','티어를 불러오지 못했습니다 · 눌러서 재시도');
    el.onclick=r?()=>app.leaderboard():loadRank;
  });
  loadRank();
  const stopWarmup=scheduleGameWarmup(wrap,store.list[store.sel].cards);
  if(u && u.id!=='local-guest-user') void api.me().then(fresh=>{if(!disposed&&fresh?.id===u.id&&app.user?.id===u.id) { app.user=fresh; document.dispatchEvent(new Event("lore:user")); }}).catch(()=>{});
  const unsub=onLangChange(()=>app.home());
  return {destroy:()=>{disposed=true;duelButton.destroy();stopWarmup();unsub();stopSpirit();stopDaily();stopGifts();}};
}

/** Select an NPC, then start centrally or double-click its card. */
function showBotNpcModal(app: App): void {
  if(document.querySelector('.bot-diff-ov'))return;
  const store=sanitizeDecks(app.user?.decks ?? null),activeDeck=store.list[store.sel];
  void warmGame(activeDeck.cards).catch(()=>{});
  let selected:BotDifficulty='normal';
  const previousFocus=document.activeElement as HTMLElement|null;
  const ov = document.createElement("div");
  ov.className = "overlay bot-diff-ov";
  ov.innerHTML = `
    <div class="modal support-dialog bot-diff bot-challenge bot-npcs" role="dialog" aria-modal="true" aria-labelledby="challengeTitle">
      <header class="support-dialog-heading">
        <h2 id="challengeTitle">${loungeText("対戦相手を選ぶ","Choose your opponent","대전 상대 선택")}</h2>
        <button class="challenge-back" id="diffCancel">← ${t('common.back')}</button>
      </header>
      <div class="diff-grid" role="group" aria-label="${loungeText("対戦相手を選ぶ","Choose your opponent","대전 상대 선택")}">
        ${BOT_NPCS.map(npc => `
          <button type="button" class="diff-card diff-${npc.difficulty}" data-diff="${npc.difficulty}" aria-pressed="${npc.difficulty===selected}">
            <span class="challenge-selected">${loungeText('選択中','SELECTED','선택됨')}</span>
            <span class="challenge-art" aria-hidden="true"><img src="${npc.portrait}" alt=""></span>
            <span class="diff-name">${esc(npc.name[getLang()])}</span>
            <span class="npc-difficulty">${t(`bot.diff.${npc.difficulty}`)}</span>
            <span class="npc-first-reward" data-bot-reward="${npc.difficulty}">${app.user?.botClears?.includes(npc.difficulty)?loungeText('クリア済み','Cleared','클리어 완료'):`${firstClearLabel(BOT_REWARDS[npc.difficulty])} · ${BOT_FIRST_CLEAR_EXP[npc.difficulty]} EXP`}</span>
          </button>`).join("")}
      </div>
      <div class="challenge-footer">
        <button type="button" class="challenge-start" id="diffStart"></button>
        <div class="challenge-details"><div class="challenge-deck"><img src="${artUrl.sm('STARTER_MANA')}" alt=""><span><small>${t('deck.inuse')}</small><strong>${esc(activeDeck.name||t('deck.slot').replace('{n}',String(store.sel+1)))}</strong></span></div></div>
      </div>
    </div>`;
  document.body.appendChild(ov);
  if(app.user&&app.user.id!=='local-guest-user')void api.progression().then(data=>{if(!ov.isConnected)return;for(const [diff,done] of Object.entries(data.bot)){const el=ov.querySelector(`[data-bot-reward="${diff}"]`);if(el&&done)el.textContent=loungeText('クリア済み','Cleared','클리어 완료');}}).catch(()=>{});
  const update = () => {
    const npc = botNpc(selected), name = npc.name[getLang()];
    ov.querySelectorAll<HTMLButtonElement>('[data-diff]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.diff === selected)));
    ov.querySelector('#diffStart')!.textContent = loungeText(`${name}と対戦 →`, `Duel ${name} →`, `${name}와 대전 →`);
  };
  let closed = false;
  const close = () => {closed=true;ov.remove();previousFocus?.focus();};
  const start = (difficulty: BotDifficulty = selected) => {
    if(closed || !ov.isConnected)return;
    close();
    app.botGame(difficulty);
  };
  (ov.querySelector("#diffCancel") as HTMLElement).onclick = close;
  ov.onclick = (e) => { if (e.target === ov) close(); };
  ov.querySelectorAll<HTMLButtonElement>(".diff-card").forEach((b) => {
    b.onclick = () => { selected=b.dataset.diff as BotDifficulty;update(); };
    b.ondblclick = () => start(b.dataset.diff as BotDifficulty);
  });
  (ov.querySelector('#diffStart') as HTMLButtonElement).onclick=()=>start();
  ov.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const buttons=[...ov.querySelectorAll<HTMLButtonElement>('button')],at=buttons.indexOf(document.activeElement as HTMLButtonElement);e.preventDefault();buttons[(at+(e.shiftKey?-1:1)+buttons.length)%buttons.length].focus();}};
  update();ov.querySelector<HTMLButtonElement>('[aria-pressed=true]')!.focus();
}

/** 문의 모달: 제목+본문 → /api/inquiry → 어드민 대시보드 '문의' 탭. */
export function showInquiryModal(): void {
  const ov = document.createElement("div");
  ov.className = "overlay";
  ov.innerHTML = `
    <div class="modal support-dialog inquiry-box">
      <header class="support-dialog-heading"><span class="menu-eyebrow">SUPPORT</span><h2>${t("inquiry.modal.title")}</h2></header>
      <label class="field-label" for="inqTitle">${t("inquiry.field.title")}</label>
      <input class="input" id="inqTitle" maxlength="100" placeholder="${t("inquiry.ph.title")}">
      <label class="field-label" for="inqBody">${t("inquiry.field.body")}</label>
      <textarea class="input inq-textarea" id="inqBody" maxlength="2000" rows="6" placeholder="${t("inquiry.ph.body")}"></textarea>
      <div class="inq-msg" id="inqMsg" role="status"></div>
      <div class="modal-row">
        <button class="btn btn-ghost" id="inqCancel">${t("common.cancel")}</button>
        <button class="btn btn-gold" id="inqSend">${t("inquiry.send")}</button>
      </div>
    </div>`;
  document.body.appendChild(ov);
  const close = () => ov.remove();
  const titleEl = ov.querySelector("#inqTitle") as HTMLInputElement;
  const bodyEl = ov.querySelector("#inqBody") as HTMLTextAreaElement;
  const msgEl = ov.querySelector("#inqMsg") as HTMLElement;
  const sendBtn = ov.querySelector("#inqSend") as HTMLButtonElement;
  (ov.querySelector("#inqCancel") as HTMLElement).onclick = close;
  ov.onclick = (e) => { if (e.target === ov) close(); };
  titleEl.focus();
  sendBtn.onclick = () => {
    const title = titleEl.value.trim();
    const body = bodyEl.value.trim();
    if (!title || !body) { msgEl.className = "inq-msg err"; msgEl.textContent = t("inquiry.need"); return; }
    sendBtn.disabled = true;
    sendBtn.textContent = t("inquiry.sending");
    void api.sendInquiry(title, body).then(() => {
      const box = ov.querySelector(".inquiry-box") as HTMLElement;
      box.innerHTML = `
        <header class="support-dialog-heading"><span class="menu-eyebrow">SUPPORT</span><h2>${t("inquiry.modal.title")}</h2></header>
        <div class="inq-done" role="status">${homeIcon("check")} ${t("inquiry.sent")}</div>
        <div class="modal-row"><button class="btn btn-gold btn-block" id="inqOk">${t("common.confirm")}</button></div>`;
      (box.querySelector("#inqOk") as HTMLElement).onclick = close;
      (box.querySelector("#inqOk") as HTMLElement).focus();
    }).catch(() => {
      sendBtn.disabled = false;
      sendBtn.textContent = t("inquiry.send");
      msgEl.className = "inq-msg err";
      msgEl.textContent = t("inquiry.fail");
    });
  };
}

/** Invite-campaign modal: share link + invitee progress (max 3). */
export async function showInviteModal(signal?:AbortSignal): Promise<void> {
  let data: Awaited<ReturnType<typeof api.inviteMe>>;
  try { data = await api.inviteMe(); } catch { return; }
  if(signal?.aborted)return;
  const link = `${location.origin}/?ref=${data.code}`;

  const ov = document.createElement("div");
  ov.className = "overlay";
  const stLabel = (s: string) => s === "earned" ? t("invite.status.earned") : s === "paid" ? t("invite.status.paid") : t("invite.status.pending");
  ov.innerHTML = `
    <div class="modal support-dialog invite-box">
      <header class="support-dialog-heading"><span class="menu-eyebrow">INVITE A FRIEND</span><h2>${t("invite.title")}</h2></header>
      <div class="inv-desc">${t("invite.desc")}</div>
      <div class="invite-progress"><span>${loungeText("招待人数", "Friends invited", "초대한 친구")}</span><strong>${data.invites.length}<small> / ${data.limit}</small></strong></div><label class="field-label" for="invLink">${t("invite.link")}</label>
      <div class="invite-link-row">
        <input class="input" id="invLink" readonly value="${link}">
        <button class="btn btn-gold" id="invCopy">${t("invite.copy")}</button>
      </div>
      <div class="invite-list">
        ${data.invites.length === 0 ? `<div class="inv-row inv-empty">${t("invite.empty")}</div>`
          : data.invites.map((v) => `<div class="inv-row"><span>${v.display.replace(/[<>&]/g, "")}</span><span class="inv-st ${v.status}">${stLabel(v.status)}</span></div>`).join("")}
      </div>
      <div class="modal-row"><button class="btn btn-ghost btn-block" id="invClose">${t("common.confirm")}</button></div>
    </div>`;
  document.body.appendChild(ov);
  (ov.querySelector("#invClose") as HTMLElement).onclick = () => ov.remove();
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  (ov.querySelector("#invCopy") as HTMLButtonElement).onclick = () => {
    const inp = ov.querySelector("#invLink") as HTMLInputElement;
    inp.select();
    void navigator.clipboard?.writeText(link).catch(() => document.execCommand("copy"));
    (ov.querySelector("#invCopy") as HTMLButtonElement).textContent = t("invite.copied");
  };
}
