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
import { createGame, reduce, playCost } from "../shared/engine";
import { botDecide, pickBotDeck } from "../shared/bot";
import { DB, STARTERS, hasPassive } from "../shared/cards";
import { GameView, type BoardHandlers } from "../ui/boardView";
import { GameLog } from "../ui/log";
import * as A from "../ui/anim";
import { cardPicker, cardPickerMulti, confirmDialog, treasureModal, winModal } from "../ui/modal";
import { api } from "../net/api";
import { aCapture } from "../net/analytics";
import { sfx, type SfxName } from "../ui/sound";
import { avatarHtml } from "../ui/social";
import { tierOf, tierLabel } from "../ui/tier";
import { t, getLang, cardName, onLangChange } from "../i18n";

export interface ControllerExits {
  onHome(): void;
  onRematch(): void;
}

// ---- coin-toss profiles (set by the game screen at mount): the two coin faces ----
interface CoinProfile { avatar: string | null; name: string; }
let COIN_ME: CoinProfile = { avatar: null, name: "YOU" };
let COIN_OPP: CoinProfile = { avatar: null, name: "OPP" };
export function setCoinProfiles(me: CoinProfile, opp: CoinProfile): void { COIN_ME = me; COIN_OPP = opp; }

/** Card IDs whose outcome is a random roll — surfaced as a result popup, not just a log line. */
import { RANDOM_CARDS } from "../shared/cards"; // 주사위·확률 카드 (결과 팝업 + 수레바퀴 재굴림 대상)

const wait = (ms: number): Promise<void> => A.fxWait(ms); // skippable: flushes when the player acts

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
  private fxGen = 0; // batches queued so far
  private skipGen = 0; // batches up to this gen fast-forward
  // ---- turn timer ----
  private timerKey = "";
  private timerLeft = 0;
  private timerInt: number | null = null;
  private warned25 = false;
  private toastEl: HTMLElement | null = null;
  private prevMaxMana = 0;
  // bot/tutorial (and casual online fallback) use a 90s turn; online games get the
  // authoritative length from the server via g.turnTotalMs (ranked 50s / casual 90s).
  private static readonly LOCAL_TURN_SECS = 90;
  private turnTotal = 90; // full length of the CURRENT turn (for the ring's full-scale)
  private turnStartedWall = 0; // wall-clock ms when the current turn's timer started (anti instant-skip)
  private lastEndTurnAt = 0;   // 턴종료 연타 가드: 마지막 endTurn 제출 시각
  private purgePicks: string[] | null = null; // multi-select purge: remaining queued picks
  protected introShown = false; // coin-toss reveal plays once at game start

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

  /** The player acted — fast-forward any still-playing batches so input never waits. */
  protected fastForward(): void {
    this.skipGen = this.fxGen;
    A.setFxSkip(true);
  }

  // ---- BoardHandlers ----
  // Hand plays are looked up by uid (not index): the on-screen hand can be a
  // batch behind the logical state, and uids stay correct where indices drift.
  onPlay(uid: string) {
    this.fastForward();
    const idx = this.state.players[this.you].hand.findIndex((c) => c.uid === uid);
    if (idx >= 0) this.submit({ type: "play", idx });
  }
  onBlockedPlay(uid: string) {
    const g = this.state; if (!g || g.over) return;
    const me = g.players[this.you];
    const c = me.hand.find((x) => x.uid === uid);
    const msg = g.cur !== this.you ? t("play.block.turn")
      : g.pending ? t("play.block.pending")
      : (c && me.mana < playCost(c)) ? t("play.block.mana")
      : t("play.block.cond");
    this.cantPlayToast(msg);
  }
  onAttack(uid: string) { this.fastForward(); this.submit({ type: "attack", uid }); }
  onReorder(from: number, to: number) { this.fastForward(); this.submit({ type: "reorder", from, to }); }
  onChooseTarget(uid: string | null) { this.fastForward(); this.submit({ type: this.state.pending?.kind === "seek" || this.state.pending?.kind === "recall" ? "pick" : "chooseTarget", uid } as Action); }
  onBuyMarket(i: number) { this.fastForward(); this.submit({ type: "buyMarket", i }); }
  onBuySupply(i: number) { this.fastForward(); this.submit({ type: "buySupply", i }); }
  onRefresh() { this.fastForward(); this.submit({ type: "refresh" }); }
  onEndTurn() {
    // 연타 가드 — 빠른 더블/트리플 클릭이 (봇 턴이 순식간에 끝난 뒤) 방금 시작된
    // 내 새 턴까지 즉시 끝내버리는 사고 방지. 900ms 내 재클릭과 턴 시작 직후
    // 500ms 내 클릭(이전 턴을 노린 잔여 클릭일 가능성이 높음)은 무시한다.
    const now = Date.now();
    if (now - this.lastEndTurnAt < 900) return;
    if (this.state?.cur === this.you && now - this.turnStartedWall < 500 && this.state.turn > 1) return;
    this.lastEndTurnAt = now;
    this.fastForward(); this.submit({ type: "endTurn" });
  }
  async onSurrender() {
    const ok = await confirmDialog({ title: t("surrender.title"), body: t("surrender.body"), confirm: t("common.yes"), cancel: t("common.no"), danger: true });
    if (ok) this.submit({ type: "surrender", player: this.you });
  }

  // ---- apply a reduce result: queued so batches play back one at a time ----
  protected applyResult(res: ReduceResult, animate = true): void {
    const prev = this.state ?? res.state;
    this.state = res.state; // logical state advances immediately (input guards etc.)
    const gen = ++this.fxGen;
    this.queue = this.queue
      .then(() => this.playResult(prev, res, animate, gen))
      .catch((err) => console.error("[playback]", err));
  }

  private async playResult(prev: GameState, res: ReduceResult, animate: boolean, gen: number): Promise<void> {
    if (this.dead) return;
    // batches older than the player's latest action jump-cut; fresh ones play normally
    A.setFxSkip(gen <= this.skipGen);
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
      if (e.type === "turnHeader") this.log.turnHeader(e.turn, e.name, e.isBot, e.player != null ? e.player === this.you : undefined);
      else if (e.type === "log") {
        // "can't play/attack" rejection lines are NOT written to the battle log (they'd
        // just spam it). Only the ACTING player gets a friendly popup. Online: the server
        // never even sends the opponent these; in bot mode this guard suppresses the bot's
        // blocked attempts (cur !== you).
        if (/불가|사용할 수 없|없습니다|가득|できません|cannot|not allowed/i.test(e.html)) {
          if (this.state.cur === this.you) {
            const reason = this.stripHtml(getLang() === "ja" ? e.htmlJa : getLang() === "en" ? logToEn(e.html) : e.html).replace(/^\s*[└·\-]\s*/, "").trim();
            this.cantPlayToast(reason || t("play.block.cond"));
          }
          continue;
        }
        this.log.line(e.html, e.htmlJa);
      }
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
      // glanceable icon rail (topbar): key events → small icons
      if (e.type === "summon" || e.type === "attack" || e.type === "destroy" || e.type === "buy" || e.type === "draw" || e.type === "playSpell" || e.type === "trapReveal") this.view.pushIcon(e.type);
      else if (e.type === "damage" && e.player === this.you) this.view.pushIcon("hitme");
      else if (e.type === "heal" && e.player === this.you) this.view.pushIcon("heal");
      // sound per event
      let sn: SfxName | undefined;
      if (e.type === "summon") sn = e.id === "MIMIC" ? "mimic" : "summon";      // Mimic token has its own cue
      else if (e.type === "attack") sn = e.targetUid ? "attack" : "facehit";     // no target = direct hit on a player
      else sn = ({ hit: "impact", destroy: "death", buy: "buy", draw: "draw", playSpell: "play", trapReveal: "trap", trapSet: "trapSet" } as Partial<Record<GameEvent["type"], SfxName>>)[e.type];
      if (sn) sfx(sn);
      else if (e.type === "damage" && e.player === this.you) sfx("damage");
      else if (e.type === "heal" && e.player === this.you) sfx("heal");
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

    // ---- state-diff celebrations: max mana / max HP gains ----
    // Fire-and-forget: the surge plays OVER the re-rendered board, so the
    // numbers/pips update immediately instead of waiting out the celebration.
    for (const pl of [0, 1] as Side[]) {
      if (this.dead) return;
      const dMana = res.state.players[pl].maxMana - prev.players[pl].maxMana;
      const dHp = res.state.players[pl].maxHp - prev.players[pl].maxHp;
      if (dMana > 0) void A.manaSurge(sideOf(pl), dMana);
      else if (dMana < 0) A.manaDrop(sideOf(pl), -dMana);
      if (dHp > 0) { void A.maxHpSurge(sideOf(pl), dHp); sfx("maxhp"); }
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
    // 고정 renders in order; 제시 is displayed SORTED, so match its ORIGINAL index via data attr
    const node = (from === "supply"
      ? host?.querySelector(`[data-sup-idx="${i}"]`)
      : host?.children[i]) as HTMLElement | undefined;
    return node ? node.getBoundingClientRect() : null;
  }

  private afterApply(res: ReduceResult): void {
    this.syncTimer();
    // coin-toss intro: reveal who won the toss for the first turn (once, at game start)
    if (!this.introShown && this.state && this.state.turn === 1 && !this.state.over) {
      this.introShown = true;
      this.showCoinToss(this.state.cur);
    }
    // max-mana growth cue (mid-turn gains too)
    const mm = this.state?.players?.[this.you]?.maxMana ?? 0;
    if (this.prevMaxMana && mm > this.prevMaxMana) sfx("mana");
    this.prevMaxMana = mm;
    if (res.state !== this.state) return; // a newer batch is queued — let it drive follow-ups
    const g = this.state;
    if (g.over) { this.showWin(); return; }
    // 다중 선택 pending (대숙청 purge / 흑룡 oppRmz / 신수 oppBoard) — 모달에서 한 번에
    // 고른 뒤 1장씩 순차 제출한다 (엔진 프로토콜은 그대로 1장씩 pick)
    const multiKind = g.pending && (g.pending.kind === "purge" || g.pending.kind === "oppRmz" || g.pending.kind === "oppBoard");
    if (!multiKind) this.purgePicks = null; // 선택이 끝나면 큐 정리
    if (g.pending && g.cur === this.you) {
      if (multiKind) {
        if (this.purgePicks) {
          const next = this.purgePicks.shift();
          if (next === undefined) { this.purgePicks = null; setTimeout(() => this.submit({ type: "pick", uid: null }), 0); } // 남은 pending 닫기
          else setTimeout(() => this.submit({ type: "pick", uid: next }), 0);
          return;
        }
        const me = g.players[this.you];
        const opp = g.players[1 - this.you];
        let pool: CardInst[];
        if (g.pending.kind === "purge") {
          // 시련의 영역(trialExile): 묘지에서만 제외
          const discOnly = g.pending.data?.zone === "discard";
          pool = (discOnly ? [...me.discard] : [...me.deck, ...me.discard]).sort((a, b) => a.cost - b.cost);
        }
        else if (g.pending.kind === "oppRmz") pool = [...(opp.removed ?? [])].sort((a, b) => a.cost - b.cost);
        else pool = [ // oppBoard: 상대 몬스터(아우라 제외) + 세트 함정(뒷면) + 영구마법
          ...opp.field.filter((m) => !hasPassive(m, "aura")),
          ...opp.traps.map((t2) => ({ uid: t2.card.uid, id: "HIDDEN", t: "trap", cost: 0, name: t("picker.settrap"), text: "?" } as CardInst)),
          ...opp.enchants.map((e2) => e2.card),
        ];
        const hint = getLang() === "ja" ? g.pending.hintJa : getLang() === "en" ? logToEn(g.pending.hint) : g.pending.hint;
        const max = Math.min((g.pending.data?.val as number) || 1, pool.length);
        cardPickerMulti(hint, pool, max, (uids) => {
          if (!uids.length) { this.submit({ type: "pick", uid: null }); return; } // 아무것도 안 고름 = 취소
          this.purgePicks = uids.slice(1);
          this.submit({ type: "pick", uid: uids[0] });
        });
        return;
      }
      if (g.pending.kind === "giantShop") {
        // 시초의 거인: 코스트 5+ 시초 카드 구매 (지불 가능한 것만 제시)
        // 고대 문명(civChoice): 알 2종 중 1장 무료 선택
        const me = g.players[this.you];
        const free = g.pending.reason === "civChoice";
        const ids = (g.pending.data?.ids as string[] | undefined) ?? [];
        const pool = ids.filter((id) => DB[id] && (free || DB[id].cost <= me.mana)).map((id) => ({ uid: id, ...DB[id] }));
        const hint = getLang() === "ja" ? g.pending.hintJa : getLang() === "en" ? logToEn(g.pending.hint) : g.pending.hint;
        if (!pool.length) { this.submit({ type: "pick", uid: null }); return; }
        cardPicker(hint, pool, (uid) => this.submit({ type: "pick", uid }));
        return;
      }
      if (g.pending.kind === "reroll") {
        // 운명의 수레바퀴: 결과 유지 / 다시 굴리기
        void confirmDialog({ title: t("wheel.title"), body: t("wheel.body"), confirm: t("wheel.reroll"), cancel: t("wheel.keep") })
          .then((re) => this.submit({ type: "pick", uid: re ? "re" : null }));
        return;
      }
      if (g.pending.kind === "seek" || g.pending.kind === "recall") {
        const me = g.players[this.you];
        const pool = g.pending.kind === "seek" ? me.deck : me.discard;
        cardPicker(getLang() === "ja" ? g.pending.hintJa : getLang() === "en" ? logToEn(g.pending.hint) : g.pending.hint, pool, (uid) => this.submit({ type: "pick", uid }));
      }
      return; // oppMon/myMon resolved by board clicks
    }
    this.maybeBot();
  }

  // ============================================================
  // turn timer — 50s/turn. Popups at 25s (1.5s) and a countdown from
  // 5s; the timer chip shakes at ≤5s; on 0 the active player's turn
  // auto-ends (online: only my own client submits, server validates).
  // ============================================================
  private syncTimer(): void {
    if (this.dead) return;
    const g = this.state;
    if (!g || g.over) { this.stopTimer(); return; }
    const key = `${g.turn}:${g.cur}`;
    if (key !== this.timerKey) {
      const firstTurn = this.timerKey === "";
      this.timerKey = key;
      // full turn length for THIS turn: server-authoritative online (ranked 50 / casual 90),
      // else the local 90s default (bot / tutorial).
      this.turnTotal = g.turnTotalMs != null ? Math.round(g.turnTotalMs / 1000) : BaseController.LOCAL_TURN_SECS;
      // Online: trust the server's remaining-ms so a reconnecting client resumes the
      // same clock instead of restarting the turn. Bot mode has no turnLeftMs → full turn.
      this.timerLeft = g.turnLeftMs != null
        ? Math.max(1, Math.ceil(g.turnLeftMs / 1000))
        : this.turnTotal;
      this.warned25 = this.timerLeft <= 25; // don't re-fire the 25s popup mid-turn on reconnect
      this.turnStartedWall = Date.now();    // guard against a stale ~0 clock instantly skipping the turn
      if (!firstTurn && g.cur === this.you) sfx("turn"); // my turn begins
      if (this.timerInt) clearInterval(this.timerInt);
      this.renderTimer();
      this.timerInt = window.setInterval(() => this.tickTimer(), 1000);
    }
  }

  private tickTimer(): void {
    if (this.dead || this.state.over) { this.stopTimer(); return; }
    this.timerLeft--;
    this.renderTimer();
    const s = this.timerLeft;
    if (s === 25 && !this.warned25) { this.warned25 = true; this.turnToast(t("game.timer.sec").replace("{n}", String(s)), "small", 1500); }
    else if (s <= 5 && s >= 1) this.turnToast(String(s), "big", 900);
    if (s <= 0) {
      // never auto-end within the first ~2s of a turn — a stale/near-zero clock (e.g. after a
      // skip or a reconnect) must not instantly skip the turn; give the player real time.
      if (Date.now() - this.turnStartedWall < 2000) return;
      // only the active player's own client forces the end (server validates online)
      if (this.state.cur === this.you && !this.state.over) {
        if (this.state.pending) {
          // A pending target choice (e.g. attacking a monster at the last second) would
          // otherwise block auto-end and freeze the turn indefinitely. Cancel a cancelable
          // pending now; the next tick (still ≤0) then ends the turn. Non-cancelable
          // pendings must be resolved by the player.
          if (this.state.pending.allowCancel) this.onChooseTarget(null);
        } else {
          if (this.timerInt) { clearInterval(this.timerInt); this.timerInt = null; }
          this.submit({ type: "endTurn" });
        }
      } else if (this.timerInt) { clearInterval(this.timerInt); this.timerInt = null; }
    }
  }

  private renderTimer(): void {
    const active = this.state.cur === this.you ? "me" : "opp";
    const other = active === "me" ? "opp" : "me";
    const clr = document.getElementById(`clock-${other}`);
    if (clr) { clr.className = "mp-clock"; clr.replaceChildren(); }
    const el = document.getElementById(`clock-${active}`);
    if (!el) return;
    const total = this.turnTotal;
    const s = Math.max(0, this.timerLeft);
    const mine = active === "me" && !this.state.over;
    const R = 26, C = 2 * Math.PI * R;
    let arc = el.querySelector(".tc-arc") as SVGCircleElement | null;
    let num = el.querySelector(".tc-num") as HTMLElement | null;
    if (!arc || !num) {
      el.innerHTML =
        `<svg viewBox="0 0 64 64" class="tc-svg">` +
        `<circle class="tc-track" cx="32" cy="32" r="${R}"></circle>` +
        `<circle class="tc-arc" cx="32" cy="32" r="${R}" stroke-dasharray="${C.toFixed(1)}"></circle>` +
        `</svg><span class="tc-num"></span>`;
      arc = el.querySelector(".tc-arc"); num = el.querySelector(".tc-num");
      if (!arc || !num) return;
    }
    el.className = "mp-clock show" + (mine ? " mine" : " opp") + (s <= 5 ? " warn" : "");
    // fresh turn (full ring) → snap instantly; otherwise let CSS animate the drain
    arc.style.transition = s >= total ? "none" : "";
    arc.setAttribute("stroke-dashoffset", (C * (1 - s / total)).toFixed(1));
    num.textContent = String(s);
  }

  /** Coin-toss reveal at game start: a two-headed coin — each face is a player's
      profile avatar — flips and lands on the face of whoever goes first. */
  private showCoinToss(firstSide: Side): void {
    const iAmFirst = firstSide === this.you;
    const firstName = firstSide === this.you ? COIN_ME.name : COIN_OPP.name;
    const heads = iAmFirst; // heads face = ME; land on heads if I'm first, else on OPP (tails)
    const face = (p: CoinProfile) => `<span class="ct-ava">${avatarHtml(p.avatar, p.name, 96)}</span>`;
    const ov = document.createElement("div");
    ov.className = "cointoss-ov";
    ov.innerHTML = `
      <div class="cointoss">
        <div class="ct-coin ${heads ? "to-heads" : "to-tails"}">
          <div class="ct-face ct-heads">${face(COIN_ME)}</div>
          <div class="ct-face ct-tails">${face(COIN_OPP)}</div>
        </div>
        <div class="ct-caption">
          <div class="ct-head">${t("coin.title")}</div>
          <div class="ct-result">${iAmFirst ? t("coin.youFirst") : `${firstName} ${t("coin.oppFirst")}`}</div>
        </div>
      </div>`;
    document.body.appendChild(ov);
    sfx("coin");
    setTimeout(() => sfx(iAmFirst ? "turn" : "pop"), 900);
    setTimeout(() => { ov.classList.add("out"); setTimeout(() => ov.remove(), 350); }, 2200);
  }

  private turnToast(text: string, size: "big" | "small", ms: number): void {
    this.toastEl?.remove();
    const el = document.createElement("div");
    el.className = `turn-toast ${size}`;
    el.textContent = text;
    document.body.appendChild(el);
    this.toastEl = el;
    setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 300); }, ms);
  }

  /** Centered popup explaining why a card can't be played (condition not met, etc.). */
  private cantPlayToast(msg: string): void {
    sfx("error");
    document.querySelectorAll(".cant-toast").forEach((n) => n.remove());
    const el = document.createElement("div");
    el.className = "cant-toast";
    el.innerHTML = `<span class="ct-x">✕</span>${msg}`;
    document.body.appendChild(el);
    setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 300); }, 1700);
  }

  private stopTimer(): void {
    if (this.timerInt) { clearInterval(this.timerInt); this.timerInt = null; }
    this.timerKey = "";
    for (const id of ["clock-me", "clock-opp"]) {
      const el = document.getElementById(id);
      if (el) { el.className = "mp-clock"; el.replaceChildren(); }
    }
  }

  protected showWin(): void {
    this.stopTimer();
    if (this.winShown || this.state.winner == null) return;
    this.winShown = true;
    sfx(this.state.winner === this.you ? "win" : "lose");
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
    this.renderRankDelta(); // fill the ranked MMR line if we already have the result
  }

  /** Ranked MMR change on the result screen: "랭크 +18 · 1240 → 1258 (골드)". */
  protected rankChange?: { before: number; after: number };
  protected renderRankDelta(): void {
    if (!this.rankChange) return;
    const el = document.getElementById("winRankDelta");
    if (!el) return;
    const { before, after } = this.rankChange;
    const d = after - before;
    const sign = d > 0 ? "+" : ""; // negative already carries its own '-'
    const cls = d > 0 ? "up" : d < 0 ? "down" : "flat";
    const tBefore = tierOf(before), tAfter = tierOf(after);
    const promo = tBefore !== tAfter ? ` <span class="rk-tier">${tierLabel(tAfter)}</span>` : "";
    el.innerHTML = `<span class="rk-label">${t("rank.label")}</span> <span class="rk-delta rk-${cls}">${sign}${d}</span> <span class="rk-mmr">${before} → ${after}</span>${promo}`;
    (el as HTMLElement).style.display = "";
  }

  destroy(): void {
    this.dead = true;
    this.stopTimer();
    this.toastEl?.remove();
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

  constructor(root: HTMLElement, exits: ControllerExits, playerName = "PLAYER 1", deck?: string[]) {
    super(root, 0, exits);
    const bot = pickBotDeck(); // roll a random archetype (deck + buy discipline) per game
    const res = createGame({
      mode: "bot",
      p0: { id: "local", name: playerName, deck },
      p1: { id: "bot", name: bot.name, isBot: true, deck: bot.cards },
      starting: (Math.random() < 0.5 ? 0 : 1) as Side, // coin toss for first turn
    });
    res.state.players[1].botTune = bot.tune; // archetype-matched buy discipline (survives structuredClone in reduce)
    this.applyResult(res, false);
  }

  protected submit(action: Action): void {
    if (this.state.over) return;
    // input is never locked during playback — so out-of-turn clicks (e.g. on a
    // stale board while the bot's turn plays out) must be rejected here
    if (action.type !== "surrender" && this.state.cur !== this.you) return;
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

  private botTurnNo = -1;
  private botTurnSteps = 0;
  private botStep(): void {
    const g = this.state;
    if (g.over || !g.players[g.cur].isBot) return;
    // 안전망: 봇이 한 턴에서 비정상적으로 많은 행동을 반복하면(거부 루프 등) 강제 턴 종료.
    // 정상 턴은 수십 액션 이내 — 200회는 버그가 아니면 도달 불가.
    if (g.turn !== this.botTurnNo) { this.botTurnNo = g.turn; this.botTurnSteps = 0; }
    if (++this.botTurnSteps > 200) {
      console.warn("[bot] loop guard — forcing endTurn on turn", g.turn);
      this.applyResult(reduce(g, g.pending?.allowCancel ? ({ type: "pick", uid: null } as Action) : ({ type: "endTurn" } as Action)));
      return;
    }
    const action = botDecide(g);
    this.applyResult(reduce(g, action));
  }

  destroy(): void { clearTimeout(this.botTimer); super.destroy(); }
}
