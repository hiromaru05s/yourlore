// ============================================================
// LORE — post-login HOME. Choose Random Online or Bot match.
// ============================================================
import type { App, Screen } from "../router";
import { api } from "../net/api";
import { t, onLangChange } from "../i18n";
import { langSelectEl } from "../ui/langSelect";
import { tierChipHtml } from "../ui/tier";

export function mountHome(app: App): Screen {
  const u = app.user;
  const wrap = document.createElement("div");
  wrap.className = "screen";
  wrap.innerHTML = `
    <div class="topright-lang"></div>
    <div class="screen-brand"><div class="mark"></div><h1>LORE</h1></div>
    <div class="home">
      <div class="welcome">${t("home.welcome")}</div>
      <div class="title">${u?.display ?? "PLAYER"}</div>
      <div class="modes modes-3">
        <div class="panel mode-card mode-ranked" id="ranked">
          <div class="icon">🏆</div>
          <h3>${t("home.ranked.title")}</h3>
          <p>${t("home.ranked.desc")}</p>
          <div class="my-tier" id="myTier"></div>
        </div>
        <div class="panel mode-card" id="online">
          <div class="icon">🌐</div>
          <h3>${t("home.online.title")}</h3>
          <p>${t("home.online.desc")}</p>
        </div>
        <div class="panel mode-card" id="bot">
          <div class="icon">🤖</div>
          <h3>${t("home.bot.title")}</h3>
          <p>${t("home.bot.desc")}</p>
        </div>
      </div>
      <div class="panel tut-card" id="lb">
        <span class="tut-emoji">📊</span>
        <span class="tut-txt"><b>${t("home.lb.title")}</b><span>${t("home.lb.desc")}</span></span>
        <span class="tut-arrow">→</span>
      </div>
      <div class="panel tut-card" id="invite">
        <span class="tut-emoji">🎁</span>
        <span class="tut-txt"><b>${t("invite.title")}</b><span>${t("invite.desc")}</span></span>
        <span class="tut-arrow">→</span>
      </div>
      <div class="panel tut-card" id="cards">
        <span class="tut-emoji">🃏</span>
        <span class="tut-txt"><b>${t("home.cards.title")}</b><span>${t("home.cards.desc")}</span></span>
        <span class="tut-arrow">→</span>
      </div>
      <div class="panel tut-card" id="tutorial">
        <span class="tut-emoji">📖</span>
        <span class="tut-txt"><b>${t("home.tutorial.title")}</b><span>${t("home.tutorial.desc")}</span></span>
        <span class="tut-arrow">→</span>
      </div>
      <div class="acct">
        <span class="stats">${t("home.record")} ${u?.wins ?? 0}${t("home.win")} ${u?.losses ?? 0}${t("home.loss")}</span>
        <span>·</span>
        <a id="logout" style="cursor:pointer">${t("home.logout")}</a>
      </div>
    </div>`;
  app.root.appendChild(wrap);
  wrap.querySelector(".topright-lang")!.appendChild(langSelectEl());

  (wrap.querySelector("#ranked") as HTMLElement).onclick = () => app.rankedLobby();
  (wrap.querySelector("#lb") as HTMLElement).onclick = () => app.leaderboard();
  (wrap.querySelector("#invite") as HTMLElement).onclick = () => void showInviteModal();
  (wrap.querySelector("#online") as HTMLElement).onclick = () => app.onlineLobby();
  (wrap.querySelector("#bot") as HTMLElement).onclick = () => app.botGame();

  // current season tier badge (async, best-effort)
  void api.rankMe().then((r) => {
    const el = wrap.querySelector("#myTier");
    if (el && r) el.innerHTML = tierChipHtml(r.tier, r.mmr);
  }).catch(() => { /* not logged in / offline */ });
  (wrap.querySelector("#cards") as HTMLElement).onclick = () => app.cards();
  (wrap.querySelector("#tutorial") as HTMLElement).onclick = () => app.tutorial();
  (wrap.querySelector("#logout") as HTMLElement).onclick = () => app.logout();

  const unsub = onLangChange(() => app.home());
  return { destroy: unsub };
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
      <h2>🎁 ${t("invite.title")}</h2>
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
