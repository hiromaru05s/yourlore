// ============================================================
// LORE — game controllers.
// BaseController turns engine events into log + animation + render.
// Events play back SEQUENTIALLY (summon → trap → destroy …) so the
// player can follow chains without reading the log.
// LocalController reduces locally and drives the bot.
// (OnlineController lives in ./online and reuses BaseController.)
// ============================================================
import type { Action, CardInst, GameEvent, GameState, ReduceResult, Side } from "../shared/types";
import { logToEn } from "../shared/logEn";
import { createGame, reduce } from "../shared/engine";
import { botDecide } from "../shared/bot";
import { DB, STARTERS } from "../shared/cards";
import { GameView, type BoardHandlers } from "../ui/boardView";
import { GameLog } from "../ui/log";
import * as A from "../ui/anim";
import { cardPicker, confirmDialog, treasureModal, winModal } from "../ui/modal";
import { api } from "../net/api";
import { aCapture } from "../net/analytics";
import { t, getLang, cardName, onLangChange } from "../i18n";

export interface ControllerExits {
  onHome(): void;
  onRematch(): void;
}

/** Card IDs whose outcome is a random roll — surfaced as a result popup, not just a log line. */
const RANDOM_CARDS = new Set([
  "ND3", "ND5", "GS5_0", "GS6_2", "GS7_0", "GS8_0", "GS8_3", "GS8_5",
  "TIMEWARP", "GAMBLE", "DICE8", "GUILD_CHEST", "LUCKY_CHEST", "FORBIDDEN", "GENESIS_SONG",
]);

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export abstract class BaseController implements BoardHandlers {
  protected view: GameView;
  protected log: GameLog;
  protected state!: GameState;
  protected you: Side;
  protected exits: ControllerExits;
  private winShown = false;
  private dead = false;
  private queue: Promise<void> = Promise.resolve();
  private unsubLang: () => void;

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
  onReorder(from: number, to: number) { this.submit({ type: "reorder", from, to }); }
  onChooseTarget(uid: string | null) { this.submit({ type: this.state.pending?.kind === "seek" || this.state.pending?.kind === "recall" ? "pick" : "chooseTarget", uid } as Action); }
  onBuyMarket(i: number) { this.submit({ type: "buyMarket", i }); }
  onBuySupply(i: number) { this.submit({ type: "buySupply", i }); }
  onRefresh() { this.submit({ type: "refresh" }); }
  onEndTurn() { this.submit({ type: "endTurn" }); }
  async onSurrender() {
    const ok = await confirmDialog({ title: t("surrender.title"), body: t("surrender.body"), confirm: t("common.yes"), cancel: t("common.no"), danger: true });
    if (ok) this.submit({ type: "surrender", player: this.you });
  }

  // ---- apply a reduce result: queued so batches play back one at a time ----
  protected applyResult(res: ReduceResult, animate = true): void {
    const prev = this.state ?? res.state;
    this.state = res.state; // logical state advances immediately (input guards etc.)
    this.queue = this.queue
      .then(() => this.playResult(prev, res, animate))
      .catch((err) => console.error("[playback]", err));
  }

  private async playResult(prev: GameState, res: ReduceResult, animate: boolean): Promise<void> {
    if (this.dead) return;
    this.consumeLogs(res.events);
    if (!animate) {
      this.view.render(res.state);
      this.afterApply(res);
      return;
    }
    this.view.setPlaying(true);
    try {
      await this.playEvents(prev, res);
    } finally {
      if (!this.dead) this.view.setPlaying(false);
    }
    if (this.dead) return;
    this.afterApply(res);
  }

  private consumeLogs(events: GameEvent[]): void {
    for (const e of events) {
      if (e.type === "turnHeader") this.log.turnHeader(e.turn, e.name, e.isBot);
      else if (e.type === "log") this.log.line(e.html, e.htmlJa);
    }
  }

  /** Play a batch of events one at a time on the OLD board, then re-render. */
  private async playEvents(prev: GameState, res: ReduceResult): Promise<void> {
    // Cards that left my hand must disappear from it IMMEDIATELY — seeing a
    // card fly onto the field while its copy still sits in the hand is confusing.
    // (The hand itself only re-renders after the whole batch has played out.)
    const newHand = new Set(res.state.players[this.you].hand.map((c) => c.uid));
    for (const c of prev.players[this.you].hand) {
      if (!newHand.has(c.uid)) {
        (document.querySelector(`#hand .card[data-uid="${c.uid}"]`) as HTMLElement | null)?.classList.add("is-played");
      }
    }
    const events = res.events;
    const sideOf = (pl: Side): A.ViewSide => (pl === this.you ? "me" : "opp");
    const ghosts = new Map<string, { el: HTMLElement; side: A.ViewSide }>();
    // running counters for ghost slot placement + live HP readout
    const fieldCount: [number, number] = [prev.players[0].field.length, prev.players[1].field.length];
    const hpNow: [number, number] = [prev.players[0].hp, prev.players[1].hp];
    let myDraws = 0;
    let lastKill: { srcKo?: string; srcJa?: string } | null = null;

    for (let i = 0; i < events.length; i++) {
      if (this.dead) return;
      const e = events[i];
      switch (e.type) {
        case "summon": {
          const card = this.findCard(res.state, e.uid) ?? this.defOf(e.id, e.uid);
          if (card) {
            const g = await A.ghostSummon(card, sideOf(e.player), fieldCount[e.player]);
            if (g) ghosts.set(e.uid, { el: g, side: sideOf(e.player) });
          }
          fieldCount[e.player]++;
          await wait(160);
          break;
        }
        case "trapSet":
          await A.trapSetAnim(sideOf(e.player));
          break;
        case "trapReveal": {
          const def = DB[e.id];
          if (def) {
            await Promise.all([
              A.eventBanner(`⚡ ${t("fx.trap")}`, cardName({ uid: "fx", ...def }), "trap", 1500),
              A.trapRevealAnim({ uid: "fx", ...def }, sideOf(e.player), 1600),
            ]);
          }
          break;
        }
        case "destroy": {
          const gh = ghosts.get(e.uid);
          if (gh) { await A.ghostDie(gh.el, gh.side); ghosts.delete(e.uid); }
          else await A.destroyAnim(e.uid, sideOf(e.player));
          fieldCount[e.player] = Math.max(0, fieldCount[e.player] - 1);
          break;
        }
        case "attack": {
          // charge INTO the target (Hearthstone-style): enemy monster, or the
          // defender's HP bar on a direct hit — impact shakes the victim
          const defender = sideOf((1 - e.player) as Side);
          await A.attackStrike(e.uid, e.targetUid, defender, () => { if (e.targetUid) A.monHit(e.targetUid); });
          break;
        }
        case "hit":
          A.monHit(e.uid);
          await wait(260);
          break;
        case "damage": {
          hpNow[e.player] -= e.amount;
          A.hpFeedback(sideOf(e.player), "dmg", e.amount);
          A.hpBarSet(sideOf(e.player), hpNow[e.player], res.state.players[e.player].maxHp);
          if (e.srcKo) lastKill = { srcKo: e.srcKo, srcJa: e.srcJa };
          await wait(430);
          break;
        }
        case "heal": {
          hpNow[e.player] = Math.min(res.state.players[e.player].maxHp, hpNow[e.player] + e.amount);
          A.hpFeedback(sideOf(e.player), "heal", e.amount);
          A.hpBarSet(sideOf(e.player), hpNow[e.player], res.state.players[e.player].maxHp);
          await wait(340);
          break;
        }
        case "playSpell": {
          const def = DB[e.id] ?? STARTERS[e.id]; // 컬/어튠/보물상자 live in STARTERS
          if (def) await A.revealSpell({ uid: "fx", ...def }, sideOf(e.player), e.dest);
          // random-roll cards: show the outcome as a popup for BOTH players
          if (def && RANDOM_CARDS.has(def.id)) {
            const lines = this.effectLines(events, i);
            if (lines.length) {
              const mine = e.player === this.you;
              const title = (mine ? "" : `${t("fx.opp")} · `) + cardName({ uid: "fx", ...def });
              await A.resultPopup(title, lines, mine);
            }
          }
          break;
        }
        case "buy": {
          const def = DB[e.id];
          if (def) await A.buyReveal({ uid: "fx", ...def }, sideOf(e.player), this.marketCardRect(e.from, e.i));
          else A.pileFlash(e.player === this.you ? "pile-myDisc" : "pile-oppDisc");
          break;
        }
        case "draw":
          if (e.player === this.you) myDraws += e.count;
          break;
        case "treasure": {
          const mine = e.player === this.you && !e.isBot;
          const text = getLang() === "ja" ? e.textJa : getLang() === "en" ? logToEn(e.text) : e.text;
          if (mine) treasureModal(e.kind, text); // modal with a Claim button (not awaited)
          else await A.resultPopup(`${t("fx.opp")} · ${t("treasure.title")}`, [text], false);
          break;
        }
        default:
          break; // log / turnHeader / win / needTarget — no board animation
      }
    }

    // ---- state-diff celebrations: max mana / max HP gains (rich, 2s+) ----
    for (const pl of [0, 1] as Side[]) {
      if (this.dead) return;
      const dMana = res.state.players[pl].maxMana - prev.players[pl].maxMana;
      const dHp = res.state.players[pl].maxHp - prev.players[pl].maxHp;
      if (dMana > 0) await A.manaSurge(sideOf(pl), dMana);
      else if (dMana < 0) A.manaDrop(sideOf(pl), -dMana);
      if (dHp > 0) await A.maxHpSurge(sideOf(pl), dHp);
    }

    if (this.dead) return;
    this.view.render(res.state);
    // ghosts overlap the freshly-rendered real cards — drop them next frame
    requestAnimationFrame(() => ghosts.forEach((g) => g.el.remove()));
    if (myDraws > 0) A.animateDraw(document.getElementById("hand") as HTMLElement, myDraws);

    // ---- death sequence: HP orb shatters + cause of death, before the result modal ----
    if (res.state.over && res.state.winner != null && !this.winShown) {
      const won = res.state.winner === this.you;
      const loser = (1 - res.state.winner) as Side;
      const cause = lastKill ? (getLang() === "ja" ? lastKill.srcJa ?? lastKill.srcKo : getLang() === "en" ? logToEn(lastKill.srcKo ?? "") : lastKill.srcKo) : null;
      await wait(250);
      await A.deathShatter(sideOf(loser), won, this.stripHtml(cause ?? "") || null);
    }
  }

  /** Plain-text log lines describing the effect right after events[idx] (for result popups). */
  private effectLines(events: GameEvent[], idx: number): string[] {
    const lines: string[] = [];
    for (let j = idx + 1; j < events.length && lines.length < 5; j++) {
      const e = events[j];
      if (e.type === "log") {
        const html = getLang() === "ja" ? e.htmlJa : getLang() === "en" ? logToEn(e.html) : e.html;
        const txt = this.stripHtml(html).replace(/^\s*└\s*/, "").trim();
        if (txt) lines.push(txt);
      } else if (e.type === "playSpell" || e.type === "trapSet" || e.type === "trapReveal" || e.type === "buy" || e.type === "turnHeader" || e.type === "win") {
        break; // next discrete action — effect scope ends
      }
    }
    return lines;
  }

  private stripHtml(html: string): string {
    const d = document.createElement("div");
    d.innerHTML = html;
    return (d.textContent ?? "").trim();
  }

  private defOf(id: string | undefined, uid: string): CardInst | null {
    if (!id) return null;
    const def = DB[id] ?? STARTERS[id];
    return def ? { uid, ...def } : null;
  }

  /** Find a field monster (either side) by uid in a given state. */
  private findCard(g: GameState, uid: string): CardInst | null {
    for (const pl of g.players) { const m = pl.field.find((x) => x.uid === uid); if (m) return m; }
    return null;
  }

  /** Bounding rect of a market/supply card slot at index i (pre re-render). */
  private marketCardRect(from: "market" | "supply", i: number): DOMRect | null {
    const host = document.getElementById(from === "market" ? "fixedMarket" : "supplyMarket");
    const node = host?.children[i] as HTMLElement | undefined;
    return node ? node.getBoundingClientRect() : null;
  }

  private afterApply(res: ReduceResult): void {
    if (res.state !== this.state) return; // a newer batch is queued — let it drive follow-ups
    const g = this.state;
    if (g.over) { this.showWin(); return; }
    if (g.pending && g.cur === this.you) {
      if (g.pending.kind === "purge") {
        const me = g.players[this.you];
        const pool = [...me.deck, ...me.discard].sort((a, b) => a.cost - b.cost);
        const hint = getLang() === "ja" ? g.pending.hintJa : getLang() === "en" ? logToEn(g.pending.hint) : g.pending.hint;
        cardPicker(hint, pool, (uid) => this.submit({ type: "pick", uid }));
        return;
      }
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
    // bot games are client-local — report the result for analytics (online games are recorded server-side)
    if (this.state.mode === "bot") void api.trackBot(this.state.winner === this.you);
    aCapture("game_end", { mode: this.state.mode, won: this.state.winner === this.you, turns: this.state.turn });
    this.openResult();
  }

  /** Result modal — reopenable from the review FAB so the log can be studied (복기). */
  private openResult(): void {
    A.removeReviewFab();
    const won = this.state.winner === this.you;
    const meHp = Math.max(0, this.state.players[this.you].hp);
    const oppHp = Math.max(0, this.state.players[1 - this.you].hp);
    const detail = `${t("modal.hp.me")} ${meHp} · ${t("modal.hp.opp")} ${oppHp}`;
    winModal(
      won,
      detail,
      () => { A.removeReviewFab(); this.exits.onRematch(); },
      () => { A.removeReviewFab(); this.exits.onHome(); },
      () => A.reviewFab(() => this.openResult()),
    );
  }

  destroy(): void {
    this.dead = true;
    document.removeEventListener("keydown", this.onKey);
    A.removeReviewFab();
    this.unsubLang();
    this.log.dispose();
  }
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
      // playback has already finished by the time afterApply runs — a short beat is enough
      this.botTimer = window.setTimeout(() => this.botStep(), g.pending ? 380 : 600);
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
