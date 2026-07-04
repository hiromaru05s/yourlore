// ============================================================
// LORE — profile screen: rename, preset avatar, badge equip,
// record + recent matches. Also renders OTHER players' profiles
// (read-only; honors their stats_public setting).
// ============================================================
import type { App, Screen } from "../router";
import { api, type Profile } from "../net/api";
import { t, onLangChange } from "../i18n";
import { langSelectEl } from "../ui/langSelect";
import { tierChipHtml } from "../ui/tier";
import { avatarHtml, avatarPresets, BADGE_META, badgeChipHtml } from "../ui/social";
import { sfx } from "../ui/sound";

function esc(s: string): string { return s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]!)); }

function fmtDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export function mountProfile(app: App, userId?: string): Screen {
  const wrap = document.createElement("div");
  wrap.className = "screen tut-screen";
  wrap.innerHTML = `
    <div class="topright-lang"></div>
    <div class="tut">
      <div class="tut-head">
        <button class="btn btn-ghost" id="back">← ${t("common.back")}</button>
        <h2>${t("profile.title")}</h2>
      </div>
      <div class="tut-body" id="pbody"><div class="pf-loading">…</div></div>
    </div>`;
  app.root.appendChild(wrap);
  wrap.querySelector(".topright-lang")!.appendChild(langSelectEl());
  (wrap.querySelector("#back") as HTMLElement).onclick = () => app.home();

  const body = wrap.querySelector("#pbody") as HTMLElement;
  let dead = false;

  const load = async (): Promise<void> => {
    let p: Profile;
    try { p = await api.profile(userId); } catch { body.innerHTML = `<div class="pf-loading">${t("login.err.generic")}</div>`; return; }
    if (dead) return;
    render(p);
  };

  const render = (p: Profile): void => {
    const total = (p.wins ?? 0) + (p.losses ?? 0);
    const rate = total ? Math.round(((p.wins ?? 0) / total) * 100) : 0;
    const modeLabel = (m: string) => m === "ranked" ? t("mode.ranked") : m === "bot" ? t("mode.bot") : t("mode.online");
    const resLabel = (r: string) => r === "win" ? t("modal.win") : r === "draw" ? t("modal.draw") : t("modal.lose");

    body.innerHTML = `
      <section class="tut-sec pf-card">
        <div class="pf-head">
          <button class="pf-ava" id="avaBtn" ${p.self ? "" : "disabled"}>${avatarHtml(p.avatar, p.display, 72)}${p.self ? '<span class="pf-ava-edit">✎</span>' : ""}</button>
          <div class="pf-id">
            <div class="pf-name-row">
              <span class="pf-name" id="pfName">${esc(p.display)}</span>
              ${p.self ? `<button class="btn btn-ghost btn-mini" id="renameBtn">✎ ${t("profile.rename")}</button>` : ""}
            </div>
            <div class="pf-badge-row">${badgeChipHtml(p.badge) || `<span class="pf-nobadge">${t("profile.badge.none")}</span>`}</div>
            <div class="pf-joined">${t("home.record")}${p.private ? "" : ` ${p.wins ?? 0}${t("home.win")} ${p.losses ?? 0}${t("home.loss")}`} · ${fmtDate(p.created_at)}~</div>
          </div>
        </div>
        <div class="pf-rename" id="renameRow" style="display:none">
          <input class="input" id="renameInput" maxlength="24" placeholder="${t("profile.rename.ph")}">
          <button class="btn btn-gold" id="renameSave">${t("common.confirm")}</button>
        </div>
      </section>
      ${p.private ? `<section class="tut-sec"><p>${t("profile.private")}</p></section>` : `
      <section class="tut-sec">
        <h3><span class="tut-ico">📊</span>${t("profile.stats")}</h3>
        <div class="pf-stats">
          <div class="pf-stat"><b>${p.wins ?? 0}</b><span>${t("home.win")}</span></div>
          <div class="pf-stat"><b>${p.losses ?? 0}</b><span>${t("home.loss")}</span></div>
          <div class="pf-stat"><b>${rate}%</b><span>${t("profile.winrate")}</span></div>
          <div class="pf-stat pf-stat-tier">${p.tier ? tierChipHtml(p.tier, p.mmr ?? undefined) : "—"}</div>
        </div>
      </section>
      ${p.self ? `
      <section class="tut-sec">
        <h3><span class="tut-ico">🎖️</span>${t("profile.badge")}</h3>
        <div class="pf-badges" id="badgeGrid"></div>
      </section>` : ""}
      <section class="tut-sec">
        <h3><span class="tut-ico">🕘</span>${t("profile.recent")}</h3>
        ${!p.recent?.length ? `<p>${t("profile.recent.empty")}</p>` : `
        <div class="pf-matches">
          ${p.recent.map((m) => `
            <div class="pf-match pf-${m.result}">
              <span class="pf-m-res">${resLabel(m.result)}</span>
              <span class="pf-m-opp">vs ${esc(m.opp)}</span>
              <span class="pf-m-meta">${modeLabel(m.mode)}${m.turns ? ` · ${m.turns}${t("profile.turns")}` : ""} · ${fmtDate(m.at)}</span>
            </div>`).join("")}
        </div>`}
      </section>`}
    `;

    if (!p.self) return;

    // ---- rename ----
    const renameRow = body.querySelector("#renameRow") as HTMLElement;
    (body.querySelector("#renameBtn") as HTMLElement | null)?.addEventListener("click", () => {
      renameRow.style.display = renameRow.style.display === "none" ? "flex" : "none";
      (body.querySelector("#renameInput") as HTMLInputElement).value = p.display;
      (body.querySelector("#renameInput") as HTMLInputElement).focus();
    });
    (body.querySelector("#renameSave") as HTMLElement | null)?.addEventListener("click", () => {
      const v = (body.querySelector("#renameInput") as HTMLInputElement).value.trim();
      if (v.length < 2) return;
      void api.updateMe({ display: v }).then((r) => {
        if (app.user) { app.user.display = r.display; }
        sfx("pop");
        void load();
      }).catch((e) => alert((e as Error).message));
    });

    // ---- avatar picker ----
    (body.querySelector("#avaBtn") as HTMLElement | null)?.addEventListener("click", () => openAvatarPicker(p));

    // ---- badges ----
    const grid = body.querySelector("#badgeGrid") as HTMLElement | null;
    if (grid) {
      const owned = new Set(p.badges ?? []);
      const all = Object.keys(BADGE_META);
      grid.innerHTML = all.map((key) => {
        const has = owned.has(key);
        const equipped = p.badge === key;
        return `
          <div class="pf-badge ${has ? "" : "locked"} ${equipped ? "equipped" : ""}" data-key="${key}">
            ${badgeChipHtml(key)}
            ${has
              ? `<button class="btn btn-mini ${equipped ? "btn-ghost" : "btn-gold"}" data-eq="${key}">${equipped ? t("profile.badge.unequip") : t("profile.badge.equip")}</button>`
              : `<span class="pf-badge-lock">🔒 ${t("profile.badge.locked")}</span>`}
          </div>`;
      }).join("");
      grid.querySelectorAll("[data-eq]").forEach((btn) => {
        (btn as HTMLElement).onclick = () => {
          const key = (btn as HTMLElement).dataset.eq!;
          const next = p.badge === key ? "" : key;
          void api.updateMe({ badge: next }).then(() => {
            if (app.user) app.user.badge = next || null;
            sfx("pop");
            void load();
          }).catch((e) => alert((e as Error).message));
        };
      });
    }
  };

  const openAvatarPicker = (p: Profile): void => {
    const ov = document.createElement("div");
    ov.className = "overlay";
    const ids = avatarPresets();
    ov.innerHTML = `
      <div class="modal ava-modal">
        <h2>${t("profile.avatar.pick")}</h2>
        <div class="ava-grid">
          ${ids.map((id) => `<button class="ava-opt ${p.avatar === id ? "sel" : ""}" data-id="${id}">${avatarHtml(id, "", 56)}</button>`).join("")}
        </div>
        <div class="modal-row"><button class="btn btn-ghost btn-block" id="avaClose">${t("common.cancel")}</button></div>
      </div>`;
    document.body.appendChild(ov);
    ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
    (ov.querySelector("#avaClose") as HTMLElement).onclick = () => ov.remove();
    ov.querySelectorAll(".ava-opt").forEach((b) => {
      (b as HTMLElement).onclick = () => {
        const id = (b as HTMLElement).dataset.id!;
        void api.updateMe({ avatar: id }).then(() => {
          if (app.user) app.user.avatar = id;
          sfx("pop");
          ov.remove();
          void load();
        }).catch((e) => alert((e as Error).message));
      };
    });
  };

  void load();
  const unsub = onLangChange(() => { void load(); });
  return { destroy: () => { dead = true; unsub(); } };
}

/** Read-only profile popup (used from the friends list). */
export async function showProfileModal(userId: string): Promise<void> {
  let p: Profile;
  try { p = await api.profile(userId); } catch { return; }
  const total = (p.wins ?? 0) + (p.losses ?? 0);
  const rate = total ? Math.round(((p.wins ?? 0) / total) * 100) : 0;
  const ov = document.createElement("div");
  ov.className = "overlay";
  ov.innerHTML = `
    <div class="modal pf-mini-modal">
      <div class="pf-head">
        ${avatarHtml(p.avatar, p.display, 64)}
        <div class="pf-id">
          <div class="pf-name">${esc(p.display)}</div>
          <div class="pf-badge-row">${badgeChipHtml(p.badge, true) || ""}</div>
        </div>
      </div>
      ${p.private
        ? `<p style="margin-top:10px">${t("profile.private")}</p>`
        : `<div class="pf-stats" style="margin-top:12px">
            <div class="pf-stat"><b>${p.wins ?? 0}</b><span>${t("home.win")}</span></div>
            <div class="pf-stat"><b>${p.losses ?? 0}</b><span>${t("home.loss")}</span></div>
            <div class="pf-stat"><b>${rate}%</b><span>${t("profile.winrate")}</span></div>
            <div class="pf-stat pf-stat-tier">${p.tier ? tierChipHtml(p.tier, p.mmr ?? undefined) : "—"}</div>
          </div>`}
      <div class="modal-row"><button class="btn btn-ghost btn-block" id="pfClose">${t("common.confirm")}</button></div>
    </div>`;
  document.body.appendChild(ov);
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  (ov.querySelector("#pfClose") as HTMLElement).onclick = () => ov.remove();
}
