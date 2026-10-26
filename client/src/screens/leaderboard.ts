import "../styles/rankedProfile.css";
import "../styles/leaderboardStanding.css";
import {showProfileModal} from "./profile";
import {purchaseCards} from "../ui/purchaseCards";
import { homeIcon } from "../ui/homeIcons";
import { loungeText } from "../ui/loungeText";
// ============================================================
// LORE — season leaderboard. Top 100 by MMR; top 25 Masters are
// crowned GRANDMASTER. Footer shows the viewer's own standing.
// ============================================================
import type { App, Screen } from "../router";
import { api } from "../net/api";
import { t, onLangChange } from "../i18n";
import { TIERS } from "../shared/rank";
import { rankEmblem } from "../ui/rankEmblem";
import { TIER_META } from "../ui/tier";
import { tierChipHtml, tierLabel } from "../ui/tier";

export function mountLeaderboard(app: App): Screen {
  let destroyed=false;
  const wrap = document.createElement("div");
  wrap.className = "screen lb-screen";
  wrap.innerHTML = `
    <div class="screen-brand"><div class="mark"></div><h1>LORE</h1></div>
    <div class="panel lb">
      <div class="lb-head">
        <button class="btn btn-ghost" id="lbBack">← ${t("common.back")}</button>
        <div><small class="menu-eyebrow">BIBLION / LEADERBOARD</small><h2>${t("home.nav.ranking")}</h2><p class="menu-subtitle">${loungeText("シーカーたちの、現在地。","Where Seekers stand.","시커들의 현재 위치.")}</p></div>
        <span class="lb-season" id="lbSeason"></span>
      </div>
      <div class="menu-records"><details class="lounge-rank-rules"><summary>${loungeText("MMRとシーズンについて", "MMR & seasons", "MMR과 시즌 안내")}</summary><p>${loungeText("初期MMRは1000。ランク対戦の結果と相手のMMRで増減します。同じMMR同士なら勝利 +18、敗北 −16、引き分け ±0。ノーマル・シングル・フレンド対戦では変動しません。毎月UTCの月初に、前月のMMRを1000へ半分戻して開始します。", "Start at 1000 MMR. Ranked results adjust your rating based on your opponent: equal ratings yield +18 for a win, −16 for a loss, 0 for a draw. Casual, Single and friend matches do not change MMR. Each UTC month resets the previous month's MMR halfway toward 1000.", "초기 MMR은 1000입니다. 상대 MMR과 랭크 결과에 따라 변동하며, 동일 MMR 기준 승리 +18, 패배 −16, 무승부 0입니다. 일반·싱글·친선전은 MMR에 영향을 주지 않습니다. 매월 UTC 기준 지난달 MMR을 1000 방향으로 절반 초기화합니다.")}</p><div class="rank-tier-guide">${[...TIERS,{key:"gm",min:1550}].map(tier=>`<div style="--rank-metal:${TIER_META[tier.key].color}">${rankEmblem(tier.key)}<b>${tierLabel(tier.key)}</b><span>${tier.min}+ MMR${tier.key==="gm"?" · TOP 25":""}</span></div>`).join("")}</div></details>
      <div class="lb-row lb-columns"><span>#</span><span>${loungeText("シーカー", "Seeker", "시커")}</span><span>${loungeText("ティア", "Tier", "티어")}</span><span>MMR</span><span>${t("home.record")}</span><span>${loungeText("購入率 TOP 5","Top purchases","구매율 TOP 5")}</span></div>
      <div class="lb-list" id="lbList"><div class="spinner"></div></div>
      </div><aside class="lb-me" id="lbMe" aria-live="polite"></aside>
    </div>`;
  app.root.appendChild(wrap);

  (wrap.querySelector("#lbBack") as HTMLElement).onclick = () => app.home();
  const list = wrap.querySelector("#lbList") as HTMLElement;
  const seasonEl = wrap.querySelector("#lbSeason") as HTMLElement;
  const meEl = wrap.querySelector("#lbMe") as HTMLElement;

  void (async () => {
    try {
      const { season, entries } = await api.leaderboard();
      if(destroyed)return;
      seasonEl.textContent = `${t("lb.season")} ${season}`;
      if (!entries.length) { list.innerHTML = `<div class="lb-empty">${t("lb.empty")}</div>`; }
      else {
        list.innerHTML = entries.map((e) => `
          <div class="lb-row ${e.tier === "gm" ? "is-gm" : ""}">
            <span class="lb-rank">${e.rank <= 3 ? `${homeIcon("trophy")}<b>${e.rank}</b>` : e.rank}</span>
            <span class="lb-name"><button type="button" class="lb-profile-trigger" data-user="${escapeHtml(e.userId)}" aria-haspopup="dialog">${escapeHtml(e.display)}</button></span>
            ${tierChipHtml(e.tier)}
            <span class="lb-mmr">${e.mmr}</span>
            <span class="lb-wl">${e.wins}${t("home.win")} ${e.losses}${t("home.loss")}</span>
            <div class="lb-purchases"></div>
          </div>`).join("");
      }
      list.querySelectorAll<HTMLButtonElement>('.lb-profile-trigger').forEach(button=>{
        button.onclick=()=>{void showProfileModal(button.dataset.user!);};
      });
      list.querySelectorAll<HTMLElement>('.lb-purchases').forEach((host,index)=>host.append(purchaseCards(entries[index].purchases)));
      const me = await api.rankMe();
      if(destroyed)return;
      if (me?.rank != null) {
        meEl.innerHTML = `<div class="lb-me-heading"><small>${t("lb.myrank")}</small><strong>#${me.rank}</strong></div>${rankEmblem(me.tier)}<div class="lb-me-rating"><span class="lb-me-tier">${tierLabel(me.tier)}</span><div class="lb-me-score"><b>${me.mmr}</b><span>MMR</span></div></div><div class="lb-me-record"><span><b>${me.wins}</b><small>${t("home.win")}</small></span><span><b>${me.losses}</b><small>${t("home.loss")}</small></span></div>`;
      }
    } catch {
      if(destroyed)return;
      list.innerHTML = `<div class="lb-empty">${t("lobby.connerr")}</div>`;
    }
  })();

  const unsub = onLangChange(() => app.leaderboard());
  return { destroy: ()=>{destroyed=true;unsub();} };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
