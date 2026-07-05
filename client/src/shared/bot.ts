// ============================================================
// LORE — bot AI. Pure: botDecide(state, difficulty) -> single best Action.
// The controller applies it, then calls again until endTurn.
//
// Layers:
//  · greedyDecide — fast heuristic policy (break traps first, develop board,
//    count penetration damage, disciplined buys). Strong; the ceiling for the
//    easy/normal/hard tiers.
//  · value-net search (HELL only) — enumerates candidate actions, plays each out
//    to the end of the opponent's reply, and scores the resulting position with a
//    learned value network (botNet). It deviates from greedy only when the net
//    judges it clearly better (margin), averaged over determinized samples so it
//    never reads hidden info. A/B vs the pure greedy (hard) bot: ~55%.
//
// Difficulty is otherwise a BLUNDER RATE — how often the bot throws away its best
// move for a random legal one. Bot-vs-bot A/B (200 games/matchup, first player
// alternated) gives a clean monotonic ladder:
//   normal>easy 68% · hard>normal 64% · hell>hard ~55% · hell>easy 81%
//  · easy   — blunders ~45% of moves → 초보자용
//  · normal — blunders ~22% of moves
//  · hard   — blunders ~8% of moves (best pure heuristic)
//  · hell   — never blunders + value-net look-ahead search → 최강
// ============================================================
import type { Action, CardInst, FieldMon, GameState, PlayerState, Side } from "./types";
import { buyCost, cardValue, chestLocked, effAtk, effDef, glassBanActive, playCost, reduce, summonReqMet } from "./engine";
import { netEval, determinize } from "./botNet";
import { DB } from "./cards";

export type BotDifficulty = "easy" | "normal" | "hard" | "hell";

const BLUNDER: Record<BotDifficulty, number> = { easy: 0.45, normal: 0.22, hard: 0.08, hell: 0 };

export function botDecide(g: GameState, diff: BotDifficulty = "hard"): Action {
  const best = diff === "hell" ? hellDecide(g) : greedyDecide(g);
  // blunder: with tier probability, discard the best move for a random legal one
  const p = BLUNDER[diff];
  if (p > 0 && Math.random() < p) {
    const bestKey = JSON.stringify(best);
    const cands = candidates(g).filter((a) => JSON.stringify(a) !== bestKey);
    if (cands.length > 0) return cands[Math.floor(Math.random() * cands.length)];
  }
  return best;
}

// ---------------- HELL: value-net guided rollout search ----------------
const HELL_MARGIN = 0.02;  // net advantage a deviation must beat greedy by
const HELL_ROLL = 40;      // max greedy steps per turn during a rollout
const MCTS_SIMS = 16;      // root PUCT budget; enough for topK while evaluable
const MCTS_TOPK = 8;       // complete legal actions are ranked, then narrowed
const MCTS_CPUCT = 1.35;
const LETHAL_DEPTH = 10;   // enough for spell/target chains + several attacks
const LETHAL_NODES = 260;  // keep bot turns snappy even in wide late boards

function hellDecide(g: GameState): Action {
  if (g.pending) return greedyDecide(g); // let the greedy policy resolve targets/picks
  try {
    const s = g.cur as Side;
    const base = greedyDecide(g);
    const pool = rankedLegalActions(g, base).slice(0, MCTS_TOPK);
    if (pool.length === 0) return base;
    return rootPuct(g, s, pool, base);
  } catch { return greedyDecide(g); } // engine hiccup → safe fallback
}

interface RootArm { a: Action; p: number; n: number; w: number }

function rootPuct(g: GameState, s: Side, pool: { a: Action; prior: number }[], base: Action): Action {
  const arms: RootArm[] = pool.map((x) => ({ a: x.a, p: x.prior, n: 0, w: 0 }));
  const baseKey = JSON.stringify(base);
  if (!arms.some((x) => JSON.stringify(x.a) === baseKey)) arms.unshift({ a: base, p: Math.max(1, actionPrior(g, base)), n: 0, w: 0 });
  const psum = arms.reduce((t, x) => t + x.p, 0) || 1;
  arms.forEach((x) => { x.p /= psum; });

  for (let i = 0; i < MCTS_SIMS; i++) {
    const totalN = arms.reduce((t, x) => t + x.n, 0);
    let best = arms[0], bestU = -Infinity;
    for (const arm of arms) {
      const q = arm.n > 0 ? arm.w / arm.n : 0.5;
      const u = q + MCTS_CPUCT * arm.p * Math.sqrt(totalN + 1) / (1 + arm.n);
      if (u > bestU) { bestU = u; best = arm; }
    }
    const v = hellRollout(g, best.a, s);
    best.n++;
    best.w += v;
  }

  const baseArm = arms.find((x) => JSON.stringify(x.a) === baseKey);
  const baseQ = baseArm && baseArm.n > 0 ? baseArm.w / baseArm.n : hellRollout(g, base, s);
  let best = base, bestN = baseArm?.n ?? 0, bestQ = baseQ + HELL_MARGIN;
  for (const arm of arms) {
    if (arm.n === 0) continue;
    const q = arm.w / arm.n;
    if (arm.n > bestN || (arm.n === bestN && q > bestQ)) {
      if (q >= baseQ + HELL_MARGIN || JSON.stringify(arm.a) === baseKey) {
        best = arm.a; bestN = arm.n; bestQ = q;
      }
    }
  }
  return best;
}

/** Apply `a`, finish my turn + the opponent's reply greedily, score with the value net. */
function hellRollout(g: GameState, a: Action, s: Side): number {
  const g2 = structuredClone(g);
  g2.rng = (g2.rng ^ 0x9e3779b9) >>> 0; // decouple from the real RNG (no dice clairvoyance)
  determinize(g2, s);                   // hide hidden info: sample from public knowledge
  let st = reduce(g2, a).state;
  // no-op guard: the engine refused the action before paying → never pick it
  if (a.type === "play" && !st.pending && !st.over &&
      st.players[s].mana === g.players[s].mana && st.players[s].hand.length === g.players[s].hand.length) return -Infinity;
  let steps = 0;
  while (!st.over && st.cur === s && steps < HELL_ROLL) { st = reduce(st, greedyDecide(st, false)).state; steps++; }
  steps = 0;
  while (!st.over && st.cur !== s && steps < HELL_ROLL) { st = reduce(st, greedyDecide(st, false)).state; steps++; }
  if (st.over) return st.winner === s ? 1 : 0;
  return strongValueEval(st, s);
}

// candidate actions, deduped + trimmed (used to sample a random legal "blunder",
// for value-net search, and for self-play exploration)
export function candidates(g: GameState): Action[] {
  const p = g.players[g.cur];
  const o = g.players[1 - g.cur];
  const out: Action[] = [];

  if (g.pending) {
    const pend = g.pending;
    const push = (uid: string | null) => out.push(pend.kind === "seek" || pend.kind === "recall" ? { type: "pick", uid } : { type: "chooseTarget", uid });
    if (pend.kind === "oppMon" && pend.reason === "attack") {
      // attack targeting: only killable targets — a blocked swing (atk<=def) does
      // NOTHING, so it's strictly dominated; if none killable defer to greedy
      const att = p.field.find((m) => m.uid === (pend.data?.attackerUid as string));
      const a = att ? effAtk(p, att) : 0;
      o.field.filter((tm) => a > effDef(o, tm)).forEach((m) => push(m.uid));
      return out; // empty → searchDecide falls back to the greedy pick
    }
    if (pend.kind === "oppMon") o.field.forEach((m) => push(m.uid));
    else if (pend.kind === "myMon") p.field.forEach((m) => push(m.uid));
    else if (pend.kind === "purge") {
      const pool = [...p.deck, ...p.discard];
      const seen = new Set<string>();
      [...pool].sort((a, b) => cardValue(a) - cardValue(b)).forEach((c) => {
        if (!seen.has(c.id) && seen.size < 6) { seen.add(c.id); push(c.uid); }
      });
      push(null); // "그만 제외" 후보
      return out;
    }
    else if (pend.kind === "seek" || pend.kind === "recall") {
      const pool = pend.kind === "seek" ? p.deck : p.discard;
      const exile = pend.reason === "exilePick"; // 제외용은 저가치 우선 탐색
      const seen = new Set<string>();
      [...pool].sort((a, b) => (exile ? cardValue(a) - cardValue(b) : cardValue(b) - cardValue(a))).forEach((c) => {
        if (!seen.has(c.id) && seen.size < 8) { seen.add(c.id); push(c.uid); }
      });
    }
    if (out.length === 0) push(null);
    return out;
  }

  // plays: unique by card id, affordable
  // (no chests before turn 7 — a turn-2 mimic on the enemy board costs more than
  //  early mana/HP compounds; single-sample rollouts under-count the 25% risk)
  const seenPlay = new Set<string>();
  p.hand.forEach((c, idx) => {
    if (c.star === "chest" && (g.turn <= 6 || chestLocked(g))) return;
    if (playCost(c) > p.mana || seenPlay.has(c.id)) return;
    seenPlay.add(c.id);
    out.push({ type: "play", idx });
  });
  // attacks: only swings that can land (kill / empty field / assassin), deduped by atk
  const noAtk = g.players.some((pl) => pl.enchants.some((e) => e.card.ench === "noAttack"));
  if (!noAtk) {
    const seenAtk = new Set<string>();
    p.field.forEach((m) => {
      if (m.exhausted) return;
      const a = effAtk(p, m);
      if (glassBanActive(g) && effDef(p, m) <= 1) return; // 유리 병기 금지령
      const canLand = m.directOnly || o.field.length === 0 || o.field.some((tm) => a > effDef(o, tm));
      if (!canLand) return;
      const key = `${a}|${m.directOnly ? 1 : 0}`;
      if (seenAtk.has(key)) return;
      seenAtk.add(key);
      out.push({ type: "attack", uid: m.uid });
    });
  }
  // buys: top 4 by rough score, unique by id
  const buys: { a: Action; s: number }[] = [];
  const seenBuy = new Set<string>();
  p.supply.forEach((c, i) => { if (c && buyCost(p, c) <= p.mana && !seenBuy.has(c.id)) { seenBuy.add(c.id); buys.push({ a: { type: "buySupply", i }, s: roughBuy(c) }); } });
  g.market.forEach((c, i) => { if (buyCost(p, c) <= p.mana && !seenBuy.has(c.id)) { seenBuy.add(c.id); buys.push({ a: { type: "buyMarket", i }, s: roughBuy(c) }); } });
  buys.sort((x, y) => y.s - x.s).slice(0, 4).forEach((b) => out.push(b.a));
  // 상대 함정이 깔려 있고 공격이 가능하면 "공격 보류(턴 종료)"도 후보에 —
  // 킬각이 있어도 함정에 꽂아주는 게 정답이 아닐 때가 있다 (A/B +5%)
  if (o.traps.length > 0 && out.some((a) => a.type === "attack")) out.push({ type: "endTurn" });
  if (out.length === 0) out.push({ type: "endTurn" });
  return out;
}

function roughBuy(c: CardInst): number {
  return c.t === "mon" ? (c.atk || 0) * 2.0 + (c.def || 0) * 1.2 + c.cost * 0.7 : cardValue(c);
}

function rankedLegalActions(g: GameState, base: Action): { a: Action; prior: number }[] {
  const seen = new Set<string>();
  const out: { a: Action; prior: number }[] = [];
  const add = (a: Action): void => {
    const k = JSON.stringify(a);
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ a, prior: Math.max(0.01, actionPrior(g, a) * policyHead(g, a)) });
  };

  add(base);
  for (const a of legalActions(g)) add(a);
  return out.sort((x, y) => y.prior - x.prior);
}

function legalActions(g: GameState): Action[] {
  const p = g.players[g.cur];
  const o = g.players[1 - g.cur];
  const out: Action[] = [];
  const add = (a: Action) => out.push(a);

  if (g.pending) {
    const pend = g.pending;
    const pick = (uid: string | null): Action => pend.kind === "seek" || pend.kind === "recall" || pend.kind === "purge"
      ? { type: "pick", uid }
      : { type: "chooseTarget", uid };
    if (pend.kind === "oppMon") o.field.forEach((m) => add(pick(m.uid)));
    else if (pend.kind === "myMon") p.field.forEach((m) => add(pick(m.uid)));
    else if (pend.kind === "seek") p.deck.forEach((c) => add(pick(c.uid)));
    else if (pend.kind === "recall") p.discard.forEach((c) => add(pick(c.uid)));
    else if (pend.kind === "purge") [...p.deck, ...p.discard].forEach((c) => add(pick(c.uid)));
    if (pend.allowCancel) add(pick(null));
    return out;
  }

  p.hand.forEach((c, idx) => { if (playCost(c) <= p.mana) add({ type: "play", idx }); });
  const noAtk = g.players.some((pl) => pl.enchants.some((e) => e.card.ench === "noAttack"));
  if (!noAtk) {
    p.field.forEach((m) => {
      if (!m.exhausted && (!glassBanActive(g) || effDef(p, m) > 1)) add({ type: "attack", uid: m.uid });
    });
  }
  p.supply.forEach((c, i) => { if (c && buyCost(p, c) <= p.mana) add({ type: "buySupply", i }); });
  g.market.forEach((c, i) => { if (buyCost(p, c) <= p.mana) add({ type: "buyMarket", i }); });
  if (p.mana >= 1) add({ type: "refresh" });
  add({ type: "endTurn" });
  return out;
}

function actionPrior(g: GameState, a: Action): number {
  const p = g.players[g.cur];
  const o = g.players[1 - g.cur];
  const read = opponentRead(o);
  if (a.type === "endTurn") return 0.15 + (p.mana <= 1 ? 0.25 : 0) - (p.mana > 2 && earlyCullPressure(g, p) > 0.5 ? 0.08 : 0);
  if (a.type === "refresh") return p.mana >= 8 ? 1.2 : (p.mana >= 5 && handQualityLow(p) ? 0.35 : 0.12);
  if (a.type === "chooseTarget" || a.type === "pick") {
    if (a.uid === null) return 0.08;
    const target = [...p.field, ...o.field, ...p.deck, ...p.discard, ...o.deck, ...o.discard].find((c) => c.uid === a.uid);
    return target ? 0.4 + cardValue(target) / 20 : 0.25;
  }
  if (a.type === "play") {
    const c = p.hand[a.idx];
    if (!c) return 0.01;
    if (c.star === "trash") return 0.35 + earlyCullPressure(g, p) * 0.75;
    if (c.star === "mana") return 1.1 + attunePressure(g, p) * 0.65;
    if (c.act === "chestToMana") return 1.5 + attunePressure(g, p) * 0.5 + (p.hand.some((h) => h.star === "chest") ? 0.4 : -1);
    if (c.act === "dmg" || c.act === "siphon") return 5 + (c.val || 0) * 0.5 + (o.hp <= (c.val || 0) ? 10 : 0);
    if (c.act === "destroyTrap" && (o.traps.length > 0 || read.trap > 0)) return 3.5 + o.traps.length * 1.15 + read.trap * 0.25;
    if (c.act === "destroyMon" || c.act === "weaken" || c.act === "atkDown" || c.act === "defDown") return 3.5 + (o.field.length > 0 ? 1.5 : 0) + (c.val || 0) * 0.2 + read.wall * 0.12;
    if (c.id === "INQUISITION") return 0.8 + read.tribe * 0.3;
    if (c.ench === "noAttack") return 0.85 + read.attack * 0.25 - (potentialFace(p, o) > potentialFace(o, p) ? 0.35 : 0);
    if (c.ench === "noSummonLow") return 0.75 + read.tribe * 0.1 + read.attack * 0.08;
    if (c.act === "buffTurn" || c.act === "buffAllTurn" || c.act === "buffPerm") return 3 + p.field.length * 0.6 + (c.val || 0) * 0.2;
    if (c.t === "mon") return 2.2 + (c.atk || 0) * 0.35 + (c.def || 0) * 0.18 + c.cost * 0.08;
    if (c.act === "draw" || c.act === "seek" || c.act === "recall") return 2.0;
    if (c.act === "manaUp" || c.act === "manaUpGain" || c.act === "chestToMana") return 1.8;
    if (c.t === "trap") return 1.0 + (p.traps.length < 2 ? 0.4 : 0);
    return 0.6 + cardValue(c) / 20;
  }
  if (a.type === "attack") {
    const m = p.field.find((x) => x.uid === a.uid);
    if (!m) return 0.01;
    const atk = effAtk(p, m);
    if (m.directOnly || o.field.length === 0) return 4 + atk * 0.45 + (atk >= o.hp ? 10 : 0) - (o.traps.length > 0 ? 0.7 + read.trap * 0.25 : 0);
    const bestKill = o.field.filter((tm) => atk > effDef(o, tm)).sort((x, y) => (effAtk(o, y) * 2 + effDef(o, y)) - (effAtk(o, x) * 2 + effDef(o, x)))[0];
    return bestKill ? 3 + atk * 0.25 + effAtk(o, bestKill) * 0.35 - (o.traps.length > 0 ? 0.45 + read.trap * 0.15 : 0) : 0.08;
  }
  if (a.type === "buySupply") {
    const c = p.supply[a.i];
    return c ? 0.4 + buyFit(g, p, o, c) / 8 : 0.01;
  }
  if (a.type === "buyMarket") {
    const c = g.market[a.i];
    return c ? 0.35 + buyFit(g, p, o, c) / 9 : 0.01;
  }
  return 0.01;
}

interface OpponentRead { trap: number; wall: number; spell: number; tribe: number; ramp: number; attack: number }

function opponentRead(o: PlayerState): OpponentRead {
  const r: OpponentRead = { trap: o.traps.length, wall: 0, spell: 0, tribe: 0, ramp: 0, attack: 0 };
  for (const [id, nRaw] of Object.entries(o.buys ?? {})) {
    const n = Math.min(4, nRaw || 0);
    const c = DB[id];
    if (!c) continue;
    if (c.t === "trap") r.trap += n;
    if (c.t === "spell") r.spell += n;
    if (c.tribe) r.tribe += n;
    if ((c.def || 0) >= 8 || c.aura === "wallDef") r.wall += n;
    if (c.aura === "mana1" || c.aura === "mana2" || c.act === "manaUp" || c.act === "manaUpGain" || c.act === "chestToMana") r.ramp += n;
    if ((c.atk || 0) >= 7 || c.directOnly || c.act === "dmg" || c.act === "siphon") r.attack += n;
  }
  return r;
}

function earlyCullPressure(g: GameState, p: PlayerState): number {
  const trash = [...p.hand, ...p.deck, ...p.discard].filter((c) => c.star === "trash").length;
  const handPlays = p.hand.filter((c) => c.star !== "trash" && playCost(c) <= p.mana).length;
  const early = g.turn <= 8 ? 1 : g.turn <= 14 ? 0.55 : 0.2;
  const spare = p.mana >= 1 ? Math.min(1, p.mana / 4) : 0;
  const clutter = Math.min(1, trash / 8);
  return Math.max(0, Math.min(1, early * clutter * spare * (handPlays <= 1 ? 1 : 0.35)));
}

function attunePressure(g: GameState, p: PlayerState): number {
  const early = g.turn <= 10 ? 1 : g.turn <= 18 ? 0.55 : 0.15;
  const capRoom = p.maxMana < 10 ? 1 : p.maxMana < 13 ? 0.45 : 0.1;
  const spare = p.mana >= 3 ? 1 : p.mana / 3;
  return Math.max(0, Math.min(1, early * capRoom * spare));
}

function handQualityLow(p: PlayerState): boolean {
  return p.hand.filter((c) => c.star !== "trash" && roughBuy(c) >= 12).length <= 1;
}

function buyFit(g: GameState, p: PlayerState, o: PlayerState, c: CardInst): number {
  const read = opponentRead(o);
  let s = roughBuy(c);
  const myIds = new Set([...p.hand, ...p.deck, ...p.discard, ...p.field].map((x) => x.id));
  if (c.tribe) {
    const tribeHave = new Set([...p.hand, ...p.deck, ...p.discard, ...p.field].filter((x) => x.tribe === c.tribe).map((x) => x.id));
    if (!tribeHave.has(c.id)) s += Math.min(5, tribeHave.size * 1.8);
  }
  if (c.act === "destroyTrap" && read.trap > 0) s += Math.min(3, read.trap * 0.55);
  if ((c.act === "destroyMon" || c.act === "weaken" || c.act === "atkDown" || c.act === "defDown") && (read.wall > 0 || read.attack > 0)) s += Math.min(2.5, (read.wall + read.attack) * 0.3);
  if ((c.react === "nullspell" || c.aura === "sealAll" || c.aura === "sealLow") && read.spell > 0) s += Math.min(2.5, read.spell * 0.35);
  if ((c.ench === "noAttack" || c.react) && read.attack > 0) s += Math.min(2, read.attack * 0.25);
  if ((c.aura === "mana1" || c.aura === "mana2" || c.act === "manaUp" || c.act === "manaUpGain") && g.turn <= 12 && p.maxMana < 10) s += 1.4;
  if (myIds.has(c.id) && !c.tribe) s -= 1.5;
  return s;
}

function strongValueEval(g: GameState, s: Side): number {
  const base = netEval(g, s);
  const p = g.players[s], o = g.players[1 - s];
  const myAtk = p.field.reduce((t, m) => t + effAtk(p, m), 0);
  const opAtk = o.field.reduce((t, m) => t + effAtk(o, m), 0);
  const myDef = p.field.reduce((t, m) => t + effDef(p, m), 0);
  const opDef = o.field.reduce((t, m) => t + effDef(o, m), 0);
  const pressure = (potentialFace(p, o) - potentialFace(o, p)) / 45;
  const board = ((myAtk - opAtk) * 0.55 + (myDef - opDef) * 0.2 + (p.field.length - o.field.length) * 1.4) / 35;
  const resources = ((p.hand.length - o.hand.length) * 0.7 + (p.maxMana - o.maxMana) * 0.9 + (p.traps.length - o.traps.length) * 0.5) / 18;
  const hp = (p.hp - o.hp) / 90;
  return clamp01(base + 0.025 * pressure + 0.018 * board + 0.012 * resources + 0.01 * hp);
}

function potentialFace(p: PlayerState, o: PlayerState): number {
  const defs = o.field.map((m) => effDef(o, m)).sort((a, b) => b - a);
  let total = 0;
  for (const m of [...p.field].filter((x) => !x.exhausted).sort((a, b) => effAtk(p, b) - effAtk(p, a))) {
    const a = effAtk(p, m);
    if (a <= 0) continue;
    if (m.directOnly || defs.length === 0) { total += a; continue; }
    const k = defs.findIndex((d) => a > d);
    if (k >= 0) { total += a - defs[k]; defs.splice(k, 1); }
  }
  return total;
}

const POLICY_W = [
  1.45, 1.25, 0.95, 0.75, 0.65, 0.45,
  -0.55, -0.4, 0.35, 0.3, 0.25, -0.25,
  0.15, 0.12, 0.12, 0.12,
];
const POLICY_B = -0.15;

function policyHead(g: GameState, a: Action): number {
  const x = policyFeatures(g, a);
  let z = POLICY_B;
  for (let i = 0; i < POLICY_W.length; i++) z += POLICY_W[i] * x[i];
  return 0.8 + 0.4 / (1 + Math.exp(-z));
}

function policyFeatures(g: GameState, a: Action): number[] {
  const p = g.players[g.cur], o = g.players[1 - g.cur];
  const greedyKey = JSON.stringify(greedyDecide(g, false));
  const isGreedy = JSON.stringify(a) === greedyKey ? 1 : 0;
  const canKill = actionCanWin(g, a) ? 1 : 0;
  const read = opponentRead(o);
  let face = 0, removes = 0, develops = 0, draw = 0, trapBreak = 0, buy = 0, weak = 0, risky = 0;
  let cull = 0, attune = 0, counter = 0, attackOk = 0;
  if (a.type === "play") {
    const c = p.hand[a.idx];
    if (c) {
      face = (c.act === "dmg" || c.act === "siphon") ? Math.min(1, (c.val || 0) / Math.max(1, o.hp)) : 0;
      removes = (c.act === "destroyMon" || c.act === "weaken" || c.act === "atkDown" || c.act === "defDown") && o.field.length > 0 ? 1 : 0;
      develops = c.t === "mon" ? Math.min(1, ((c.atk || 0) + (c.def || 0)) / 18) : 0;
      draw = c.act === "draw" || c.act === "seek" || c.act === "recall" ? 1 : 0;
      trapBreak = c.act === "destroyTrap" && o.traps.length > 0 ? 1 : 0;
      cull = c.star === "trash" ? earlyCullPressure(g, p) : 0;
      attune = c.star === "mana" || c.act === "manaUp" || c.act === "manaUpGain" || c.act === "chestToMana" ? attunePressure(g, p) : 0;
      counter = (c.act === "destroyTrap" && read.trap > 0) || ((c.act === "destroyMon" || c.act === "weaken") && read.wall > 0) || (c.id === "INQUISITION" && read.tribe > 0) ? 1 : 0;
      risky = c.id === "SHATTER" || c.id === "MASSACRE" || c.id === "GUILD_CHEST" || c.id === "FORBIDDEN" ? 1 : 0;
      weak = c.star === "trash" || c.star === "chest" ? 0.6 : 0;
    }
  } else if (a.type === "attack") {
    const m = p.field.find((x) => x.uid === a.uid);
    if (m) {
      const atk = effAtk(p, m);
      face = m.directOnly || o.field.length === 0 ? Math.min(1, atk / Math.max(1, o.hp)) : 0;
      removes = o.field.some((tm) => atk > effDef(o, tm)) ? 0.8 : 0;
      attackOk = face > 0 || removes > 0 ? 1 : 0;
      risky = o.traps.length > 0 ? 0.8 : 0;
      weak = removes === 0 && face === 0 ? 1 : 0;
    }
  } else if (a.type === "buySupply" || a.type === "buyMarket") {
    const c = a.type === "buySupply" ? p.supply[a.i] : g.market[a.i];
    buy = c ? Math.min(1, buyFit(g, p, o, c) / 32) : 0;
    counter = c && buyFit(g, p, o, c) > roughBuy(c) + 2 ? 1 : 0;
    weak = c && roughBuy(c) < (p.maxMana >= 5 ? 17 : 11) ? 0.7 : 0;
  } else if (a.type === "refresh") {
    draw = p.mana >= 8 ? 0.7 : 0;
    weak = p.mana < 8 ? 0.8 : 0;
  } else if (a.type === "endTurn") {
    weak = p.mana > 2 ? 0.9 : 0.2;
  }
  const tempo = (p.mana - o.mana) / 15;
  return [isGreedy, canKill, face, removes, develops, trapBreak, weak, risky, draw, buy, tempo, o.traps.length > 0 ? 1 : 0, cull, attune, counter, attackOk];
}

function actionCanWin(g: GameState, a: Action): boolean {
  const p = g.players[g.cur], o = g.players[1 - g.cur];
  if (a.type === "play") {
    const c = p.hand[a.idx];
    return !!c && (c.act === "dmg" || c.act === "siphon") && (c.val || 0) >= o.hp;
  }
  if (a.type === "attack") {
    const m = p.field.find((x) => x.uid === a.uid);
    return !!m && (m.directOnly || o.field.length === 0) && effAtk(p, m) >= o.hp;
  }
  return false;
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

// ---------------- greedy policy (the difficulty-neutral heuristic) ----------------
export function greedyDecide(g: GameState, useLethal = true): Action {
  const p = g.players[g.cur];
  const o = g.players[1 - g.cur];

  if (useLethal && lethalWorthSearching(g)) {
    const lethal = findLethalAction(g);
    if (lethal) return lethal;
  }

  // 0) resolve a pending target/pick automatically
  if (g.pending) return autoTarget(g);

  const noAtk = g.players.some((pl) => pl.enchants.some((e) => e.card.ench === "noAttack"));
  const oppNoLow = o.enchants.some((e) => e.card.ench === "noSummonLow"); // blocks my cost<=3 summons

  const ready = p.field.filter((m) => !m.exhausted);

  // castable(): reject spells that would be refused before paying (avoids the bot
  // re-picking an uncastable card forever) OR that would be self-defeating.
  const castable = (c: CardInst): boolean => {
    // 침묵 오라 / 침묵의 심판: 마법 봉인 (엔진에서 거부되므로 봇도 스킵)
    if (c.t === "spell") {
      if (g.players.some((pl) => pl.field.some((m) => m.aura === "sealAll"))) return false;
      if (playCost(c) <= 5 && g.players.some((pl) => pl.field.some((m) => m.aura === "sealLow"))) return false;
      if (p.spellSealTurn) return false;
    }
    if (c.act === "wipeBack" && p.field.length > 0) return false;
    if (c.id === "S4" && (p.usesTurn?.["S4"] || 0) >= 1) return false;
    if (c.id === "GS9_0" && o.hp <= 21) return false;
    if (c.id === "GS10_0" && p.field.length > 1) return false;
    if (c.id === "RUNE1" && !o.field.some((m) => (m.cost ?? 0) >= 5)) return false;
    if (c.id === "RUNE2" && !p.hand.some((h) => h.id === "RUNE1")) return false;
    if (c.id === "RUNE3" && !(p.hand.some((h) => h.id === "RUNE1") && p.hand.some((h) => h.id === "RUNE2"))) return false;
    if ((c.id === "DISARM1" || c.id === "DISARM2" || c.id === "DISARM3") && o.enchants.length === 0) return false;
    // don't waste heals at (near) full HP
    if (c.act === "heal" && p.maxHp - p.hp < Math.min(c.val || 0, 6)) return false;
    // 어튠-마: needs a chest in hand (봉인 중에도 사용 가능 — 상자를 '여는' 게 아니라 소모)
    if (c.act === "chestToMana" && !p.hand.some((h) => h.star === "chest")) return false;
    // 길드 상자: 자해 10 리스크 — 체력 여유 필요
    if (c.id === "GUILD_CHEST" && p.hp <= 12) return false;
    // 안식 계열: "이번 턴 다른 플레이 없음" / "필드 비어있음" 조건
    if ((c.id === "MEDITATE" || c.id === "PRAYER") && (p.playsTurn || 0) > 0) return false;
    if ((c.id === "MEDITATE" || c.id === "PRAYER") && p.hp >= Math.floor(p.maxHp * 0.8)) return false;
    if (c.id === "PRAYER" && p.maxMana > 12) return false;
    if (c.id === "HERMIT" && p.field.length > 0) return false;
    // 폐기 경제 카드: 대상이 있어야 시전
    if (c.act === "exilePick" && p.discard.length === 0) return false;
    if (c.id === "WALLBREAK1" && !o.field.some((m) => effAtk(o, m) <= 1)) return false;
    if (c.id === "WALLBREAK2" && !o.field.some((m) => effAtk(o, m) <= 2)) return false;
    if (c.id === "SNIPE1" && !o.field.some((m) => effDef(o, m) <= 1)) return false;
    if (c.id === "SNIPE2" && !o.field.some((m) => effDef(o, m) <= 2)) return false;
    if (c.id === "SHATTER" && p.hp <= 7) return false;
    if (c.id === "GREED_PRICE" && p.hp <= 4) return false;
    if (c.id === "GOLIATH_HUNT" && !o.field.some((m) => effDef(o, m) >= 20)) return false;
    if (c.id === "MASSACRE" && (o.field.length === 0 || p.hp <= 10)) return false;
    // FAIR PLAY: don't peek at the opponent's hidden deck order. Whether they own
    // ANY tribe monster is public knowledge (starter + buy log = the collection
    // multiset), so gate on existence across all zones rather than deck position.
    if (c.id === "INQUISITION" && ![...o.field, ...o.discard, ...o.hand, ...o.deck, ...o.traps.map((tr) => tr.card)].some((m) => m.t === "mon" && m.tribe)) return false;
    if (c.id === "PURGE_ALL" && p.deck.length + p.discard.length === 0) return false;
    if (c.id === "SCRAPPER" && [...p.deck, ...p.discard].filter((x) => x.cost <= 1).length < 2) return false;
    // blood magic hurts the caster — don't suicide
    if (c.id === "CATALYST" && p.hp <= 6) return false;
    if (c.id === "BLOOD1" && p.hp <= 6) return false;
    if (c.id === "BLOOD2" && p.hp <= 10) return false;
    if (c.id === "BLOOD3" && p.hp <= 14) return false;
    // forbidden ritual: needs HP to spare AND a non-시초 tribe monster to duplicate
    if (c.id === "FORBIDDEN" && (p.hp <= 17 || !p.field.some((m) => m.tribe && m.tribe !== "시초"))) return false;
    return true;
  };
  const spells = p.hand.map((c, i) => ({ c, i })).filter((x) => x.c.t === "spell" && playCost(x.c) <= p.mana && castable(x.c));

  const stFull = p.traps.length + p.enchants.length >= 7;
  // summonable monsters, best value first (respect the 9-monster zone cap)
  const monsters = p.field.length >= 7 ? [] : p.hand
    .map((c, i) => ({ c, i }))
    .filter((x) => x.c.t === "mon" && playCost(x.c) <= p.mana && !(oppNoLow && (x.c.cost ?? 0) <= 3) && summonReqMet(p, x.c))
    .sort((a, b) => cardValue(b.c) - cardValue(a.c));

  // 1) LETHAL: direct spells + attacks (with 관통 penetration) that kill THIS turn.
  //    Cast the guaranteed damage spells first, then swing.
  const plan = facePlan(p, o, ready, spells, noAtk);
  if (plan.total >= o.hp) {
    if (plan.spellIdx !== null) return { type: "play", idx: plan.spellIdx };
    if (plan.attackUid) return { type: "attack", uid: plan.attackUid };
  }

  // 1.5) removal-lethal: if clearing the biggest blocker makes the swing lethal, do it now
  const removal = spells.find((x) => (x.c.act === "destroyMon" || x.c.act === "weaken") && o.field.length > 0);
  if (removal && removal.c.act === "destroyMon" && !noAtk && o.field.length > 0) {
    const big = [...o.field].sort((a, b) => (effAtk(o, b) + b.def!) - (effAtk(o, a) + a.def!))[0]; // autoTarget picks this one
    const after = facePlan(p, o, ready, spells.filter((x) => x.i !== removal.i), noAtk, big.uid);
    if (after.total >= o.hp) return { type: "play", idx: removal.i };
  }

  // 2) break traps BEFORE summoning/attacking (pitfall kills summons, counters kill attackers)
  const trapbreak = spells.find((x) => x.c.act === "destroyTrap" && o.traps.length > 0);
  if (trapbreak && (monsters.length > 0 || ready.length > 0)) return { type: "play", idx: trapbreak.i };

  // 3) removal on a blocker (clear the way before swinging)
  if (removal) return { type: "play", idx: removal.i };

  // 4) develop board — summon the strongest affordable monster
  if (monsters.length) return { type: "play", idx: monsters[0].i };

  // 5) buffs — only when there is a ready attacker to benefit
  const buff = spells.find((x) =>
    (x.c.act === "buffPerm" && p.field.length > 0) ||
    ((x.c.act === "buffTurn" || x.c.act === "buffAllTurn") && ready.length > 0));
  if (buff) return { type: "play", idx: buff.i };

  // 6) attack — assassins go face; otherwise attack when it kills (a blocked
  //    swing does nothing, so never chip into a bigger defense).
  //    Biggest attacker first: same kill, more penetration (관통) face damage.
  if (!noAtk) {
    const ban = glassBanActive(g);
    const canSwing = (m: FieldMon): boolean => !ban || effDef(p, m) > 1;
    const assassin = ready.find((m) => m.directOnly && canSwing(m));
    if (assassin) return { type: "attack", uid: assassin.uid };
    for (const m of [...ready].filter(canSwing).sort((a, b) => effAtk(p, b) - effAtk(p, a))) {
      if (o.field.length === 0) return { type: "attack", uid: m.uid };
      const a = effAtk(p, m);
      if (o.field.some((tm) => a > effDef(o, tm))) return { type: "attack", uid: m.uid };
    }
  }

  // 7) trap-break / wipe / direct damage
  if (trapbreak) return { type: "play", idx: trapbreak.i };
  const wipe = spells.find((x) => x.c.act === "wipeBack" && p.field.length === 0 && (o.traps.length + o.enchants.length) > 0);
  if (wipe) return { type: "play", idx: wipe.i };
  const direct = spells.find((x) => x.c.act === "dmg" || x.c.act === "siphon");
  if (direct) return { type: "play", idx: direct.i };

  // 8) utility spells (draw / ramp / disruption)
  const util = spells.find((x) => ["draw", "seek", "crash", "exile", "recall", "heal", "manaUp", "manaDown", "manaUpGain", "chestToMana"].includes(x.c.act || ""));
  if (util) return { type: "play", idx: util.i };

  // 8.5) 금단의 술식 / 복권 상자류 — castable() 가드 통과 시 저우선순위로 사용
  const forb = spells.find((x) => x.c.id === "FORBIDDEN" || x.c.id === "LUCKY_CHEST" || x.c.id === "GUILD_CHEST" || x.c.id === "GREED_PRICE" || x.c.id === "MARKET_CRISIS" || x.c.id === "GOLIATH_HUNT" || x.c.id === "MASSACRE");
  if (forb) return { type: "play", idx: forb.i };

  // 9) persistent enchant magic (respect the spell/trap zone cap)
  const ench = stFull ? undefined : spells.find((x) => !!x.c.ench);
  if (ench) return { type: "play", idx: ench.i };

  // 10) set a trap (bot keeps a light footprint; also respect the zone cap)
  const trap = p.hand.map((c, i) => ({ c, i })).find((x) => x.c.t === "trap" && playCost(x.c) <= p.mana);
  if (trap && p.traps.length < 3 && !stFull) return { type: "play", idx: trap.i };

  // 11) Attune (max mana +1) — always good
  const attune = p.hand.findIndex((c) => c.star === "mana" && playCost(c) <= p.mana);
  if (attune >= 0) return { type: "play", idx: attune };

  // 12) buy from supply, then common market — attack-weighted scoring (races are
  //     won with face damage), and once the economy is online (maxMana>=5) stop
  //     buying chaff: weak buys dilute the deck and starve the late game.
  //     Early game also has a floor (11): cheap chaff bought on turns 1-4 is
  //     what clogs the deck at turn 15. Defense weighted 1.2 — walls soak
  //     penetration damage. (A/B: ~66% vs v1 bot, then +4% more in round 2.)
  const buyScore = (c: CardInst): number =>
    c.t === "mon" ? (c.atk || 0) * 2.0 + (c.def || 0) * 1.2 + c.cost * 0.7 : cardValue(c);
  const minBuy = p.maxMana >= 5 ? 17 : 11; // 신메타 재튜닝: 카드 풀 확대로 구매 기준 상향 (13→17, 그리디 A/B 61%)
  let bi = -1, bs = minBuy;
  p.supply.forEach((c, i) => { if (c && buyCost(p, c) <= p.mana) { const s = buyScore(c); if (s > bs) { bs = s; bi = i; } } });
  if (bi >= 0) return { type: "buySupply", i: bi };
  let mbi = -1, mbs = minBuy;
  g.market.forEach((c, i) => { if (buyCost(p, c) <= p.mana) { const s = buyScore(c); if (s > mbs) { mbs = s; mbi = i; } } });
  if (mbi >= 0) return { type: "buyMarket", i: mbi };

  // 12.5) 마나가 크게 남아도는데 살 만한 게 없으면 제시 리롤 — 마나를 카드로 환전
  //       (램프 폭발 후반: 리롤로 폭탄을 파는 게 정답. 8마나+ 여유일 때만 → 일반 게임 영향 최소)
  if (p.mana >= 8) return { type: "refresh" };

  // 13) spare mana → Pry Chest (not before turn 7 — early mimic risk outweighs the payout; not while sealed)
  const chest = (g.turn <= 6 || chestLocked(g)) ? -1 : p.hand.findIndex((c) => c.star === "chest" && playCost(c) <= p.mana);
  if (chest >= 0) return { type: "play", idx: chest };

  // 14) spare mana → Cull (deck thinning)
  const cull = p.hand.findIndex((c) => c.star === "trash" && playCost(c) <= p.mana);
  if (cull >= 0) return { type: "play", idx: cull };

  // 15) nothing left
  return { type: "endTurn" };
}

// ---- lethal planning: max guaranteed face damage this turn.
// Direct-damage spells (sequenced within the mana budget) + a greedy attack
// simulation where each attacker kills the toughest blocker it can (clearing
// the road for smaller attackers) and overkill penetrates to the player.
// `withoutUid` simulates the board after removing one enemy monster (removal spell).
interface FacePlan { total: number; spellIdx: number | null; attackUid: string | null }
function facePlan(p: PlayerState, o: PlayerState, ready: FieldMon[], spells: { c: CardInst; i: number }[], noAtk: boolean, withoutUid?: string): FacePlan {
  let total = 0;
  let spellIdx: number | null = null;
  let manaLeft = p.mana;
  const dmg = spells
    .filter((x) => (x.c.act === "dmg" || x.c.act === "siphon") && (x.c.val || 0) > 0)
    .sort((a, b) => (b.c.val || 0) - (a.c.val || 0));
  for (const s of dmg) {
    const cost = playCost(s.c);
    if (cost <= manaLeft) { manaLeft -= cost; total += s.c.val || 0; if (spellIdx === null) spellIdx = s.i; }
  }
  let attackUid: string | null = null;
  if (!noAtk) {
    // 유리 병기 금지령: 방어 1 이하는 공격 자체가 불가 → 리썰 계산에서 제외
    const ban = [p, o].some((pl) => pl.enchants.some((e) => e.card.ench === "glassBan"));
    const defs = o.field.filter((m) => m.uid !== withoutUid).map((m) => effDef(o, m)).sort((a, b) => b - a); // toughest first
    for (const m of [...ready].sort((a, b) => effAtk(p, b) - effAtk(p, a))) {
      const a = effAtk(p, m);
      if (a <= 0) continue;
      if (ban && effDef(p, m) <= 1) continue;
      if (m.directOnly || defs.length === 0) { total += a; if (!attackUid) attackUid = m.uid; continue; }
      const k = defs.findIndex((d) => a > d); // toughest blocker this attacker still kills
      if (k >= 0) { total += a - defs[k]; defs.splice(k, 1); if (!attackUid) attackUid = m.uid; }
    }
  }
  return { total, spellIdx, attackUid };
}

function findLethalAction(g: GameState): Action | null {
  const side = g.cur as Side;
  let nodes = 0;
  const seen = new Set<string>();

  const search = (st: GameState, depth: number): Action[] | null => {
    if (st.over) return st.winner === side ? [] : null;
    if (st.cur !== side || depth <= 0 || nodes++ >= LETHAL_NODES) return null;
    const key = lethalKey(st);
    if (seen.has(key)) return null;
    seen.add(key);

    for (const a of lethalActions(st)) {
      const next = reduce(st, a).state;
      if (!stateAdvanced(st, next, a)) continue;
      const rest = search(next, depth - 1);
      if (rest) return [a, ...rest];
    }
    return null;
  };

  return search(g, LETHAL_DEPTH)?.[0] ?? null;
}

function lethalWorthSearching(g: GameState): boolean {
  if (g.pending) return true;
  const p = g.players[g.cur], o = g.players[1 - g.cur];
  let ceiling = p.mana;
  for (const c of p.hand) {
    if (playCost(c) <= p.mana) {
      if (c.act === "dmg" || c.act === "siphon") ceiling += c.val || 0;
      else if (c.act === "buffTurn" || c.act === "buffAllTurn" || c.act === "buffPerm") ceiling += (c.val || 0) * Math.max(1, p.field.length);
      else if (c.t === "mon") ceiling += c.atk || 0;
      else if (c.act === "destroyTrap" || c.act === "destroyMon" || c.act === "weaken" || c.act === "draw" || c.act === "seek" || c.act === "recall") ceiling += 4;
    }
  }
  for (const m of p.field) if (!m.exhausted) ceiling += Math.max(0, effAtk(p, m));
  return ceiling >= o.hp;
}

function lethalActions(g: GameState): Action[] {
  const p = g.players[g.cur];
  const o = g.players[1 - g.cur];
  const out: Action[] = [];
  const add = (a: Action) => out.push(a);

  if (g.pending) {
    const pend = g.pending;
    const pick = (uid: string | null): Action => pend.kind === "seek" || pend.kind === "recall" || pend.kind === "purge"
      ? { type: "pick", uid }
      : { type: "chooseTarget", uid };
    if (pend.kind === "oppMon") o.field.forEach((m) => add(pick(m.uid)));
    else if (pend.kind === "myMon") p.field.forEach((m) => add(pick(m.uid)));
    else if (pend.kind === "seek") {
      uniqueCards(p.deck, (a, b) => cardValue(b) - cardValue(a)).forEach((c) => add(pick(c.uid)));
      if (pend.allowCancel) add(pick(null));
    } else if (pend.kind === "recall") {
      uniqueCards(p.discard, (a, b) => cardValue(b) - cardValue(a)).forEach((c) => add(pick(c.uid)));
      if (pend.allowCancel) add(pick(null));
    } else if (pend.kind === "purge") {
      uniqueCards([...p.deck, ...p.discard], (a, b) => cardValue(a) - cardValue(b)).forEach((c) => add(pick(c.uid)));
      if (pend.allowCancel) add(pick(null));
    }
    return out.slice(0, 18);
  }

  const playable = p.hand
    .map((c, idx) => ({ c, idx }))
    .filter(({ c }) => playCost(c) <= p.mana)
    .sort((a, b) => lethalPlayPriority(b.c) - lethalPlayPriority(a.c));
  playable.forEach(({ idx }) => add({ type: "play", idx }));

  const noAtk = g.players.some((pl) => pl.enchants.some((e) => e.card.ench === "noAttack"));
  // Set traps are hidden information. Unless the search first removes them, do
  // not prove a lethal line by peeking at what the trap actually is.
  if (!noAtk && o.traps.length === 0) {
    const ban = glassBanActive(g);
    [...p.field]
      .filter((m) => !m.exhausted && (!ban || effDef(p, m) > 1))
      .sort((a, b) => effAtk(p, b) - effAtk(p, a))
      .forEach((m) => add({ type: "attack", uid: m.uid }));
  }

  return out;
}

function lethalPlayPriority(c: CardInst): number {
  if (c.act === "dmg" || c.act === "siphon") return 100 + (c.val || 0);
  if (c.act === "destroyTrap") return 90 + (c.val || 0);
  if (c.act === "destroyMon" || c.act === "weaken" || c.act === "atkDown" || c.act === "defDown") return 80 + (c.val || 0);
  if (c.act === "buffTurn" || c.act === "buffAllTurn" || c.act === "buffPerm") return 70 + (c.val || 0) + (c.val2 || 0);
  if (c.t === "mon") return 55 + (c.atk || 0) * 2 + (c.def || 0);
  if (c.act === "draw" || c.act === "seek" || c.act === "recall" || c.act === "chestToMana" || c.act === "manaUpGain") return 45;
  return 10 + cardValue(c);
}

function uniqueCards(pool: CardInst[], sort: (a: CardInst, b: CardInst) => number): CardInst[] {
  const seenIds = new Set<string>();
  const out: CardInst[] = [];
  for (const c of [...pool].sort(sort)) {
    if (seenIds.has(c.id)) continue;
    seenIds.add(c.id);
    out.push(c);
    if (out.length >= 12) break;
  }
  return out;
}

function stateAdvanced(before: GameState, after: GameState, a: Action): boolean {
  if (after.over) return true;
  if (a.type === "chooseTarget" || a.type === "pick") return before.pending !== after.pending;
  const bp = before.players[before.cur], ap = after.players[before.cur];
  const bo = before.players[1 - before.cur], ao = after.players[1 - before.cur];
  return before.cur !== after.cur ||
    before.pending !== after.pending ||
    bp.hp !== ap.hp || bo.hp !== ao.hp ||
    bp.mana !== ap.mana ||
    bp.hand.length !== ap.hand.length ||
    bp.field.length !== ap.field.length ||
    bo.field.length !== ao.field.length ||
    bp.traps.length !== ap.traps.length ||
    bo.traps.length !== ao.traps.length ||
    bp.enchants.length !== ap.enchants.length ||
    bo.enchants.length !== ao.enchants.length ||
    bp.discard.length !== ap.discard.length ||
    bo.discard.length !== ao.discard.length;
}

function lethalKey(g: GameState): string {
  const p = g.players[g.cur], o = g.players[1 - g.cur];
  return JSON.stringify({
    cur: g.cur, pending: g.pending, hp: [p.hp, o.hp], mana: p.mana, rng: g.rng,
    hand: p.hand.map((c) => c.uid), field: p.field.map((m) => [m.uid, m.exhausted, m.atkMod, m.defMod, m.tempAtk, m.attacksUsed]),
    ofield: o.field.map((m) => [m.uid, m.atkMod, m.defMod, m.tempAtk]), traps: [p.traps.length, o.traps.length],
    ench: [p.enchants.length, o.enchants.length], discard: p.discard.length, deck: p.deck.length,
  });
}

function autoTarget(g: GameState): Action {
  const pending = g.pending!;
  const p = g.players[g.cur];
  const o = g.players[1 - g.cur];

  if (pending.kind === "oppMon") {
    if (pending.reason === "attack") {
      const att = p.field.find((m) => m.uid === (pending.data!.attackerUid as string));
      const a = att ? effAtk(p, att) : 0;
      // among killable targets, take out the biggest THREAT (atk-weighted), not just the softest
      const killable = o.field
        .filter((tm) => a > effDef(o, tm))
        .sort((x, y) => (effAtk(o, y) * 2 + effDef(o, y)) - (effAtk(o, x) * 2 + effDef(o, x)));
      const target = killable[0] ?? lowestDef(o, o.field);
      return { type: "chooseTarget", uid: target ? target.uid : null };
    }
    // destroy / debuff → hit the most valuable enemy monster
    const t = [...o.field].sort((a, b) => (effAtk(o, b) + b.def!) - (effAtk(o, a) + a.def!))[0];
    return { type: "chooseTarget", uid: t ? t.uid : null };
  }
  if (pending.kind === "myMon") {
    const t = [...p.field].sort((x, y) => effAtk(p, y) - effAtk(p, x))[0];
    return { type: "chooseTarget", uid: t ? t.uid : null };
  }
  if (pending.kind === "seek") {
    const best = bestOf(p.deck);
    return { type: "pick", uid: best ? best.uid : (p.deck[0]?.uid ?? null) };
  }
  if (pending.kind === "purge") { // 덱·묘지에서 제외: 저가치부터, 살릴 가치가 있으면 종료
    const pool = [...p.deck, ...p.discard].sort((a, b) => cardValue(a) - cardValue(b));
    const worst = pool[0];
    if (worst && cardValue(worst) < 8) return { type: "pick", uid: worst.uid };
    return { type: "pick", uid: null };
  }
  if (pending.kind === "recall") {
    if (pending.reason === "exilePick") { // 게임에서 제외 → 가장 쓸모없는 카드
      const worst = [...p.discard].sort((a, b) => cardValue(a) - cardValue(b))[0];
      return { type: "pick", uid: worst ? worst.uid : (p.discard[0]?.uid ?? null) };
    }
    const best = bestOf(p.discard);
    return { type: "pick", uid: best ? best.uid : (p.discard[0]?.uid ?? null) };
  }
  return { type: "chooseTarget", uid: null };
}

function lowestDef(p: PlayerState, field: FieldMon[]): FieldMon | undefined {
  return [...field].sort((a, b) => effDef(p, a) - effDef(p, b))[0];
}
function bestOf(pool: CardInst[]): CardInst | undefined {
  return [...pool].sort((a, b) => cardValue(b) - cardValue(a))[0];
}
