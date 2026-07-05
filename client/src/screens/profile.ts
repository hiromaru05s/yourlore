// ============================================================
// LORE — profile screen. For the signed-in user it's TABBED:
//   · 프로필  — avatar / rename / badges / record / recent matches
//   · 슬리브  — equip owned card sleeves (buy more in the Shop)
//   · 설정    — SFX volume / privacy / coupon / billing / language / logout
// Viewing ANOTHER player's profile shows the overview only (read-only,
// honoring their stats_public setting).
// ============================================================
import type { App, Screen } from "../router";
import { api, type Profile } from "../net/api";
import { t, onLangChange, getLang, setLang, type Lang } from "../i18n";
import { tierChipHtml } from "../ui/tier";
import { avatarHtml, avatarPresets, BADGE_META, badgeChipHtml } from "../ui/social";
import { SLEEVE_LIST, sleeveUrl, SLEEVES } from "../shared/cards";
import { getSfxVolume, setSfxVolume, sfx } from "../ui/sound";

function esc(s: string): string { return s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]!)); }

function fmtDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function sleeveName(id: string): string {
  const s = SLEEVES[id]; if (!s) return id;
  const lang = getLang();
  return lang === "ja" ? s.ja : lang === "en" ? s.en : s.ko;
}

export type ProfileTab = "overview" | "sleeves" | "settings";
type Tab = ProfileTab;

export function mountProfile(app: App, userId?: string, initialTab?: ProfileTab): Screen {
  const wrap = document.createElement("div");
  wrap.className = "screen tut-screen";
  app.root.appendChild(wrap);

  let dead = false;
  let cached: Profile | null = null;
  let tab: Tab = initialTab ?? "overview";

  const isSelf = (): boolean => !!cached?.self;

  // ---- shell (head + optional tab bar + body) ----
  const build = (): void => {
    wrap.innerHTML = `
      <div class="tut">
        <div class="tut-head">
          <button class="btn btn-ghost" id="back">← ${t("common.back")}</button>
          <h2>${t("profile.title")}</h2>
        </div>
        ${isSelf() ? `
        <div class="pf-tabs">
          <button class="pf-tab ${tab === "overview" ? "is-active" : ""}" data-tab="overview">${t("profile.tab.overview")}</button>
          <button class="pf-tab ${tab === "sleeves" ? "is-active" : ""}" data-tab="sleeves">🃏 ${t("profile.tab.sleeves")}</button>
          <button class="pf-tab ${tab === "settings" ? "is-active" : ""}" data-tab="settings">⚙ ${t("profile.tab.settings")}</button>
        </div>` : ""}
        <div class="tut-body" id="pbody"><div class="pf-loading">…</div></div>
      </div>`;
    (wrap.querySelector("#back") as HTMLElement).onclick = () => app.home();
    wrap.querySelectorAll(".pf-tab").forEach((b) => {
      (b as HTMLElement).onclick = () => {
        const next = (b as HTMLElement).dataset.tab as Tab;
        if (next === tab) return;
        tab = next; sfx("pop"); build(); renderTab();
      };
    });
  };

  const body = (): HTMLElement => wrap.querySelector("#pbody") as HTMLElement;

  const load = async (): Promise<void> => {
    let p: Profile;
    try { p = await api.profile(userId); } catch { body().innerHTML = `<div class="pf-loading">${t("login.err.generic")}</div>`; return; }
    if (dead) return;
    cached = p;
    build();      // rebuild so the tab bar appears once we know self/other
    renderTab();
  };

  const renderTab = (): void => {
    if (!cached) return;
    if (!cached.self || tab === "overview") renderOverview(cached);
    else if (tab === "sleeves") renderSleeves(cached);
    else renderSettings(cached);
  };

  // ============================================================
  // TAB: overview
  // ============================================================
  const renderOverview = (p: Profile): void => {
    const total = (p.wins ?? 0) + (p.losses ?? 0);
    const rate = total ? Math.round(((p.wins ?? 0) / total) * 100) : 0;
    const modeLabel = (m: string) => m === "ranked" ? t("mode.ranked") : m === "bot" ? t("mode.bot") : t("mode.online");
    const resLabel = (r: string) => r === "win" ? t("modal.win") : r === "draw" ? t("modal.draw") : t("modal.lose");

    body().innerHTML = `
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
    const renameRow = body().querySelector("#renameRow") as HTMLElement;
    (body().querySelector("#renameBtn") as HTMLElement | null)?.addEventListener("click", () => {
      renameRow.style.display = renameRow.style.display === "none" ? "flex" : "none";
      (body().querySelector("#renameInput") as HTMLInputElement).value = p.display;
      (body().querySelector("#renameInput") as HTMLInputElement).focus();
    });
    (body().querySelector("#renameSave") as HTMLElement | null)?.addEventListener("click", () => {
      const v = (body().querySelector("#renameInput") as HTMLInputElement).value.trim();
      if (v.length < 2) return;
      void api.updateMe({ display: v }).then((r) => {
        if (app.user) { app.user.display = r.display; }
        sfx("pop");
        void load();
      }).catch((e) => alert((e as Error).message));
    });

    // ---- avatar picker ----
    (body().querySelector("#avaBtn") as HTMLElement | null)?.addEventListener("click", () => openAvatarPicker(p));

    // ---- badges ----
    const grid = body().querySelector("#badgeGrid") as HTMLElement | null;
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

  // ============================================================
  // TAB: sleeves
  // ============================================================
  const renderSleeves = (p: Profile): void => {
    const owned = new Set(p.sleeves ?? ["default"]);
    const equipped = p.sleeve ?? "default";
    body().innerHTML = `
      <section class="tut-sec sl-current">
        <h3><span class="tut-ico">🃏</span>${t("sleeve.current")}</h3>
        <div class="sl-current-row">
          <div class="sl-preview sl-preview-lg" style="background-image:url(${sleeveUrl(equipped)})"></div>
          <div class="sl-current-meta">
            <div class="sl-current-name">${sleeveName(equipped)}</div>
            <div class="sl-current-tag">✓ ${t("sleeve.equipped")}</div>
          </div>
        </div>
      </section>
      <section class="tut-sec">
        <h3><span class="tut-ico">🎴</span>${t("sleeve.title")}</h3>
        <div class="sl-grid">
          ${SLEEVE_LIST.map((s) => {
            const has = owned.has(s.id);
            const eq = s.id === equipped;
            return `
              <div class="sl-tile ${eq ? "is-eq" : ""} ${has ? "" : "is-locked"}">
                <div class="sl-preview" style="background-image:url(${s.url})">${has ? "" : `<span class="sl-lock">🔒</span>`}</div>
                <div class="sl-name">${sleeveName(s.id)}</div>
                ${eq
                  ? `<button class="btn btn-mini btn-ghost" disabled>${t("sleeve.equipped")}</button>`
                  : has
                    ? `<button class="btn btn-mini btn-gold" data-eq="${s.id}">${t("sleeve.equip")}</button>`
                    : `<span class="sl-price">💎 ${s.price}</span>`}
              </div>`;
          }).join("")}
        </div>
        <a class="sl-getmore" id="toShop">${t("sleeve.getmore")}</a>
      </section>`;

    body().querySelectorAll("[data-eq]").forEach((btn) => {
      (btn as HTMLElement).onclick = () => {
        const id = (btn as HTMLElement).dataset.eq!;
        void api.updateMe({ sleeve: id }).then((r) => {
          if (app.user) app.user.sleeve = r.sleeve;
          if (cached) cached.sleeve = r.sleeve;
          sfx("pop");
          renderSleeves(cached!);
        }).catch((e) => alert((e as Error).message));
      };
    });
    (body().querySelector("#toShop") as HTMLElement).onclick = () => app.shop();
  };

  // ============================================================
  // TAB: settings
  // ============================================================
  const renderSettings = (p: Profile): void => {
    const credits = p.credits ?? app.user?.credits ?? 0;
    body().innerHTML = `
      <section class="tut-sec">
        <h3><span class="tut-ico">🔊</span>${t("settings.sound")}</h3>
        <div class="set-row">
          <label class="set-label" for="vol">${t("settings.sound.volume")}</label>
          <input type="range" id="vol" min="0" max="100" step="5" value="${Math.round(getSfxVolume() * 100)}">
          <span class="set-val" id="volVal">${Math.round(getSfxVolume() * 100)}%</span>
          <button class="btn btn-mini btn-ghost" id="volTest">${t("settings.sound.test")}</button>
        </div>
      </section>
      <section class="tut-sec">
        <h3><span class="tut-ico">🌐</span>${t("settings.language")}</h3>
        <div class="set-row">
          <label class="set-label">${t("settings.language")}</label>
          <div class="lang-select"><select id="langSel">
            <option value="ko"${getLang() === "ko" ? " selected" : ""}>한국어</option>
            <option value="ja"${getLang() === "ja" ? " selected" : ""}>日本語</option>
            <option value="en"${getLang() === "en" ? " selected" : ""}>English</option>
          </select></div>
        </div>
        <p class="set-desc">${t("settings.language.desc")}</p>
      </section>
      <section class="tut-sec">
        <h3><span class="tut-ico">👁️</span>${t("settings.privacy")}</h3>
        <div class="set-row">
          <label class="set-label">${t("settings.privacy.public")}</label>
          <label class="switch"><input type="checkbox" id="pub" ${p.stats_public !== false ? "checked" : ""}><span class="slider"></span></label>
        </div>
        <p class="set-desc">${t("settings.privacy.desc")}</p>
      </section>
      <section class="tut-sec">
        <h3><span class="tut-ico">🎟️</span>${t("settings.coupon")}</h3>
        <div class="set-row fr-add">
          <input class="input" id="coupon" placeholder="${t("settings.coupon.ph")}" maxlength="32" style="text-transform:uppercase">
          <button class="btn btn-gold" id="couponGo">${t("settings.coupon.apply")}</button>
        </div>
        <div class="fr-add-msg" id="couponMsg"></div>
      </section>
      <section class="tut-sec">
        <h3><span class="tut-ico">💳</span>${t("settings.billing")}</h3>
        <div class="set-row"><span class="set-label">${t("settings.billing.credits")}</span><span class="set-val">💎 <b id="credits">${credits}</b></span></div>
        <div class="set-row"><span class="set-label">${t("settings.billing.sub")}</span><span class="set-val">${t("settings.billing.none")}</span></div>
        <div class="bill-plan">
          <div class="bill-plan-name">LORE PREMIUM</div>
          <div class="bill-plan-desc">${t("settings.billing.plan")}</div>
          <button class="btn btn-primary btn-block" disabled>${t("settings.billing.soon")}</button>
        </div>
      </section>
      <section class="tut-sec">
        <h3><span class="tut-ico">👤</span>${t("settings.account")}</h3>
        <div class="set-row"><span class="set-label">${p.self ? esc(p.display) : ""}</span>
          <button class="btn btn-ghost" id="logout">${t("home.logout")}</button>
        </div>
      </section>`;

    // volume
    const vol = body().querySelector("#vol") as HTMLInputElement;
    const volVal = body().querySelector("#volVal") as HTMLElement;
    vol.oninput = () => { setSfxVolume(Number(vol.value) / 100); volVal.textContent = `${vol.value}%`; };
    vol.onchange = () => sfx("coin");
    (body().querySelector("#volTest") as HTMLElement).onclick = () => sfx("impact");

    // language (persists to this device; re-renders the whole screen via onLangChange)
    (body().querySelector("#langSel") as HTMLSelectElement).onchange = (e) => setLang((e.target as HTMLSelectElement).value as Lang);

    // privacy
    const pub = body().querySelector("#pub") as HTMLInputElement;
    pub.onchange = () => {
      void api.updateMe({ stats_public: pub.checked }).then(() => { if (cached) cached.stats_public = pub.checked; sfx("pop"); })
        .catch(() => { pub.checked = !pub.checked; sfx("error"); });
    };

    // coupon
    const couponMsg = body().querySelector("#couponMsg") as HTMLElement;
    const redeem = (): void => {
      const code = (body().querySelector("#coupon") as HTMLInputElement).value.trim();
      if (!code) return;
      couponMsg.textContent = "…";
      api.redeemCoupon(code).then((r) => {
        couponMsg.textContent = `✓ ${t("settings.coupon.ok")} +${r.amount} 💎`;
        (body().querySelector("#credits") as HTMLElement).textContent = String(r.credits);
        if (app.user) app.user.credits = r.credits;
        if (cached) cached.credits = r.credits;
        (body().querySelector("#coupon") as HTMLInputElement).value = "";
        sfx("coin");
      }).catch((e) => { couponMsg.textContent = (e as Error).message; sfx("error"); });
    };
    (body().querySelector("#couponGo") as HTMLElement).onclick = redeem;
    (body().querySelector("#coupon") as HTMLInputElement).onkeydown = (e) => { if (e.key === "Enter") redeem(); };

    // logout
    (body().querySelector("#logout") as HTMLElement).onclick = () => {
      if (confirm(t("settings.logout.confirm"))) void app.logout();
    };
  };

  // ---- avatar picker (shared) ----
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

  build();
  void load();
  const unsub = onLangChange(() => { build(); renderTab(); });
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
