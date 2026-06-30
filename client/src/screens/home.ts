// ============================================================
// LORE — post-login HOME. Choose Random Online or Bot match.
// ============================================================
import type { App, Screen } from "../router";
import { t, onLangChange } from "../i18n";
import { langSelectEl } from "../ui/langSelect";

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
      <div class="modes">
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

  (wrap.querySelector("#online") as HTMLElement).onclick = () => app.onlineLobby();
  (wrap.querySelector("#bot") as HTMLElement).onclick = () => app.botGame();
  (wrap.querySelector("#tutorial") as HTMLElement).onclick = () => app.tutorial();
  (wrap.querySelector("#logout") as HTMLElement).onclick = () => app.logout();

  const unsub = onLangChange(() => app.home());
  return { destroy: unsub };
}
