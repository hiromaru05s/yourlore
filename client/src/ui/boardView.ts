// ============================================================
// LORE — board view. Renders the whole game from a GameState
// (from the viewer's perspective) and wires interaction handlers.
// All animation lives in anim.ts; this file only draws + binds.
// ============================================================
import type { CardInst, GameState, PlayerState, Side } from "../shared/types";
import { effMaxMana, supplyRange, playCost } from "../shared/engine";
import { frameFor, FRAME_BACK } from "../shared/cards";
import { cardEl } from "./cardView";
import { zoomCard } from "./anim";
import { t, getLang } from "../i18n";

const MON_SLOTS = 7;
const ST_SLOTS = 5;

export interface BoardHandlers {
  onPlay(idx: number): void;
  onAttack(uid: string): void;
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
        </div>
        <div class="stage">
          <div class="board-col">
            <div class="opp-hand" id="oppHand"></div>
            <div class="prow" id="oppRow"></div>
            <div class="panel market" id="market"></div>
            <div class="prow" id="meRow"></div>
            <div class="hand-area">
              <div class="hand" id="hand"></div>
              <div class="end-turn-wrap"><button class="btn btn-primary" id="endBtn">${t("game.endturn")}</button></div>
            </div>
          </div>
          <div class="panel logpanel">
            <div class="panel-title" id="logTitle">${t("game.log")}</div>
            <div class="log" id="log"></div>
            <div class="log-foot"><button class="btn btn-danger btn-block" id="surrenderBtn">${t("game.surrender")}</button></div>
          </div>
        </div>
      </div>
      <div class="target-hint" id="targetHint" style="display:none"></div>`;
    this.logEl = this.q("log");
    (this.q("endBtn") as HTMLButtonElement).onclick = () => this.h.onEndTurn();
    (this.q("surrenderBtn") as HTMLButtonElement).onclick = () => this.h.onSurrender();
    document.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  private q(id: string): HTMLElement { return this.root.querySelector("#" + id) as HTMLElement; }

  render(g: GameState): void {
    const me = g.players[this.you];
    const opp = g.players[1 - this.you];
    const myTurn = g.cur === this.you && !g.over;
    const pending = g.pending;

    this.q("turnInfo").innerHTML = `${t("game.turn")} ${g.turn} <span class="muted">·</span> <b>${g.players[g.cur].name}</b>`;
    // refresh static labels (so a live language switch updates them)
    this.q("endBtn").textContent = t("game.endturn");
    this.q("surrenderBtn").textContent = t("game.surrender");
    this.q("logTitle").textContent = t("game.log");

    // opponent fanned hand (face-down)
    const oh = this.q("oppHand"); oh.innerHTML = "";
    const n = opp.hand.length, mid = (n - 1) / 2;
    for (let i = 0; i < n; i++) {
      const cb = document.createElement("div");
      cb.className = "card--back";
      cb.style.backgroundImage = `url(${FRAME_BACK})`;
      cb.style.width = "56px"; cb.style.height = "90px";
      cb.style.transform = `rotate(${(i - mid) * 4}deg) translateY(${Math.abs(i - mid) ** 2 * 1.4}px)`;
      cb.style.zIndex = String(i);
      oh.appendChild(cb);
    }

    this.renderRow(this.q("oppRow"), g, opp, false, myTurn, pending);
    this.renderRow(this.q("meRow"), g, me, true, myTurn, pending);
    this.renderMarket(g, me, myTurn);
    this.renderHand(g, me, myTurn);

    (this.q("endBtn") as HTMLButtonElement).disabled = !myTurn || !!pending;

    // target hint banner
    const hint = this.q("targetHint");
    if (pending && myTurn && (pending.kind === "oppMon" || pending.kind === "myMon")) {
      hint.style.display = "block";
      hint.innerHTML = `▸ ${getLang() === "ja" ? pending.hintJa : pending.hint}` + (pending.allowCancel ? ` &nbsp; <a id="cancelTarget" style="cursor:pointer">[${t("common.cancel")}]</a>` : "");
      const c = hint.querySelector("#cancelTarget") as HTMLElement | null;
      if (c) c.onclick = () => this.h.onChooseTarget(null);
    } else {
      hint.style.display = "none";
    }
  }

  private renderRow(row: HTMLElement, g: GameState, p: PlayerState, isMe: boolean, myTurn: boolean, pending: GameState["pending"]): void {
    row.innerHTML = "";
    const deckPile = this.pileEl(isMe ? "pile-myDeck" : "pile-oppDeck", p.deck.length, FRAME_BACK, null, t("game.deck"));
    // both discards public (top face-up, zoomable)
    const discTop = p.discard[p.discard.length - 1];
    const discPile = this.pileEl(isMe ? "pile-myDisc" : "pile-oppDisc", p.discard.length, discTop ? frameFor(discTop.t) : null, discTop ?? null, t("game.discard"));

    const block = document.createElement("div");
    block.className = "field-block" + (g.cur === g.players.indexOf(p) ? " is-turn" : "");
    if (!g.over && g.cur === (g.players.indexOf(p) as Side)) block.classList.add("is-turn");

    // player bar
    block.appendChild(this.barEl(g, p, isMe));

    // monster zone
    const mz = document.createElement("div");
    mz.className = "zone";
    const targetableMon = !!pending && ((pending.kind === "oppMon" && !isMe) || (pending.kind === "myMon" && isMe)) && myTurn;
    p.field.forEach((m) => {
      const canAttack = isMe && myTurn && !pending && !m.exhausted && !g.over;
      const card = cardEl(m, { field: true, owner: p, attacker: canAttack, targetable: targetableMon, exhausted: m.exhausted });
      if (targetableMon) card.onclick = () => this.h.onChooseTarget(m.uid);
      else if (canAttack) card.onclick = () => this.h.onAttack(m.uid);
      card.oncontextmenu = (e) => { e.preventDefault(); zoomCard(m); };
      mz.appendChild(card);
    });
    for (let i = p.field.length; i < MON_SLOTS; i++) mz.appendChild(this.slotEl());

    // spell/trap zone
    const sz = document.createElement("div");
    sz.className = "zone";
    p.traps.forEach((t) => {
      if (isMe && t.card.id !== "HIDDEN") {
        const card = cardEl(t.card, { badge: "SET" });
        card.oncontextmenu = (e) => { e.preventDefault(); zoomCard(t.card); };
        sz.appendChild(card);
      } else {
        const cb = document.createElement("div");
        cb.className = "card card--back";
        cb.style.backgroundImage = `url(${FRAME_BACK})`;
        sz.appendChild(cb);
      }
    });
    // persistent enchantments (public, face-up, with remaining-turn badge)
    p.enchants.forEach((e) => {
      const card = cardEl(e.card, { badge: `${e.turns}T` });
      card.oncontextmenu = (ev) => { ev.preventDefault(); zoomCard(e.card); };
      sz.appendChild(card);
    });
    for (let i = p.traps.length + p.enchants.length; i < ST_SLOTS; i++) sz.appendChild(this.slotEl());

    const zones = document.createElement("div");
    zones.append(mz, sz);
    block.appendChild(zones);

    // layout: opponent => discard | block | deck ; me => deck | block | discard
    if (isMe) row.append(deckPile, block, discPile);
    else row.append(discPile, block, deckPile);
  }

  private barEl(g: GameState, p: PlayerState, isMe: boolean): HTMLElement {
    const bar = document.createElement("div");
    bar.className = "pbar";
    const emax = effMaxMana(p);
    const onTurn = g.cur === (g.players.indexOf(p) as Side) && !g.over;
    const hpPct = Math.max(0, p.hp) / p.maxHp * 100;

    const pips: string[] = [];
    const total = Math.max(emax, p.maxMana);
    for (let i = 0; i < total; i++) {
      let cl = "pip";
      if (i < p.mana) cl += " full"; // current mana shown live for BOTH players
      if (i >= emax) cl += " locked";
      pips.push(`<span class="${cl}"></span>`);
    }
    const manaTxt = `${p.mana}/${emax}`;

    bar.innerHTML = `
      <span class="pname"><span class="who"></span>${p.name}
        <span class="turn-chip ${onTurn ? "on" : ""}">${onTurn ? t("game.myturn") : t("game.waiting")}</span></span>
      <span class="hp">
        <span class="lbl">${t("game.hp")}</span>
        <span class="num"><b id="hp-${isMe ? "me" : "opp"}">${Math.max(0, p.hp)}</b><span class="muted">/${p.maxHp}</span></span>
        <span class="hpbar" id="hpbar-${isMe ? "me" : "opp"}"><i style="width:${hpPct}%"></i></span>
      </span>
      <span class="mana"><span class="lbl">${t("game.mana")}</span><span class="pips">${pips.join("")}</span><span class="mnum">${manaTxt}</span></span>`;
    return bar;
  }

  private renderMarket(g: GameState, me: PlayerState, myTurn: boolean): void {
    // The 제시 (supply) on display belongs to whoever's turn it is — your own
    // on your turn, your opponent's (public) on theirs.
    const owner = g.players[g.cur];
    const [lo, hi] = supplyRange(owner);
    const supplyMeta = myTurn ? `${t("game.mana")} ${lo}~${hi} · ${t("game.refresh.suffix")}` : `<span class="dmg">${t("game.supply.opp")}</span> · ${t("game.mana")} ${lo}~${hi}`;
    const mk = this.q("market");
    mk.innerHTML = `
      <div class="market-sub">
        <div class="sub-head"><span class="tag">${t("game.std")}</span><span class="meta">${t("game.std.meta")}</span></div>
        <div class="market-cards" id="fixedMarket"></div>
      </div>
      <div class="market-div"></div>
      <div class="market-sub">
        <div class="sub-head"><span class="tag">${t("game.supply")}</span><span class="meta">${supplyMeta}</span>
          <button class="refresh-btn" id="refreshBtn">⟳ 1</button></div>
        <div class="market-cards" id="supplyMarket"></div>
      </div>`;

    const fixed = this.q("fixedMarket");
    g.market.forEach((c, i) => {
      const aff = myTurn && !g.pending && me.mana >= c.cost;
      const card = cardEl(c, { buyable: aff, dim: !aff }); // board size so 8 fit
      if (aff) card.onclick = () => this.h.onBuyMarket(i);
      card.oncontextmenu = (e) => { e.preventDefault(); zoomCard(c); };
      fixed.appendChild(card);
    });

    const sup = this.q("supplyMarket");
    owner.supply.forEach((c, i) => {
      if (!c) { sup.appendChild(this.slotEl("mkt", true)); return; }
      const aff = myTurn && !g.pending && me.mana >= c.cost;
      const card = cardEl(c, { size: "mkt", buyable: aff, dim: !aff });
      if (aff) card.onclick = () => this.h.onBuySupply(i);
      card.oncontextmenu = (e) => { e.preventDefault(); zoomCard(c); };
      sup.appendChild(card);
    });

    const rb = this.q("refreshBtn") as HTMLButtonElement;
    rb.disabled = !myTurn || !!g.pending || me.mana < 1;
    rb.onclick = () => this.h.onRefresh();
  }

  private renderHand(g: GameState, me: PlayerState, myTurn: boolean): void {
    const handEl = this.q("hand");
    handEl.innerHTML = "";
    const n = me.hand.length, mid = (n - 1) / 2;
    me.hand.forEach((c, idx) => {
      const pc = playCost(c);
      const aff = myTurn && !g.pending && me.mana >= pc;
      const card = cardEl(c, { size: "hand", playable: aff, dim: !aff, costOverride: pc });
      const off = idx - mid;
      card.style.transform = `rotate(${off * 3.2}deg) translateY(${Math.abs(off) ** 2 * 2}px)`;
      card.style.zIndex = String(idx);
      if (aff) card.onclick = () => this.h.onPlay(idx);
      card.oncontextmenu = (e) => { e.preventDefault(); zoomCard(c); };
      handEl.appendChild(card);
    });
  }

  private pileEl(id: string, count: number, frame: string | null, faceCard: CardInst | null, tag: string): HTMLElement {
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
    if (faceCard && faceCard.id !== "HIDDEN") pile.oncontextmenu = (e) => { e.preventDefault(); zoomCard(faceCard); };
    return pile;
  }

  private slotEl(size?: "mkt", bought?: boolean): HTMLElement {
    const s = document.createElement("div");
    s.className = "slot" + (bought ? " is-bought" : "");
    if (size === "mkt") { s.style.setProperty("--cw", "var(--card-w-mkt)"); s.style.setProperty("--ch", "var(--card-h-mkt)"); }
    return s;
  }
}
