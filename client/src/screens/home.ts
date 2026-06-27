// ============================================================
// LORE — post-login HOME. Choose Random Online or Bot match.
// ============================================================
import type { App, Screen } from "../router";

export function mountHome(app: App): Screen {
  const u = app.user;
  const wrap = document.createElement("div");
  wrap.className = "screen";
  wrap.innerHTML = `
    <div class="screen-brand"><div class="mark"></div><h1>LORE</h1></div>
    <div class="home">
      <div class="welcome">환영합니다</div>
      <div class="title">${u?.display ?? "PLAYER"}</div>
      <div class="modes">
        <div class="panel mode-card" id="online">
          <div class="icon">🌐</div>
          <h3>랜덤 온라인 대전</h3>
          <p>실시간으로 다른 플레이어와 매칭됩니다.</p>
        </div>
        <div class="panel mode-card" id="bot">
          <div class="icon">🤖</div>
          <h3>BOT 대전</h3>
          <p>AI 상대로 바로 연습합니다.</p>
        </div>
      </div>
      <div class="acct">
        <span class="stats">전적 ${u?.wins ?? 0}승 ${u?.losses ?? 0}패</span>
        <span>·</span>
        <a id="logout" style="cursor:pointer">로그아웃</a>
      </div>
    </div>`;
  app.root.appendChild(wrap);

  (wrap.querySelector("#online") as HTMLElement).onclick = () => app.onlineLobby();
  (wrap.querySelector("#bot") as HTMLElement).onclick = () => app.botGame();
  (wrap.querySelector("#logout") as HTMLElement).onclick = () => app.logout();

  return {};
}
