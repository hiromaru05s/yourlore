// ============================================================
// LORE — matchmaking lobby. Joins the Matchmaker queue and waits
// for a pairing, then jumps into the online game.
// ============================================================
import type { App, Screen } from "../router";
import type { QueueClientMsg, QueueServerMsg } from "../shared/protocol";
import { Sock } from "../net/socket";

export function mountLobby(app: App): Screen {
  const wrap = document.createElement("div");
  wrap.className = "screen";
  wrap.innerHTML = `
    <div class="screen-brand"><div class="mark"></div><h1>LORE</h1></div>
    <div class="panel auth-card lobby">
      <div class="spinner"></div>
      <h2 id="lobbyTitle">상대를 찾는 중…</h2>
      <p id="lobbyMsg">매칭 대기열에 입장했습니다.</p>
      <button class="btn btn-ghost" id="cancel">취소</button>
    </div>`;
  app.root.appendChild(wrap);

  const title = wrap.querySelector("#lobbyTitle") as HTMLElement;
  const msg = wrap.querySelector("#lobbyMsg") as HTMLElement;

  const sock = new Sock<QueueServerMsg, QueueClientMsg>("/ws/queue", {
    onOpen: () => sock.send({ type: "queue" }),
    onMessage: (m) => {
      if (m.type === "queued") msg.textContent = `대기열 ${m.position}번째…`;
      else if (m.type === "matched") {
        title.textContent = "상대를 찾았습니다!";
        msg.textContent = `vs ${m.oppName}`;
        sock.close();
        setTimeout(() => app.onlineGame(m.roomId, m.you, m.oppName), 600);
      } else if (m.type === "error") {
        title.textContent = "매칭 실패";
        msg.textContent = m.message;
      }
    },
    onClose: () => { /* matched closes intentionally */ },
    onError: () => { title.textContent = "연결 오류"; msg.textContent = "서버에 연결할 수 없습니다."; },
  });

  (wrap.querySelector("#cancel") as HTMLElement).onclick = () => { sock.send({ type: "cancel" }); sock.close(); app.home(); };

  return { destroy: () => sock.close() };
}
