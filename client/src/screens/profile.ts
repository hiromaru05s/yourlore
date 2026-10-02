import {renderQuality,setRenderQuality} from '../ui/renderDensity';
import { homeIcon } from "../ui/homeIcons";
import { loungeText } from "../ui/loungeText";
import { confirmDialog } from "../ui/modal";
// ============================================================
// LORE — profile screen. For the signed-in user it's TABBED:
//   · 프로필  — avatar / rename / badges / record / recent matches
//   · 설정    — SFX volume / privacy / coupon / billing / language / logout
// Viewing ANOTHER player's profile shows the overview only (read-only,
// honoring their stats_public setting).
// ============================================================
import type { App, Screen } from "../router";
import { api, type Profile } from "../net/api";
import { t, onLangChange, getLang, setLang, type Lang } from "../i18n";
import { tierChipHtml } from "../ui/tier";
import { avatarHtml, avatarPresets } from "../ui/social";
import { getSfxVolume, setSfxVolume, sfx } from "../ui/sound";

function esc(s: string): string { return s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]!)); }

function fmtDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export type ProfileTab = "overview" | "h2h" | "settings";
type Tab = ProfileTab;
type RecFilter = "ranked" | "online" | "bot";

export function mountProfile(app: App, userId?: string, initialTab?: ProfileTab): Screen {
  const wrap = document.createElement("div");
  wrap.className = "screen tut-screen";
  app.root.appendChild(wrap);

  let dead = false;
  let cached: Profile | null = null;
  let tab: Tab = initialTab ?? "overview";
  let recFilter: RecFilter = "ranked";

  const isSelf = (): boolean => !!cached?.self;

  // ---- shell (head + optional tab bar + body) ----
  const build = (): void => {
    wrap.dataset.profileTab = tab;
    wrap.innerHTML = `
      <div class="tut">
        <div class="tut-head">
          <button class="btn btn-ghost" id="back">← ${t("common.back")}</button>
          <div class="support-heading"><span class="menu-eyebrow">${tab === "settings" ? "PREFERENCES" : "SEEKER PROFILE"}</span><h2>${t(tab === "settings" ? "home.settings" : "profile.title")}</h2><p class="menu-subtitle">${tab === "settings" ? loungeText("音・言語・公開範囲を、あなたに合わせて。", "Make LORE your own.", "소리, 언어, 공개 범위를 설정하세요.") : loungeText("デュエルの記録と、シーカーの現在地。", "Your duels, your progress.", "듀얼 기록과 시커의 현재 위치.")}</p></div>
        </div>
        ${isSelf() ? `
        <div class="pf-tabs">
          <button class="pf-tab ${tab === "overview" ? "is-active" : ""}" data-tab="overview" aria-pressed="${tab === "overview"}">${homeIcon("profile")} ${t("profile.tab.overview")}</button>
          <button class="pf-tab ${tab === "h2h" ? "is-active" : ""}" data-tab="h2h" aria-pressed="${tab === "h2h"}">${homeIcon("duel")} ${t("profile.tab.h2h")}</button>
          <button class="pf-tab ${tab === "settings" ? "is-active" : ""}" data-tab="settings" aria-pressed="${tab === "settings"}">${homeIcon("settings")} ${t("profile.tab.settings")}</button>
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
    try { p = await api.profile(userId); } catch { if (dead) return; body().innerHTML = `<div class="pf-loading">${t("login.err.generic")}</div>`; return; }
    if (dead) return;
    cached = p;
    build();      // rebuild so the tab bar appears once we know self/other
    renderTab();
  };

  const renderTab = (): void => {
    body().classList.toggle("pf-overview", tab === "overview");
    if (!cached) return;
    if (!cached.self || tab === "overview") renderOverview(cached);
    else if (tab === "h2h") renderH2H(cached);
    else renderSettings(cached);
  };

  // ============================================================
  // TAB: overview
  // ============================================================
  const renderOverview = (p: Profile): void => {
    const modeLabel = (m: string) => m === "ranked" ? t("mode.ranked") : m === "bot" ? t("mode.bot") : t("mode.online");
    const resLabel = (r: string) => r === "win" ? t("modal.win") : r === "draw" ? t("modal.draw") : t("modal.lose");
    // Never substitute mixed lifetime totals for a selected match mode.
    const cur = p.byMode?.[recFilter] ?? {w:0,l:0};
    const totalG = cur.w + cur.l;
    const rate = totalG ? Math.round((cur.w / totalG) * 100) : 0;
    const showTier = recFilter === "ranked";
    const recent = (p.recent ?? []).filter((m) => m.mode === recFilter);
    const filterOpts: RecFilter[] = ["ranked", "online", "bot"];

    body().innerHTML = `
      <section class="tut-sec pf-card">
        <div class="pf-head">
          <button class="pf-ava" id="avaBtn" ${p.self ? "" : "disabled"}>${avatarHtml(p.avatar, p.display, 72)}${p.self ? `<span class="pf-ava-edit">${homeIcon("edit")}</span>` : ""}</button>
          <div class="pf-id">
            <div class="pf-name-row">
              <span class="pf-name" id="pfName">${esc(p.display)}</span>
              ${p.self ? `<button class="btn btn-ghost btn-mini" id="renameBtn">${homeIcon("edit")} ${t("profile.rename")}</button>` : ""}
            </div>
            <div class="pf-joined">${t("home.record")}${p.private ? "" : ` ${modeLabel(recFilter)} · ${cur.w}${t("home.win")} ${cur.l}${t("home.loss")}`} · ${fmtDate(p.created_at)}~</div>
          </div>
        </div>
        <div class="pf-rename" id="renameRow" style="display:none">
          <input class="input" id="renameInput" maxlength="24" placeholder="${t("profile.rename.ph")}">
          <button class="btn btn-gold" id="renameSave">${t("common.confirm")}</button>
        </div>
      </section>
      ${p.private ? `<section class="tut-sec"><p>${t("profile.private")}</p></section>` : `
      <section class="tut-sec">
        <div class="pf-stats-head">
          <h3><span class="tut-ico">${homeIcon("trophy")}</span>${t("profile.stats")}</h3>
          <div class="lang-select pf-filter"><select id="modeFilter" aria-label="${t("profile.stats")}">
            ${filterOpts.map((f) => `<option value="${f}"${recFilter === f ? " selected" : ""}>${t(`profile.filter.${f}`)}</option>`).join("")}
          </select></div>
        </div>
        <div class="pf-stats">
          <div class="pf-stat"><b>${cur.w}</b><span>${t("home.win")}</span></div>
          <div class="pf-stat"><b>${cur.l}</b><span>${t("home.loss")}</span></div>
          <div class="pf-stat"><b>${rate}%</b><span>${t("profile.winrate")}</span></div>
          <div class="pf-stat pf-stat-tier">${showTier && p.tier ? tierChipHtml(p.tier, p.mmr ?? undefined) : "—"}</div>
        </div>
      </section>
      <section class="tut-sec">
        <h3><span class="tut-ico">${homeIcon("history")}</span>${t("profile.recent")}</h3>
        ${!recent.length ? `<p>${t("profile.recent.empty")}</p>` : `
        <div class="pf-matches">
          ${recent.map((m) => `
            <div class="pf-match pf-${m.result}">
              <span class="pf-m-res">${resLabel(m.result)}</span>
              <span class="pf-m-opp">vs ${esc(m.opp)}</span>
              <span class="pf-m-meta">${modeLabel(m.mode)}${m.turns ? ` · ${m.turns}${t("profile.turns")}` : ""} · ${fmtDate(m.at)}</span>
            </div>`).join("")}
        </div>`}
      </section>`}
    `;

    // Mode filter: re-render the overview with the chosen mode
    (body().querySelector("#modeFilter") as HTMLSelectElement | null)?.addEventListener("change", (e) => {
      recFilter = (e.target as HTMLSelectElement).value as RecFilter;
      renderOverview(p);
    });

    if (!p.self) return;

    // ---- rename ----
    (body().querySelector("#renameBtn") as HTMLElement | null)?.addEventListener("click", () => {
      const ov=document.createElement("div");ov.className="overlay";
      ov.innerHTML=`<div class="modal"><h2>${t("profile.rename")}</h2><label class="field-label" for="renameInput">${t("profile.rename.ph")}</label><input class="input" id="renameInput" maxlength="24" value="${esc(p.display)}"><div id="renameCount" class="set-desc"></div><p id="renameError" role="status"></p><div class="modal-row"><button class="btn btn-ghost" id="renameCancel">${t("common.cancel")}</button><button class="btn btn-gold" id="renameSave">${t("common.confirm")}</button></div></div>`;
      document.body.append(ov);const input=ov.querySelector<HTMLInputElement>("#renameInput")!,save=ov.querySelector<HTMLButtonElement>("#renameSave")!;
      const update=()=>{ov.querySelector("#renameCount")!.textContent=`${input.value.length} / 24`;save.disabled=input.value.trim().length<2;};update();input.oninput=update;
      ov.querySelector<HTMLButtonElement>("#renameCancel")!.onclick=()=>ov.remove();
      save.onclick=async()=>{save.disabled=true;try{const r=await api.updateMe({display:input.value.trim()});if(app.user)app.user.display=r.display;ov.remove();document.dispatchEvent(new Event("lore:user"));if(!dead)void load();}catch(e){ov.querySelector("#renameError")!.textContent=(e as Error).message;save.disabled=false;}};
    });

    // ---- avatar picker ----
    (body().querySelector("#avaBtn") as HTMLElement | null)?.addEventListener("click", () => openAvatarPicker(p));
  };

  // ============================================================
  // TAB: head-to-head (self only)
  // ============================================================
  const renderH2H = (p: Profile): void => {
    const rows = p.h2h ?? [];
    body().innerHTML = `
      <section class="tut-sec">
        <h3><span class="tut-ico">${homeIcon("duel")}</span>${t("profile.h2h.title")}</h3><p class="set-desc">${loungeText("2回以上対戦した相手を表示します。", "Opponents you have played at least twice.", "2번 이상 대전한 상대를 표시합니다.")}</p>
        ${!rows.length ? `<p>${t("profile.h2h.empty")}</p>` : `
        <div class="pf-h2h">
          ${rows.map((r) => {
            const tot = r.wins + r.losses;
            const rate = tot ? Math.round((r.wins / tot) * 100) : 0;
            return `
              <div class="h2h-row" data-id="${r.oppId}">
                <span class="h2h-opp">${esc(r.oppName || "?")}</span>
                <span class="h2h-rec"><b class="h2h-w">${r.wins}</b>−<b class="h2h-l">${r.losses}</b></span>
                <span class="h2h-rate">${rate}%</span>
                <span class="h2h-games">${r.games}${t("profile.h2h.games")}</span>
              </div>`;
          }).join("")}
        </div>`}
      </section>`;
    body().querySelectorAll(".h2h-row").forEach((el) => {
      (el as HTMLElement).onclick = () => { const id = (el as HTMLElement).dataset.id; if (id) app.profile(id); };
    });
  };

  // ============================================================
  // TAB: settings
  // ============================================================
  const renderSettings = (p: Profile): void => {
    const credits = p.credits ?? app.user?.credits ?? 0;
    body().innerHTML = `
      <section class="tut-sec">
        <h3><span class="tut-ico">${homeIcon("sound")}</span>${t("settings.sound")}</h3>
        <div class="set-row">
          <label class="set-label" for="vol">${t("settings.sound.volume")}</label>
          <input type="range" id="vol" min="0" max="100" step="5" value="${Math.round(getSfxVolume() * 100)}">
          <span class="set-val" id="volVal">${Math.round(getSfxVolume() * 100)}%</span>
          <button class="btn btn-mini btn-ghost" id="volTest">${t("settings.sound.test")}</button>
        </div>
      </section>
      <section class="tut-sec">
        <h3><span class="tut-ico">${homeIcon("language")}</span>${t("settings.language")}</h3>
        <div class="set-row">
          <label class="set-label" for="langSel">${t("settings.language")}</label>
          <div class="lang-select"><select id="langSel">
            <option value="ko"${getLang() === "ko" ? " selected" : ""}>한국어</option>
            <option value="ja"${getLang() === "ja" ? " selected" : ""}>日本語</option>
            <option value="en"${getLang() === "en" ? " selected" : ""}>English</option>
          </select></div>
        </div>
        <p class="set-desc">${t("settings.language.desc")}</p>
      </section>
      <section class="tut-sec">
        <h3><span class="tut-ico">${homeIcon("home")}</span>${t("settings.privacy")}</h3>
        <div class="set-row">
          <label class="set-label" for="pub">${t("settings.privacy.public")}</label>
          <label class="switch"><input type="checkbox" id="pub" ${p.stats_public !== false ? "checked" : ""}><span class="slider"></span></label>
        </div>
        <p class="set-desc">${t("settings.privacy.desc")}</p>
      </section>
      <section class="tut-sec">
        <h3><span class="tut-ico">${homeIcon("gift")}</span>${t("settings.coupon")}</h3>
        <div class="set-row fr-add">
          <input class="input" id="coupon" aria-label="${t("settings.coupon")}" placeholder="${t("settings.coupon.ph")}" maxlength="32" style="text-transform:uppercase">
          <button class="btn btn-gold" id="couponGo">${t("settings.coupon.apply")}</button>
        </div>
        <div class="fr-add-msg" id="couponMsg"></div>
      </section>
      <section class="tut-sec">
        <h3><span class="tut-ico">${homeIcon("shard")}</span>${t("settings.billing")}</h3>
        <div class="set-row"><span class="set-label">${t("home.shards")}</span><span class="set-val">${homeIcon("shard")} <b id="credits">${credits}</b></span></div>
        <div class="set-row"><span class="set-label">${t("settings.billing.sub")}</span><span class="set-val">${t("settings.billing.none")}</span></div>
        <div class="bill-plan">
          <div class="bill-plan-name">LORE PREMIUM</div>

          <button class="btn btn-primary btn-block" disabled>${t("settings.billing.soon")}</button>
        </div>
      </section>
      <section class="tut-sec">
        <h3><span class="tut-ico">${homeIcon("profile")}</span>${t("settings.account")}</h3>
        <div class="set-row"><span class="set-label">${p.self ? esc(p.display) : ""}</span>
          <button class="btn btn-ghost" id="logout">${t("home.logout")}</button>
        </div>
      </section>`;

    const qualitySection=document.createElement('section');qualitySection.className='tut-sec';qualitySection.innerHTML=`<h3>${loungeText('描画品質','Graphics','그래픽')}</h3><div class="set-row"><label class="set-label" for="renderQuality">${loungeText('盤面の精細さ','Board detail','보드 선명도')}</label><select id="renderQuality"><option value="balanced">${loungeText('高精細（推奨）','Crisp (recommended)','고해상도 (권장)')}</option><option value="economy">${loungeText('軽量','Economy','경량')}</option></select></div><p class="set-desc">${loungeText('この端末に保存し、次の対戦から適用します。','Saved on this device. Applies to the next match.','이 기기에 저장되며 다음 대전부터 적용됩니다.')}</p>`;body().children[0].after(qualitySection);const quality=qualitySection.querySelector<HTMLSelectElement>('select')!;quality.value=renderQuality();quality.onchange=()=>setRenderQuality(quality.value);
    // volume
    const vol = body().querySelector("#vol") as HTMLInputElement;
    const volVal = body().querySelector("#volVal") as HTMLElement;
    vol.oninput = () => { setSfxVolume(Number(vol.value) / 100); volVal.textContent = `${vol.value}%`; };
    vol.onchange = () => sfx("pop");
    (body().querySelector("#volTest") as HTMLElement).onclick = () => sfx("impact");

    // language (persists to this device; re-renders the whole screen via onLangChange)
    (body().querySelector("#langSel") as HTMLSelectElement).onchange = (e) => setLang((e.target as HTMLSelectElement).value as Lang);

    // privacy
    const pub = body().querySelector("#pub") as HTMLInputElement;
    pub.onchange = () => {
      pub.disabled = true;
      void api.updateMe({ stats_public: pub.checked }).then(() => { if (cached) cached.stats_public = pub.checked; sfx("pop"); })
        .catch(() => { pub.checked = !pub.checked; sfx("error"); }).finally(() => { pub.disabled = false; });
    };

    // coupon
    const couponMsg = body().querySelector("#couponMsg") as HTMLElement;
    const redeem = (): void => {
      const code = (body().querySelector("#coupon") as HTMLInputElement).value.trim();
      if (!code) return;
      couponMsg.textContent = "…";
      api.redeemCoupon(code).then((r) => {
        couponMsg.textContent = `✓ ${t("settings.coupon.ok")} +${r.amount} ${t("home.shards")}`;
        (body().querySelector("#credits") as HTMLElement).textContent = String(r.credits);
        if (app.user) app.user.credits = r.credits;
        document.dispatchEvent(new Event("lore:user"));
        if (cached) cached.credits = r.credits;
        (body().querySelector("#coupon") as HTMLInputElement).value = "";
        sfx("coin");
      }).catch((e) => { couponMsg.textContent = (e as Error).message; sfx("error"); });
    };
    (body().querySelector("#couponGo") as HTMLElement).onclick = redeem;
    (body().querySelector("#coupon") as HTMLInputElement).onkeydown = (e) => { if (e.key === "Enter") redeem(); };

    // logout
    (body().querySelector("#logout") as HTMLElement).onclick = () => {
      void confirmDialog({ title: t("home.logout"), body: t("settings.logout.confirm"), confirm: t("common.yes"), cancel: t("common.no") }).then(ok => { if (ok) void app.logout(); });
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
        <div class="ava-grid seeker-picker">
          ${ids.map((id) => `<button class="ava-opt ${p.avatar === id ? "sel" : ""}" data-id="${id}">${avatarHtml(id, "", 128)}<span>${id === "SEEKER_RED" ? "RED" : "BLUE"}</span></button>`).join("")}
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
          document.dispatchEvent(new Event("lore:user"));
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
  const record = p.byMode?.ranked ?? {w:0,l:0};
  const total = record.w + record.l;
  const rate = total ? Math.round((record.w / total) * 100) : 0;
  const ov = document.createElement("div");
  ov.className = "overlay";
  ov.innerHTML = `
    <div class="modal pf-mini-modal">
      <div class="pf-head">
        ${avatarHtml(p.avatar, p.display, 64)}
        <div class="pf-id">
          <div class="pf-name">${esc(p.display)}</div>
        </div>
      </div>
      ${p.private
        ? `<p style="margin-top:10px">${t("profile.private")}</p>`
        : `<p>${t("mode.ranked")}</p><div class="pf-stats" style="margin-top:12px">
            <div class="pf-stat"><b>${record.w}</b><span>${t("home.win")}</span></div>
            <div class="pf-stat"><b>${record.l}</b><span>${t("home.loss")}</span></div>
            <div class="pf-stat"><b>${rate}%</b><span>${t("profile.winrate")}</span></div>
            <div class="pf-stat pf-stat-tier">${p.tier ? tierChipHtml(p.tier, p.mmr ?? undefined) : "—"}</div>
          </div>`}
      <div class="modal-row"><button class="btn btn-ghost btn-block" id="pfClose">${t("common.confirm")}</button></div>
    </div>`;
  document.body.appendChild(ov);
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  (ov.querySelector("#pfClose") as HTMLElement).onclick = () => ov.remove();
}
