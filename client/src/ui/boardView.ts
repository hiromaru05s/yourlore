// ============================================================
// LORE — board view. Renders the whole game from a GameState
// (from the viewer's perspective) and wires interaction handlers.
// All animation lives in anim.ts; this file only draws + binds.
// ============================================================
import type { CardInst, GameState, PlayerState, Side } from "../shared/types";
import { purchaseAllowed, freeBuyBlocked } from "../shared/engine";
import { MAX_MANA, FIELD_MAX, ST_MAX, effMaxMana, playCost, buyCost, effAtk, effDef, curHp, isGolem, marketStockOf } from "../shared/engine";
import { enchantHasTurnCountdown, fieldFrameFor, frameFor, FRAME_BACK, sleeveUrl, DB as DBC, STARTERS, hasPassive } from "../shared/cards";
import { ENCH_TURN_LIMITS } from "../shared/cardText";
import { cardPicker, deckViewer , showControlsHelp } from "./modal";
import { artUrl, cardEl, ensureCardCompositing, prefetchZoomArt } from "./cardView";
import { bindZoom, zoomCard, setPlayOrigin } from "./anim";
import { t, getLang, esc, cardName } from "../i18n";
import { logToEn } from "../shared/logEn";
import { getSfxVolume, setSfxVolume } from "./sound";
import { deckBucket, refinedArt } from "./duelMaterials";
import { avatarHtml } from "./social";

// the local player's profile avatar (set by the game screen), shown on MY portrait
let MY_AVATAR: string | null | undefined;
export function setMyAvatar(a?: string | null): void { MY_AVATAR = a; }
// the opponent's avatar (online games pass it in; bot games fall back to initial)
let OPP_AVATAR: string | null | undefined;
export function setOppAvatar(a?: string | null): void { OPP_AVATAR = a; }

// each side's equipped card-sleeve URL — used for deck/hand/set-trap backs.
// MY is set locally from app.user; OPP is refreshed per-render from the
// server-synced state.sleeves, so the opponent's chosen sleeve shows too.
let MY_SLEEVE = FRAME_BACK;
let OPP_SLEEVE = FRAME_BACK;
export function setMySleeve(id?: string | null): void { MY_SLEEVE = sleeveUrl(id); }
// 마켓 알림이: 활성 덱 프리셋의 워치리스트 — 마켓/제시에 뜨면 은은하게 표시
let MARKET_WATCH = new Set<string>();
export function setMarketWatch(ids?: string[] | null): void { MARKET_WATCH = new Set(ids ?? []); }
/** card-back image for a pile/back that belongs to `isMe`. */
function backFor(isMe: boolean): string { return isMe ? MY_SLEEVE : OPP_SLEEVE; }

const pickBattlefieldBg = (): string => "/art/biblion/duel-table.png";

/** Eat the click that follows THIS press (capture, once) — but self-expire: a
 *  cancelled touch (scroll/palm rejection) never fires the click, and a stale
 *  swallower would silently eat the user's NEXT legitimate tap. */
function swallowNextClick(el: HTMLElement): void {
  const swallow = (ce: Event): void => { ce.stopPropagation(); ce.preventDefault(); };
  el.addEventListener("click", swallow, { capture: true, once: true });
  setTimeout(() => el.removeEventListener("click", swallow, { capture: true }), 500);
}

const MON_SLOTS = FIELD_MAX;
const ST_SLOTS = ST_MAX;

export interface BoardHandlers {
  onPlay(uid: string): void;
  onBlockedPlay(uid: string): void;
  /** targetUid: drag-to-attack picked the defender up front (undefined = let the engine ask). */
  onAttack(uid: string, targetUid?: string | null): void;
  /** Tried to hit the player directly while enemy monsters are still standing. */
  onBlockedAttack(): void;
  onReorder(from: number, to: number): void;
  onChooseTarget(uid: string | null): void;
  onBuyMarket(i: number): void;
  onBuySupply(i: number): void;
  onRefresh(): void;
  onEndTurn(): void;
  onSurrender(): void;
}

export class GameView {
  private riftCounts = new Map<string, number>();
  root: HTMLElement;
  you: Side;
  h: BoardHandlers;
  logEl!: HTMLElement;
  /** battlefield art for THIS match — rolled once at construction (see pickBattlefieldBg) */
  private disposed = false;
  private disposeScene?: () => void;
  private readonly battlefieldBg = pickBattlefieldBg();

  constructor(root: HTMLElement, you: Side, h: BoardHandlers) {
    this.root = root;
    this.you = you;
    this.h = h;
    this.buildSkeleton();
    if (typeof WebGL2RenderingContext !== 'undefined') {
      void import('./duelScene').then(({ mountDuelScene }) => {
        if (!this.disposed) this.disposeScene = mountDuelScene(this.root);
      }).catch(() => { /* DOM controls and time remain available without WebGL. */ });
    }
  }

  private buildSkeleton(): void {
    this.root.innerHTML = `
      <div class="game">
        <div class="topbar">
          <div class="brand"><div class="mark"></div><h1>LORE</h1></div>
          <div class="turn-info" id="turnInfo"></div>
          <button class="btn btn-danger giveup-btn" id="giveupBtn"><svg class="gv-flag" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M6 2a1 1 0 0 1 1 1v.6h10.3a.7.7 0 0 1 .58 1.1L16.4 8l1.48 3.3a.7.7 0 0 1-.58 1.1H7V21a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1z"/></svg><span class="gv-label">${t("game.surrender")}</span></button>
        </div>
        <button class="mute-fab" id="muteBtn" title="${t("game.mute")}" aria-label="${t("game.mute")}"></button>
        <button class="help-fab" id="helpBtn" title="${t("help.title")}" aria-label="${t("help.title")}"><span class="hf-ico">?</span><span class="hf-label">${t("help.open")}</span></button>
        <div class="stage">
          <div class="board-col">
            <div class="pcluster pcluster--opp">
              <div class="pc-side pc-side--l"></div>
              <div class="portrait portrait--opp" id="portraitOpp"></div>
              <div class="pc-side pc-side--r"><div class="opp-hand" id="oppHand"></div></div>
            </div>
            <div class="prow" id="oppRow"></div>
            <div class="mid-row">
              <div class="panel market" id="market"></div>
              <!-- turn timer + END TURN live just right of the market (with a gap) -->
              <div class="mid-aside">
                <div class="mp-clock" id="clock-opp" aria-hidden="true"></div>
                <div class="mp-clock" id="clock-me" aria-hidden="true"></div>
                <div class="end-turn-wrap"><button class="btn btn-primary" id="endBtn">${t("game.endturn")}</button></div>
              </div>
            </div>
            <div class="prow" id="meRow"></div>
            <div class="hand-area" id="handArea">
              <div class="pcluster pcluster--me">
                <div class="pc-side pc-side--l"></div>
                <div class="portrait portrait--me" id="portraitMe"></div>
                <div class="pc-side pc-side--r"><div class="hand" id="hand"></div></div>
              </div>
            </div>
          </div>
        </div>
        <!-- battle log: a left-edge drawer with a mid-left toggle tab.
             The backdrop guarantees a tap anywhere outside the drawer closes it,
             whatever is (or isn't) under the finger. -->
        <div class="log-backdrop" id="logBackdrop"></div>
        <button class="log-tab" id="logTab" aria-label="log">${t("game.log")}</button>
        <div class="panel logpanel" id="logPanel">
          <div class="panel-title" id="logTitle">${t("game.log")}</div>
          <div class="log" id="log"></div>
        </div>
      </div>
      <div class="target-hint" id="targetHint" style="display:none"></div>`;
    this.logEl = this.q("log");
    this.root.querySelector(".mid-aside")!.prepend(this.q("turnInfo"));
    (this.q("endBtn") as HTMLButtonElement).onclick = () => this.h.onEndTurn();
    (this.q("giveupBtn") as HTMLButtonElement).onclick = () => this.h.onSurrender();
    // sound button (round button below the logo): click = volume slider popover
    // (ON/OFF만 있던 것을 인게임 볼륨 조절로 확장 — 슬라이더 0 = 음소거)
    // 조작 방법 안내: 버튼을 은은히 빛내고, 하루 1회 말풍선으로 위치를 알려준다.
    // ❌로 닫거나 도움말을 실제로 열면 그날은 다시 보이지 않는다 (localStorage 날짜 도장).
    const helpBtn = this.q("helpBtn") as HTMLButtonElement;
    const CALLOUT_KEY = "lore_help_callout_seen";
    const today = new Date().toISOString().slice(0, 10);
    let seenDay = "";
    try { seenDay = localStorage.getItem(CALLOUT_KEY) ?? ""; } catch { /* private mode */ }
    let callout: HTMLElement | null = null;
    const dismissCallout = (remember: boolean): void => {
      callout?.remove(); callout = null;
      helpBtn.classList.remove("is-callout");
      if (remember) { try { localStorage.setItem(CALLOUT_KEY, today); } catch { /* ignore */ } }
    };
    if (seenDay !== today) {
      helpBtn.classList.add("is-callout");
      callout = document.createElement("div");
      callout.className = "help-callout";
      callout.innerHTML = `<span class="hc-text">${t("help.callout")}</span><button class="hc-close" aria-label="${t("common.cancel")}">✕</button>`;
      (this.root.querySelector(".game") as HTMLElement).appendChild(callout);
      (callout.querySelector(".hc-close") as HTMLButtonElement).onclick = (e) => { e.stopPropagation(); dismissCallout(true); };
      callout.onclick = () => { dismissCallout(true); showControlsHelp(); };
    }
    helpBtn.onclick = () => { dismissCallout(true); showControlsHelp(); };
    const muteBtn = this.q("muteBtn") as HTMLButtonElement;
    const SPK_ON = `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16.5 8.6a4 4 0 010 6.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
    const SPK_OFF = `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
    let lastVol = getSfxVolume() || 0.7;
    const paintMute = () => { const m = getSfxVolume() <= 0; muteBtn.innerHTML = m ? SPK_OFF : SPK_ON; muteBtn.classList.toggle("muted", m); };
    const volPop = document.createElement("div");
    volPop.className = "vol-pop";
    volPop.innerHTML = `<input type="range" min="0" max="100" step="5" aria-label="volume">`;
    muteBtn.insertAdjacentElement("afterend", volPop);
    const volRange = volPop.querySelector("input") as HTMLInputElement;
    volRange.value = String(Math.round(getSfxVolume() * 100));
    volRange.oninput = () => {
      const v = Number(volRange.value) / 100;
      if (v > 0) lastVol = v;
      setSfxVolume(v);
      paintMute();
    };
    let volOpen = false;
    const setVolOpen = (o: boolean) => { volOpen = o; volPop.classList.toggle("open", o); };
    muteBtn.onclick = (e) => { e.stopPropagation(); volRange.value = String(Math.round(getSfxVolume() * 100)); setVolOpen(!volOpen); };
    volPop.onclick = (e) => e.stopPropagation();
    // double-click the button = quick mute/unmute (기존 동작 유지)
    muteBtn.ondblclick = () => { if (getSfxVolume() > 0) { lastVol = getSfxVolume(); setSfxVolume(0); } else { setSfxVolume(lastVol || 0.7); } volRange.value = String(Math.round(getSfxVolume() * 100)); paintMute(); };
    const closeVolPop = (): void => { if (volOpen) setVolOpen(false); };
    document.addEventListener("click", closeVolPop);
    this.cleanups.push(() => document.removeEventListener("click", closeVolPop));
    paintMute();
    // battle log — CLOSED by default; a mid-left edge tab opens the drawer.
    // Once opened it stays open (state persisted in localStorage).
    const gameEl = this.root.querySelector(".game") as HTMLElement;
    // hand the pre-rolled battlefield to CSS (the .game background renders it
    // full-viewport under a thin dark readability overlay — see game.css)
    gameEl.style.setProperty("--battlefield-bg", `url("${this.battlefieldBg}")`);
    let logOpen = false;
    try { logOpen = localStorage.getItem("lore_log_open") === "1"; } catch { /* ignore */ }
    const applyLog = () => {
      gameEl.classList.toggle("log-open", logOpen);
      this.q("logTab").classList.toggle("on", logOpen);
    };
    const setLog = (open: boolean) => {
      if (logOpen === open) return;
      logOpen = open;
      try { localStorage.setItem("lore_log_open", logOpen ? "1" : "0"); } catch { /* ignore */ }
      applyLog();
    };
    const toggleLog = () => setLog(!logOpen);
    (this.q("logTab")).onclick = toggleLog;
    // explicit ✕ inside the panel — on a phone the drawer is a bottom sheet that
    // COVERS its own edge tab, so the tab alone left no way back out.
    const logClose = document.createElement("button");
    logClose.className = "log-close";
    logClose.id = "logClose";
    logClose.setAttribute("aria-label", "close");
    logClose.textContent = "✕";
    logClose.onclick = (e) => { e.stopPropagation(); setLog(false); };
    this.q("logPanel").appendChild(logClose);
    // tap anywhere outside the drawer closes it (phones/tablets only — on
    // desktop the log is a persistent side panel and every board click would
    // dismiss it). Two belts: a real backdrop element that swallows the tap,
    // plus a capture-phase listener for anything that renders above it.
    const backdrop = this.q("logBackdrop");
    const eatOutside = (e: Event): void => {
      if (!document.body.contains(this.root)) return;   // screen was swapped
      if (!logOpen || !GameView.isDrawerLog()) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest("#logPanel") || el?.closest("#logTab")) return;
      e.preventDefault(); e.stopPropagation();
      setLog(false);
    };
    backdrop.addEventListener("pointerdown", eatOutside);
    backdrop.addEventListener("click", (e) => e.stopPropagation());
    document.addEventListener("pointerdown", eatOutside, { capture: true });
    this.cleanups.push(() => document.removeEventListener("pointerdown", eatOutside, { capture: true }));
    applyLog();
    const noCtx = (e: Event): void => e.preventDefault();
    document.addEventListener("contextmenu", noCtx);
    this.cleanups.push(() => document.removeEventListener("contextmenu", noCtx));

    // ---- hand: Hearthstone-style two states. Default = COMPACT stack held to the
    // right of my portrait; clicking it EXPANDS the hand large at bottom-center.
    // Clicking anywhere outside the expanded hand collapses it back. ----
    const collapse = (e: PointerEvent) => {
      if (!document.body.contains(this.root)) return;      // screen was swapped
      if (!this.handOpen) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest("#hand") || el?.closest(".zoom-overlay")) return; // zoom close ≠ hand close
      this.setHandOpen(false);
    };
    document.addEventListener("pointerdown", collapse, { capture: true });
    this.cleanups.push(() => document.removeEventListener("pointerdown", collapse, { capture: true }));

    // A press ANYWHERE on the compact stack expands it. This lives on the
    // container (not just the cards) because the invisible hit-pad — and the
    // lowest card's own stacking order — used to swallow the press on card #0.
    const handEl = this.q("hand");
    handEl.addEventListener("pointerdown", (e) => {
      // Card presses must reach bindHandCard: the same gesture can expand AND
      // drag. Only empty hit-pad presses are handled by the container.
      if (this.handOpen || (e.target as Element)?.closest('.card')) return;
      e.stopPropagation();
      this.setHandOpen(true);
      swallowNextClick(handEl);
    }, { capture: true });
    // Re-measure compact and expanded hand steps after responsive sizing.
    this.onLayout = () => this.layoutHand();
    window.addEventListener("lore:layout", this.onLayout);
  }

  /** The log is an overlay drawer (not a persistent side panel) below 860px. */
  private static drawerMq: MediaQueryList | null =
    typeof matchMedia === "function" ? matchMedia("(max-width: 860px), (pointer: coarse)") : null;
  private static isDrawerLog(): boolean { return !!GameView.drawerMq?.matches; }

  private onLayout: ((e: Event) => void) | null = null;
  /** document/mediaQuery listeners installed by buildSkeleton — the SPA swaps
   *  screens by replacing innerHTML, so anything global MUST be detached here
   *  or it stacks per match (and retains the whole board DOM via closures). */
  private cleanups: Array<() => void> = [];
  /** Detach the window/document-level listeners this view installed. */
  destroy(): void {
    this.disposed = true;
    this.cancelHandDrag?.();
    this.disposeScene?.();
    if (this.onLayout) window.removeEventListener("lore:layout", this.onLayout);
    for (const fn of this.cleanups.splice(0)) { try { fn(); } catch { /* already gone */ } }
  }

  private handOpen = false;
  private cancelHandDrag: (() => void) | null = null;
  setHandOpen(open: boolean): void {
    if (this.handOpen === open) return;
    this.handOpen = open;
    (this.root.querySelector(".game") as HTMLElement | null)?.classList.toggle("hand-open", open);
  }

  private q(id: string): HTMLElement { return this.root.querySelector("#" + id) as HTMLElement; }

  /** Append a compact event icon to the topbar rail (glanceable history when the log is closed). */
  pushIcon(kind: string): void {
    const map: Record<string, [string, string]> = {
      summon: ["🐾", ""], attack: ["⚔", ""], destroy: ["💥", "dmg"], buy: ["🛒", "gold"],
      draw: ["🃏", ""], playSpell: ["✨", ""], trapReveal: ["⚡", "dmg"], heal: ["✚", "good"], hitme: ["🩸", "dmg"],
    };
    const m = map[kind]; if (!m) return;
    const rail = this.root.querySelector("#iconRail"); if (!rail) return;
    const chip = document.createElement("span");
    chip.className = "rail-ico" + (m[1] ? " " + m[1] : "");
    chip.textContent = m[0];
    rail.appendChild(chip);
    while (rail.children.length > 18) rail.removeChild(rail.firstChild as Node);
    requestAnimationFrame(() => chip.classList.add("in"));
  }

  /** Playback marker only — input is NEVER locked (the player can always act;
   *  acting fast-forwards whatever is still animating). */
  setPlaying(on: boolean): void {
    (this.root.querySelector(".game") as HTMLElement | null)?.classList.toggle("fx-playing", on);
  }

  render(g: GameState): void {
    const me = g.players[this.you];
    const opp = g.players[1 - this.you];
    const myTurn = g.cur === this.you && !g.over;
    const pending = g.pending;
    // opponent's equipped sleeve (server-synced); falls back to default for bot/local games
    OPP_SLEEVE = sleeveUrl(g.sleeves?.[1 - this.you]);

    this.q("turnInfo").innerHTML = `<span class="turn-badge"><span class="tb-label">${t("game.turn")}</span><span class="tb-num">${g.turn}</span></span><span class="turn-cur"><b>${t(myTurn ? "fx.yourturn" : "fx.oppturn")}</b></span>`;
    // refresh static labels (so a live language switch updates them)
    this.q("endBtn").textContent = t("game.endturn");
    const gvl = this.q("giveupBtn").querySelector(".gv-label"); if (gvl) gvl.textContent = t("game.surrender");
    this.q("logTitle").textContent = t("game.log");
    this.q("logTab").textContent = t("game.log");

    // Hearthstone-style center portraits (opp top / me bottom)
    this.renderPortrait(this.q("portraitOpp"), opp, false);
    this.renderPortrait(this.q("portraitMe"), me, true);
    this.q("portraitMe").classList.toggle("is-active", myTurn);
    this.q("portraitOpp").classList.toggle("is-active", !myTurn && !g.over);

    // opponent hand (face-down): straight upright stack held to the right of their
    // portrait. Overlap tightens as the count grows so the RIGHT edge stays put.
    const oh = this.q("oppHand"); oh.innerHTML = "";
    const n = opp.hand.length;
    // back size follows the solved portrait size (--pt) so it scales with the viewport
    const pt = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--pt")) || 58;
    const obw = Math.max(18, Math.round(pt * 0.82 * 0.64)); // back width (px)
    const spread = obw * 4.4;
    const ostep = n <= 1 ? 0 : Math.min(obw * 0.62, Math.max(6, (spread - obw) / (n - 1)));
    for (let i = 0; i < n; i++) {
      const cb = document.createElement("div");
      cb.className = "card--back";
      cb.style.width = `${obw}px`;
      cb.style.height = `${obw / .64}px`;
      cb.style.backgroundImage = `url(${OPP_SLEEVE})`;
      cb.style.left = `${i * ostep}px`;
      cb.style.zIndex = String(i);
      oh.appendChild(cb);
    }
    oh.style.width = `${n ? obw + (n - 1) * ostep : 0}px`;
    if (n > 0) {
      const cnt = document.createElement("div");
      cnt.className = "opp-hand-count";
      cnt.textContent = String(n);
      oh.appendChild(cnt);
    }


    this.renderRow(this.q("oppRow"), g, opp, false, myTurn, pending);
    this.renderRow(this.q("meRow"), g, me, true, myTurn, pending);
    this.renderMarket(g, me, myTurn);
    this.renderHand(g, me, myTurn);

    (this.q("endBtn") as HTMLButtonElement).disabled = !myTurn || !!pending;

    // Warm the full-resolution art for everything enlargeable on this board, at
    // idle. A tap on a phone has no hover to hint from, so without this the
    // player waits for the master to download the first time they enlarge a
    // card. Bounded by what is actually on screen (~30 cards), de-duped for the
    // session, and skipped entirely on a metered or slow connection.
    for (const c of [...me.hand, ...me.field, ...opp.field, ...g.market, ...(g.players[g.cur].supply.filter(Boolean) as CardInst[])]) {
      if (c && c.id !== "HIDDEN") prefetchZoomArt(c.id);
    }

    // target hint banner
    const hint = this.q("targetHint");
    if (pending && myTurn && (pending.kind === "oppMon" || pending.kind === "myMon")) {
      hint.style.display = "block";
      hint.innerHTML = `▸ ${getLang() === "ja" ? pending.hintJa : getLang() === "en" ? logToEn(pending.hint) : pending.hint}` + (pending.allowCancel ? ` &nbsp; <a id="cancelTarget" style="cursor:pointer">[${t("common.cancel")}]</a>` : "");
      const c = hint.querySelector("#cancelTarget") as HTMLElement | null;
      if (c) c.onclick = () => this.h.onChooseTarget(null);
    } else {
      hint.style.display = "none";
    }
  }

  private renderRow(row: HTMLElement, g: GameState, p: PlayerState, isMe: boolean, myTurn: boolean, pending: GameState["pending"]): void {
    row.innerHTML = "";
    const onTurn = !g.over && g.cur === (g.players.indexOf(p) as Side);

    // 필드 오른쪽 더미 열: [묘지][덱] — 둘 다 정사각 타일과 "같은 폭", 높이는 카드 정상 비율
    // (폭을 타일에 맞추면 카드 비율상 한 줄보다 높아지므로 두 줄에 걸쳐 세운다.)
    const sortByCost = (cards: CardInst[]) => [...cards].sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
    const graveTop = p.discard[p.discard.length - 1];
    const graveArt = graveTop && graveTop.id !== "HIDDEN" ? artUrl.full(graveTop.id) : graveTop ? frameFor(graveTop.t) : null;
    const gravePile = this.pileEl(isMe ? "pile-myDisc" : "pile-oppDisc", p.discard.length, graveArt, graveTop ?? null, t("game.discard"),
      () => { if (p.discard.length) cardPicker(`${esc(p.name)} — ${t("game.discard")} (${p.discard.length})`, sortByCost(p.discard), () => { /* browse only */ }); });
    // clicking the DECK opens the full composition (own or opponent's public aggregate)
    const collection = this.collectionOf(p, isMe);
    // my deck → also show the cards still remaining (undrawn); opponent's remaining deck is hidden
    const remaining = isMe ? [...p.deck].sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name)) : null;
    const deckPile = this.pileEl(isMe ? "pile-myDeck" : "pile-oppDeck", p.deck.length, backFor(isMe), null, t("game.deck"),
      () => deckViewer(`${esc(p.name)} — ${t("deck.view")}`, collection, remaining, !isMe));

    const block = document.createElement("div");
    block.className = "field-block" + (isMe ? " is-mine" : " is-opp") + (onTurn ? " is-turn" : "");

    // monster zone
    const mz = document.createElement("div");
    mz.className = "zone zone-mon";
    // anySide(파괴 선택, v21): oppMon pending이라도 자신 필드의 몬스터를 고를 수 있다
    const targetableZone = !!pending && ((pending.kind === "oppMon" && (!isMe || !!(pending.data as { anySide?: boolean } | undefined)?.anySide)) || (pending.kind === "myMon" && isMe)) && myTurn;
    p.field.forEach((m, idx) => {
      // 아우라(ward): 공격 대상으로는 지정 가능하지만 마법·몬스터 "효과"의 대상은 안 됨
      // 고급 부화기(incubate): 자신의 "알"만 선택 가능
      const targetableMon = targetableZone
        && !(pending!.kind === "oppMon" && !isMe && pending!.reason !== "attack" && hasPassive(m, "aura")) // 아우라는 상대 효과만 차단 — 내 카드는 내 효과로 파괴 가능
        && !(pending!.kind === "oppMon" && pending!.reason === "decayMark" && m.hatch != null) // 카운터: 알 제외
        && !(pending!.kind === "oppMon" && pending!.reason === "destroyMon" && pending!.data?.maxCost != null && m.cost > (pending!.data.maxCost as number)) // 룬 파열: 코스트 캡
        && !(pending!.kind === "myMon" && pending!.reason === "incubate" && m.hatch == null)
        && !(pending!.kind === "myMon" && pending!.reason === "chosenMage" && (m.id !== "CHOSEN_MAGE" || ((pending!.data?.fired as string[] | undefined) ?? []).includes(m.uid))) // 마법사만 발동 가능
        && !(pending!.kind === "myMon" && pending!.reason === "grantDecay" && hasPassive(m, "decay")) // 이미 부패 보유
        && !(pending!.kind === "myMon" && pending!.reason === "grantMajesty" && hasPassive(m, "majesty")) // 이미 위엄 보유
        && !(pending!.kind === "myMon" && pending!.reason === "emberBuff" && m.tribe !== "시초") // 시초의 불씨: 시초만
        && !(pending!.kind === "myMon" && pending!.reason === "golemBuff" && !isGolem(m)) // 앤티크 인핸스 매직: 골램만
        && !(pending!.kind === "myMon" && pending!.reason === "worldTree" && (m.id !== "WORLD_TREE" || (m.gcount || 0) <= 0)) // 세계수: 카운터 있는 세계수만
        && !(pending!.kind === "myMon" && (((pending!.data?.excl as string[] | undefined) ?? []).includes(m.uid))); // 지원 나팔: 이미 고른 몬스터는 중복 선택 불가
      const canAttack = isMe && myTurn && !pending && !m.exhausted && !g.over && m.hatch == null; // 알은 공격 불가
      // 카지노(v34): 카운터 배지 (12개마다 카지노 주사위)
      const countLabel = getLang() === 'ja' ? 'カウント' : getLang() === 'en' ? 'Count' : '카운트';
      const casinoBadge = m.aura === "casino" ? { badge: `${countLabel} ${m.gcount || 0}/12` } : m.id === "CASTLE" ? { badge: `${countLabel} ${m.gcount || 0}` } : {};
      const card = cardEl(m, { field: true, compactField: true, owner: p, attacker: canAttack, targetable: targetableMon, exhausted: m.exhausted, ...casinoBadge });
      if (targetableMon) card.onclick = () => this.h.onChooseTarget(m.uid);
      else if (canAttack) card.onclick = () => this.h.onAttack(m.uid);
      // zoom shows the monster's CURRENT atk/hp (buffs/mods applied) — and, when damaged,
      // "현재/최대" exactly like the field tile (v29: the zoom used to show max HP only,
      // so a 4/20 monster read as a healthy 20 in the view players trade off).
      bindZoom(card, { ...m, atk: effAtk(p, m), def: effDef(p, m) }, { now: curHp(p, m), max: effDef(p, m) });
      // 드래그 = 공격(상대 몬스터/초상화로) + 내 필드 안에서는 순서 변경.
      // 예전엔 몬스터가 2체 이상일 때만 드래그가 붙어서 1체일 땐 공격 드래그가 아예 없었다.
      if (isMe && myTurn && !pending && !g.over && (canAttack || p.field.length > 1)) {
        const opp = g.players[1 - (g.players.indexOf(p) as Side)];
        this.enableMonsterDrag(card, idx, mz, {
          uid: m.uid,
          canReorder: p.field.length > 1,
          canAttack,
          oppHasMon: opp.field.length > 0,
          directOnly: !!m.directOnly,
        });
      }
      mz.appendChild(card);
    });
    for (let i = p.field.length; i < MON_SLOTS; i++) mz.appendChild(this.slotEl());

    // spell/trap zone
    const sz = document.createElement("div");
    sz.className = "zone zone-st";
    ensureCardCompositing();
    const trapLabel = t("duel.setTrap");
    p.traps.forEach((t) => {
      // Generic trap icon and unknown cost preserve hidden identity for both players.
      const tile = document.createElement("div");
      tile.className = "buff-icon buff-icon--trap";
      tile.innerHTML = `<span class="buff-frame" style="background-image:url(${fieldFrameFor('trap')})"></span><span class="buff-art" style="background-image:url(${refinedArt('trap-seal')})"></span><span class="buff-cost" aria-hidden="true"><span>?</span></span>`;
      tile.title = trapLabel;
      tile.setAttribute("aria-label", trapLabel);
      // v30 카운터 배지 — 카운트다운(⏳남은 턴) / 정보상(×남은 사용 횟수).
      // 자신의 함정은 항상, 상대 함정은 발동으로 정체가 공개된 정보상만 (카운트다운은 비공개 유지)
      if (t.cnt != null && (isMe || t.card.react === "infoDealer")) {
        const b = document.createElement("span");
        b.className = "badge trap-cnt";
        b.textContent = t.card.react === "doomsday" ? `⏳${t.cnt}` : `×${t.cnt}`;
        tile.appendChild(b);
      }
      sz.appendChild(tile);
    });
    p.enchants.forEach((e) => {
      const lim = e.card.ench ? ENCH_TURN_LIMITS[e.card.ench] : undefined;
      const elapsed = lim != null ? Math.max(0, g.turn - (e.bornTurn ?? 0)) : null;
      const rem = lim != null ? Math.max(0, lim - elapsed!) : enchantHasTurnCountdown(e.card) ? Math.max(0, e.turns) : null;
      const bits = [elapsed != null ? `${Math.min(elapsed,lim!)}/${lim}` : rem != null ? `${getLang() === 'ja' ? '残り' : getLang() === 'en' ? '' : '남은 '}${rem}` : ''];
      if (e.cnt != null && e.cnt > 0) bits.push(`×${e.cnt}`);
      const lang = getLang();
      const state = elapsed != null
        ? (lang === 'ja' ? `経過 ${elapsed}/${lim}ターン · 残り ${rem}ターン` : lang === 'en' ? `Elapsed ${elapsed}/${lim} turns · ${rem} remaining` : `경과 ${elapsed}/${lim}턴 · 남은 ${rem}턴`)
        : rem != null ? (lang === 'ja' ? `残り ${rem}ターン` : lang === 'en' ? `${rem} turns remaining` : `남은 ${rem}턴`)
        : (lang === 'ja' ? '永続魔法' : lang === 'en' ? 'Permanent spell' : '지속 마법');
      const stateText = state + (e.cnt ? ` · ×${e.cnt}` : '');
      const durationUi = rem == null
        ? `<img class="buff-infinity" src="/art/biblion/modular/infinity.png" alt="${lang === 'ja' ? '無期限' : lang === 'en' ? 'Permanent' : '무기한'}">${e.cnt ? `<span class="buff-counter">×${e.cnt}</span>` : ''}`
        : `<span class="buff-duration" aria-label="${stateText}"><span>${bits.join(' ')}</span></span>`;
      const card = document.createElement('div');
      card.className = 'buff-icon buff-icon--spell';
      card.dataset.uid = e.card.uid;
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `${cardName(e.card)} ${stateText}`);
      card.title = `${cardName(e.card)} · ${stateText}`;
      card.innerHTML = `<span class="buff-frame" style="background-image:url(${fieldFrameFor('spell')})"></span><span class="buff-art" style="background-image:url(${artUrl.full(e.card.id)})"></span><span class="buff-cost" aria-hidden="true"><span>${e.card.cost}</span></span>${durationUi}`;
      card.onclick = () => zoomCard(e.card, undefined, stateText);
      card.onkeydown = ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); zoomCard(e.card, undefined, stateText); } };
      if (rem != null) { card.classList.add("ench-timed"); if (rem <= 1) card.classList.add("ench-expiring"); }
      else card.classList.add("ench-perm");
      bindZoom(card, e.card, undefined, stateText);
      sz.appendChild(card);
    });
    for (const q of p.quests ?? []) {
      const tile = document.createElement("button");
      tile.className = "buff-icon buff-icon--quest";
      tile.dataset.uid = q.card.uid;
      const progress = `${q.progress}/${q.card.quest?.target ?? 0}`;
      tile.title = `${cardName(q.card)} · ${progress} · ${q.card.textJa ?? q.card.text}`;
      tile.setAttribute("aria-label", `${cardName(q.card)} クエスト進捗 ${progress}`);
      tile.innerHTML = `<span class="buff-frame" style="background-image:url(${fieldFrameFor('quest')})"></span><span class="quest-progress">${progress}</span>`;
      tile.onclick = () => zoomCard(q.card, undefined, `クエスト進捗 ${progress}`);
      sz.appendChild(tile);
    }
    for (let i = p.traps.length + p.enchants.length + (p.quests?.length ?? 0); i < ST_SLOTS; i++) sz.appendChild(this.slotEl());

    // Monster zone nearest the center line: me → mon on top, opp → mon on bottom.
    const monRow = this.zoneRow(mz);
    const stRow = this.zoneRow(sz);
    monRow.dataset.label = `${t("duel.monsters")} ${p.field.length}/${MON_SLOTS}`;
    stRow.dataset.label = `${t("duel.spellsTraps")} ${p.traps.length + p.enchants.length + (p.quests?.length ?? 0)}/${ST_SLOTS}`;
    mz.setAttribute("aria-label", monRow.dataset.label);
    sz.setAttribute("aria-label", stRow.dataset.label);
    const zones = document.createElement("div");
    zones.className = "zones";
    if (isMe) zones.append(monRow, stRow); else zones.append(stRow, monRow);

    // 더미 열: 덱 → 묘지 순(바깥쪽이 묘지). 넓은 화면에선 필드 오른쪽에 세로로,
    // 좁은 화면(.board-underpile)에선 7칸 두 줄 ARABE 아래에 가로로 깔린다 — CSS만으로 전환.
    const piles = document.createElement("div");
    piles.className = "pile-col";
    piles.append(deckPile, gravePile);

    block.append(zones, piles);

    // 제외는 자기 필드 블록 바로 오른쪽 (레일이 아니라 본인 필드 옆)
    const aside = document.createElement("div");
    aside.className = "row-aside";
    const removed = (p.removed ?? []).slice().sort((a, b) => a.cost - b.cost);
    {
      const rbtn = document.createElement("button");
      rbtn.className = "rift-button";
      rbtn.id = isMe ? "rift-me" : "rift-opp";
      const previous = this.riftCounts.get(rbtn.id);
      if (previous != null && removed.length > previous) rbtn.classList.add("is-absorbing");
      this.riftCounts.set(rbtn.id, removed.length);
      rbtn.addEventListener("animationend", () => rbtn.classList.remove("is-absorbing"));
      rbtn.innerHTML = `<span class="rift-sprite" aria-hidden="true"></span><span class="rift-label">${t("deck.removed")} <b>${removed.length}</b></span>`;
      rbtn.title = `${t("deck.removed")} ${removed.length}`;
      rbtn.onclick = () => cardPicker(`${esc(p.name)} — ${t("deck.removed")} (${removed.length})`, removed, () => { /* browse only */ });
      piles.appendChild(rbtn);
    }

    row.append(block, aside);
  }

  /** One zone line (slots only — 덱/묘지 더미는 field-block 오른쪽의 pile-col로 빠졌다). */
  private zoneRow(zone: HTMLElement): HTMLElement {
    const rowEl = document.createElement("div");
    rowEl.className = "zone-row";
    rowEl.append(zone);
    return rowEl;
  }

  /**
   * Drag & drop reordering of my own field monsters (my turn only).
   * Pointer-based so it works with mouse AND touch; a short tap still
   * clicks (attack), and the 380ms long-press zoom keeps working:
   * - drag only starts past a 14px move threshold (zoom cancels at 12px)
   * - on touch, if the long-press window already elapsed, the zoom owns
   *   the gesture and we abort instead of dragging behind the overlay.
   */
  /** Pointer drag on one of MY monsters:
   *   - sideways inside my own monster zone  → reorder (drop marker)
   *   - up toward the opponent               → ATTACK (drop on a monster, or on the
   *     enemy portrait for a direct attack)
   *  Playing a card is already a drag, so attacking had to become one too. Tap still
   *  attacks (desktop habit) and a long press still zooms. */
  private enableMonsterDrag(
    card: HTMLElement, index: number, zone: HTMLElement,
    o: { uid: string; canReorder: boolean; canAttack: boolean; oppHasMon: boolean; directOnly: boolean },
  ): void {
    card.style.touchAction = "none"; // keep pointermove alive on touch
    // native HTML5 drag (e.g. of the card art <img>) fires pointercancel and
    // kills our pointer stream — suppress it so drags stay pointer-based
    card.draggable = false;
    card.addEventListener("dragstart", (e) => e.preventDefault());
    card.addEventListener("pointerdown", (e: PointerEvent) => {
      if (e.button !== 0) return;
      const isTouch = e.pointerType === "touch";
      const sx = e.clientX, sy = e.clientY, t0 = performance.now();
      let ghost: HTMLElement | null = null;
      let marker: HTMLElement | null = null;
      let to = index;
      let done = false;
      let mode: "reorder" | "attack" = "reorder";
      let hot: HTMLElement | null = null; // currently highlighted attack target

      const others = (): DOMRect[] =>
        ([...zone.children] as HTMLElement[])
          .filter((el) => el.classList.contains("card") && el !== card)
          .map((el) => el.getBoundingClientRect());

      const setHot = (el: HTMLElement | null): void => {
        if (hot === el) return;
        hot?.classList.remove("is-atk-target");
        hot = el;
        hot?.classList.add("is-atk-target");
      };

      /** What is under the pointer? (the ghost is pointer-events:none so it never blocks) */
      const targetAt = (x: number, y: number): { mon: HTMLElement | null; portrait: HTMLElement | null } => {
        const el = document.elementFromPoint(x, y) as HTMLElement | null;
        return {
          mon: (el?.closest("#oppRow .zone-mon .card") as HTMLElement | null) ?? null,
          portrait: (el?.closest("#portraitOpp") as HTMLElement | null) ?? null,
        };
      };

      const place = (x: number, y: number): void => {
        if (!ghost) return;
        ghost.style.left = `${x}px`;
        ghost.style.top = `${y}px`;
        const zr = zone.getBoundingClientRect();
        const t = o.canAttack ? targetAt(x, y) : { mon: null, portrait: null };
        // above my own monster row = aiming at the opponent
        mode = o.canAttack && (!!t.mon || !!t.portrait || y < zr.top - 10) ? "attack" : "reorder";
        ghost.classList.toggle("drag-attack", mode === "attack");
        if (mode === "attack") {
          if (marker) marker.style.display = "none";
          setHot(t.mon ?? t.portrait);
          return;
        }
        setHot(null);
        if (!marker) return;
        marker.style.display = "";
        const rects = others();
        to = rects.filter((r) => x > r.left + r.width / 2).length;
        const mx = rects.length === 0 ? zr.left + 6 : to === 0 ? rects[0].left - 4 : rects[to - 1].right + 1;
        marker.style.left = `${mx - zr.left}px`;
      };

      const cleanup = (): void => {
        done = true;
        ghost?.remove(); marker?.remove();
        setHot(null);
        card.classList.remove("is-dragging");
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", cleanup);
      };

      const onMove = (ev: PointerEvent): void => {
        if (done || ev.pointerId !== e.pointerId) return;
        if (!ghost) {
          if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 14) return;
          if (isTouch && performance.now() - t0 > 340) { cleanup(); return; } // zoom overlay owns this gesture
          try { card.setPointerCapture(ev.pointerId); } catch { /* ok */ }
          ghost = card.cloneNode(true) as HTMLElement;
          ghost.className = card.className + " drag-ghost";
          ghost.classList.remove("is-attacker");
          ghost.style.width = `${card.offsetWidth}px`;
          ghost.style.height = `${card.offsetHeight}px`;
          document.body.appendChild(ghost);
          card.classList.add("is-dragging");
          if (o.canReorder) {
            marker = document.createElement("div");
            marker.className = "drop-marker";
            zone.appendChild(marker);
          }
        }
        place(ev.clientX, ev.clientY);
      };

      const onUp = (ev: PointerEvent): void => {
        if (done || ev.pointerId !== e.pointerId) return;
        const dragged = !!ghost;
        const t = dragged && o.canAttack ? targetAt(ev.clientX, ev.clientY) : { mon: null, portrait: null };
        const aimed = mode === "attack";
        cleanup();
        if (!dragged) return;
        // swallow the click that follows pointerup so it doesn't ALSO trigger an attack
        swallowNextClick(card);
        if (aimed && o.canAttack) {
          const tUid = t.mon?.dataset.uid;
          if (tUid) { this.h.onAttack(o.uid, tUid); return; }               // dropped on a monster
          if (t.portrait || !o.oppHasMon) {                                  // dropped on the face (or the board is clear)
            if (o.oppHasMon && !o.directOnly) { this.h.onBlockedAttack(); return; }
            this.h.onAttack(o.uid); return;
          }
          this.h.onAttack(o.uid); return;                                    // aimed forward, no precise target → engine asks
        }
        if (o.canReorder && to !== index) this.h.onReorder(index, to);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", cleanup);
    });
  }

  /** Full owned-card list for the deck-view button (opponent side uses only public info). */
  private collectionOf(p: PlayerState, isMe: boolean): CardInst[] {
    const fieldCards = p.field as unknown as CardInst[];
    const enchCards = p.enchants.map((e) => e.card);
    let pool: CardInst[];
    if (isMe) {
      pool = [...p.deck, ...p.hand, ...p.discard, ...fieldCards, ...p.traps.map((tr) => tr.card), ...enchCards];
    } else if (p.collection) {
      // Online: server-provided game-long reveal history. Current public zones are
      // already included, so adding them again would double-count those cards.
      pool = p.collection.map((id, i) => { const d = DBC[id] ?? STARTERS[id]; return d ? { uid: `v_${i}`, ...d } : null; }).filter((c): c is CardInst => !!c);
    } else if (p.revealedCards) {
      // Bot/local games keep the same information boundary without server redaction.
      pool = p.revealedCards.map((known, i) => { const d = DBC[known.id] ?? STARTERS[known.id]; return d ? { uid: `v_${i}`, ...d } : null; }).filter((c): c is CardInst => !!c);
    } else {
      // Legacy state fallback: show only cards that are public right now.
      pool = [...p.discard, ...fieldCards, ...enchCards];
    }
    return pool.filter((c) => c && c.id !== "HIDDEN").sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
  }

  private renderMarket(g: GameState, me: PlayerState, myTurn: boolean): void {
    // The 제시 (supply) on display belongs to whoever's turn it is — your own
    // on your turn, your opponent's (public) on theirs.
    const owner = g.players[g.cur];
    const mk = this.q("market");
    // 재렌더로 카드 노드가 갈리면 body에 떠 있던 확인 배지는 가리킬 대상을 잃는다
    document.querySelectorAll(".buy-confirm").forEach((b) => b.remove());
    mk.innerHTML = `
      <div class="market-heading"><span>${t("duel.market")}</span></div>
      <div class="market-counter">
        <div class="market-sub market-sub--supply">
          <div class="sub-head"><button class="refresh-btn" id="refreshBtn" aria-describedby="rerollHint"><span class="rf-ico">⟳</span> ${t("duel.rerollFour").replace("4", String(owner.supply.length))} <b>1</b> ◈</button></div>
          <div class="market-cards" id="supplyMarket"></div>
          <span class="reroll-hint" id="rerollHint">${t("duel.rerollHint").replace("4", String(owner.supply.length))}</span>
        </div>
        <div class="market-sub market-sub--fixed"><div class="market-cards" id="fixedMarket"></div></div>
      </div>`;

    // 오클릭 구매 방지: 첫 클릭 = 선택(확인 배지 표시), 같은 카드 재클릭 = 구매.
    // 빠른 더블클릭도 그대로 구매가 된다. 다른 곳 클릭/2.5초 경과 시 해제.
    let armedEl: HTMLElement | null = null;
    let armedKey = "";
    let armTimer = 0;
    // 확인 배지는 카드의 자식이 아니라 body 직속 고정 레이어다: 배지 문구가 카드
    // 폭보다 훨씬 넓어서(카드 65px vs 배지 113px) 카드 안에 두면 .market의
    // overflow:hidden에 잘리고, 카드 스태킹 컨텍스트에 갇혀 옆 카드 사이에 끼어
    // 보였다. body에 띄우면 항상 맨 앞, 절대 안 잘린다.
    const dropBadge = () => document.querySelectorAll(".buy-confirm").forEach((b) => b.remove());
    const disarm = () => {
      clearTimeout(armTimer);
      armedEl?.classList.remove("is-armed");
      dropBadge();
      armedEl = null; armedKey = "";
    };
    // 마켓 카드 조작 = 손패와 동일하게 "탭 = 확대". 구매는 더블탭으로 무장(확인 배지) →
    // 한 번 더 탭하면 구매. (예전엔 첫 탭이 곧 구매 무장이라 손패와 규칙이 어긋났다.)
    const TAP_MS = 260;
    let tapTimer = 0;
    const armBuy = (card: HTMLElement, key: string, buy: () => void, inst: CardInst) => {
      card.onclick = (e) => {
        e.stopPropagation();
        if (armedKey === key) { clearTimeout(tapTimer); tapTimer = 0; disarm(); buy(); return; } // 무장 상태에서 탭 = 구매
        if (tapTimer) { clearTimeout(tapTimer); tapTimer = 0; arm(card, key); return; }          // 더블탭 = 무장
        tapTimer = window.setTimeout(() => { tapTimer = 0; disarm(); zoomCard(inst); }, TAP_MS); // 단일 탭 = 확대
      };
      const arm = (c2: HTMLElement, k: string): void => {
        disarm();
        armedEl = c2; armedKey = k;
        c2.classList.add("is-armed");
        const badge = document.createElement("div");
        badge.className = "buy-confirm";
        badge.textContent = t("market.confirm");
        document.body.appendChild(badge);
        const place = (): void => {
          const r = c2.getBoundingClientRect();
          const bw = badge.offsetWidth;
          // 카드 위에 붙이되, 화면 좌우로는 절대 안 넘치게 클램프
          const x = Math.min(Math.max(r.left + r.width / 2, bw / 2 + 6), window.innerWidth - bw / 2 - 6);
          const above = r.top - 8 > badge.offsetHeight;
          badge.style.left = x + "px";
          badge.style.top = (above ? r.top - 6 : r.bottom + 6) + "px";
          badge.classList.toggle("below", !above);
        };
        place();
        armTimer = window.setTimeout(disarm, 2500);
      };
    };
    // 살 수 없는 카드도 탭하면 확대는 된다(손패와 동일)
    const zoomOnTap = (card: HTMLElement, inst: CardInst) => { card.onclick = (e) => { e.stopPropagation(); zoomCard(inst); }; };
    mk.onclick = () => disarm(); // 마켓 빈 곳 클릭 시 해제

    // 마켓 알림이: 덱 프리셋에 등록한 카드가 뜨면 은은한 링 + 🔔 점 표시
    const markWatch = (card: HTMLElement, id: string): void => {
      if (!MARKET_WATCH.has(id)) return;
      card.classList.add("is-watch");
      const dot = document.createElement("div");
      dot.className = "watch-dot";
      dot.textContent = "🔔";
      card.appendChild(dot);
    };

    const fixed = this.q("fixedMarket");
    g.market.forEach((c, i) => {
      const bc = buyCost(owner, c);
      const aff = myTurn && !g.pending && me.mana >= bc && purchaseAllowed(g, me, c) && !freeBuyBlocked(me, c);
      const card = cardEl(c, { size: "mkt", buyable: aff, dim: !aff, costOverride: bc }); // same size as 제시
      if (aff) armBuy(card, "mkt" + i, () => this.h.onBuyMarket(i), c); else zoomOnTap(card, c);
      // v40: 슬롯 재고 — 다 팔리면 새 카드로 교체되므로 남은 수를 보여준다
      const stock = marketStockOf(g, i);
      const st = document.createElement("div");
      st.className = "mkt-stock" + (stock <= 1 ? " mkt-stock--last" : "");
      st.textContent = `×${stock}`;
      st.title = `${t("market.stock")} ${stock}`;
      card.appendChild(st);
      markWatch(card, c.id);
      bindZoom(card, c);
      fixed.appendChild(card);
    });

    // 제시(supply): show sorted by type (monster → spell → trap), keeping the
    // ORIGINAL slot index for the buy handler; bought (null) slots render last.
    const sup = this.q("supplyMarket");
    const rank = (ty: string) => ty === "mon" ? 0 : (ty === "spell" || ty === "starter") ? 1 : 2;
    const filled = owner.supply.map((c, i) => ({ c, i })).filter((x) => x.c) as { c: CardInst; i: number }[];
    filled.sort((a, b) => rank(a.c.t) - rank(b.c.t) || a.c.cost - b.c.cost);
    for (const { c, i } of filled) {
      const bc = buyCost(owner, c);
      const aff = myTurn && !g.pending && me.mana >= bc && purchaseAllowed(g, me, c) && !freeBuyBlocked(me, c);
      const card = cardEl(c, { size: "mkt", buyable: aff, dim: !aff, costOverride: bc });
      const stock = document.createElement("div");
      stock.className = "mkt-stock mkt-stock--single";
      stock.textContent = "×1";
      stock.title = `${t("market.stock")} 1`;
      card.appendChild(stock);
      card.dataset.supIdx = String(i);  // ORIGINAL supply index (display is sorted) — buy anim finds it by this
      if (aff) armBuy(card, "sup" + i, () => this.h.onBuySupply(i), c); else zoomOnTap(card, c);
      if (myTurn) markWatch(card, c.id); // 제시는 내 턴의 내 제시만 (상대 제시엔 표시 무의미)
      bindZoom(card, c);
      sup.appendChild(card);
    }
    for (let k = filled.length; k < owner.supply.length; k++) sup.appendChild(this.slotEl("mkt", true));

    const rb = this.q("refreshBtn") as HTMLButtonElement;
    const rtok = me.refreshTokens || 0; // 렐릭 헌터(v36): 카운터가 있으면 무료 갱신
    rb.disabled = !myTurn || !!g.pending || (me.mana < 1 && rtok <= 0);
    const rbCost = rb.querySelector("b"); if (rbCost) rbCost.textContent = rtok > 0 ? `0 (${rtok})` : "1";
    rb.onpointerenter = () => mk.classList.add("reroll-focus");
    rb.onpointerleave = () => mk.classList.remove("reroll-focus");
    rb.onfocus = () => mk.classList.add("reroll-focus");
    rb.onblur = () => mk.classList.remove("reroll-focus");
    rb.onclick = () => this.h.onRefresh();
  }

  /** Shared portrait row: aligned HP on the left and mana on the right. */
  private renderPortrait(el: HTMLElement, p: PlayerState, isMe: boolean): void {
    const sd = isMe ? "me" : "opp";
    const emax = effMaxMana(p);
    const hp = Math.max(0, p.hp);
    const hpPct = hp / p.maxHp * 100;
    const crystals = Array.from({ length: Math.min(MAX_MANA, Math.max(0, emax)) }, (_, i) => `<i class="mana-crystal${i < p.mana ? " is-lit" : ""}" aria-hidden="true"></i>`).join("");
    const avatar = isMe ? MY_AVATAR : OPP_AVATAR;
    const seeker = avatar === "SEEKER_RED" || avatar === "SEEKER_BLUE" ? avatar : isMe ? "SEEKER_BLUE" : "SEEKER_RED";
    el.innerHTML = `
      <span class="pt-vitals"><span class="pt-hp" title="HP ${hp}/${p.maxHp}"><span class="pt-hp-ico">HP</span><b id="hp-${sd}">${hp}</b><span class="pt-hp-max">/${p.maxHp}</span></span>
      <span class="pt-hpbar hpbar" id="hpbar-${sd}" role="meter" aria-label="HP" aria-valuemin="0" aria-valuemax="${p.maxHp}" aria-valuenow="${hp}"><i style="width:${Math.min(100, hpPct)}%"></i></span></span>
      <span class="pt-ring">${avatarHtml(seeker, p.name, 100)}</span>
      <span class="pt-mana pips" aria-label="${t("game.mana")} ${p.mana}/${emax}"><span class="mana-readout">${t("game.mana")} <b>${p.mana}</b><span class="pt-mana-max">/${emax}</span></span><span class="mana-crystals" style="--mana-rows:${Math.max(1,Math.ceil(Math.min(MAX_MANA,emax)/10))}">${crystals}</span></span>
      ${(p.brand ?? 0) > 0 ? `<span class="pt-brand" title="${esc(t("game.brandTip").replace("{n}", String(p.brand)))}">${t("game.brand")} <b>${p.brand}</b></span>` : ""}
      <span class="pt-name">${esc(p.name)}</span>`;
  }

  /** MY hand — straight upright cards (no fan) in two states:
   *  - compact (default): small stack right of my portrait; overlap tightens with
   *    the card count so the RIGHT edge stays anchored ("completes to the right").
   *    Any press on it just expands the hand.
   *  - open: large, bottom-center. Click a card = zoom preview; DRAG it up = play. */
  private renderHand(g: GameState, me: PlayerState, myTurn: boolean): void {
    this.cancelHandDrag?.();
    const handEl = this.q("hand");
    handEl.innerHTML = "";
    me.hand.forEach((c, idx) => {
      const pc = playCost(c, me);
      const aff = myTurn && !g.pending && !c.quick && me.mana >= pc && (c.t !== "quest" || me.traps.length + me.enchants.length + (me.quests?.length ?? 0) < 14);
      const card = cardEl(c, { size: "hand", playable: aff, dim: !aff, costOverride: pc });
      card.style.setProperty("--hi", String(idx));
      card.style.zIndex = String(idx);
      this.bindHandCard(card, c, aff);
      handEl.appendChild(card);
    });
    this.layoutHand();
  }

  /** Per-state overlap steps (CSS picks the var by .hand-open on .game).
   *  Measured against the REAL card width, and re-run on every layout solve —
   *  the solver's settle passes resize cards after the first render. */
  private layoutHand(): void {
    const handEl = this.root.querySelector("#hand") as HTMLElement | null;
    if (!handEl) return;
    const n = handEl.children.length;
    const cw = (handEl.querySelector(".card") as HTMLElement | null)?.offsetWidth || 100;
    const vw = Math.round(window.visualViewport?.width || window.innerWidth) || 960; // hidden tabs report 0
    const openStep = n <= 1 ? cw : Math.min(cw + 8, Math.max(cw * 0.42, (Math.min(vw * 0.86, 960) - cw) / (n - 1)));
    const compactStep = n <= 1 ? cw : Math.min(cw * 0.6, Math.max(16, (300 - cw) / (n - 1)));
    handEl.style.setProperty("--h-step-open", `${openStep}px`);
    handEl.style.setProperty("--h-step-compact", `${compactStep}px`);
    handEl.style.setProperty("--h-w-open", `${n ? cw + (n - 1) * openStep : 0}px`);
    handEl.style.setProperty("--h-w-compact", `${n ? cw + (n - 1) * compactStep : 0}px`);
  }

  /** Drag onto the visible board to play; return to the hand to cancel. */
  private bindHandCard(card: HTMLElement, c: CardInst, aff: boolean): void {
    card.style.touchAction = "none";
    card.draggable = false;
    card.addEventListener("dragstart", (e) => e.preventDefault());
    card.addEventListener("pointerdown", (e: PointerEvent) => {
      if (e.button !== 0) return;
      this.cancelHandDrag?.();
      const wasOpen = this.handOpen;
      if (!wasOpen) { this.setHandOpen(true); swallowNextClick(card); }
      e.preventDefault();
      // Capture before the expansion moves the original card away from the
      // pointer. Mouse, pen and touch then follow one uninterrupted gesture.
      try { card.setPointerCapture(e.pointerId); } catch { /* detached/legacy */ }
      const sx = e.clientX, sy = e.clientY;
      let ghost: HTMLElement | null = null;
      let done = false;
      let guide: HTMLElement | null = null;
      const destination = this.root.querySelector<HTMLElement>(c.t === "mon" ? "#meRow .zone-mon" : "#meRow .zone-st");
      const dropBounds = () => {
        const top = this.q("oppRow").getBoundingClientRect();
        const bottom = this.q("meRow").getBoundingClientRect();
        return { left: bottom.left, right: bottom.right, top: top.top - 12, bottom: bottom.bottom + 16 };
      };
      const canDropAt = (x: number, y: number) => {
        const r = dropBounds(), hand = this.q("hand").getBoundingClientRect();
        const overHand = x >= hand.left && x <= hand.right && y >= hand.top && y <= hand.bottom;
        return !overHand && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
      };
      const game = this.root.querySelector(".game") as HTMLElement | null;

      const cleanup = (): void => {
        if (done) return;
        done = true;
        ghost?.remove();
        guide?.remove();
        destination?.classList.remove("drop-destination", "drop-ready");
        card.classList.remove("is-dragging");
        game?.classList.remove("drag-play");
        this.cancelHandDrag = null;
        try { card.releasePointerCapture(e.pointerId); } catch { /* already released */ }
        card.removeEventListener("lostpointercapture", cleanup);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", cleanup);
      };
      const onMove = (ev: PointerEvent): void => {
        if (done || ev.pointerId !== e.pointerId) return;
        if (!ghost) {
          if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < (e.pointerType === 'touch' ? 10 : 6)) return;
          try { card.setPointerCapture(ev.pointerId); } catch { /* ok */ }
          ghost = card.cloneNode(true) as HTMLElement;
          ghost.className = card.className + " drag-ghost drag-ghost--hand";
          ghost.classList.remove('is-played', 'is-dragging', 'tilt-live');
          // A hand card has inline z-index 0..N. That must never override the
          // drag layer: low-index cards otherwise disappear behind the board.
          ghost.style.zIndex = '2000';
          ghost.style.visibility = 'visible';
          ghost.style.opacity = '1';
          // Field-sized silhouette, with hand aspect ratio and proportional seals.
          const field = this.root.querySelector<HTMLElement>("#meRow .zone-mon .card, #meRow .zone-mon .slot");
          const fieldWidth = field?.getBoundingClientRect().width || 64;
          const width = Math.min(card.offsetWidth * .65 * .72, fieldWidth);
          const height = width * card.offsetHeight / card.offsetWidth;
          ghost.style.setProperty("--cw", `${width}px`);
          ghost.style.setProperty("--ch", `${height}px`);
          ghost.style.width = `${width}px`;
          ghost.style.height = `${height}px`;
          // Text fitting stores pixel sizes on the source. Scale those too,
          // otherwise the smaller drag card inherits an oversized clipped title.
          for (const label of ghost.querySelectorAll<HTMLElement>("[style]")) {
            if (label.style.fontSize.endsWith("px")) label.style.fontSize = `${parseFloat(label.style.fontSize) * width / card.offsetWidth}px`;
          }
          document.body.appendChild(ghost);
          card.classList.add("is-dragging");
          if (aff) game?.classList.add("drag-play");
          guide = document.createElement("div");
          guide.className = "play-drop-guide";
          guide.setAttribute("role", "status");
          guide.setAttribute("aria-live", "polite");
          document.body.appendChild(guide);
          if (aff) destination?.classList.add("drop-destination");
        }
        ghost.style.left = `${ev.clientX}px`;
        ghost.style.top = `${ev.clientY}px`;
        const ready = canDropAt(ev.clientX, ev.clientY);
        destination?.classList.toggle("drop-ready", ready && aff);
        ghost.classList.toggle("drop-ready", ready && aff);
        if (guide) {
          const r = dropBounds();
          guide.style.left = `${r.left}px`; guide.style.top = `${r.top}px`;
          guide.style.width = `${r.right - r.left}px`; guide.style.height = `${r.bottom - r.top}px`;
          guide.classList.toggle("is-ready", ready && aff);
          guide.classList.toggle("is-blocked", !aff);
          const label = !aff ? t("play.drop.blocked") : ready ? t("play.drop.release") : t("play.drop.guide");
          if (guide.textContent !== label) guide.textContent = label;
        }
      };
      const onUp = (ev: PointerEvent): void => {
        if (done || ev.pointerId !== e.pointerId) return;
        const dragged = !!ghost;
        const inPlayArea = canDropAt(ev.clientX, ev.clientY);
        // Where the card actually IS when you let go — the play FX continues from
        // here (and leans with the drag) instead of restarting at the hand's left
        // edge. Derived from the pointer + the ghost's own anchor (CSS .drag-ghost
        // = translate(-50%,-58%)) rather than getBoundingClientRect(), which would
        // include the ghost's scale/rotate and land a few px off.
        const gw = ghost ? ghost.offsetWidth : 0, gh = ghost ? ghost.offsetHeight : 0;
        const rel = ghost ? { left: ev.clientX - gw / 2, top: ev.clientY - gh * 0.58, width: gw, height: gh } : null;
        cleanup();
        if (!dragged) return; // plain click → the click handler zooms
        swallowNextClick(card);
        // The highlight and submission use the same board bounds.
        if (inPlayArea) {
          if (aff) {
            setPlayOrigin(rel ? { left: rel.left, top: rel.top, width: rel.width, height: rel.height, dx: ev.clientX - sx, dy: ev.clientY - sy } : null);
            this.h.onPlay(c.uid); // uid, not index: the DOM can lag the logical state
          } else this.h.onBlockedPlay(c.uid); // explain WHY it can't be played (popup)
        } else setPlayOrigin(null); // dropped back on the hand — don't leak a stale origin
      };
      this.cancelHandDrag = cleanup;
      card.addEventListener("lostpointercapture", cleanup);
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", cleanup);
    });
    card.onclick = (e) => {
      e.stopPropagation();
      if (this.handOpen) zoomCard(c); // tap = enlarge preview; playing is drag-only now
    };
  }

  /** Semantic pile controls and GPU fallback; duelScene supplies the 3D skin. */
  private pileEl(id: string, count: number, frame: string | null, faceCard: CardInst | null, tag: string, onOpen?: () => void): HTMLElement {
    const pile = document.createElement("div");
    pile.className = "pile" + (id.endsWith("Disc") ? " pile--shelf" : " pile--deck") + (count ? "" : " is-empty");
    pile.tabIndex = 0;
    pile.setAttribute("role", "button");
    pile.setAttribute("aria-label", `${tag} ${count}`);
    pile.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen?.(); } };
    pile.id = id;
    pile.dataset.count = String(count);
    pile.dataset.texture = frame || FRAME_BACK;
    pile.dataset.sleeve = backFor(id.startsWith('pile-my'));
    // Only the public discard top gets a face texture. Decks use sleeve only.
    if (id.endsWith('Disc') && faceCard && faceCard.id !== 'HIDDEN') pile.dataset.face = artUrl.full(faceCard.id);
    const body = document.createElement("div");
    body.className = "pile-body";
    const shelf = id.endsWith("Disc");
    const bucket = deckBucket(count);
    pile.dataset.bucket = String(bucket);
    body.style.backgroundImage = `url(${refinedArt(shelf ? "shelf-case" : `deck-${bucket || 1}`)})`;
    if (!shelf && !count) body.style.opacity = "0.18";
    const front = document.createElement("div");
    front.className = "pile-card";
    if (count) front.style.backgroundImage = `url(${shelf && faceCard ? artUrl.full(faceCard.id) : backFor(id.startsWith('pile-my'))})`;
    else front.hidden = true;
    body.append(front); pile.append(body);
    if (shelf && faceCard && faceCard.id !== 'HIDDEN') {
      // Public discard face rendered by the same component as every real card.
      // Offscreen print feeds the mesh; it never receives input or accessibility focus.
      const print=document.createElement('div'); print.className='pile-print'; print.setAttribute('aria-hidden','true');
      print.append(cardEl(faceCard,{size:'hand'})); pile.append(print);
    }
    const tg = document.createElement("div"); tg.className = "pile-tag"; tg.textContent = tag; pile.appendChild(tg);
    const cnt = document.createElement("div"); cnt.className = "pile-count"; cnt.textContent = String(count); pile.appendChild(cnt);
    if (faceCard && faceCard.id !== "HIDDEN") bindZoom(pile, faceCard);
    if (onOpen) { pile.style.cursor = "pointer"; pile.title = "click: browse"; pile.addEventListener("click", onOpen); }
    return pile;
  }

  private slotEl(size?: "mkt", bought?: boolean): HTMLElement {
    const s = document.createElement("div");
    s.className = "slot" + (bought ? " is-bought" : "");
    if (bought) s.dataset.label = t("market.bought"); // CSS ::after reads attr(data-label) — 언어별 표기
    if (size === "mkt") { s.style.setProperty("--cw", "var(--card-w-mkt)"); s.style.setProperty("--ch", "var(--card-h-mkt)"); }
    return s;
  }
}
