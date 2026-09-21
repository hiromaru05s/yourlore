// ============================================================
// LORE — post-login HOME. Choose Random Online or Bot match.
// ============================================================
import type { App, Screen } from "../router";
import type { BotDifficulty } from "../shared/bot";
import { api } from "../net/api";
import { t, onLangChange, esc, cardName } from "../i18n";
import { tierChipHtml } from "../ui/tier";
import { mountFriends } from "./friends";
import { DB, STARTERS, sanitizeDecks } from "../shared/cards";
import { artUrl } from "../ui/cardArt";
import { homeIcon, type HomeIcon } from "../ui/homeIcons";


export function mountHome(app: App): Screen {
  const u = app.user;
  const wrap = document.createElement("div");
  wrap.className = "screen lounge-home-screen";
  const store=sanitizeDecks(u?.decks ?? null);
  wrap.innerHTML = `
    <section class="lounge-home-main">
      <div class="lounge-welcome"><span>BIBLION · THE GRAND LIBRARY</span><h1>${t("home.biblion")}</h1></div>
      <section class="lounge-play">
        <div id="myTier" class="lounge-rank-info">${t("lb.season")} —</div>
        <h2>${t("home.ranked.title")}</h2>
        <button class="lounge-play-button" id="ranked">${homeIcon("home")}<strong>${t("home.enterDuel")}</strong><span>›</span></button>
        <div class="lounge-secondary-modes"><button id="online">${homeIcon("duel")}${t("home.online.title")}</button><button id="bot">${homeIcon("bot")}${t("home.bot.title")}</button></div>
      </section>
      <section class="lounge-active-deck"><div><h3>${t("deck.inuse")} · ${t("deck.slot").replace("{n}",String(store.sel+1))}</h3><div class="lounge-deck-preview">${["STARTER_MANA",...store.list[store.sel].cards].slice(0,5).map(id=>`<img src="${artUrl.sm(id)}" alt="${esc(cardName({...(STARTERS[id]??DB[id]),uid:id}))}" loading="lazy">`).join("")}</div></div><div class="lounge-deck-actions"><button class="btn btn-gold" id="deck">${homeIcon("deck")}${t("home.deck.title")} ›</button><button class="btn btn-ghost" id="profile">${t("profile.title")} ›</button></div></section>
    </section><button class="lounge-friends-toggle" id="friendsToggle" aria-expanded="false" aria-controls="homeFriendsAside">${t("friends.title")} ↑</button><aside id="homeFriendsAside" class="lounge-home-friends"><div class="lounge-friends-heading"><h2>${t("friends.title")}</h2><button class="btn btn-ghost" id="allFriends">${t("cards.f.all")} ›</button></div><div id="homeFriends"></div></aside>`;
  app.root.appendChild(wrap);
  const q=(id:string)=>wrap.querySelector<HTMLButtonElement>('#'+id)!;
  q('ranked').onclick=()=>app.rankedLobby(); q('online').onclick=()=>app.onlineLobby();
  q('bot').onclick=()=>showBotDifficultyModal(app); q('deck').onclick=()=>app.deck(); q('profile').onclick=()=>app.profile();q('allFriends').onclick=()=>app.friends();
  q('friendsToggle').onclick=()=>{const open=wrap.querySelector('#homeFriendsAside')!.classList.toggle('is-open');q('friendsToggle').setAttribute('aria-expanded',String(open));q('friendsToggle').textContent=t('friends.title')+(open?' ↓':' ↑');};
  const friends=mountFriends(app,wrap.querySelector<HTMLElement>('#homeFriends')!,true);
  let disposed=false;
  void api.rankMe().then(r=>{if(disposed)return;const el=wrap.querySelector<HTMLElement>('#myTier')!;el.innerHTML=r?`${tierChipHtml(r.tier,r.mmr)} <small>${r.season} · #${r.rank}</small>`:t('lobby.connerr');});
  if(u && u.id!=='local-guest-user') void api.me().then(fresh=>{if(!disposed&&fresh?.id===u.id&&app.user?.id===u.id) { app.user=fresh; document.dispatchEvent(new Event("lore:user")); }}).catch(()=>{});
  const unsub=onLangChange(()=>app.home());
  return {destroy:()=>{disposed=true;unsub();friends.destroy?.();}};
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
        ${tiers.map((x) => `
          <button class="diff-card diff-${x.diff}" data-diff="${x.diff}">
            <span class="diff-ico">${homeIcon(x.icon)}</span>
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
    <div class="modal inquiry-box" style="min-width:340px;max-width:460px">
      <h2>${homeIcon("mail")} ${t("inquiry.modal.title")}</h2>
      <label class="field-label">${t("inquiry.field.title")}</label>
      <input class="input" id="inqTitle" maxlength="100" placeholder="${t("inquiry.ph.title")}">
      <label class="field-label">${t("inquiry.field.body")}</label>
      <textarea class="input inq-textarea" id="inqBody" maxlength="2000" rows="6" placeholder="${t("inquiry.ph.body")}"></textarea>
      <div class="inq-msg" id="inqMsg"></div>
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
        <h2>${homeIcon("mail")} ${t("inquiry.modal.title")}</h2>
        <div class="inq-done">✅ ${t("inquiry.sent")}</div>
        <div class="modal-row"><button class="btn btn-gold btn-block" id="inqOk">${t("common.confirm")}</button></div>`;
      (box.querySelector("#inqOk") as HTMLElement).onclick = close;
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
    <div class="modal invite-box" style="min-width:340px;max-width:420px">
      <h2>${homeIcon("gift")} ${t("invite.title")}</h2>
      <div class="inv-desc">${t("invite.desc")}</div>
      <label class="field-label">${t("invite.link")} (${data.invites.length}/${data.limit})</label>
      <div class="invite-link-row">
        <input class="input" id="invLink" readonly value="${link}">
        <button class="btn btn-gold" id="invCopy">${t("invite.copy")}</button>
      </div>
      <div class="invite-list">
        ${data.invites.length === 0 ? `<div class="inv-row" style="justify-content:center;color:var(--paper-faint)">${t("invite.empty")}</div>`
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
