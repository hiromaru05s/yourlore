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
