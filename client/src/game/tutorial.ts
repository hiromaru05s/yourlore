// ============================================================
// LORE — interactive tutorial controller.
// A real local game (fixed seed, scripted docile opponent) with a
// coach overlay. 9 hands-on steps teaching every core mechanic,
// each detected from engine events/actions/state and rewarded with
// credits via /api/rewards/claim (server dedupes → replays never
// double-pay). Full curriculum totals 890💎.
//
//   1. 화면 이해     (coach confirm)                 +50
//   2. 카드 구매     (buy)                           +70
//   3. 제시 리롤     (refresh)                        +80
//   4. 몬스터 소환   (summon)                         +90   ← M4 injected
//   5. 마법 시전     (cast a spell)                  +100   ← S13 injected
//   6. 공격          (attack)                         +90
//   7. 종족 시너지   (2 same-tribe monsters)         +130   ← TSO2+TSO3, mana staged
//   8. 어튠          (max mana +1)                    +80   ← STARTER_MANA injected
//   9. 승리          (win)                           +200   ← bot HP lowered
// ============================================================
import type { Action, FieldMon, GameEvent, PlayerState } from "../shared/types";
import { createGame, effAtk, reduce } from "../shared/engine";
import { DB, STARTERS } from "../shared/cards";
import { BaseController, type ControllerExits } from "./controller";
import { api } from "../net/api";
import { t } from "../i18n";
import { winModal } from "../ui/modal";

export interface TutorialHooks {
  /** Called with the fresh server balance after each claimed reward. */
  onCredits?(credits: number): void;
}

export interface TutStepMeta { key: string; reward: number; titleKey: string; }

/** Step metadata — shared with the tutorial screen (list + claimed marks). Sum = 890.
 * Keep the existing reward/translation keys: previously claimed progress must not shift.
 * tuto:7 is retired; it is never requested by this curriculum.
 */
export const TUT_STEPS: TutStepMeta[] = [
  { key: "tuto:1",  reward: 50,  titleKey: "tut.s1.title" },
  { key: "tuto:2",  reward: 70,  titleKey: "tut.s2.title" },
  { key: "tuto:3",  reward: 80,  titleKey: "tut.s3.title" },
  { key: "tuto:4",  reward: 90,  titleKey: "tut.s4.title" },
  { key: "tuto:5",  reward: 100, titleKey: "tut.s5.title" },
  { key: "tuto:6",  reward: 90,  titleKey: "tut.s6.title" },
  { key: "tuto:8",  reward: 130, titleKey: "tut.s8.title" },
  { key: "tuto:9",  reward: 80,  titleKey: "tut.s9.title" },
  { key: "tuto:10", reward: 200, titleKey: "tut.s10.title" },
];

const SEED = 20260705; // deterministic market/draws for a reproducible lesson

/** true if any single tribe has ≥2 DISTINCT cards on this field (a synergy has formed). */
function hasTribeSynergy(p: PlayerState): boolean {
  const byTribe = new Map<string, Set<string>>();
  for (const m of p.field) {
    if (!m.tribe) continue;
    if (!byTribe.has(m.tribe)) byTribe.set(m.tribe, new Set());
    byTribe.get(m.tribe)!.add(m.id);
  }
  for (const ids of byTribe.values()) if (ids.size >= 2) return true;
  return false;
}

export class TutorialController extends BaseController {
  private step = 0;   // 0-based index into TUT_STEPS
  private earned = 0;
  private tutDone = false;
  private tutWinShown = false;
  private botTimer = 0;
  private glowTimer = 0;
  private winTimer = 0;
  private winDetail: HTMLElement | null = null;
  private coach!: HTMLElement;
  private hooks: TutorialHooks;

  constructor(root: HTMLElement, exits: ControllerExits, playerName = "PLAYER", hooks: TutorialHooks = {}) {
    super(root, 0, exits);
    this.introShown = true; // skip the coin-toss reveal during the lesson
    this.hooks = hooks;
    const res = createGame({
      mode: "bot",
      seed: SEED,
      starting: 0,
      p0: { id: "local", name: playerName },
      p1: { id: "bot", name: "TUTOR", isBot: true },
    });
    // bot is unkillable until the victory step, so earlier attacks/spells can't end
    // the lesson early; activateStep(8) drops its HP to a single finishing blow.
    res.state.players[1].hp = res.state.players[1].maxHp = 999;
    this.applyResult(res, false);
    this.buildCoach(root);
    this.glowTimer = window.setInterval(() => this.applyGlow(), 400);
  }

  // ---- all mutations flow through here (player clicks AND bot script) ----
  protected submit(action: Action): void {
    // input is never locked during playback — reject out-of-turn clicks
    // (the scripted bot bypasses submit and calls apply() directly)
    if (action.type !== "surrender" && this.state.cur !== this.you) return;
    this.apply(action);
  }

  private apply(action: Action): void {
    if (this.state.over) return;
    const res = reduce(this.state, action);
    this.applyResult(res);
    this.onStep(action, res.events);
  }

  // ---- step engine: detect completion from action + events + resulting state ----
  private onStep(action: Action, events: GameEvent[]): void {
    if (this.tutDone) return;
    const me = this.state.players[0];
    const s = this.step;
    const ev = (type: GameEvent["type"]) => events.some((e) => e.type === type && (e as { player?: number }).player === 0);

    switch (s) {
      case 1: if (ev("buy")) return this.completeStep(); break;                                  // buy
      case 2: if (action.type === "refresh") return this.completeStep(); break;                  // reroll (refresh has no event)
      case 3: if (ev("summon")) return this.completeStep(); break;                               // summon
      case 4: // cast a real spell (not a starter): playSpell whose card is a spell
        if (events.some((e) => e.type === "playSpell" && e.player === 0 && DB[e.id]?.t === "spell")) return this.completeStep();
        break;
      case 5: if (ev("attack")) return this.completeStep(); break;                               // attack
      case 6: if (ev("summon") && hasTribeSynergy(me)) return this.completeStep(); break;        // tribe synergy
      case 7: // attune: max mana went up (STARTER_MANA / attune played)
        if (events.some((e) => e.type === "playSpell" && e.player === 0) && me.maxMana > this.preAttuneMax) return this.completeStep();
        break;
      case 8: if (events.some((e) => e.type === "win" && e.winner === 0)) return this.completeStep(); break; // victory
    }
  }

  private preAttuneMax = 0;

  private completeStep(): void {
    const idx = this.step;
    const meta = TUT_STEPS[idx];
    if (idx < TUT_STEPS.length - 1) this.activateStep(idx + 1);
    else { this.tutDone = true; this.coach.style.display = "none"; }
    void api.claimReward(meta.key)
      .then((r) => {
        this.earned += r.amount;
        if (this.winDetail) this.winDetail.textContent = t("tut.complete.detail").replace("{n}", String(this.earned));
        this.hooks.onCredits?.(r.credits);
        this.toast(idx, r.amount);
      })
      .catch(() => this.toast(idx, 0)); // offline/guest: step still advances
  }

  /** Enter step `i`, staging whatever the lesson needs (mana / cards / HP). */
  private activateStep(i: number): void {
    this.step = i;
    const g = this.state;
    const me = g.players[0];
    // give the player their turn with full mana for most lessons
    if (g.cur !== 0) { /* leave — bot will pass back */ }
    if (i === 1) me.mana = me.maxMana;                        // buy
    if (i === 2) { me.mana = Math.max(me.mana, 1); }           // reroll (needs 1 mana)
    if (i === 3) { me.mana = me.maxMana; this.ensureHand("M4", (c) => c.t === "mon"); }       // summon
    if (i === 4) { me.mana = me.maxMana; this.giveOnce("S13"); }    // cast a current, target-free damage spell
    if (i === 5) { me.mana = me.maxMana; this.ensureAttacker(); }                             // attack
    if (i === 6) {                                            // tribe synergy: two SAME-tribe monsters
      me.maxMana = Math.max(me.maxMana, 7); me.mana = me.maxMana;
      this.giveOnce("TSO2"); this.giveOnce("TSO3"); // neither requires a tribe-only field
    }
    if (i === 7) {                                            // attune
      me.mana = Math.max(me.mana, 3);
      this.preAttuneMax = me.maxMana;
      this.giveOnce("STARTER_MANA");
    }
    if (i === 8) {                                            // victory: one clean hit finishes it
      this.ensureAttacker();
      const bot = g.players[1];
      const best = Math.max(1, ...me.field.map((m) => effAtk(me, m)));
      bot.hp = Math.min(bot.hp, best); // ≤ the player's strongest hit
    }
    this.view.render(this.state);
    this.renderCoach();
  }

  /** Ensure the player holds a card matching `pred`; if not, inject `id`. */
  private ensureHand(id: string, pred: (c: { t: string }) => boolean): void {
    if (!this.state.players[0].hand.some(pred)) this.giveCard(id);
  }
  /** Ensure the player has a monster on the field that can attack this turn. */
  private ensureAttacker(): void {
    const me = this.state.players[0];
    if (!me.field.some((m) => !m.exhausted)) {
      const def = structuredClone(DB.M4);
      const m: FieldMon = { ...def, uid: `tut${++this.state.uidSeq}`, exhausted: false, tempAtk: 0, atkMod: 0, defMod: 0, summonedTurn: this.state.turn };
      me.field.push(m);
    }
  }
  private giveOnce(id: string): void {
    if (!this.state.players[0].hand.some((c) => c.id === id)) this.giveCard(id);
  }
  private giveCard(id: string): void {
    const def = DB[id] || STARTERS[id];
    if (!def) return;
    this.state.players[0].hand.push({ ...structuredClone(def), uid: `tut${++this.state.uidSeq}` });
  }

  // ---- scripted opponent: passes every turn ----
  protected maybeBot(): void {
    const g = this.state;
    if (g.over || !g.players[g.cur].isBot) return;
    clearTimeout(this.botTimer);
    this.botTimer = window.setTimeout(() => this.botStep(), 900);
  }

  private botStep(): void {
    const g = this.state;
    if (g.over || !g.players[g.cur].isBot) return;
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
    const meta = TUT_STEPS[this.step];
    const body = t(meta.titleKey.replace(".title", ".body"));
    this.coach.innerHTML = `
      <div class="tut-coach-head">
        <span class="tut-coach-step">${n}/${TUT_STEPS.length}</span>
        <b>${t(meta.titleKey)}</b>
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
      case 2: return ["#refreshBtn"];
      case 3: return ["#hand"];
      case 4: return ["#hand"];
      case 5: return ["#meRow .card"];
      case 6: return ["#hand"];
      case 7: return ["#hand"];
      case 8: return ["#meRow .card"];
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
    this.winTimer = window.setTimeout(() => {
      const detail = won ? t("tut.complete.detail").replace("{n}", String(this.earned)) : "";
      winModal(won, detail, () => this.exits.onRematch(), () => this.exits.onHome());
      if (won) this.winDetail = document.getElementById("winDetail");
    }, 600);
  }

  destroy(): void {
    clearTimeout(this.botTimer);
    clearInterval(this.glowTimer);
    clearTimeout(this.winTimer);
    this.winDetail = null;
    document.querySelectorAll(".tut-glow").forEach((el) => el.classList.remove("tut-glow"));
    this.coach.remove();
    super.destroy();
  }
}
