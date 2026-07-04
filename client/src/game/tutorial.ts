// ============================================================
// LORE — interactive tutorial controller.
// A real local game (fixed seed, scripted docile opponent) with a
// coach overlay: 6 steps, each detected from engine events and
// rewarded with credits via /api/rewards/claim (server dedupes,
// so replays never double-pay).
//
//  1. 화면 살펴보기 (coach confirm)        +10
//  2. 카드 구매      (buy event)           +20
//  3. 몬스터 소환    (summon event)        +25  ← M4 injected into hand
//  4. 공격           (attack event)        +25
//  5. 함정           (trapSet → 봇 공격 → trapReveal) +30  ← T6 injected
//  6. 승리           (win event)           +40  ← bot HP lowered to 5
// ============================================================
import type { Action, FieldMon, GameEvent } from "../shared/types";
import { createGame, effAtk, reduce } from "../shared/engine";
import { DB } from "../shared/cards";
import { BaseController, type ControllerExits } from "./controller";
import { api } from "../net/api";
import { t } from "../i18n";
import { winModal } from "../ui/modal";

export interface TutorialHooks {
  /** Called with the fresh server balance after each claimed reward. */
  onCredits?(credits: number): void;
}

export interface TutStepMeta { key: string; reward: number; titleKey: string; }

/** Step metadata — shared with the tutorial screen (list + claimed marks). */
export const TUT_STEPS: TutStepMeta[] = [
  { key: "tut:1", reward: 10, titleKey: "tut.s1.title" },
  { key: "tut:2", reward: 20, titleKey: "tut.s2.title" },
  { key: "tut:3", reward: 25, titleKey: "tut.s3.title" },
  { key: "tut:4", reward: 25, titleKey: "tut.s4.title" },
  { key: "tut:5", reward: 30, titleKey: "tut.s5.title" },
  { key: "tut:6", reward: 40, titleKey: "tut.s6.title" },
];

const SEED = 20260704; // deterministic market/draws for a reproducible lesson

export class TutorialController extends BaseController {
  private step = 0;   // 0-based index into TUT_STEPS
  private phase = 0;  // trap step sub-phase: 0 = set it, 1 = end turn & watch
  private earned = 0;
  private tutDone = false;
  private tutWinShown = false;
  private botAttacked = false;
  private botTimer = 0;
  private glowTimer = 0;
  private coach!: HTMLElement;
  private hooks: TutorialHooks;

  constructor(root: HTMLElement, exits: ControllerExits, playerName = "PLAYER", hooks: TutorialHooks = {}) {
    super(root, 0, exits);
    this.hooks = hooks;
    const res = createGame({
      mode: "bot",
      seed: SEED,
      starting: 0,
      p0: { id: "local", name: playerName },
      p1: { id: "bot", name: "TUTOR", isBot: true },
    });
    this.applyResult(res, false);
    this.buildCoach(root);
    this.glowTimer = window.setInterval(() => this.applyGlow(), 400);
  }

  // ---- all mutations flow through here (player clicks AND bot script) ----
  protected submit(action: Action): void {
    this.apply(action);
  }

  private apply(action: Action): void {
    if (this.state.over) return;
    const res = reduce(this.state, action);
    this.applyResult(res);
    this.onEvents(res.events);
  }

  // ---- step engine ----
  private onEvents(events: GameEvent[]): void {
    if (this.tutDone) return;
    for (const e of events) {
      const s = this.step;
      if (s === 1 && e.type === "buy" && e.player === 0) return this.completeStep();
      if (s === 2 && e.type === "summon" && e.player === 0) return this.completeStep();
      if (s === 3 && e.type === "attack" && e.player === 0) return this.completeStep();
      if (s === 4 && this.phase === 0 && e.type === "trapSet" && e.player === 0) {
        this.phase = 1;
        this.renderCoach();
        return;
      }
      if (s === 4 && this.phase === 1 && e.type === "trapReveal" && e.player === 0) return this.completeStep();
      if (s === 5 && e.type === "win" && e.winner === 0) return this.completeStep();
    }
  }

  private completeStep(): void {
    const idx = this.step;
    const meta = TUT_STEPS[idx];
    if (idx < TUT_STEPS.length - 1) this.activateStep(idx + 1);
    else { this.tutDone = true; this.coach.style.display = "none"; }
    void api.claimReward(meta.key)
      .then((r) => {
        this.earned += r.amount;
        this.hooks.onCredits?.(r.credits);
        this.toast(idx, r.amount);
      })
      .catch(() => this.toast(idx, 0)); // offline/guest: step still advances
  }

  /** Enter step `i`, staging whatever the lesson needs (mana / cards / HP). */
  private activateStep(i: number): void {
    this.step = i;
    this.phase = 0;
    const g = this.state;
    const me = g.players[0];
    if (i === 1) me.mana = me.maxMana; // buy: make sure the market is affordable
    if (i === 2) {                      // summon: guarantee a playable monster in hand
      me.mana = me.maxMana;
      if (!me.hand.some((c) => c.t === "mon")) this.giveCard("M4"); // 블레이드 헤어 5/2
    }
    if (i === 4) {                      // trap: hand the player 카운터 서지
      me.mana = me.maxMana;
      if (!me.hand.some((c) => c.t === "trap")) this.giveCard("T6");
    }
    if (i === 5) {                      // victory: one clean hit finishes it
      const bot = g.players[1];
      const best = Math.max(0, ...me.field.map((m) => effAtk(me, m)));
      bot.hp = Math.min(bot.hp, Math.max(1, best)); // ≤ the player's strongest hit
    }
    this.view.render(this.state);
    this.renderCoach();
  }

  private giveCard(id: string): void {
    const def = DB[id];
    if (!def) return;
    this.state.players[0].hand.push({ ...structuredClone(def), uid: `tut${++this.state.uidSeq}` });
  }

  // ---- scripted opponent: passes every turn, except the one trap demo ----
  protected maybeBot(): void {
    const g = this.state;
    if (g.over || !g.players[g.cur].isBot) return;
    clearTimeout(this.botTimer);
    this.botTimer = window.setTimeout(() => this.botStep(), Math.max(this.animMs, 900));
  }

  private botStep(): void {
    const g = this.state;
    if (g.over || !g.players[g.cur].isBot) return;
    if (this.step === 4 && this.phase === 1 && !this.botAttacked) {
      // summon a scripted assassin (direct-attacker → no target pending),
      // then attack into the player's freshly set counter trap
      this.botAttacked = true;
      const def = structuredClone(DB.ASSASSIN1); // 초급 암살자 4/0, directOnly
      const uid = `tut${++this.state.uidSeq}`;
      const m: FieldMon = { ...def, uid, exhausted: false, tempAtk: 0, atkMod: 0, defMod: 0, attacksUsed: 0, summonedTurn: g.turn };
      g.players[1].field.push(m);
      this.view.render(this.state);
      this.botTimer = window.setTimeout(() => this.apply({ type: "attack", uid }), 1100);
      return; // maybeBot() re-fires after the attack resolves → falls through to endTurn
    }
    this.apply({ type: "endTurn" });
  }

  // ---- coach overlay ----
  private buildCoach(root: HTMLElement): void {
    this.coach = document.createElement("div");
    this.coach.className = "tut-coach";
    root.appendChild(this.coach);
    this.renderCoach();
  }

  private renderCoach(): void {
    const n = this.step + 1;
    const body = this.step === 4 ? t(`tut.s5.p${this.phase}`) : t(`tut.s${n}.body`);
    this.coach.innerHTML = `
      <div class="tut-coach-head">
        <span class="tut-coach-step">${n}/${TUT_STEPS.length}</span>
        <b>${t(`tut.s${n}.title`)}</b>
        <span class="tut-coach-gem">+${TUT_STEPS[this.step].reward} 💎</span>
        <a class="tut-coach-exit" title="${t("tut.exit")}">✕</a>
      </div>
      <div class="tut-coach-body">${body}</div>
      ${this.step === 0 ? `<button class="btn btn-primary tut-coach-btn">${t("tut.ok")}</button>` : ""}`;
    const btn = this.coach.querySelector(".tut-coach-btn") as HTMLElement | null;
    if (btn) btn.onclick = () => this.completeStep();
    (this.coach.querySelector(".tut-coach-exit") as HTMLElement).onclick = () => this.exits.onHome();
  }

  /** Pulsing highlight on whatever the current step wants clicked. */
  private glowSelectors(): string[] {
    if (this.tutDone || this.state.over) return [];
    if (this.state.cur !== 0) return []; // nothing to do on the bot's turn
    switch (this.step) {
      case 1: return ["#market"];
      case 2: return ["#hand"];
      case 3: return ["#meRow .card"];
      case 4: return this.phase === 0 ? ["#hand"] : ["#endBtn"];
      case 5: return ["#meRow .card"];
      default: return [];
    }
  }

  private applyGlow(): void {
    document.querySelectorAll(".tut-glow").forEach((el) => el.classList.remove("tut-glow"));
    for (const sel of this.glowSelectors()) {
      document.querySelectorAll(sel).forEach((el) => el.classList.add("tut-glow"));
    }
  }

  private toast(stepIdx: number, amount: number): void {
    const el = document.createElement("div");
    el.className = "tut-toast";
    el.innerHTML = `✅ ${t("tut.toast.done")} <b>${t(TUT_STEPS[stepIdx].titleKey)}</b>${amount > 0 ? ` <span class="gem">+${amount} 💎</span>` : ""}`;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add("out"), 2100);
    setTimeout(() => el.remove(), 2600);
  }

  // ---- custom end-of-tutorial modal ----
  protected showWin(): void {
    if (this.tutWinShown || this.state.winner == null) return;
    this.tutWinShown = true;
    const won = this.state.winner === 0;
    const detail = won ? t("tut.complete.detail").replace("{n}", String(this.earned)) : "";
    setTimeout(() => winModal(won, detail, () => this.exits.onRematch(), () => this.exits.onHome()), 600);
  }

  destroy(): void {
    clearTimeout(this.botTimer);
    clearInterval(this.glowTimer);
    document.querySelectorAll(".tut-glow").forEach((el) => el.classList.remove("tut-glow"));
    this.coach.remove();
    super.destroy();
  }
}
