import { homeIcon } from "../ui/homeIcons";
import { loungeText } from "../ui/loungeText";
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
import {warmGame} from './lazyGame';

const HB_MS = 20_000;   // same cadence as the in-game socket heartbeat
const RETRY_MS = 2_000; // requeue delay after an unexpected drop

export function mountLobby(app: App, ranked = false): Screen {
  const wrap = document.createElement("div");
  wrap.className = "screen";
  wrap.innerHTML = `
    <div class="screen-brand"><div class="mark"></div><h1>LORE</h1></div>
    <div class="panel auth-card lobby">
      <div class="spinner">${homeIcon("home")}</div>
      <h2 id="lobbyTitle">${ranked ? t("lobby.ranked") : t("lobby.searching")}</h2>
      <p id="lobbyMsg">${t("lobby.entered")}</p>
      <div class="lounge-queue-time" id="queueTime" aria-label="elapsed">00:00</div>
      <p class="lounge-queue-rule">${ranked ? loungeText("近いMMRの相手を探しています。待機時間に応じて検索範囲が広がります。", "Searching for a similar MMR. The range expands as you wait.", "비슷한 MMR의 상대를 찾고 있습니다. 대기 시간에 따라 검색 범위가 넓어집니다.") : t("home.online.desc")}</p>
      <button class="btn btn-ghost" id="cancel">${t("common.cancel")}</button>
    </div>`;
  app.root.appendChild(wrap);

  const title = wrap.querySelector("#lobbyTitle") as HTMLElement;
  const msg = wrap.querySelector("#lobbyMsg") as HTMLElement;

  let started:number|undefined;
  const clock = window.setInterval(() => { const n=started===undefined?0:Math.floor((Date.now()-started)/1000); wrap.querySelector("#queueTime")!.textContent=String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0"); },1000);
  let sock: Sock<QueueServerMsg, QueueClientMsg> | null = null;
  let hb: ReturnType<typeof setInterval> | null = null;
  let done = false; // matched / cancelled / unmounted — stop reconnecting
  let retry = 0;    // consecutive drops without a successful "queued" ack (drives backoff)

  const stopHb = (): void => { if (hb) { clearInterval(hb); hb = null; } };
  let matchTimer = 0; // the 600ms "matched → enter game" delay; must die with the screen
  const shutdown = (): void => { done = true; clearInterval(clock); stopHb(); clearTimeout(matchTimer); sock?.close(); };

  const connect = (): void => {
    started??=Date.now();
    sock = new Sock<QueueServerMsg, QueueClientMsg>(ranked ? "/ws/queue?mode=ranked" : "/ws/queue", {
      onOpen: () => {
        if (done) { sock?.close(); return; }
        sock?.send({ type: "queue" });
        stopHb();
        hb = setInterval(() => sock?.send({ type: "ping" }), HB_MS);
      },
      onMessage: (m) => {
        if (m.type === "queued") {
          retry = 0; // the server actually processed us — reset the backoff
          title.textContent = ranked ? t("lobby.ranked") : t("lobby.searching");
          msg.textContent = t("lobby.entered");
        } else if (m.type === "matched") {
          done = true;
          stopHb();
          sfx("match");
          title.textContent = t("lobby.found");
          msg.textContent = `vs ${m.oppName}`;
          sock?.close();
          matchTimer = window.setTimeout(() => app.onlineGame(m.roomId, m.you, m.oppName, m.oppAvatar ?? null, ranked), 600);
        } else if (m.type === "error") {
          title.textContent = t("lobby.fail");
          msg.textContent = m.message;
        }
      },
      onClose: () => {
        stopHb();
        // dropped while waiting (idle timeout, deploy, network blip) — rejoin automatically,
        // with exponential backoff (max 15s) so a rejection loop can't hammer the matchmaker DO
        retry++;
        if (!done) { title.textContent = t("lobby.connerr"); msg.textContent = t("lobby.connerr.desc"); }
        if (!done) setTimeout(() => { if (!done) connect(); }, Math.min(RETRY_MS * 2 ** (retry - 1), 15_000));
      },
      onError: () => { title.textContent = t("lobby.connerr"); msg.textContent = t("lobby.connerr.desc"); },
    });
  };
  // Do not pair players while a cold client is still downloading its game.
  const prepare=async()=>{
    msg.textContent=loungeText('対戦素材を準備しています','Preparing duel assets','대전 자료 준비 중');
    try {await warmGame(app.user?.deck??[]);if(!done){msg.textContent=t('lobby.entered');connect();}}
    catch {
      if(done)return;
      msg.textContent=loungeText('対戦の準備に失敗しました','Duel preparation failed','대전 준비 실패');
      const retryButton=document.createElement('button');retryButton.className='btn btn-ghost';retryButton.textContent=loungeText('再試行','Retry','다시 시도');
      retryButton.onclick=()=>{retryButton.remove();void prepare();};msg.after(retryButton);
    }
  };
  void prepare();

  (wrap.querySelector("#cancel") as HTMLElement).onclick = () => { sock?.send({ type: "cancel" }); shutdown(); app.home(); };

  const unsub = onLangChange(() => { shutdown(); ranked ? app.rankedLobby() : app.onlineLobby(); });
  return { destroy: () => { unsub(); shutdown(); } };
}
