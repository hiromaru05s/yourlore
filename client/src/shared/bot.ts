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
import { buyCost, cardValue, chestLocked, effAtk, effDef, glassBanActive, playCost, reduce, summonReqMet } from "./engine";
import { DB } from "./cards";

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
    if (pend.kind === "oppMon") o.field.filter((m) => !(m.aura === "ward" && pend.reason !== "attack")).forEach((m) => push(m.uid));
    else if (pend.kind === "myMon") {
      // 지원 나팔(exclude: 이미 고른 몬스터) / 고급 부화기(알만) 제약 준수 — 아니면 재무장 무한루프
      p.field
        .filter((m) => m.uid !== (pend.data?.exclude as string | undefined))
        .filter((m) => !(pend.reason === "incubate" && m.hatch == null))
        .forEach((m) => push(m.uid));
      if (pend.allowCancel) push(null);
    }
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
  const candSealAll = g.players.some((pl) => pl.field.some((m) => m.aura === "sealAll"));
  const candSealLow = g.players.some((pl) => pl.field.some((m) => m.aura === "sealLow"));
  p.hand.forEach((c, idx) => {
    if (c.star === "chest" && (g.turn <= TUNE.chestTurn || chestLocked(g))) return;
    if (c.t === "trap" && p.trapBlockTurn) return; // 협상: 함정 설치 금지 턴 — 엔진 거부 루프 방지
    if ((c.t === "spell" || c.t === "starter") && (candSealAll || p.spellSealTurn || (candSealLow && playCost(c) <= 5))) return; // 침묵
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
      if (m.hatch != null) return; // 알은 공격 불가 (엔진이 거부 — 후보에서 제외해야 무한 재시도 안 함)
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

// ---- 튜닝 파라미터 (A/B 하네스가 덮어쓰며 탐색 — 기본값 = 배포값) ----
export const TUNE = {
  minBuy: 17,      // maxMana>=5 이후 구매 하한 (덱 희석 방지)
  minBuyEarly: 11, // 초반(1~4턴) 구매 하한
  atkW: 2.0,       // 몬스터 구매 가치: 공격 가중치
  defW: 1.2,       // 방어 가중치 (벽이 관통을 흡수)
  costW: 0.7,
  chestTurn: 6,    // 이 턴까지는 보물상자 안 엶 (초반 미믹 리스크)
};

function roughBuy(c: CardInst): number {
  return c.t === "mon" ? (c.atk || 0) * TUNE.atkW + (c.def || 0) * TUNE.defW + c.cost * TUNE.costW : cardValue(c);
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
  // 알(egg) 위협: 회귀 평가가 모르는 신메타 항 — 부화가 임박할수록 위협이 커지고,
  // 내구도를 깎으면 위협이 줄어든다 (→ 탐색이 "알 깨기" 라인을 평가로 발견할 수 있음)
  z += 0.18 * (eggProg(p) - eggProg(o));
  return z;
}
/** 알 부화 위협: 진행도(임박) × 내구도(깎을수록 감소) × 종류 가중(신수의 알 1.4). */
function eggProg(x: PlayerState): number {
  let t = 0;
  for (const m of x.field) {
    if (m.hatch == null || (m.dur ?? 0) <= 0) continue;
    const total = m.hatchTurns ?? 8;
    const prog = Math.max(0, total - m.hatch); // 0(방금 낳음) ~ total(부화 직전)
    const durF = 0.2 + 0.2 * Math.min(4, Math.max(0, m.dur ?? 0)); // 내구도 1칩당 위협 -20%p
    t += prog * durF * (m.id === "BEAST_EGG" ? 1.4 : 1);
  }
  return t;
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

  const ready = p.field.filter((m) => !m.exhausted && m.hatch == null); // 알은 공격 불가

  // castable(): reject spells that would be refused before paying (avoids the bot
  // re-picking an uncastable card forever) OR that would be self-defeating.
  const castable = (c: CardInst): boolean => {
    // 침묵 오라 / 침묵의 심판: 마법 봉인 — v5부터 스타터(컬/상자/어튠)도 대상 (엔진 거부 → 봇도 스킵)
    if (c.t === "spell" || c.t === "starter") {
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
    if (c.id === "INQUISITION" && ![...o.deck, ...o.discard, ...o.field].some((m) => m.t === "mon" && m.tribe)) return false;
    if (c.id === "PURGE_ALL" && p.deck.length + p.discard.length === 0) return false;
    if (c.id === "SCRAPPER" && [...p.deck, ...p.discard].filter((x) => x.cost <= 1).length < 2) return false;
    // blood magic hurts the caster — don't suicide
    if (c.id === "CATALYST" && p.hp <= 6) return false;
    if (c.id === "BLOOD1" && p.hp <= 6) return false;
    if (c.id === "BLOOD2" && p.hp <= 10) return false;
    if (c.id === "BLOOD_JOY" && p.hp <= 8) return false;
    if (c.id === "BLOOD_ANGER" && p.hp <= 12) return false;
    if (c.id === "BLOOD_SORROW" && (p.hp <= 14 || p.discard.length === 0)) return false;
    if (c.id === "BLOOD_PLEASURE" && p.hp <= 16) return false;
    if (c.id === "VAMP_PACT" && (p.hp <= 8 || p.field.length >= 7)) return false;
    if (c.id === "INCUBATOR" && !p.field.some((m) => m.hatch != null && m.hatch > 0)) return false;
    if (c.id === "INCUBATOR_S" && !p.field.some((m) => m.hatch != null && m.hatch > 0)) return false;
    if (c.id === "FLAME" && p.hp <= 2) return false;
    if (c.id === "AMBUSH" && (o.maxMana !== 4 || p.hp <= 4)) return false;
    if (c.id === "COUNTERCALC" && (o.maxMana > 6 || o.enchants.length === 0)) return false;
    if (c.id === "TRUMPET" && p.field.length === 0) return false;
    if (c.id === "NEGOTIATE") return false; // 봇은 상대 마나를 올려주지 않는다
    if (c.id === "FATE_WHEEL" && p.hp <= 10) return false;
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
  // 협상(trapBlockTurn): 이번 턴 함정 설치가 거부되므로 시도하면 무한 재선택 루프에 빠진다
  const trap = p.trapBlockTurn ? undefined : p.hand.map((c, i) => ({ c, i })).find((x) => x.c.t === "trap" && playCost(x.c) <= p.mana);
  if (trap && p.traps.length < 3 && !stFull) return { type: "play", idx: trap.i };

  // 11) Attune (max mana +1) — always good
  const attune = p.hand.findIndex((c) => c.star === "mana" && playCost(c) <= p.mana && castable(c));
  if (attune >= 0) return { type: "play", idx: attune };

  // 12) buy from supply, then common market — attack-weighted scoring (races are
  //     won with face damage), and once the economy is online (maxMana>=5) stop
  //     buying chaff: weak buys dilute the deck and starve the late game.
  //     Early game also has a floor (11): cheap chaff bought on turns 1-4 is
  //     what clogs the deck at turn 15. Defense weighted 1.2 — walls soak
  //     penetration damage. (A/B: ~66% vs v1 bot, then +4% more in round 2.)
  const buyScore = (c: CardInst): number =>
    c.t === "mon" ? (c.atk || 0) * TUNE.atkW + (c.def || 0) * TUNE.defW + c.cost * TUNE.costW : cardValue(c);
  const minBuy = p.maxMana >= 5 ? TUNE.minBuy : TUNE.minBuyEarly; // 구매 하한 (덱 희석 방지 — 지배적 레버)
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
  const chest = (g.turn <= TUNE.chestTurn || chestLocked(g)) ? -1 : p.hand.findIndex((c) => c.star === "chest" && playCost(c) <= p.mana && castable(c));
  if (chest >= 0) return { type: "play", idx: chest };

  // 14) spare mana → Cull (deck thinning)
  const cull = p.hand.findIndex((c) => c.star === "trash" && playCost(c) <= p.mana && castable(c));
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

function autoTarget(g: GameState): Action {
  const pending = g.pending!;
  const p = g.players[g.cur];
  const o = g.players[1 - g.cur];

  if (pending.kind === "oppMon") {
    if (pending.reason === "attack") {
      const att = p.field.find((m) => m.uid === (pending.data!.attackerUid as string));
      const a = att ? effAtk(p, att) : 0;
      // among killable targets, take out the biggest THREAT (atk-weighted), not just the softest
      // 알은 부화 임박도(진행도)를 위협으로 환산 — 부화 직전 알은 최우선으로 깬다
      const threat = (tm: FieldMon): number =>
        tm.hatch != null ? Math.max(0, (tm.hatchTurns ?? 8) - tm.hatch) * 4 * (tm.id === "BEAST_EGG" ? 1.4 : 1)
        : effAtk(o, tm) * 2 + effDef(o, tm);
      const killable = o.field
        .filter((tm) => a > effDef(o, tm) || tm.hatch != null)
        .sort((x, y) => threat(y) - threat(x));
      const target = killable[0] ?? lowestDef(o, o.field);
      return { type: "chooseTarget", uid: target ? target.uid : null };
    }
    // destroy / debuff → hit the most valuable enemy monster
    const t = [...o.field].sort((a, b) => (effAtk(o, b) + b.def!) - (effAtk(o, a) + a.def!))[0];
    return { type: "chooseTarget", uid: t ? t.uid : null };
  }
  if (pending.kind === "myMon") {
    if (pending.reason === "incubate") { // 고급 부화기: 부화가 가장 임박한 알
      const egg = [...p.field].filter((m) => m.hatch != null).sort((a, b) => (a.hatch ?? 99) - (b.hatch ?? 99))[0];
      return { type: "chooseTarget", uid: egg ? egg.uid : null };
    }
    // 지원 나팔의 exclude(중복 선택 불가)를 지켜야 무한 재무장 루프에 안 빠진다
    const excl = pending.data?.exclude as string | undefined;
    const t = [...p.field].filter((x) => x.uid !== excl).sort((x, y) => effAtk(p, y) - effAtk(p, x))[0];
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
  if (pending.kind === "reroll") return { type: "pick", uid: null }; // 수레바퀴: 봇은 결과 유지
  if (pending.kind === "giantShop") { // 시초의 거인 교역: 살 수 있는 가장 비싼 시초 카드
    const ids = ((pending.data?.ids as string[] | undefined) ?? []).filter((id) => DB[id] && DB[id].cost <= p.mana);
    const best = ids.sort((a, b) => DB[b].cost - DB[a].cost)[0];
    return { type: "pick", uid: best ?? null };
  }
  if (pending.kind === "oppRmz") { // 흑룡: 상대 묘지 오염 — 가치가 낮은 카드(컬 등)를 되돌린다
    const worst = [...(o.removed ?? [])].sort((a, b) => cardValue(a) - cardValue(b))[0];
    return { type: "pick", uid: worst ? worst.uid : null };
  }
  if (pending.kind === "oppBoard") { // 신수: 가장 위협적인 몬스터 → 함정 → 영구마법 순으로 파괴
    const best = [...o.field].filter((m) => m.aura !== "ward")
      .sort((a, b) => (effAtk(o, b) + (b.def || 0)) - (effAtk(o, a) + (a.def || 0)))[0];
    const uid = best?.uid ?? o.traps[0]?.card.uid ?? o.enchants[0]?.card.uid ?? null;
    return { type: "pick", uid };
  }
  return { type: "chooseTarget", uid: null };
}

function lowestDef(p: PlayerState, field: FieldMon[]): FieldMon | undefined {
  return [...field].sort((a, b) => effDef(p, a) - effDef(p, b))[0];
}
function bestOf(pool: CardInst[]): CardInst | undefined {
  return [...pool].sort((a, b) => cardValue(b) - cardValue(a))[0];
}
