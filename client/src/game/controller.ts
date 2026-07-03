// ============================================================
// LORE — game controllers.
// BaseController turns engine events into log + animation + render.
// LocalController reduces locally and drives the bot.
// (OnlineController lives in ./online and reuses BaseController.)
// ============================================================
import type { Action, CardInst, GameEvent, GameState, ReduceResult, Side } from "../shared/types";
import { logToEn } from "../shared/logEn";
import { createGame, reduce } from "../shared/engine";
import { botDecide } from "../shared/bot";
import { frameFor, DB, STARTERS } from "../shared/cards";
import { GameView, type BoardHandlers } from "../ui/boardView";
import { GameLog } from "../ui/log";
import * as A from "../ui/anim";
import { cardPicker, confirmDialog, treasureModal, winModal } from "../ui/modal";
import { t, getLang, onLangChange } from "../i18n";

export interface ControllerExits {
  onHome(): void;
  onRematch(): void;
}

export abstract class BaseController implements BoardHandlers {
  protected view: GameView;
  protected log: GameLog;
  protected state!: GameState;
  protected you: Side;
  protected exits: ControllerExits;
  private winShown = false;
  private flyAfter: { frame: string; rect: DOMRect | null; discId: string }[] = [];
  private unsubLang: () => void;
  protected animMs = 250; // duration of the most recent batch's animations (paces the bot)

  constructor(root: HTMLElement, you: Side, exits: ControllerExits) {
    this.you = you;
    this.exits = exits;
    this.view = new GameView(root, you, this);
    this.log = new GameLog(this.view.logEl);
    document.addEventListener("keydown", this.onKey);
    // re-render the board (labels + card names) when language changes
    this.unsubLang = onLangChange(() => { if (this.state) this.view.render(this.state); });
  }

  private onKey = (e: KeyboardEvent) => { if (e.key === "Escape") A.closeZoom(); };

  // ---- the only mutation entry point (subclass decides how) ----
  protected abstract submit(action: Action): void;
  protected maybeBot(): void {}

  // ---- BoardHandlers ----
  onPlay(idx: number) { this.submit({ type: "play", idx }); }
  onAttack(uid: string) { this.submit({ type: "attack", uid }); }
  onChooseTarget(uid: string | null) { this.submit({ type: this.state.pending?.kind === "seek" || this.state.pending?.kind === "recall" ? "pick" : "chooseTarget", uid } as Action); }
  onBuyMarket(i: number) { this.submit({ type: "buyMarket", i }); }
  onBuySupply(i: number) { this.submit({ type: "buySupply", i }); }
  onRefresh() { this.submit({ type: "refresh" }); }
  onEndTurn() { this.submit({ type: "endTurn" }); }
  async onSurrender() {
    const ok = await confirmDialog({ title: t("surrender.title"), body: t("surrender.body"), confirm: t("common.yes"), cancel: t("common.no"), danger: true });
    if (ok) this.submit({ type: "surrender", player: this.you });
  }

  // ---- apply a reduce result: logs, animations, render, follow-ups ----
  protected applyResult(res: ReduceResult, animate = true): void {
    this.state = res.state;
    this.consumeLogs(res.events);
    const delayed = animate && this.preAnim(res.events);
    if (delayed) setTimeout(() => this.postRender(res.events, animate), 250);
    else this.postRender(res.events, animate);
  }

  private consumeLogs(events: GameEvent[]): void {
    for (const e of events) {
      if (e.type === "turnHeader") this.log.turnHeader(e.turn, e.name, e.isBot);
      else if (e.type === "log") this.log.line(e.html, e.htmlJa);
    }
  }

  /** Animations that must run on the OLD board (before re-render). */
  private preAnim(events: GameEvent[]): boolean {
    const attacks = events.filter((e) => e.type === "attack") as Extract<GameEvent, { type: "attack" }>[];
    const destroys = events.filter((e) => e.type === "destroy") as Extract<GameEvent, { type: "destroy" }>[];
    if (!attacks.length && !destroys.length) return false;

    for (const a of attacks) {
      A.lunge(a.uid, a.player === this.you ? "up" : "down");
      if (a.targetUid) A.monHit(a.targetUid);
    }
    this.flyAfter = destroys.map((d) => {
      const node = document.querySelector(`.card[data-uid="${d.uid}"]`);
      if (node) node.classList.add("mdie");
      const side = d.player === this.you ? "me" : "opp";
      return { frame: frameFor("mon"), rect: node ? node.getBoundingClientRect() : null, discId: side === "me" ? "pile-myDisc" : "pile-oppDisc" };
    });
    return true;
  }

  /** Re-render + post-render animations + follow-ups. */
  private postRender(events: GameEvent[], animate: boolean): void {
    // capture market source rects BEFORE re-render (the slot moves/clears after)
    const buySrc = new Map<number, DOMRect | null>();
    for (const e of events) if (e.type === "buy") buySrc.set(e.i, this.marketCardRect(e.from, e.i));
    this.view.render(this.state);
    let animMs = 250;
    if (animate) {
      for (const f of this.flyAfter) {
        const to = document.getElementById(f.discId);
        A.flyCardFrame(f.frame, f.rect, to ? to.getBoundingClientRect() : null);
        if (to) A.pileFlash(f.discId);
      }
      this.flyAfter = [];
      for (const e of events) {
        const sideOf = (pl: Side): A.ViewSide => (pl === this.you ? "me" : "opp");
        if (e.type === "summon") {
          const card = this.findCard(e.uid);
          if (card) { void A.summonFromHand(card, e.uid, sideOf(e.player)); animMs = Math.max(animMs, 700); }
          else A.summonIn(e.uid);
        } else if (e.type === "playSpell") {
          const def = DB[e.id] ?? STARTERS[e.id]; // 컬/어튠/보물상자 live in STARTERS
          if (def) void A.revealSpell({ uid: "fx", ...def }, sideOf(e.player), e.dest);
          animMs = Math.max(animMs, e.dest === "field" ? 1100 : 2300);
        } else if (e.type === "trapSet") {
          void A.trapSetAnim(sideOf(e.player)); animMs = Math.max(animMs, 650);
        } else if (e.type === "trapReveal") {
          if (DB[e.id]) void A.trapRevealAnim({ uid: "fx", ...DB[e.id] }, sideOf(e.player)); animMs = Math.max(animMs, 2500);
        } else if (e.type === "buy") {
          if (DB[e.id]) void A.buyReveal({ uid: "fx", ...DB[e.id] }, sideOf(e.player), buySrc.get(e.i) ?? null);
          else A.pileFlash(e.player === this.you ? "pile-myDisc" : "pile-oppDisc");
          animMs = Math.max(animMs, 1000);
        } else if (e.type === "damage") A.hpFeedback(sideOf(e.player), "dmg", e.amount);
        else if (e.type === "heal") A.hpFeedback(sideOf(e.player), "heal", e.amount);
        else if (e.type === "draw" && e.player === this.you) A.animateDraw(this.view.logEl.ownerDocument!.getElementById("hand") as HTMLElement, e.count);
        else if (e.type === "treasure" && !e.isBot && e.player === this.you) treasureModal(e.kind, getLang() === "ja" ? e.textJa : getLang() === "en" ? logToEn(e.text) : e.text);
        else if (e.type === "attack" || e.type === "destroy") animMs = Math.max(animMs, 650);
      }
    }
    this.animMs = animMs;
    this.afterApply();
  }

  /** Find a field monster (either side) by uid, to drive its summon animation. */
  private findCard(uid: string): CardInst | null {
    for (const pl of this.state.players) { const m = pl.field.find((x) => x.uid === uid); if (m) return m; }
    return null;
  }

  /** Bounding rect of a market/supply card slot at index i (post-render). */
  private marketCardRect(from: "market" | "supply", i: number): DOMRect | null {
    const host = document.getElementById(from === "market" ? "fixedMarket" : "supplyMarket");
    const node = host?.children[i] as HTMLElement | undefined;
    return node ? node.getBoundingClientRect() : null;
  }

  private afterApply(): void {
    const g = this.state;
    if (g.over) { this.showWin(); return; }
    if (g.pending && g.cur === this.you) {
      if (g.pending.kind === "seek" || g.pending.kind === "recall") {
        const me = g.players[this.you];
        const pool = g.pending.kind === "seek" ? me.deck : me.discard;
        cardPicker(getLang() === "ja" ? g.pending.hintJa : g.pending.hint, pool, (uid) => this.submit({ type: "pick", uid }));
      }
      return; // oppMon/myMon resolved by board clicks
    }
    this.maybeBot();
  }

  protected showWin(): void {
    if (this.winShown || this.state.winner == null) return;
    this.winShown = true;
    const won = this.state.winner === this.you;
    const meHp = Math.max(0, this.state.players[this.you].hp);
    const oppHp = Math.max(0, this.state.players[1 - this.you].hp);
    const detail = `${t("modal.hp.me")} ${meHp} · ${t("modal.hp.opp")} ${oppHp}`;
    setTimeout(() => winModal(won, detail, () => this.exits.onRematch(), () => this.exits.onHome()), 400);
  }

  destroy(): void { document.removeEventListener("keydown", this.onKey); this.unsubLang(); this.log.dispose(); }
}

// ============================================================
// LocalController — single device, you vs bot
// ============================================================
export class LocalController extends BaseController {
  private botTimer = 0;

  constructor(root: HTMLElement, exits: ControllerExits, playerName = "PLAYER 1") {
    super(root, 0, exits);
    const res = createGame({
      mode: "bot",
      p0: { id: "local", name: playerName },
      p1: { id: "bot", name: "BOT", isBot: true },
    });
    this.applyResult(res, false);
  }

  protected submit(action: Action): void {
    if (this.state.over) return;
    this.applyResult(reduce(this.state, action));
  }

  protected maybeBot(): void {
    const g = this.state;
    if (g.over) return;
    if (g.players[g.cur].isBot) {
      clearTimeout(this.botTimer);
      const delay = Math.max(this.animMs, g.pending ? 500 : 650); // let the action's animation finish first
      this.botTimer = window.setTimeout(() => this.botStep(), delay);
    }
  }

  private botStep(): void {
    const g = this.state;
    if (g.over || !g.players[g.cur].isBot) return;
    const action = botDecide(g);
    this.applyResult(reduce(g, action));
  }

  destroy(): void { clearTimeout(this.botTimer); super.destroy(); }
}
