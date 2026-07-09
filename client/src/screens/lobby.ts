// ============================================================
// LORE — matchmaking lobby. Joins the Matchmaker queue and waits
// for a pairing, then jumps into the online game.
// Keepalive + auto-requeue: idle edge/NAT timeouts silently kill
// quiet sockets (~100s) and deploys restart the Matchmaker DO —
// both used to ghost the player out of the queue while the
// spinner kept spinning. Now we ping every 20s and rejoin the
// queue automatically on any unexpected drop.
// ============================================================
import type { App, Screen } from "../router";
import type { QueueClientMsg, QueueServerMsg } from "../shared/protocol";
import { Sock } from "../net/socket";
import { t, onLangChange } from "../i18n";
import { sfx } from "../ui/sound";

const HB_MS = 20_000;   // same cadence as the in-game socket heartbeat
const RETRY_MS = 2_000; // requeue delay after an unexpected drop

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

  let sock: Sock<QueueServerMsg, QueueClientMsg> | null = null;
  let hb: ReturnType<typeof setInterval> | null = null;
  let done = false; // matched / cancelled / unmounted — stop reconnecting

  const stopHb = (): void => { if (hb) { clearInterval(hb); hb = null; } };
  const shutdown = (): void => { done = true; stopHb(); sock?.close(); };

  const connect = (): void => {
    sock = new Sock<QueueServerMsg, QueueClientMsg>(ranked ? "/ws/queue?mode=ranked" : "/ws/queue", {
      onOpen: () => {
        if (done) { sock?.close(); return; }
        sock?.send({ type: "queue" });
        stopHb();
        hb = setInterval(() => sock?.send({ type: "ping" }), HB_MS);
      },
      onMessage: (m) => {
        if (m.type === "queued") {
          title.textContent = ranked ? t("lobby.ranked") : t("lobby.searching");
          msg.textContent = t("lobby.entered");
        } else if (m.type === "matched") {
          done = true;
          stopHb();
          sfx("match");
          title.textContent = t("lobby.found");
          msg.textContent = `vs ${m.oppName}`;
          sock?.close();
          setTimeout(() => app.onlineGame(m.roomId, m.you, m.oppName, m.oppAvatar ?? null, ranked), 600);
        } else if (m.type === "error") {
          title.textContent = t("lobby.fail");
          msg.textContent = m.message;
        }
      },
      onClose: () => {
        stopHb();
        // dropped while waiting (idle timeout, deploy, network blip) — rejoin automatically
        if (!done) setTimeout(() => { if (!done) connect(); }, RETRY_MS);
      },
      onError: () => { title.textContent = t("lobby.connerr"); msg.textContent = t("lobby.connerr.desc"); },
    });
  };
  connect();

  (wrap.querySelector("#cancel") as HTMLElement).onclick = () => { sock?.send({ type: "cancel" }); shutdown(); app.home(); };

  const unsub = onLangChange(() => { shutdown(); ranked ? app.rankedLobby() : app.onlineLobby(); });
  return { destroy: () => { unsub(); shutdown(); } };
}
