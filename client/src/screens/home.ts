// ============================================================
// LORE — post-login HOME. Choose Random Online or Bot match.
// ============================================================
import type { App, Screen } from "../router";
import type { BotDifficulty } from "../shared/bot";
import { api } from "../net/api";
import { t, onLangChange, esc } from "../i18n";
import { tierChipHtml } from "../ui/tier";
import { avatarHtml } from "../ui/social";
import { watchSocial } from "./friends";
import { homeIcon, type HomeIcon } from "../ui/homeIcons";
import { seekerLevel } from "../ui/seekerLevel";
import "../styles/home.css";

export function mountHome(app: App): Screen {
  void import("../ui/duelReadiness").then(({warmDuel})=>warmDuel());
  const u = app.user;
  const level = seekerLevel(u?.wins ?? 0, u?.losses ?? 0);
  const shortLabels: Record<string, string> = { tutorial: "home.nav.guide", deck: "home.nav.deck", cards: "home.nav.cards", lb: "home.nav.ranking" };
  const item = (id: string, icon: HomeIcon, key: string, extra = "") => `<button class="lobby-nav-item" id="${id}" title="${esc(t(key))}">${homeIcon(icon)}<span>${t(shortLabels[id] ?? key)}</span>${extra}</button>`;
  const wrap = document.createElement("div");
  wrap.className = "screen lobby-home";
  wrap.innerHTML = `
    <main class="lobby-shell">
      <header class="lobby-header">
        <button class="lobby-profile" id="profile" title="${esc(t("home.profile.title"))}">
          <span class="lobby-avatar">${avatarHtml(u?.avatar, u?.display ?? "P", 60)}</span>
          <span class="lobby-identity"><b>${esc(u?.display ?? "PLAYER")}</b>
            <span class="lobby-level">${t("home.seekerLevel")} <strong id="seekerLevel">${level.level}</strong></span>
            <span class="lobby-xp" role="progressbar" aria-label="${t("home.seekerLevel")}" aria-valuemin="0" aria-valuemax="5" aria-valuenow="${level.progress}" title="${t("home.levelRule")}"><i style="width:${level.progress / level.required * 100}%"></i></span>
          </span><span class="lobby-profile-arrow" aria-hidden="true">›</span>
        </button>
        <div class="lobby-wallet">
          <button id="credits" title="${esc(t("home.shop.title"))}">${homeIcon("shard")}<span><small>${t("home.shards")}</small><b id="shardBalance">${(u?.credits ?? 0).toLocaleString()}</b></span><span class="lobby-plus" aria-hidden="true">+</span></button>
          <button id="settings" class="lobby-settings" aria-label="${esc(t("home.settings"))}" title="${esc(t("home.settings"))}">${homeIcon("settings")}</button>
        </div>
      </header>
      <section class="lobby-wordmark" aria-label="LORE">
        <img src="/art/brand/lore-logo-transparent.png" alt="LORE">
        <p>${t("home.biblion")}</p>
      </section>
      <aside class="lobby-utilities" aria-label="${t("home.utilities")}">
        ${item("invite", "gift", "invite.title")}
        ${item("inquiry", "mail", "home.inquiry.title")}
      </aside>
      <section class="lobby-duel" aria-label="${t("home.ranked.title")}">
        <button class="lobby-ranked" id="ranked">
          <span class="lobby-rank-emblem">${homeIcon("duel")}</span>
          <span class="my-tier" id="myTier"></span>
          <strong>${t("home.ranked.title")}</strong><span class="lobby-mode-description">${t("home.ranked.desc")}</span>
          <span class="lobby-enter">${t("home.enterDuel")} <span aria-hidden="true">›</span></span>
        </button>
        <div class="lobby-other-modes">
          <button id="online">${homeIcon("duel")}<span>${t("home.online.title")}</span></button>
          <button id="bot">${homeIcon("bot")}<span>${t("home.bot.title")}</span></button>
        </div>
      </section>
      <nav class="lobby-navigation" aria-label="${t("home.navigation")}">
        ${item("tutorial", "book", "home.tutorial.title")}
        ${item("deck", "deck", "home.deck.title")}
        ${item("cards", "cards", "home.cards.title")}
        <button class="lobby-nav-item is-current" aria-current="page" id="homeCurrent">${homeIcon("home")}<span>${t("home.title")}</span></button>
        ${item("lb", "trophy", "home.lb.title")}
        ${item("shop", "shop", "home.shop.title")}
        ${item("friends", "friends", "home.friends.title", '<span class="fr-badge" id="frBadge" style="display:none"></span>')}
      </nav>
    </main>`;
  app.root.appendChild(wrap);

  (wrap.querySelector("#settings") as HTMLElement).onclick = () => app.settings();
  (wrap.querySelector("#homeCurrent") as HTMLElement).onclick = () => app.home();
  (wrap.querySelector("#ranked") as HTMLElement).onclick = () => app.rankedLobby();
  (wrap.querySelector("#deck") as HTMLElement).onclick = () => app.deck();
  (wrap.querySelector("#lb") as HTMLElement).onclick = () => app.leaderboard();
  (wrap.querySelector("#invite") as HTMLElement).onclick = () => void showInviteModal();
  (wrap.querySelector("#online") as HTMLElement).onclick = () => app.onlineLobby();
  (wrap.querySelector("#bot") as HTMLElement).onclick = () => showBotDifficultyModal(app);

  // current season tier badge (async, best-effort)
  void api.rankMe().then((r) => {
    const el = wrap.querySelector("#myTier");
    if (el && r) el.innerHTML = tierChipHtml(r.tier, r.mmr);
  }).catch(() => { /* not logged in / offline */ });
  (wrap.querySelector("#cards") as HTMLElement).onclick = () => app.cards();
  (wrap.querySelector("#shop") as HTMLElement).onclick = () => app.shop();
  (wrap.querySelector("#tutorial") as HTMLElement).onclick = () => app.tutorial();
  (wrap.querySelector("#inquiry") as HTMLElement).onclick = () => showInquiryModal();
  (wrap.querySelector("#profile") as HTMLElement).onclick = () => app.profile();
  (wrap.querySelector("#friends") as HTMLElement).onclick = () => app.friends();
  (wrap.querySelector("#credits") as HTMLElement).onclick = () => app.shop();

  // incoming friend requests badge + friendly-challenge popups while on HOME
  const unwatch = watchSocial(app, (n) => {
    const b = wrap.querySelector("#frBadge") as HTMLElement | null;
    if (!b) return;
    b.style.display = n > 0 ? "" : "none";
    b.textContent = n > 0 ? String(n) : "";
  });

  // Refresh server-backed progression after returning from a duel, without
  // switching screens or applying a late response to another account.
  let disposed = false;
  if (u && u.id !== "local-guest-user") void api.me().then(fresh => {
    if (disposed || !fresh || fresh.id !== u.id || app.user?.id !== u.id) return;
    app.user = fresh;
    const next = seekerLevel(fresh.wins, fresh.losses);
    wrap.querySelector("#seekerLevel")!.textContent = String(next.level);
    wrap.querySelector("#shardBalance")!.textContent = fresh.credits.toLocaleString();
    const bar = wrap.querySelector<HTMLElement>(".lobby-xp")!;
    bar.setAttribute("aria-valuenow", String(next.progress));
    bar.querySelector<HTMLElement>("i")!.style.width = `${next.progress / next.required * 100}%`;
  });
  const unsub = onLangChange(() => app.home());
  return { destroy: () => { disposed = true; unsub(); unwatch(); } };
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
function showInquiryModal(): void {
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
async function showInviteModal(): Promise<void> {
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
