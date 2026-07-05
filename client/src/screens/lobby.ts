// ============================================================
// LORE — matchmaking lobby. Joins the Matchmaker queue and waits
// for a pairing, then jumps into the online game.
// ============================================================
import type { App, Screen } from "../router";
import type { QueueClientMsg, QueueServerMsg } from "../shared/protocol";
import { Sock } from "../net/socket";
import { t, onLangChange } from "../i18n";
import { sfx } from "../ui/sound";

export function mountLobby(app: App, ranked = false): Screen {
  const wrap = document.createElement("div");
  wrap.className = "screen";
  wrap.innerHTML = `
    <div class="screen-brand"><div class="mark"></div><h1>LORE</h1></div>
    <div class="panel auth-card lobby">
      <div class="spinner"></div>
      <h2 id="lobbyTitle">${ranked ? t("lobby.ranked") : t("lobby.searching")}</h2>
      <p id="lobbyMsg">${t("lobby.entered")}</p>
      <button class="btn btn-ghost" id="cancel">${t("common.cancel")}</button>
    </div>`;
  app.root.appendChild(wrap);

  const title = wrap.querySelector("#lobbyTitle") as HTMLElement;
  const msg = wrap.querySelector("#lobbyMsg") as HTMLElement;

  const sock = new Sock<QueueServerMsg, QueueClientMsg>(ranked ? "/ws/queue?mode=ranked" : "/ws/queue", {
    onOpen: () => sock.send({ type: "queue" }),
    onMessage: (m) => {
      if (m.type === "queued") msg.textContent = t("lobby.entered");
      else if (m.type === "matched") {
        sfx("match");
        title.textContent = t("lobby.found");
        msg.textContent = `vs ${m.oppName}`;
        sock.close();
        setTimeout(() => app.onlineGame(m.roomId, m.you, m.oppName, m.oppAvatar ?? null), 600);
      } else if (m.type === "error") {
        title.textContent = t("lobby.fail");
        msg.textContent = m.message;
      }
    },
    onError: () => { title.textContent = t("lobby.connerr"); msg.textContent = t("lobby.connerr.desc"); },
  });

  (wrap.querySelector("#cancel") as HTMLElement).onclick = () => { sock.send({ type: "cancel" }); sock.close(); app.home(); };

  const unsub = onLangChange(() => { sock.close(); ranked ? app.rankedLobby() : app.onlineLobby(); });
  return { destroy: () => { unsub(); sock.close(); } };
}
