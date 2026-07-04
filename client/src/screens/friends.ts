// ============================================================
// LORE — friends screen: add/accept/remove friends, online
// presence, profiles, and friendly-match challenges.
// Challenges are polling-based:
//   · challenger: POST /social/challenge → poll until accepted →
//     join the provisioned GameRoom as side 0.
//   · target: sees the challenge in GET /social/friends (5s poll)
//     → accept → joins as side 1.
// ============================================================
import type { App, Screen } from "../router";
import { api, type FriendEntry, type FriendsData } from "../net/api";
import { t, onLangChange } from "../i18n";
import { langSelectEl } from "../ui/langSelect";
import { avatarHtml, badgeChipHtml } from "../ui/social";
import { showProfileModal } from "./profile";
import { confirmDialog } from "../ui/modal";
import { sfx } from "../ui/sound";

function esc(s: string): string { return s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]!)); }

const POLL_LIST_MS = 5000;
const POLL_CHALLENGE_MS = 2000;

export function mountFriends(app: App): Screen {
  const wrap = document.createElement("div");
  wrap.className = "screen tut-screen";
  wrap.innerHTML = `
    <div class="topright-lang"></div>
    <div class="tut">
      <div class="tut-head">
        <button class="btn btn-ghost" id="back">← ${t("common.back")}</button>
        <h2>${t("friends.title")}</h2>
      </div>
      <div class="tut-body">
        <section class="tut-sec">
          <h3><span class="tut-ico">➕</span>${t("friends.add")}</h3>
          <div class="fr-add">
            <input class="input" id="frq" placeholder="${t("friends.add.ph")}" maxlength="80">
            <button class="btn btn-gold" id="frAdd">${t("friends.add")}</button>
          </div>
          <div class="fr-add-msg" id="frMsg"></div>
        </section>
        <div id="frLists"><div class="pf-loading">…</div></div>
      </div>
    </div>`;
  app.root.appendChild(wrap);
  wrap.querySelector(".topright-lang")!.appendChild(langSelectEl());
  (wrap.querySelector("#back") as HTMLElement).onclick = () => app.home();

  const lists = wrap.querySelector("#frLists") as HTMLElement;
  const msg = wrap.querySelector("#frMsg") as HTMLElement;
  let dead = false;
  let listTimer = 0;
  let pollTimer = 0;
  let knownChallenges = new Set<string>();
  let challengeModalOpen = false;

  const cleanup = (): void => { dead = true; clearTimeout(listTimer); clearTimeout(pollTimer); };

  // ---- add friend ----
  const addFriend = (): void => {
    const q = (wrap.querySelector("#frq") as HTMLInputElement).value.trim();
    if (!q) return;
    msg.textContent = "…";
    api.friendRequest(q).then((r) => {
      msg.textContent = `✓ ${t("friends.add.sent")} (${r.display})`;
      (wrap.querySelector("#frq") as HTMLInputElement).value = "";
      sfx("pop");
      void refresh();
    }).catch((e) => { msg.textContent = (e as Error).message; sfx("error"); });
  };
  (wrap.querySelector("#frAdd") as HTMLElement).onclick = addFriend;
  (wrap.querySelector("#frq") as HTMLInputElement).onkeydown = (e) => { if (e.key === "Enter") addFriend(); };

  // ---- render ----
  const row = (f: FriendEntry, actions: string): string => `
    <div class="fr-row" data-id="${f.id}">
      ${avatarHtml(f.avatar, f.display, 40)}
      <span class="fr-info">
        <span class="fr-name">${esc(f.display)} ${badgeChipHtml(f.badge, true)}</span>
        <span class="fr-state ${f.online ? "on" : ""}">${f.online ? (f.state === "online" || f.state === "bot" ? t("friends.ingame") : t("friends.online")) : t("friends.offline")}</span>
      </span>
      <span class="fr-actions">${actions}</span>
    </div>`;

  const render = (d: FriendsData): void => {
    lists.innerHTML = `
      ${d.incoming.length ? `
      <section class="tut-sec">
        <h3><span class="tut-ico">📥</span>${t("friends.incoming")}</h3>
        ${d.incoming.map((f) => row(f, `
          <button class="btn btn-mini btn-gold" data-acc="${f.id}">${t("friends.accept")}</button>
          <button class="btn btn-mini btn-ghost" data-dec="${f.id}">${t("friends.decline")}</button>`)).join("")}
      </section>` : ""}
      <section class="tut-sec">
        <h3><span class="tut-ico">👥</span>${t("friends.title")} (${d.friends.length})</h3>
        ${d.friends.length === 0 ? `<p>${t("friends.empty")}</p>`
          : d.friends.map((f) => row(f, `
            <button class="btn btn-mini btn-primary" data-ch="${f.id}" data-name="${esc(f.display)}" ${f.online ? "" : "disabled"}>⚔ ${t("friends.challenge")}</button>
            <button class="btn btn-mini btn-ghost" data-pf="${f.id}">${t("friends.profile")}</button>
            <button class="btn btn-mini btn-ghost fr-x" data-rm="${f.id}">✕</button>`)).join("")}
      </section>
      ${d.outgoing.length ? `
      <section class="tut-sec">
        <h3><span class="tut-ico">📤</span>${t("friends.outgoing")}</h3>
        ${d.outgoing.map((f) => row(f, "")).join("")}
      </section>` : ""}
    `;
    lists.querySelectorAll("[data-acc]").forEach((b) => (b as HTMLElement).onclick = () => { void api.friendRespond((b as HTMLElement).dataset.acc!, true).then(() => { sfx("pop"); void refresh(); }); });
    lists.querySelectorAll("[data-dec]").forEach((b) => (b as HTMLElement).onclick = () => { void api.friendRespond((b as HTMLElement).dataset.dec!, false).then(() => void refresh()); });
    lists.querySelectorAll("[data-rm]").forEach((b) => (b as HTMLElement).onclick = async () => {
      const ok = await confirmDialog({ title: t("friends.remove"), body: t("friends.remove.confirm"), confirm: t("common.yes"), cancel: t("common.no"), danger: true });
      if (ok) void api.friendRemove((b as HTMLElement).dataset.rm!).then(() => void refresh());
    });
    lists.querySelectorAll("[data-pf]").forEach((b) => (b as HTMLElement).onclick = () => void showProfileModal((b as HTMLElement).dataset.pf!));
    lists.querySelectorAll("[data-ch]").forEach((b) => (b as HTMLElement).onclick = () => sendChallenge((b as HTMLElement).dataset.ch!, (b as HTMLElement).dataset.name!));
  };

  // ---- incoming challenge handling ----
  const maybeShowChallenge = (d: FriendsData): void => {
    const fresh = d.challenges.filter((c) => !knownChallenges.has(c.id));
    d.challenges.forEach((c) => knownChallenges.add(c.id));
    if (!fresh.length || challengeModalOpen) return;
    const c = fresh[fresh.length - 1];
    challengeModalOpen = true;
    sfx("match");
    const ov = document.createElement("div");
    ov.className = "overlay";
    ov.innerHTML = `
      <div class="modal">
        <h2>⚔ ${esc(c.from)}${t("friends.challenge.from")}</h2>
        <p>${t("friends.challenge.body")}</p>
        <div class="modal-row">
          <button class="btn btn-ghost" id="chNo">${t("friends.decline")}</button>
          <button class="btn btn-gold" id="chYes">${t("friends.accept")}</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    const close = (): void => { ov.remove(); challengeModalOpen = false; };
    (ov.querySelector("#chNo") as HTMLElement).onclick = () => { void api.challengeRespond(c.id, false).catch(() => null); close(); };
    (ov.querySelector("#chYes") as HTMLElement).onclick = () => {
      void api.challengeRespond(c.id, true).then((r) => {
        close();
        if (r.roomId) { cleanup(); sfx("match"); app.onlineGame(r.roomId, (r.you ?? 1) as 0 | 1, r.oppName ?? "?"); }
      }).catch(() => { close(); sfx("error"); void refresh(); });
    };
  };

  // ---- outgoing challenge ----
  const sendChallenge = (uid: string, name: string): void => {
    api.challenge(uid).then(({ id }) => {
      sfx("pop");
      const ov = document.createElement("div");
      ov.className = "overlay";
      ov.innerHTML = `
        <div class="modal">
          <h2>⚔ ${esc(name)}</h2>
          <p class="fr-wait"><span class="spinner"></span> ${t("friends.challenge.waiting")}</p>
          <div class="modal-row"><button class="btn btn-ghost btn-block" id="chCancel">${t("common.cancel")}</button></div>
        </div>`;
      document.body.appendChild(ov);
      let stopped = false;
      const stop = (note?: string): void => {
        stopped = true;
        clearTimeout(pollTimer);
        ov.remove();
        if (note) { msg.textContent = note; sfx("error"); }
      };
      (ov.querySelector("#chCancel") as HTMLElement).onclick = () => { void api.challengeCancel(id); stop(); };
      const poll = (): void => {
        if (stopped || dead) return;
        api.challengePoll(id).then((r) => {
          if (stopped || dead) return;
          if (r.status === "accepted" && r.roomId) {
            stopped = true; ov.remove(); cleanup(); sfx("match");
            app.onlineGame(r.roomId, (r.you ?? 0) as 0 | 1, r.oppName ?? name);
          } else if (r.status === "declined") stop(t("friends.challenge.declined"));
          else if (r.status === "expired" || r.status === "cancelled") stop(t("friends.challenge.expired"));
          else pollTimer = window.setTimeout(poll, POLL_CHALLENGE_MS);
        }).catch(() => { pollTimer = window.setTimeout(poll, POLL_CHALLENGE_MS); });
      };
      pollTimer = window.setTimeout(poll, POLL_CHALLENGE_MS);
    }).catch((e) => { msg.textContent = (e as Error).message; sfx("error"); });
  };

  // ---- list refresh loop ----
  const refresh = async (): Promise<void> => {
    if (dead) return;
    try {
      const d = await api.friends();
      if (dead) return;
      render(d);
      maybeShowChallenge(d);
    } catch { /* transient */ }
    clearTimeout(listTimer);
    listTimer = window.setTimeout(() => void refresh(), POLL_LIST_MS);
  };
  void refresh();

  const unsub = onLangChange(() => app.friends());
  return { destroy: () => { cleanup(); unsub(); } };
}

/** Lightweight home-screen watcher: surfaces incoming challenges + pending requests. */
export function watchSocial(app: App, onBadge: (pendingCount: number) => void): () => void {
  let stop = false;
  let timer = 0;
  const known = new Set<string>();
  let modalOpen = false;
  const tick = async (): Promise<void> => {
    if (stop) return;
    try {
      const d = await api.friends();
      if (stop) return;
      onBadge(d.incoming.length);
      const fresh = d.challenges.filter((c) => !known.has(c.id));
      d.challenges.forEach((c) => known.add(c.id));
      if (fresh.length && !modalOpen) {
        const c = fresh[fresh.length - 1];
        modalOpen = true;
        sfx("match");
        const ov = document.createElement("div");
        ov.className = "overlay";
        ov.innerHTML = `
          <div class="modal">
            <h2>⚔ ${esc(c.from)}${t("friends.challenge.from")}</h2>
            <p>${t("friends.challenge.body")}</p>
            <div class="modal-row">
              <button class="btn btn-ghost" id="wchNo">${t("friends.decline")}</button>
              <button class="btn btn-gold" id="wchYes">${t("friends.accept")}</button>
            </div>
          </div>`;
        document.body.appendChild(ov);
        (ov.querySelector("#wchNo") as HTMLElement).onclick = () => { void api.challengeRespond(c.id, false).catch(() => null); ov.remove(); modalOpen = false; };
        (ov.querySelector("#wchYes") as HTMLElement).onclick = () => {
          void api.challengeRespond(c.id, true).then((r) => {
            ov.remove(); modalOpen = false;
            if (r.roomId) { stop = true; clearTimeout(timer); sfx("match"); app.onlineGame(r.roomId, (r.you ?? 1) as 0 | 1, r.oppName ?? "?"); }
          }).catch(() => { ov.remove(); modalOpen = false; });
        };
      }
    } catch { /* transient */ }
    if (!stop) timer = window.setTimeout(() => void tick(), 8000);
  };
  timer = window.setTimeout(() => void tick(), 1200);
  return () => { stop = true; clearTimeout(timer); };
}
