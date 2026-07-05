// ============================================================
// LORE — board view. Renders the whole game from a GameState
// (from the viewer's perspective) and wires interaction handlers.
// All animation lives in anim.ts; this file only draws + binds.
// ============================================================
import type { CardInst, GameState, PlayerState, Side } from "../shared/types";
import { effMaxMana, playCost, buyCost, effAtk, effDef } from "../shared/engine";
import { frameFor, FRAME_BACK, sleeveUrl, TRIBES, DB as DBC, STARTERS } from "../shared/cards";
import { cardPicker } from "./modal";
import { cardEl } from "./cardView";
import { bindZoom } from "./anim";
import { t, getLang } from "../i18n";
import { logToEn } from "../shared/logEn";
import { getSfxVolume, setSfxVolume } from "./sound";
import { avatarHtml } from "./social";

// the local player's profile avatar (set by the game screen), shown in MY meta panel
let MY_AVATAR: string | null | undefined;
export function setMyAvatar(a?: string | null): void { MY_AVATAR = a; }

// the local player's equipped card-sleeve URL — used for MY deck/set-trap backs
// (opponent's backs stay default; per-player sleeve sync isn't wired through the engine).
let MY_SLEEVE = FRAME_BACK;
export function setMySleeve(id?: string | null): void { MY_SLEEVE = sleeveUrl(id); }
/** card-back image for a pile/back that belongs to `isMe`. */
function backFor(isMe: boolean): string { return isMe ? MY_SLEEVE : FRAME_BACK; }

const MON_SLOTS = 7;
const ST_SLOTS = 7;

export interface BoardHandlers {
  onPlay(uid: string): void;
  onBlockedPlay(uid: string): void;
  onAttack(uid: string): void;
  onReorder(from: number, to: number): void;
  onChooseTarget(uid: string | null): void;
  onBuyMarket(i: number): void;
  onBuySupply(i: number): void;
  onRefresh(): void;
  onEndTurn(): void;
  onSurrender(): void;
}

export class GameView {
  root: HTMLElement;
  you: Side;
  h: BoardHandlers;
  logEl!: HTMLElement;

  constructor(root: HTMLElement, you: Side, h: BoardHandlers) {
    this.root = root;
    this.you = you;
    this.h = h;
    this.buildSkeleton();
  }

  private buildSkeleton(): void {
    this.root.innerHTML = `
      <div class="game">
        <div class="topbar">
          <div class="brand"><div class="mark"></div><h1>LORE</h1></div>
          <div class="turn-info" id="turnInfo"></div>
          <button class="btn btn-danger giveup-btn" id="giveupBtn">${t("game.surrender")}</button>
        </div>
        <button class="mute-fab" id="muteBtn" title="${t("game.mute")}" aria-label="${t("game.mute")}"></button>
        <div class="stage">
          <div class="board-col">
            <div class="opp-hand" id="oppHand"></div>
            <div class="prow" id="oppRow"></div>
            <div class="panel market" id="market"></div>
            <div class="prow" id="meRow"></div>
            <div class="hand-area" id="handArea">
              <div class="hand" id="hand"></div>
              <div class="end-turn-wrap"><button class="btn btn-primary" id="endBtn">${t("game.endturn")}</button></div>
            </div>
          </div>
        </div>
        <!-- battle log: a left-edge drawer with a mid-left toggle tab -->
        <button class="log-tab" id="logTab" aria-label="log">${t("game.log")}</button>
        <div class="panel logpanel" id="logPanel">
          <div class="panel-title" id="logTitle">${t("game.log")}</div>
          <div class="log" id="log"></div>
        </div>
      </div>
      <div class="target-hint" id="targetHint" style="display:none"></div>`;
    this.logEl = this.q("log");
    (this.q("endBtn") as HTMLButtonElement).onclick = () => this.h.onEndTurn();
    (this.q("giveupBtn") as HTMLButtonElement).onclick = () => this.h.onSurrender();
    // mute toggle (round button below the logo) — remembers the last non-zero volume
    const muteBtn = this.q("muteBtn") as HTMLButtonElement;
    const SPK_ON = `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16.5 8.6a4 4 0 010 6.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
    const SPK_OFF = `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
    let lastVol = getSfxVolume() || 0.7;
    const paintMute = () => { const m = getSfxVolume() <= 0; muteBtn.innerHTML = m ? SPK_OFF : SPK_ON; muteBtn.classList.toggle("muted", m); };
    muteBtn.onclick = () => { if (getSfxVolume() > 0) { lastVol = getSfxVolume(); setSfxVolume(0); } else { setSfxVolume(lastVol || 0.7); } paintMute(); };
    paintMute();
    // battle log — CLOSED by default; a mid-left edge tab opens the drawer.
    // Once opened it stays open (state persisted in localStorage).
    const gameEl = this.root.querySelector(".game") as HTMLElement;
    let logOpen = false;
    try { logOpen = localStorage.getItem("lore_log_open") === "1"; } catch { /* ignore */ }
    const applyLog = () => {
      gameEl.classList.toggle("log-open", logOpen);
      this.q("logTab").classList.toggle("on", logOpen);
    };
    const toggleLog = () => { logOpen = !logOpen; try { localStorage.setItem("lore_log_open", logOpen ? "1" : "0"); } catch { /* ignore */ } applyLog(); };
    (this.q("logTab")).onclick = toggleLog;
    applyLog();
    document.addEventListener("contextmenu", (e) => e.preventDefault());

    // ---- hand: always visible (no auto-tuck). ----
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

    this.q("turnInfo").innerHTML = `<span class="turn-badge"><span class="tb-label">${t("game.turn")}</span><span class="tb-num">${g.turn}</span></span><span class="turn-cur"><b>${g.players[g.cur].name}</b></span>`;
    // refresh static labels (so a live language switch updates them)
    this.q("endBtn").textContent = t("game.endturn");
    this.q("giveupBtn").textContent = t("game.surrender");
    this.q("logTitle").textContent = t("game.log");
    this.q("logTab").textContent = t("game.log");

    // opponent hand (face-down). Always show the COUNT; >10 lays out flat/even
    // so you can still gauge how many cards they hold.
    const oh = this.q("oppHand"); oh.innerHTML = "";
    const n = opp.hand.length, mid = (n - 1) / 2;
    const flatOpp = n > 10;
    oh.classList.toggle("is-flat", flatOpp);
    for (let i = 0; i < n; i++) {
      const cb = document.createElement("div");
      cb.className = "card--back";
      cb.style.backgroundImage = `url(${FRAME_BACK})`;
      cb.style.width = "56px"; cb.style.height = "90px";
      // fan under 11 cards; flat even row past that (keeps every card edge visible).
      // arc DOWNWARD (edge cards lower) so the tops never cross the board's top clip edge.
      cb.style.transform = flatOpp ? "none" : `rotate(${-(i - mid) * 4}deg) translateY(${(Math.abs(i - mid) ** 2) * 1.1}px)`;
      cb.style.zIndex = String(i);
      oh.appendChild(cb);
    }
    const cnt = document.createElement("div");
    cnt.className = "opp-hand-count";
    cnt.textContent = String(n);
    oh.appendChild(cnt);

    this.renderRow(this.q("oppRow"), g, opp, false, myTurn, pending);
    this.renderRow(this.q("meRow"), g, me, true, myTurn, pending);
    this.renderMarket(g, me, myTurn);
    this.renderHand(g, me, myTurn);

    (this.q("endBtn") as HTMLButtonElement).disabled = !myTurn || !!pending;

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
    const sortByCost = (cards: CardInst[]) => [...cards].sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
    const onTurn = !g.over && g.cur === (g.players.indexOf(p) as Side);

    // inline pile cells (leading edge of each zone row): 묘지 on the monster row, 덱 on the spell/trap row
    const graveTop = p.discard[p.discard.length - 1];
    const gravePile = this.pileEl(isMe ? "pile-myDisc" : "pile-oppDisc", p.discard.length, graveTop ? frameFor(graveTop.t) : null, graveTop ?? null, t("game.discard"),
      () => cardPicker(`${p.name} — ${t("game.discard")} (${p.discard.length})`, sortByCost(p.discard), () => { /* browse only */ }));
    // clicking the DECK opens the full composition (own or opponent's public aggregate)
    const collection = this.collectionOf(p, isMe);
    const deckPile = this.pileEl(isMe ? "pile-myDeck" : "pile-oppDeck", p.deck.length, backFor(isMe), null, t("game.deck"),
      () => cardPicker(`${p.name} — ${t("deck.view")} (${collection.length})`, collection, () => { /* browse only */ }));

    const block = document.createElement("div");
    block.className = "field-block" + (isMe ? " is-mine" : " is-opp") + (onTurn ? " is-turn" : "");

    // monster zone
    const mz = document.createElement("div");
    mz.className = "zone zone-mon";
    const targetableMon = !!pending && ((pending.kind === "oppMon" && !isMe) || (pending.kind === "myMon" && isMe)) && myTurn;
    p.field.forEach((m, idx) => {
      const canAttack = isMe && myTurn && !pending && !m.exhausted && !g.over;
      const card = cardEl(m, { field: true, owner: p, attacker: canAttack, targetable: targetableMon, exhausted: m.exhausted });
      if (targetableMon) card.onclick = () => this.h.onChooseTarget(m.uid);
      else if (canAttack) card.onclick = () => this.h.onAttack(m.uid);
      // zoom shows the monster's CURRENT atk/def (buffs/mods applied), matching the on-field card
      bindZoom(card, { ...m, atk: effAtk(p, m), def: effDef(p, m) });
      if (isMe && myTurn && !pending && !g.over && p.field.length > 1) this.enableReorder(card, idx, mz);
      mz.appendChild(card);
    });
    for (let i = p.field.length; i < MON_SLOTS; i++) mz.appendChild(this.slotEl());

    // spell/trap zone
    const sz = document.createElement("div");
    sz.className = "zone zone-st";
    p.traps.forEach((t) => {
      if (isMe && t.card.id !== "HIDDEN") {
        const card = cardEl(t.card, { badge: "SET" });
        bindZoom(card, t.card);
        sz.appendChild(card);
      } else {
        const cb = document.createElement("div");
        cb.className = "card card--back";
        cb.style.backgroundImage = `url(${backFor(isMe)})`;
        sz.appendChild(cb);
      }
    });
    p.enchants.forEach((e) => {
      const card = cardEl(e.card, { badge: `${e.turns}T` });
      bindZoom(card, e.card);
      sz.appendChild(card);
    });
    for (let i = p.traps.length + p.enchants.length; i < ST_SLOTS; i++) sz.appendChild(this.slotEl());

    // each zone row = [leading pile] + [slots] (pile on the leading edge; opp mirrors).
    // Monster zone nearest the center line: me → mon on top, opp → mon on bottom.
    const monRow = this.zoneRow(gravePile, mz, isMe);
    const stRow = this.zoneRow(deckPile, sz, isMe);
    const zones = document.createElement("div");
    zones.className = "zones";
    if (isMe) zones.append(monRow, stRow); else zones.append(stRow, monRow);

    block.append(zones, this.metaPanel(p, isMe));
    row.append(block);
  }

  /** One zone line: pile cell at the leading edge (left for me, right for opp). */
  private zoneRow(pile: HTMLElement, zone: HTMLElement, isMe: boolean): HTMLElement {
    const rowEl = document.createElement("div");
    rowEl.className = "zone-row";
    pile.classList.add("inline-pile");
    if (isMe) rowEl.append(pile, zone); else rowEl.append(zone, pile);
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
  private enableReorder(card: HTMLElement, index: number, zone: HTMLElement): void {
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

      const others = (): DOMRect[] =>
        ([...zone.children] as HTMLElement[])
          .filter((el) => el.classList.contains("card") && el !== card)
          .map((el) => el.getBoundingClientRect());

      const place = (x: number, y: number): void => {
        if (!ghost || !marker) return;
        ghost.style.left = `${x}px`;
        ghost.style.top = `${y}px`;
        const rects = others();
        to = rects.filter((r) => x > r.left + r.width / 2).length;
        const zr = zone.getBoundingClientRect();
        const mx = rects.length === 0 ? zr.left + 6 : to === 0 ? rects[0].left - 4 : rects[to - 1].right + 1;
        marker.style.left = `${mx - zr.left}px`;
      };

      const cleanup = (): void => {
        done = true;
        ghost?.remove(); marker?.remove();
        card.classList.remove("is-dragging");
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", cleanup);
      };

      const onMove = (ev: PointerEvent): void => {
        if (done) return;
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
          marker = document.createElement("div");
          marker.className = "drop-marker";
          zone.appendChild(marker);
        }
        place(ev.clientX, ev.clientY);
      };

      const onUp = (): void => {
        const dragged = !!ghost;
        cleanup();
        if (!dragged) return;
        // swallow the click that follows pointerup so it doesn't trigger an attack
        card.addEventListener("click", (ce) => { ce.stopPropagation(); ce.preventDefault(); }, { capture: true, once: true });
        if (to !== index) this.h.onReorder(index, to);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", cleanup);
    });
  }

  /** Right-side consolidated info panel: name · HP · mana · exile · tribe. */
  private metaPanel(p: PlayerState, isMe: boolean): HTMLElement {
    const panel = document.createElement("div");
    panel.className = "meta-panel";
    const emax = effMaxMana(p);
    const hpPct = Math.max(0, p.hp) / p.maxHp * 100;

    const pips: string[] = [];
    const total = Math.max(emax, p.maxMana);
    for (let i = 0; i < total; i++) {
      let cl = "pip";
      if (i < p.mana) cl += " full";
      if (i >= emax) cl += " locked";
      pips.push(`<span class="${cl}"></span>`);
    }

    // 종족: 현재 필드 진행도 + 이미 달성한 시너지를 함께, 시각적으로 구분해 표기
    const byTribe = new Map<string, Set<string>>();
    for (const m of p.field) if (m.tribe) { if (!byTribe.has(m.tribe)) byTribe.set(m.tribe, new Set()); byTribe.get(m.tribe)!.add(m.id); }
    const firedBy = new Map<string, Set<number>>();
    for (const f of p.tribesFired) { const [tr, n] = f.split(":"); if (!firedBy.has(tr)) firedBy.set(tr, new Set()); firedBy.get(tr)!.add(Number(n)); }
    const allTribes = new Set<string>([...byTribe.keys(), ...firedBy.keys()]);
    const tribeChips: string[] = [];
    for (const tr of allTribes) {
      const ths = tr === "시초" ? [2, 3, 4] : [2, 3];  // 시초 has a 4-count payoff; others cap at 3
      const onField = byTribe.get(tr)?.size ?? 0;      // DISTINCT tribe cards on field (matches synergy rule)
      const fired = firedBy.get(tr) ?? new Set<number>();
      const nm = TRIBES[tr]?.[getLang()]?.name ?? tr;
      const allDone = ths.every((th) => fired.has(th));
      // one pip per threshold: ✓ = synergy achieved, highlighted = reached (fires next summon), dim = not yet
      const pips = ths.map((th) => {
        if (fired.has(th)) return `<span class="tp done">✓${th}</span>`;
        if (onField >= th) return `<span class="tp ready">${th}</span>`;
        return `<span class="tp">${th}</span>`;
      }).join("");
      tribeChips.push(`<span class="tribe-chip ${fired.size ? "has-syn" : ""} ${allDone ? "all" : ""}"><span class="tc-name">${nm}</span><span class="tc-cnt">${onField}</span>${pips}</span>`);
    }

    panel.innerHTML = `
      <div class="mp-top">
        <span class="mp-name">${isMe ? avatarHtml(MY_AVATAR, p.name, 24) : `<span class="who"></span>`}${p.name}</span>
        <div class="mp-clock" id="clock-${isMe ? "me" : "opp"}" aria-hidden="true"></div>
      </div>
      <div class="mp-hp">
        <span class="lbl">${t("game.hp")}</span>
        <span class="num"><b id="hp-${isMe ? "me" : "opp"}">${Math.max(0, p.hp)}</b><span class="muted">/${p.maxHp}</span></span>
        <span class="hpbar" id="hpbar-${isMe ? "me" : "opp"}"><i style="width:${hpPct}%"></i></span>
      </div>
      <div class="mp-mana"><span class="lbl">${t("game.mana")}</span><span class="pips">${pips.join("")}</span><span class="mnum">${p.mana}/${emax}</span></div>
      <div class="mp-btns"></div>
      ${tribeChips.length ? `<div class="mp-tribes">${tribeChips.join("")}</div>` : ""}`;

    // deck-view button removed — click the DECK pile to see composition. Only the
    // 제외(exile) shortcut remains (there is no pile for exiled cards).
    const btns = panel.querySelector(".mp-btns")!;
    const removed = (p.removed ?? []).slice().sort((a, b) => a.cost - b.cost);
    if (removed.length > 0) {
      const rbtn = document.createElement("button");
      rbtn.className = "btn btn-ghost mp-btn mp-btn--exile";
      rbtn.innerHTML = `<span class="mp-ico">⛔</span>${t("deck.removed")} <b>${removed.length}</b>`;
      rbtn.onclick = () => cardPicker(`${p.name} — ${t("deck.removed")} (${removed.length})`, removed, () => { /* browse only */ });
      btns.appendChild(rbtn);
    }
    return panel;
  }

  /** Full owned-card list for the deck-view button (opponent side uses only public info). */
  private collectionOf(p: PlayerState, isMe: boolean): CardInst[] {
    const fieldCards = p.field as unknown as CardInst[];
    const enchCards = p.enchants.map((e) => e.card);
    let pool: CardInst[];
    if (isMe) {
      pool = [...p.deck, ...p.hand, ...p.discard, ...fieldCards, ...p.traps.map((tr) => tr.card), ...enchCards];
    } else if (p.collection) {
      // online: server-provided aggregate of hidden zones (hand+deck+traps) + visible public zones.
      // look ids up in BOTH the main DB and STARTERS (starters aren't in DB — they were being dropped).
      const hidden = p.collection.map((id, i) => { const d = DBC[id] ?? STARTERS[id]; return d ? { uid: `v_${i}`, ...d } : null; }).filter((c): c is CardInst => !!c);
      pool = [...hidden, ...p.discard, ...fieldCards, ...enchCards];
    } else {
      // bot mode: full state is local; same public-info view as online
      pool = [...p.hand, ...p.deck, ...p.traps.map((tr) => tr.card), ...p.discard, ...fieldCards, ...enchCards];
    }
    return pool.filter((c) => c && c.id !== "HIDDEN").sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
  }

  private renderMarket(g: GameState, me: PlayerState, myTurn: boolean): void {
    // The 제시 (supply) on display belongs to whoever's turn it is — your own
    // on your turn, your opponent's (public) on theirs.
    const owner = g.players[g.cur];
    const mk = this.q("market");
    mk.innerHTML = `
      <div class="market-sub">
        <div class="sub-head"><span class="tag">${t("game.std")}</span></div>
        <div class="market-cards" id="fixedMarket"></div>
      </div>
      <div class="market-div"></div>
      <div class="market-sub market-sub--supply">
        <div class="sub-head">
          <span class="tag">${t("game.supply")}${myTurn ? "" : ` <span class="dmg sh-opp">${t("game.supply.opp")}</span>`}</span>
          <button class="refresh-btn" id="refreshBtn"><span class="rf-ico">⟳</span> ${t("game.refresh")} <b>1</b>
            <span class="refresh-tip">${t("game.refresh.tip")}</span>
          </button>
        </div>
        <div class="market-cards" id="supplyMarket"></div>
      </div>`;

    const fixed = this.q("fixedMarket");
    g.market.forEach((c, i) => {
      const bc = buyCost(owner, c);
      const aff = myTurn && !g.pending && me.mana >= bc;
      const card = cardEl(c, { size: "mkt", buyable: aff, dim: !aff, costOverride: bc }); // same size as 제시
      if (aff) card.onclick = () => this.h.onBuyMarket(i);
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
      const aff = myTurn && !g.pending && me.mana >= bc;
      const card = cardEl(c, { size: "mkt", buyable: aff, dim: !aff, costOverride: bc });
      card.dataset.supIdx = String(i);  // ORIGINAL supply index (display is sorted) — buy anim finds it by this
      if (aff) card.onclick = () => this.h.onBuySupply(i);
      bindZoom(card, c);
      sup.appendChild(card);
    }
    for (let k = filled.length; k < owner.supply.length; k++) sup.appendChild(this.slotEl("mkt", true));

    const rb = this.q("refreshBtn") as HTMLButtonElement;
    rb.disabled = !myTurn || !!g.pending || me.mana < 1;
    rb.onclick = () => this.h.onRefresh();
  }

  private renderHand(g: GameState, me: PlayerState, myTurn: boolean): void {
    const handEl = this.q("hand");
    handEl.innerHTML = "";
    const n = me.hand.length, mid = (n - 1) / 2;
    // Past 10 cards a fanned hand becomes unreadable — lay it out flat/straight instead.
    const flat = n > 10;
    handEl.classList.toggle("is-flat", flat);
    me.hand.forEach((c, idx) => {
      const pc = playCost(c);
      const aff = myTurn && !g.pending && me.mana >= pc;
      const card = cardEl(c, { size: "hand", playable: aff, dim: !aff, costOverride: pc });
      const off = idx - mid;
      card.style.transform = flat ? "none" : `rotate(${off * 3.2}deg) translateY(${Math.abs(off) ** 2 * 2}px)`;
      card.style.zIndex = String(idx);
      if (aff) card.onclick = () => this.h.onPlay(c.uid); // uid, not index: the DOM can lag the logical state
      else card.onclick = () => this.h.onBlockedPlay(c.uid); // explain WHY it can't be played (popup)
      bindZoom(card, c);
      handEl.appendChild(card);
    });
  }

  private pileEl(id: string, count: number, frame: string | null, faceCard: CardInst | null, tag: string, onOpen?: () => void): HTMLElement {
    const pile = document.createElement("div");
    pile.className = "pile" + (count ? "" : " is-empty");
    pile.id = id;
    const layers = Math.min(3, Math.max(1, Math.ceil(count / 8)));
    for (let i = layers - 1; i >= 0; i--) {
      const pc = document.createElement("div");
      pc.className = "pile-card";
      if (frame && count) pc.style.backgroundImage = `url(${frame})`;
      pc.style.transform = `translate(${i * 1.5}px, ${i * 1.5}px)`;
      pc.style.zIndex = String(-i);
      pile.appendChild(pc);
    }
    const t = document.createElement("div"); t.className = "pile-tag"; t.textContent = tag; pile.appendChild(t);
    const cnt = document.createElement("div"); cnt.className = "pile-count"; cnt.textContent = String(count); pile.appendChild(cnt);
    if (faceCard && faceCard.id !== "HIDDEN") bindZoom(pile, faceCard);
    if (onOpen) { pile.style.cursor = "pointer"; pile.title = "click: browse"; pile.addEventListener("click", onOpen); }
    return pile;
  }

  private slotEl(size?: "mkt", bought?: boolean): HTMLElement {
    const s = document.createElement("div");
    s.className = "slot" + (bought ? " is-bought" : "");
    if (size === "mkt") { s.style.setProperty("--cw", "var(--card-w-mkt)"); s.style.setProperty("--ch", "var(--card-h-mkt)"); }
    return s;
  }
}
