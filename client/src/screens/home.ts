// ============================================================
// LORE — post-login HOME. Choose Random Online or Bot match.
// ============================================================
import type { App, Screen } from "../router";
import type { BotDifficulty } from "../shared/bot";
import { api } from "../net/api";
import { t, onLangChange, esc } from "../i18n";
import { homeRankHtml } from "../ui/rankPresentation";
import { loungeText } from "../ui/loungeText";
import { sanitizeDecks } from "../shared/cards";
import { artUrl } from "../ui/cardArt";
import { homeIcon, type HomeIcon } from "../ui/homeIcons";


export function mountHome(app: App): Screen {
  const u = app.user;
  const wrap = document.createElement("div");
  wrap.className = "screen lounge-home-screen";
  const store=sanitizeDecks(u?.decks ?? null);
  wrap.innerHTML = `
    <section class="lounge-home-main">
      <section class="lounge-play" aria-label="${esc(t("home.ranked.title"))}">
        <div class="lounge-mode-tabs" role="group" aria-label="${esc(loungeText('対戦モード','Duel mode','대전 모드'))}">
          <button id="rankedMode" aria-pressed="true">${loungeText('ランク','Ranked','랭크')}</button>
          <button id="online" aria-pressed="false">${loungeText('ノーマル','Casual','일반')}</button>
          <button id="bot" aria-pressed="false">BOT</button>
        </div>
        <button class="lounge-play-button" id="ranked"><small aria-hidden="true">DUEL</small><strong>${t("home.ranked.title")}</strong><span>${t("home.enterDuel")} →</span></button>
        <button id="myTier" class="lounge-rank-info" aria-live="polite" aria-label="${t("lb.title")}">${t("lb.season")} —</button>
      </section>
      <button class="lounge-active-deck" id="deck" aria-label="${esc(t("home.deck.title"))}">
        <span class="lounge-deck-preview" aria-hidden="true">${["STARTER_MANA",...store.list[store.sel].cards].slice(0,3).map(id=>`<img src="${artUrl.sm(id)}" alt="" loading="lazy">`).join("")}</span>
        <span class="lounge-deck-label"><small>${t("deck.inuse")}</small><strong>${esc(store.list[store.sel].name || t("deck.slot").replace("{n}",String(store.sel+1)))}</strong><span>${t("home.deck.title")}</span></span>${homeIcon("arrow")}
      </button>
    </section>`;
  app.root.appendChild(wrap);
  const q=(id:string)=>wrap.querySelector<HTMLButtonElement>('#'+id)!;
  let mode: 'ranked'|'online'|'bot'='ranked';
  const selectMode=(next:typeof mode)=>{
    mode=next;
    for(const [id,key] of [['rankedMode','ranked'],['online','online'],['bot','bot']])q(id).setAttribute('aria-pressed',String(mode===key));
    q('ranked').querySelector('strong')!.textContent=t(`home.${mode}.title`);
    wrap.querySelector('.lounge-play')!.setAttribute('aria-label',t(`home.${mode}.title`));
  };
  q('rankedMode').onclick=()=>selectMode('ranked');
  q('online').onclick=()=>selectMode('online');q('bot').onclick=()=>selectMode('bot');
  q('ranked').onclick=()=>mode==='ranked'?app.rankedLobby():mode==='online'?app.onlineLobby():showBotDifficultyModal(app);
  q('deck').onclick=()=>app.deck();
  q('myTier').onclick=()=>app.leaderboard();
  let disposed=false;
  const loadRank = () => void api.rankMe().then(r=>{
    if(disposed)return;
    const el=q('myTier');
    el.innerHTML=r?homeRankHtml(r):loungeText('ティアを取得できませんでした · タップして再読み込み','Could not load rank · Tap to retry','티어를 불러오지 못했습니다 · 눌러서 재시도');
    el.onclick=r?()=>app.leaderboard():loadRank;
  });
  loadRank();
  if(u && u.id!=='local-guest-user') void api.me().then(fresh=>{if(!disposed&&fresh?.id===u.id&&app.user?.id===u.id) { app.user=fresh; document.dispatchEvent(new Event("lore:user")); }}).catch(()=>{});
  const unsub=onLangChange(()=>app.home());
  return {destroy:()=>{disposed=true;unsub();}};
}

/** BOT match difficulty picker. Dims + blurs HOME behind a focused center modal. */
function showBotDifficultyModal(app: App): void {
  const tiers: { diff: BotDifficulty; icon: HomeIcon }[] = [
    { diff: "easy", icon: "book" },
    { diff: "normal", icon: "duel" },
    { diff: "hard", icon: "bot" },
    { diff: "hell", icon: "home" },
  ];
  const ov = document.createElement("div");
  ov.className = "overlay bot-diff-ov";
  ov.innerHTML = `
    <div class="modal bot-diff">
      <h2>${t("bot.diff.title")}</h2>
      <p class="bot-diff-sub">${t("bot.diff.sub")}</p>
      <div class="diff-grid">
        ${tiers.map((x,i) => `
          <button class="diff-card diff-${x.diff}" data-diff="${x.diff}">
            <span class="diff-rank">${["I","II","III","IV"][i]}</span><span class="diff-ico">${homeIcon(x.icon)}</span>
            <span class="diff-name">${t(`bot.diff.${x.diff}`)}</span>
            <span class="diff-desc">${t(`bot.diff.${x.diff}.desc`)}</span>
          </button>`).join("")}
      </div>
      <div class="modal-row"><button class="btn btn-ghost btn-block" id="diffCancel">${t("common.cancel")}</button></div>
    </div>`;
  document.body.appendChild(ov);
  const close = () => ov.remove();
  (ov.querySelector("#diffCancel") as HTMLElement).onclick = close;
  ov.onclick = (e) => { if (e.target === ov) close(); };
  ov.querySelectorAll<HTMLButtonElement>(".diff-card").forEach((b) => {
    b.onclick = () => { close(); app.botGame(b.dataset.diff as BotDifficulty); };
  });
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
export async function showInviteModal(): Promise<void> {
  let data: Awaited<ReturnType<typeof api.inviteMe>>;
  try { data = await api.inviteMe(); } catch { return; }
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
      <div class="inv-note">${t("invite.note")}</div>
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
