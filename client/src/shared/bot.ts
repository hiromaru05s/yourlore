// ============================================================
// LORE — bot AI. Pure: botDecide(state) -> single best Action.
// The controller applies it, then calls again until endTurn.
//
// Two layers:
//  · greedyDecide — fast heuristic policy (break traps first, develop
//    board, count penetration damage, disciplined buys).
//  · botDecide    — rollout search on top: enumerates candidate actions,
//    plays each one out to the end of the opponent's reply using the
//    greedy policy, scores the result with an evaluation function whose
//    weights were fit by logistic regression on 2000 self-play games,
//    and deviates from greedy only when clearly better (margin).
//    Rollouts use a perturbed RNG so the bot can never foresee real
//    dice / draws. A/B: ~68% vs the pure greedy bot.
// ============================================================
import type { Action, CardInst, FieldMon, GameState, PlayerState, Side } from "./types";
import { buyCost, cardValue, chestLocked, effAtk, effDef, playCost, reduce, summonReqMet } from "./engine";

// ---------------- rollout search (the shipped bot) ----------------
const MARGIN = 0.1;      // eval margin a deviation must beat greedy by
const ROLLOUT_STEPS = 40;

export function botDecide(g: GameState): Action {
  try {
    const a = searchDecide(g);
    if (a) return a;
  } catch { /* engine hiccup → greedy fallback */ }
  return greedyDecide(g);
}

function searchDecide(g: GameState): Action | null {
  const s = g.cur as Side;
  const base = greedyDecide(g);
  const baseKey = JSON.stringify(base);
  const cands = candidates(g).filter((a) => JSON.stringify(a) !== baseKey);
  if (cands.length === 0) return base;
  let best: Action = base;
  let bestV = rollout(g, base, s) + MARGIN;
  for (const a of cands) {
    const v = rollout(g, a, s);
    if (v > bestV) { bestV = v; best = a; }
  }
  return best;
}

/** Apply `a`, finish my turn + the opponent's reply with the greedy policy, evaluate. */
function rollout(g: GameState, a: Action, s: Side): number {
  const g2 = structuredClone(g);
  g2.rng = (g2.rng ^ 0x9e3779b9) >>> 0; // decouple from the real RNG stream (no dice clairvoyance)
  determinize(g2, s);                   // hide hidden info: sample it from public knowledge instead
  let st = reduce(g2, a).state;
  // no-op guard: the engine refused the action before paying → never pick it
  if (a.type === "play" && !st.pending && !st.over &&
      st.players[s].mana === g.players[s].mana && st.players[s].hand.length === g.players[s].hand.length) return -Infinity;
  let steps = 0;
  while (!st.over && st.cur === s && steps < ROLLOUT_STEPS) { st = reduce(st, greedyDecide(st)).state; steps++; }
  steps = 0;
  while (!st.over && st.cur !== s && steps < ROLLOUT_STEPS) { st = reduce(st, greedyDecide(st)).state; steps++; }
  return evalState(st, s);
}

// ---- fair play: this is an imperfect-information game, so rollouts must NOT read
// hidden state. Before simulating, replace everything the bot couldn't legitimately
// know with a random sample consistent with PUBLIC information:
//  · my deck order (contents known, order unknown) → shuffled
//  · opponent's hand + deck + face-down trap identities → pooled and re-dealt
//    (the pool itself IS public: starter deck + their buy log)
// So "they only ever bought one trap" naturally means the sampled set trap is that trap.
function determinize(g: GameState, s: Side): void {
  let seed = (g.rng ^ 0x51f15eed) >>> 0;
  const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
  const shuf = <T,>(arr: T[]): void => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } };
  const me = g.players[s], op = g.players[1 - s];
  shuf(me.deck);
  const pool = [...op.hand, ...op.deck, ...op.traps.map((t) => t.card)];
  shuf(pool);
  for (let i = 0; i < op.traps.length; i++) {
    const k = pool.findIndex((c) => c.t === "trap");
    if (k < 0) break; // shouldn't happen — the real set traps are in the pool
    op.traps[i] = { ...op.traps[i], card: pool.splice(k, 1)[0] };
  }
  const handN = op.hand.length;
  op.hand = pool.slice(0, handN);
  op.deck = pool.slice(handN);
}

// candidate actions, deduped + trimmed so rollouts stay cheap
function candidates(g: GameState): Action[] {
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
    else if (pend.kind === "seek" || pend.kind === "recall") {
      const pool = pend.kind === "seek" ? p.deck : p.discard;
      const seen = new Set<string>();
      [...pool].sort((a, b) => cardValue(b) - cardValue(a)).forEach((c) => {
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

// ---- evaluation: logistic-regression weights fit on 2000 greedy self-play games ----
// features: hpD, maxManaD, atkD, defD, fieldCountD, threatIn, threatOut, deckQD, handD, trapD, enchD
const EVAL_W: number[][] = [
  [-0.0076, 0.0837, 0.0462, 0.0692, 0.1385, -0.0615, 0.0416, -0.0075, 0.0000, 0.0000, 0.0000],  // turns 1-6
  [0.0075, 0.3213, 0.0118, -0.0040, 0.1905, -0.0038, 0.0728, -0.0084, 0.0000, 0.1160, -0.6052], // turns 7-12
  [0.0533, 0.2205, -0.0007, 0.0110, -0.0701, -0.0791, 0.1841, -0.0027, 0.2964, 0.9085, -0.0948], // turns 13+
];
function evalState(g: GameState, s: Side): number {
  if (g.over) return g.winner === s ? 1e6 : -1e6;
  const p = g.players[s], o = g.players[1 - s];
  const bAtk = (x: PlayerState) => x.field.reduce((t, m) => t + effAtk(x, m), 0);
  const bDef = (x: PlayerState) => x.field.reduce((t, m) => t + effDef(x, m), 0);
  const f = [
    p.hp - o.hp,
    p.maxMana - o.maxMana,
    bAtk(p) - bAtk(o), bDef(p) - bDef(o),
    p.field.length - o.field.length,
    threatFace(o, p), threatFace(p, o),
    deckQ(p) - deckQ(o),
    p.hand.length - o.hand.length,
    p.traps.length - o.traps.length,
    p.enchants.length - o.enchants.length,
  ];
  const w = EVAL_W[g.turn <= 6 ? 0 : g.turn <= 12 ? 1 : 2];
  let z = 0;
  for (let j = 0; j < f.length; j++) z += w[j] * f[j];
  return z;
}
// bomb-weighted deck quality (only above-baseline cards, so thinning isn't penalized)
function deckQ(p: PlayerState): number {
  let t = 0;
  for (const pool of [p.hand, p.deck, p.discard]) for (const c of pool) t += Math.max(0, roughBuy(c) - 8);
  return t;
}
// o's potential face damage next turn into p's board (penetration included)
function threatFace(o: PlayerState, p: PlayerState): number {
  const defs = p.field.map((m) => effDef(p, m)).sort((a, b) => b - a);
  let total = 0;
  for (const m of [...o.field].sort((a, b) => effAtk(o, b) - effAtk(o, a))) {
    const a = effAtk(o, m);
    if (a <= 0) continue;
    if (m.directOnly || defs.length === 0) { total += a; continue; }
    const k = defs.findIndex((d) => a > d);
    if (k >= 0) { total += a - defs[k]; defs.splice(k, 1); }
  }
  return total;
}

// ---------------- greedy policy (rollout engine + fallback) ----------------
export function greedyDecide(g: GameState): Action {
  const p = g.players[g.cur];
  const o = g.players[1 - g.cur];

  // 0) resolve a pending target/pick automatically
  if (g.pending) return autoTarget(g);

  const noAtk = g.players.some((pl) => pl.enchants.some((e) => e.card.ench === "noAttack"));
  const oppNoLow = o.enchants.some((e) => e.card.ench === "noSummonLow"); // blocks my cost<=3 summons

  const ready = p.field.filter((m) => !m.exhausted);

  // castable(): reject spells that would be refused before paying (avoids the bot
  // re-picking an uncastable card forever) OR that would be self-defeating.
  const castable = (c: CardInst): boolean => {
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
    // 어튠-마: needs a chest in hand, and chests must not be sealed (행운의 보물상자)
    if (c.act === "chestToMana" && (chestLocked(g) || !p.hand.some((h) => h.star === "chest"))) return false;
    // blood magic hurts the caster — don't suicide
    if (c.id === "BLOOD1" && p.hp <= 6) return false;
    if (c.id === "BLOOD2" && p.hp <= 10) return false;
    if (c.id === "BLOOD3" && p.hp <= 14) return false;
    // forbidden ritual: needs HP to spare AND a non-시초 tribe monster to duplicate
    if (c.id === "FORBIDDEN" && (p.hp <= 17 || !p.field.some((m) => m.tribe && m.tribe !== "시초"))) return false;
    return true;
  };
  const spells = p.hand.map((c, i) => ({ c, i })).filter((x) => x.c.t === "spell" && playCost(x.c) <= p.mana && castable(x.c));

  const stFull = p.traps.length + p.enchants.length >= 9;
  // summonable monsters, best value first (respect the 9-monster zone cap)
  const monsters = p.field.length >= 9 ? [] : p.hand
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
    const assassin = ready.find((m) => m.directOnly);
    if (assassin) return { type: "attack", uid: assassin.uid };
    for (const m of [...ready].sort((a, b) => effAtk(p, b) - effAtk(p, a))) {
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

  // 8.5) 금단의 술식 — castable() already checked HP + a tribe monster on field
  const forb = spells.find((x) => x.c.id === "FORBIDDEN");
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
  const minBuy = p.maxMana >= 5 ? 13 : 11;
  let bi = -1, bs = minBuy;
  p.supply.forEach((c, i) => { if (c && buyCost(p, c) <= p.mana) { const s = buyScore(c); if (s > bs) { bs = s; bi = i; } } });
  if (bi >= 0) return { type: "buySupply", i: bi };
  let mbi = -1, mbs = minBuy;
  g.market.forEach((c, i) => { if (buyCost(p, c) <= p.mana) { const s = buyScore(c); if (s > mbs) { mbs = s; mbi = i; } } });
  if (mbi >= 0) return { type: "buyMarket", i: mbi };

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
    const defs = o.field.filter((m) => m.uid !== withoutUid).map((m) => effDef(o, m)).sort((a, b) => b - a); // toughest first
    for (const m of [...ready].sort((a, b) => effAtk(p, b) - effAtk(p, a))) {
      const a = effAtk(p, m);
      if (a <= 0) continue;
      if (m.directOnly || defs.length === 0) { total += a; if (!attackUid) attackUid = m.uid; continue; }
      const k = defs.findIndex((d) => a > d); // toughest blocker this attacker still kills
      if (k >= 0) { total += a - defs[k]; defs.splice(k, 1); if (!attackUid) attackUid = m.uid; }
    }
  }
  return { total, spellIdx, attackUid };
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
  if (pending.kind === "recall") {
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
