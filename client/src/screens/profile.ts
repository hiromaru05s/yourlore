import {renderRankedProfile} from '../ui/rankedProfile';
import {mountUsernameForm} from '../ui/usernameForm';
import {mountProfileMedals} from '../ui/profileMedals';
import {medalHtml} from '../ui/medal';
import { seekerLevel } from '../shared/progression';
import {renderQuality,setRenderQuality} from '../ui/renderDensity';
import { homeIcon } from "../ui/homeIcons";
import { loungeText } from "../ui/loungeText";
import { confirmDialog } from "../ui/modal";
// ============================================================
// LORE — profile screen. For the signed-in user it's TABBED:
//   · 프로필  — avatar / rename / badges / record / recent matches
//   · 설정    — SFX volume / privacy / coupon / Shards / language / logout
// Viewing ANOTHER player's profile shows the overview only (read-only,
// honoring their stats_public setting).
// ============================================================
import type { App, Screen } from "../router";
import { api, type Profile } from "../net/api";
import { t, onLangChange, getLang, setLang, type Lang } from "../i18n";
import { avatarHtml } from "../ui/social";
import { getSfxVolume, setSfxVolume, sfx } from "../ui/sound";

function esc(s: string): string { return s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]!)); }

function fmtDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export type ProfileTab = "overview" | "owned" | "progress" | "h2h" | "settings";
type Tab = ProfileTab;

export function mountProfile(app: App, userId?: string, initialTab?: ProfileTab): Screen {
  const wrap = document.createElement("div");
  wrap.className = "screen tut-screen";
  app.root.appendChild(wrap);

  let dead = false;
  let closeRename: (()=>void)|undefined;
  let logoutPending = false;
  let logoutError = "";
  let disposeMedals: (()=>void)|undefined;
  let cached: Profile | null = null;
  let tab: Tab = initialTab ?? "overview";

  const isSelf = (): boolean => !!cached?.self;

  // ---- shell (head + optional tab bar + body) ----
  const build = (): void => {
    disposeMedals?.();disposeMedals=undefined;
    wrap.dataset.profileTab = tab;
    wrap.innerHTML = `
      <div class="tut">
        <button type="button" class="btn btn-ghost lore-button-quiet profile-page-close" aria-label="${loungeText('閉じる','Close','닫기')}">×</button>
        <div class="tut-head">
          <button class="btn btn-ghost" id="back">← ${t("common.back")}</button>
          <div class="support-heading"><span class="menu-eyebrow">${tab === "settings" ? "PREFERENCES" : "SEEKER PROFILE"}</span><h2>${t(tab === "settings" ? "home.settings" : "profile.title")}</h2><p class="menu-subtitle">${tab === "settings" ? loungeText("音・言語・公開範囲を、あなたに合わせて。", "Make LORE your own.", "소리, 언어, 공개 범위를 설정하세요.") : loungeText("デュエルの記録と、シーカーの現在地。", "Your duels, your progress.", "듀얼 기록과 시커의 현재 위치.")}</p></div>
        </div>
        ${isSelf() ? `
        <div class="pf-tabs">
          <button class="pf-tab ${tab === "overview" ? "is-active" : ""}" data-tab="overview" aria-pressed="${tab === "overview"}">${homeIcon("profile")} ${t("profile.tab.overview")}</button>
          <button class="pf-tab ${tab === "owned" ? "is-active" : ""}" data-tab="owned" aria-pressed="${tab === "owned"}">${loungeText("保有中","Owned honors","보유 훈장")}</button>
          <button class="pf-tab ${tab === "progress" ? "is-active" : ""}" data-tab="progress" aria-pressed="${tab === "progress"}">${loungeText("進行中","In progress","진행 중")}</button>
          <button class="pf-tab ${tab === "h2h" ? "is-active" : ""}" data-tab="h2h" aria-pressed="${tab === "h2h"}">${homeIcon("duel")} ${t("profile.tab.h2h")}</button>
          <button class="pf-tab ${tab === "settings" ? "is-active" : ""}" data-tab="settings" aria-pressed="${tab === "settings"}">${homeIcon("settings")} ${t("profile.tab.settings")}</button>
        </div>` : ""}
        <div class="tut-body" id="pbody"><div class="pf-loading">…</div></div>
      </div>`;
    (wrap.querySelector("#back") as HTMLElement).onclick = () => app.home();
    wrap.querySelector<HTMLButtonElement>('.profile-page-close')!.onclick = () => app.home();
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
    else if (tab === "owned" || tab === "progress") {
      const profile=cached;
      if(!profile.medals){body().innerHTML=`<p>${loungeText('勲章を読み込めませんでした。再読み込みしてください。','Could not load honors. Please reload.','훈장을 불러오지 못했습니다. 새로고침해 주세요.')}</p>`;return;}
      disposeMedals=mountProfileMedals(body(),profile.medals,tab==='owned',async id=>{
        const result=await api.updateMe({badge:id});profile.badge=result.badge;
        if(app.user){app.user.badge=result.badge;document.dispatchEvent(new Event('lore:user'));}
      });
    }
    else if (tab === "h2h") renderH2H(cached);
    else renderSettings(cached);
  };

  // ============================================================
  // TAB: overview
  // ============================================================
  const renderOverview = (p: Profile): void => {
    const experience=seekerLevel(app.user?.exp??0);
    body().innerHTML = `
      <section class="tut-sec pf-card">
        <div class="pf-head">
          <div class="pf-ava">${avatarHtml(p.avatar, p.display, 72)}</div>
          <div class="pf-id">
            <div class="pf-name-row">
              <span class="pf-name" id="pfName">${esc(p.display)}</span>
              ${p.self ? `<button class="btn btn-ghost btn-mini" id="renameBtn">${homeIcon("edit")} ${t("profile.rename")}</button>` : ""}
            </div>
            ${medalHtml(p.medals?.equipped ?? p.badge)}
            <div class="pf-joined">${t("home.record")}${p.private ? "" : ` ${t("mode.ranked")}`} · ${fmtDate(p.created_at)}~</div>
          </div>
        </div>
      </section>
      ${p.self ? `<details class="tut-sec pf-experience"><summary>${t('home.seekerLevel')} ${experience.level} · ${experience.max?'MAX':`${experience.progress}/100 EXP`}</summary><p>${t('home.levelRule')}</p></details>` : ''}
      <div class="pf-ranked-content" data-ranked-profile></div>
    `;
    renderRankedProfile(body().querySelector<HTMLElement>('[data-ranked-profile]')!,p);

    if (!p.self) return;

    // ---- rename ----
    (body().querySelector("#renameBtn") as HTMLElement | null)?.addEventListener("click", () => {
      closeRename?.();
      const ov=document.createElement('div');ov.className='overlay';
      ov.innerHTML=`<div class="modal" role="dialog" aria-modal="true" aria-labelledby="rename-title"><h2 id="rename-title">${t('profile.rename')}</h2><div data-rename-form></div><button class="btn btn-ghost" data-cancel>${t('common.cancel')}</button></div>`;
      document.body.append(ov);
      const dispose=mountUsernameForm(ov.querySelector('[data-rename-form]')!,app,p.display,()=>{closeRename?.();if(!dead)void load();});
      closeRename=()=>{dispose();ov.remove();closeRename=undefined;};
      ov.querySelector<HTMLButtonElement>('[data-cancel]')!.onclick=()=>closeRename?.();
    });

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
        <h3><span class="tut-ico">${homeIcon("shard")}</span>${t("home.shards")}</h3>
        <div class="set-row"><span class="set-label">${t("home.shards")}</span><span class="set-val">${homeIcon("shard")} <b id="credits">${credits}</b></span></div>
      </section>
      <section class="tut-sec">
        <h3><span class="tut-ico">${homeIcon("profile")}</span>${t("settings.account")}</h3>
        ${p.self && app.user?.id === p.id && app.user.email ? `<div class="set-row"><span class="set-label">${t("login.email")}</span><span class="set-val" style="overflow-wrap:anywhere;min-width:0" data-account-email>${esc(app.user.email)}</span></div>` : ""}
        <div class="set-row"><span class="set-label">${p.self ? esc(p.display) : ""}</span>
          <button class="btn btn-ghost" id="logout" ${logoutPending ? 'disabled' : ''}>${t("home.logout")}</button>
        </div>
        <p id="logoutMsg" role="alert">${esc(logoutError)}</p>
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
    const logoutButton = body().querySelector<HTMLButtonElement>("#logout")!;
    const logoutMsg = body().querySelector<HTMLElement>("#logoutMsg")!;
    logoutButton.onclick = async () => {
      if (logoutPending || dead) return;
      logoutPending = true;
      logoutError = "";
      logoutButton.disabled = true;
      logoutMsg.textContent = "";
      try {
        const ok = await confirmDialog({ title: t("home.logout"), body: t("settings.logout.confirm"), confirm: t("common.yes"), cancel: t("common.no") });
        if (ok && !dead) await app.logout();
      } catch {
        logoutError = loungeText(
          'ログアウトを確認できませんでした。接続を確認して、もう一度ログアウトしてください。',
          'Could not confirm logout. Check your connection and try logging out again.',
          '로그아웃을 확인하지 못했습니다. 연결을 확인한 후 다시 로그아웃해 주세요.',
        );
      } finally {
        logoutPending = false;
        if (!dead) {
          const currentButton = body().querySelector<HTMLButtonElement>('#logout');
          const currentMessage = body().querySelector<HTMLElement>('#logoutMsg');
          if (currentButton) currentButton.disabled = false;
          if (currentMessage) currentMessage.textContent = logoutError;
        }
      }
    };
  };

  build();
  void load();
  const unsub = onLangChange(() => { build(); renderTab(); });
  return { destroy: () => { dead = true; closeRename?.(); disposeMedals?.(); unsub(); } };
}

/** One ranked profile shared by the leaderboard and friends list. */
export async function showProfileModal(userId: string): Promise<void> {
  const previous=document.activeElement as HTMLElement|null;
  const ov=document.createElement('div');ov.className='overlay';
  ov.innerHTML=`<div class="modal ranked-profile-modal" role="dialog" aria-modal="true" aria-label="${t('profile.title')}"><button type="button" class="btn btn-ghost lore-button-quiet profile-close" id="pfClose" aria-label="${loungeText('閉じる','Close','닫기')}">×</button><div class="profile-content" aria-live="polite">${loungeText('読み込み中…','Loading…','불러오는 중…')}</div></div>`;
  const close=()=>{ov.remove();if(previous?.isConnected)previous.focus();};
  ov.querySelector<HTMLButtonElement>('#pfClose')!.onclick=close;
  ov.onclick=e=>{if(e.target===ov)close();};
  ov.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close();}});
  document.body.append(ov);ov.querySelector<HTMLButtonElement>('#pfClose')!.focus();
  const content=ov.querySelector<HTMLElement>('.profile-content')!;
  const load=async()=>{
    try{
      const p=await api.profile(userId);if(!ov.isConnected)return;
      content.innerHTML=`<div class="pf-head">${avatarHtml(p.avatar,p.display,64)}<div class="pf-id"><div class="pf-name">${esc(p.display)}</div>${medalHtml(p.badge)}</div></div><div data-ranked-profile></div>`;
      renderRankedProfile(content.querySelector<HTMLElement>('[data-ranked-profile]')!,p);
    }catch{
      if(!ov.isConnected)return;
      content.textContent=loungeText('プロフィールを読み込めませんでした。','Could not load the profile.','프로필을 불러오지 못했습니다.');
      const retry=document.createElement('button');retry.className='btn btn-ghost';retry.textContent=loungeText('再試行','Retry','재시도');retry.onclick=()=>{content.textContent='…';void load();};content.append(retry);
    }
  };
  await load();
}
