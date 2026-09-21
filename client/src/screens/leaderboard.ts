import { loungeText } from "../ui/loungeText";
// ============================================================
// LORE — season leaderboard. Top 100 by MMR; top 25 Masters are
// crowned GRANDMASTER. Footer shows the viewer's own standing.
// ============================================================
import type { App, Screen } from "../router";
import { api } from "../net/api";
import { t, onLangChange } from "../i18n";
import { tierChipHtml, tierLabel } from "../ui/tier";

export function mountLeaderboard(app: App): Screen {
  const wrap = document.createElement("div");
  wrap.className = "screen lb-screen";
  wrap.innerHTML = `
    <div class="screen-brand"><div class="mark"></div><h1>LORE</h1></div>
    <div class="panel lb">
      <div class="lb-head">
        <button class="btn btn-ghost" id="lbBack">← ${t("common.back")}</button>
        <h2>${t("lb.title")}</h2>
        <span class="lb-season" id="lbSeason"></span>
      </div>
      <details class="lounge-rank-rules"><summary>${loungeText("MMRとシーズンについて", "MMR & seasons", "MMR과 시즌 안내")}</summary><p>${loungeText("初期MMRは1000。ランク対戦の結果と相手のMMRで増減します。同じMMR同士なら勝利 +18、敗北 −16、引き分け ±0。ノーマル・BOT・フレンド対戦では変動しません。毎月UTCの月初に、前月のMMRを1000へ半分戻して開始します。", "Start at 1000 MMR. Ranked results adjust your rating based on your opponent: equal ratings yield +18 for a win, −16 for a loss, 0 for a draw. Casual, BOT and friend matches do not change MMR. Each UTC month resets the previous month's MMR halfway toward 1000.", "초기 MMR은 1000입니다. 상대 MMR과 랭크 결과에 따라 변동하며, 동일 MMR 기준 승리 +18, 패배 −16, 무승부 0입니다. 일반·BOT·친선전은 MMR에 영향을 주지 않습니다. 매월 UTC 기준 지난달 MMR을 1000 방향으로 절반 초기화합니다.")}</p></details>
      <div class="lb-row lb-columns"><span>#</span><span>${loungeText("シーカー", "Seeker", "시커")}</span><span>${loungeText("ティア", "Tier", "티어")}</span><span>MMR</span><span>${t("home.record")}</span></div>
      <div class="lb-list" id="lbList"><div class="spinner"></div></div>
      <div class="lb-me" id="lbMe"></div>
    </div>`;
  app.root.appendChild(wrap);

  (wrap.querySelector("#lbBack") as HTMLElement).onclick = () => app.home();
  const list = wrap.querySelector("#lbList") as HTMLElement;
  const seasonEl = wrap.querySelector("#lbSeason") as HTMLElement;
  const meEl = wrap.querySelector("#lbMe") as HTMLElement;

  void (async () => {
    try {
      const { season, entries } = await api.leaderboard();
      seasonEl.textContent = `${t("lb.season")} ${season}`;
      if (!entries.length) { list.innerHTML = `<div class="lb-empty">${t("lb.empty")}</div>`; }
      else {
        list.innerHTML = entries.map((e) => `
          <div class="lb-row ${e.tier === "gm" ? "is-gm" : ""}">
            <span class="lb-rank">${e.rank <= 3 ? ["🥇", "🥈", "🥉"][e.rank - 1] : e.rank}</span>
            <span class="lb-name">${escapeHtml(e.display)}</span>
            ${tierChipHtml(e.tier)}
            <span class="lb-mmr">${e.mmr}</span>
            <span class="lb-wl">${e.wins}${t("home.win")} ${e.losses}${t("home.loss")}</span>
          </div>`).join("");
      }
      const me = await api.rankMe();
      if (me) {
        meEl.innerHTML = `${t("lb.myrank")}: <b>#${me.rank}</b> · ${tierLabel(me.tier)} <b>${me.mmr}</b> MMR · ${me.wins}${t("home.win")} ${me.losses}${t("home.loss")}`;
      }
    } catch {
      list.innerHTML = `<div class="lb-empty">${t("lobby.connerr")}</div>`;
    }
  })();

  const unsub = onLangChange(() => app.leaderboard());
  return { destroy: unsub };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
