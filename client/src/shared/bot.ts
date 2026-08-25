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
import { buyCost, chestLocked, cullExiled, curHp, effAtk, effDef, effMaxMana, freeBuyBlocked, glassBanActive, isVampFamily, playCost, reduce, summonReqMet } from "./engine";
import { avgPower, cardPower } from "./cardEval";
import { netEval, determinize } from "./botNet";
import { DB, hasPassive } from "./cards";

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
/** 구매 가능 여부. 0코스트 무한 구매 상한은 이제 엔진 규칙(FREE_BUY_MAX, 턴당 3장)이
 *  담당한다 — 예전의 봇 전용 게임당 상한은 사람 플레이어를 막지 못했다.
 *  엔진이 거부하는 수를 후보에 남기면 봇이 같은 수를 계속 골라 무한 재선택에 빠진다. */
export function buyableByBot(p: PlayerState, c: CardInst): boolean {
  if (buyCost(p, c) > p.mana) return false;
  return !freeBuyBlocked(p, c);
}

export function candidates(g: GameState): Action[] {
  const p = g.players[g.cur];
  const o = g.players[1 - g.cur];
  const T = tuneFor(p);
  const out: Action[] = [];

  if (g.pending) {
    const pend = g.pending;
    const push = (uid: string | null) => out.push(pend.kind === "seek" || pend.kind === "recall" ? { type: "pick", uid } : { type: "chooseTarget", uid });
    if (pend.kind === "oppMon" && pend.reason === "attack") {
      // attack targeting: only killable targets — a blocked swing (atk<=def) does
      // NOTHING, so it's strictly dominated; if none killable defer to greedy
      const att = p.field.find((m) => m.uid === (pend.data?.attackerUid as string));
      const a = att ? effAtk(p, att) : 0;
      o.field.filter((tm) => a >= curHp(o, tm))
        .filter((tm) => !(tm.aura === "eliteGuard" && (att?.cost ?? 0) <= 6)) // 귀족 영주
        .forEach((m) => push(m.uid));
      return out; // empty → searchDecide falls back to the greedy pick
    }
    if (pend.kind === "oppMon") o.field
      .filter((m) => !(hasPassive(m, "aura") && pend.reason !== "attack"))
      .filter((m) => !(pend.data?.maxCost != null && m.cost > (pend.data.maxCost as number) && pend.reason !== "attack")) // bounceLow 등 코스트 캡 공통
      .filter((m) => !(pend.reason === "decayMark" && m.hatch != null)) // 부패 카운터: 알 제외
      .filter((m) => !(pend.reason === "destroyMon" && pend.data?.maxCost != null && m.cost > (pend.data.maxCost as number))) // 룬 파열: 코스트 캡
      .forEach((m) => push(m.uid));
    else if (pend.kind === "myMon") {
      // 지원 나팔(exclude) / 고급 부화기(알만) / 비술(흡혈귀만) / v11 패시브 부여 제약 준수 — 아니면 재선택 무한루프
      p.field
        .filter((m) => !(((pend.data?.excl as string[] | undefined) ?? []).includes(m.uid)))
        .filter((m) => !(pend.reason === "incubate" && m.hatch == null))
        .filter((m) => !(pend.reason === "bloodSecret" && !isVampFamily(m)))
        .filter((m) => !(pend.reason === "chosenMage" && (m.id !== "CHOSEN_MAGE" || ((pend.data?.fired as string[] | undefined) ?? []).includes(m.uid))))
        .filter((m) => !(pend.reason === "grantDecay" && hasPassive(m, "decay")))
        .filter((m) => !(pend.reason === "grantMajesty" && hasPassive(m, "majesty")))
        .forEach((m) => push(m.uid));
      if (pend.allowCancel) push(null);
    }
    else if (pend.kind === "purge") {
      const pool = pend.data?.zone === "discard" ? [...p.discard] : [...p.deck, ...p.discard];
      const seen = new Set<string>();
      [...pool].sort((a, b) => cardPower(a) - cardPower(b)).forEach((c) => {
        if (!seen.has(c.id) && seen.size < 6) { seen.add(c.id); push(c.uid); }
      });
      push(null); // "그만 제외" 후보
      return out;
    }
    else if (pend.kind === "seek" || pend.kind === "recall") {
      const pool = pend.kind === "seek" ? p.deck : p.discard;
      const exile = pend.reason === "exilePick"; // 제외용은 저가치 우선 탐색
      const seen = new Set<string>();
      [...pool].sort((a, b) => (exile ? cardPower(a) - cardPower(b) : cardPower(b) - cardPower(a))).forEach((c) => {
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
    if (c.star === "chest" && (g.turn <= T.chestTurn || chestLocked(g))) return;
    if (c.t === "trap" && (p.trapBlockTurn || o.field.some((tm) => tm.aura === "trapBan"))) return; // 협상/몰락한 기사 — 엔진 거부 루프 방지
    if (c.t === "mon" && ((p.summonLockUntil ?? 0) > g.turn || !summonReqMet(p, c, o))) return; // 은둔자 잠금 / 소환 조건
    if (c.t === "spell" && p.spellCastCap != null && (p.spellsCastTurn || 0) >= p.spellCastCap) return; // 마족 시너지 한도
    if ((c.t === "spell" || c.t === "starter") && (candSealAll || p.spellSealTurn || (candSealLow && playCost(c, p) <= 5))) return; // 침묵
    if (c.id === "CHOSEN_AREA" && cullExiled(p) < 25) return; // 선택받은 영역: 컬 25장 조건
    if ((c.id === "DECAY_CRAFT" || c.id === "MAJESTY_RITE") && p.field.length === 0) return; // 대상 필요
    if (c.ench === "foresight" && p.enchants.some((e) => e.card.ench === "foresight")) return; // 선견지명 중복 금지
    if (c.ench === "guild" && p.enchants.some((e) => e.card.ench === "guild")) return; // 상회 중복 금지
    if (c.id === "SLUM" && !p.enchants.some((e) => e.card.ench === "guild")) return; // 슬럼가: 상회 필요
    if (playCost(c, p) > p.mana || seenPlay.has(c.id)) return;
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
      if (o.field.some((tm) => tm.aura === "lowAtkBan") && (m.cost ?? 0) <= 2) return; // 몰락 귀족
      const direct = m.directOnly || o.field.length === 0;
      if (direct && (p.noDirectTurn || o.field.some((tm) => tm.aura === "eliteGuard"))) return; // 천궁의 폐문 / 귀족 영주
      if (!direct && !o.field.some((tm) => !(tm.aura === "eliteGuard" && (m.cost ?? 0) <= 6))) return; // 공격 가능한 대상이 전무
      const canLand = true; // v24 HP-combat: every attack lands (chip damage accumulates)
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
  g.market.forEach((c, i) => { if (buyableByBot(p, c) && !seenBuy.has(c.id)) { seenBuy.add(c.id); buys.push({ a: { type: "buyMarket", i }, s: roughBuy(c) }); } });
  buys.sort((x, y) => y.s - x.s).slice(0, 4).forEach((b) => out.push(b.a));
  // 상대 함정이 깔려 있고 공격이 가능하면 "공격 보류(턴 종료)"도 후보에 —
  // 킬각이 있어도 함정에 꽂아주는 게 정답이 아닐 때가 있다 (A/B +5%)
  if (o.traps.length > 0 && out.some((a) => a.type === "attack")) out.push({ type: "endTurn" });
  if (out.length === 0) out.push({ type: "endTurn" });
  return out;
}

// ---- 튜닝 파라미터 (A/B 하네스가 덮어쓰며 탐색 — 기본값 = 배포값) ----
// 단위: cardEval.cardPower 의 "데미지 환산 점수" (구 cardValue 스케일 아님).
// 구 스케일 17 ≈ 5/3 몬스터 ≈ 신 스케일 11.5 — 하한을 그에 맞춰 옮겼다.
export const TUNE = {
  minBuy: 11,      // maxMana>=5 이후 구매 하한 (덱 희석 방지)
  minBuyEarly: 6,  // 초반(1~4턴) 구매 하한
  costW: 1.0,      // 구매가 1마나당 차감할 점수
  floorK: 1.25,    // 구매 하한 = max(고정 하한, floorK × 현재 덱 평균 파워)
  chestTurn: 6,    // 이 턴까지는 보물상자 안 엶 (초반 미믹 리스크)
  maxRerolls: 4,   // 턴당 제시 리롤 상한 (마나 낭비 방지)
};

/** Buy ranking: raw power, lightly discounted by what it costs to acquire. */
function roughBuy(c: CardInst): number {
  return cardPower(c) - c.cost * TUNE.costW;
}

// per-bot buy discipline: archetype overrides on top of the shared TUNE defaults.
function tuneFor(p: PlayerState): typeof TUNE {
  return { ...TUNE, ...(p.botTune ?? {}) };
}
// FLAME/AMBUSH deal face damage but the engine resolves them by id (no `act`),
// so the lethal planner and the burn branch look their damage up here.
// castable() already gates the self-damage; AMBUSH is only legal on the opening
// turn (opponent still at max mana 4).
function burnDmg(c: CardInst, o: PlayerState): number {
  if (c.id === "FLAME") return 2;
  if (c.id === "AMBUSH") return o.maxMana === 4 ? 7 : 0;
  return 0;
}

// ============================================================
// Bot deck archetypes. The bot used to always run the vanilla default
// (6 Cull + 2 Chest) with no early plays, so it just thinned and passed —
// which read as "weird". Each archetype below is a coherent 8-card starting
// deck (the fixed Attune is auto-prepended by the engine) plus a small
// buy-discipline override matching its game plan. pickBotDeck() rolls one
// at game start; controller sets it as the bot player's deck + botTune.
// ============================================================
export interface BotDeck { name: string; cards: string[]; tune: PlayerState["botTune"] }
export const BOT_DECKS: BotDeck[] = [
  { // AGGRO — open with 기습(AMBUSH), chip with 불꽃(FLAME), race with 유령(GHOST) + 지원 나팔(TRUMPET)
    name: "BOT · AGGRO",
    cards: ["AMBUSH", "FLAME", "FLAME", "FLAME", "GHOST", "GHOST", "TRUMPET", "STARTER_CHEST"],
    tune: { minBuyEarly: 5, minBuy: 8, chestTurn: 4 }, // grab cheap attackers, open chests early for tempo
  },
  { // RAMP — thin hard, ramp on 선견지명(FORESIGHT), then buy bombs. No 유령/GHOST: it self-damages
    //         whenever EITHER player ramps, which is a liability in a ramp mirror.
    name: "BOT · RAMP",
    cards: ["STARTER_TRASH", "STARTER_TRASH", "STARTER_TRASH", "STARTER_TRASH", "FORESIGHT", "STARTER_CHEST", "STARTER_CHEST", "STARTER_CHEST"],
    tune: { minBuyEarly: 8, minBuy: 13, chestTurn: 6 },
  },
  { // MIDRANGE — board tempo: 유령(GHOST) clocks, 지원 나팔(TRUMPET) pushes, 암살자 길드(GUILD_HALL)
    //            a sticky body, light thinning + chests for value, balanced buys.
    name: "BOT · MIDRANGE",
    cards: ["GHOST", "GHOST", "TRUMPET", "GUILD_HALL", "FLAME", "STARTER_TRASH", "STARTER_CHEST", "STARTER_CHEST"],
    tune: { minBuyEarly: 7, minBuy: 10, chestTurn: 5 },
  },
  { // GAMBLER RAMP (v20) — 도박꾼 3장으로 마나·최대체력을 불리고 큰 구매로 전환. 램프처럼 높은 구매 하한.
    name: "BOT · GAMBLER",
    cards: ["GAMBLER", "GAMBLER", "GAMBLER", "STARTER_TRASH", "STARTER_TRASH", "STARTER_TRASH", "STARTER_CHEST", "STARTER_CHEST"],
    tune: { minBuyEarly: 8, minBuy: 11, chestTurn: 6 },
  },
  { // ELF TEMPO (v20) — 하프 엘프 초반 보드 + 쉼터로 세계수 코스트 0 각. 밸런스형 구매.
    name: "BOT · ELF",
    cards: ["ELF_HAVEN", "HALF_ELF", "HALF_ELF", "STARTER_TRASH", "STARTER_TRASH", "STARTER_TRASH", "STARTER_CHEST", "STARTER_CHEST"],
    tune: { minBuyEarly: 7, minBuy: 10, chestTurn: 5 },
  },
];
// v20 A/B (greedy, 기존 3덱 필드 상대): GAMBLER 70% 채택 · ELF 46% 채택(아키타입 다양성)
// 탈락: TRUMPET 더블 템포 30%(나팔 스타터 승률은 상관관계였음) · MIMIC 41% · 순정 컬덱 45%
/** Roll a random archetype for a new bot game (caller supplies the RNG roll in [0,1)). */
export function pickBotDeck(rnd: number = Math.random()): BotDeck {
  return BOT_DECKS[Math.min(BOT_DECKS.length - 1, Math.max(0, Math.floor(rnd * BOT_DECKS.length)))];
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
  g.market.forEach((c, i) => { if (buyableByBot(p, c)) add({ type: "buyMarket", i }); });
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
    return target ? 0.4 + cardPower(target) / 20 : 0.25;
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
    if (c.act === "buffTurn" || c.act === "buffAllTurn" || c.act === "buffPerm" || c.act === "buffAllDef") return 3 + p.field.length * 0.6 + Math.max(c.val || 0, c.val2 || 0) * 0.2;
    if (c.t === "mon") return 2.2 + (c.atk || 0) * 0.35 + (c.def || 0) * 0.18 + c.cost * 0.08;
    if (c.act === "draw" || c.act === "seek" || c.act === "recall") return 2.0;
    if (c.act === "manaUp" || c.act === "manaUpGain" || c.act === "chestToMana") return 1.8;
    if (c.t === "trap") return 1.0 + (p.traps.length < 2 ? 0.4 : 0);
    return 0.6 + cardPower(c) / 20;
  }
  if (a.type === "attack") {
    const m = p.field.find((x) => x.uid === a.uid);
    if (!m) return 0.01;
    const atk = effAtk(p, m);
    if (m.directOnly || o.field.length === 0) return 4 + atk * 0.45 + (atk >= o.hp ? 10 : 0) - (o.traps.length > 0 ? 0.7 + read.trap * 0.25 : 0);
    const bestKill = o.field.filter((tm) => atk >= curHp(o, tm)).sort((x, y) => (effAtk(o, y) * 2 + effDef(o, y)) - (effAtk(o, x) * 2 + effDef(o, x)))[0];
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
  const myDef = p.field.reduce((t, m) => t + curHp(p, m), 0);
  const opDef = o.field.reduce((t, m) => t + curHp(o, m), 0);
  const pressure = (potentialFace(p, o) - potentialFace(o, p)) / 45;
  const board = ((myAtk - opAtk) * 0.55 + (myDef - opDef) * 0.2 + (p.field.length - o.field.length) * 1.4) / 35;
  const resources = ((p.hand.length - o.hand.length) * 0.7 + (p.maxMana - o.maxMana) * 0.9 + (p.traps.length - o.traps.length) * 0.5) / 18;
  const hp = (p.hp - o.hp) / 90;
  const eggPressure = (eggProg(p) - eggProg(o)) / 30;
  return clamp01(base + 0.025 * pressure + 0.018 * board + 0.012 * resources + 0.01 * hp + 0.01 * eggPressure);
}

function potentialFace(p: PlayerState, o: PlayerState): number {
  const defs = o.field.map((m) => curHp(o, m)).sort((a, b) => b - a);
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

function eggProg(p: PlayerState): number {
  let total = 0;
  for (const m of p.field) {
    if (m.hatch == null || (m.dur ?? 0) <= 0) continue;
    const turns = m.hatchTurns ?? 8;
    total += Math.max(0, turns - m.hatch) * (0.2 + 0.2 * Math.min(4, m.dur ?? 0)) * (m.id === "BEAST_EGG" ? 1.4 : 1);
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
      removes = o.field.some((tm) => atk >= curHp(o, tm)) ? 0.8 : 0.3; // v24: chip damage has residual value
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
/** SAFETY NET (2026-07-31): the engine refuses some plays *before* paying, leaving the
 *  state untouched. If castable() below ever misses one of those conditions the bot
 *  re-picks the same card forever (this class of bug has shipped 5 times: 침묵/나팔/알/
 *  봉인된 스타터/선견지명). castable() stays the fast path — this wrapper is the backstop:
 *  a "play" that provably changes nothing is retried with that card excluded, so a future
 *  card with a new engine-side condition degrades into a slightly worse move, never a hang. */
export function greedyDecide(g: GameState, useLethal = true): Action {
  const blocked = new Set<string>();
  for (let attempt = 0; attempt < 4; attempt++) {
    const a = greedyDecideRaw(g, useLethal, blocked);
    if (a.type !== "play") return a;
    const side = g.cur;
    const card = g.players[side].hand[(a as { idx: number }).idx];
    if (!card) return a;
    // every successful play path splices the card out of hand; a refusal leaves it there
    const after = reduce(g, a).state;
    if (!after.players[side].hand.some((h) => h.uid === card.uid)) return a;
    blocked.add(card.uid);
  }
  return { type: "endTurn" };
}

function greedyDecideRaw(g: GameState, useLethal = true, blocked?: Set<string>): Action {
  const p = g.players[g.cur];
  const o = g.players[1 - g.cur];
  const T = tuneFor(p); // archetype buy discipline (defaults to shared TUNE)

  if (useLethal && lethalWorthSearching(g)) {
    const lethal = findLethalAction(g);
    if (lethal) return lethal;
  }

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
      if (playCost(c, p) <= 5 && g.players.some((pl) => pl.field.some((m) => m.aura === "sealLow"))) return false;
      if (p.spellSealTurn) return false;
    }
    if (c.t === "spell" && p.spellCastCap != null && (p.spellsCastTurn || 0) >= p.spellCastCap) return false; // 마족 시너지
    if (c.t === "trap" && o.field.some((tm) => tm.aura === "trapBan")) return false; // 몰락한 기사
    if (blocked?.has(c.uid)) return false; // proven no-op this decision (safety-net retry)
    // 영구마법 중복/존 제약 — 엔진이 지불 전에 거부하는 조건들 (누락 시 무한 재시도)
    if (c.ench === "foresight" && p.enchants.some((e) => e.card.ench === "foresight")) return false;
    if (c.ench === "guild" && p.enchants.some((e) => e.card.ench === "guild")) return false; // 상회 중복
    if (c.id === "SLUM" && !p.enchants.some((e) => e.card.ench === "guild")) return false; // 슬럼가: 상회 필요
    if (c.ench && p.traps.length + p.enchants.length >= 7) return false;
    if (c.id === "BLOOD_SECRET" && !p.field.some((m) => isVampFamily(m))) return false;
    if (c.id === "CHOSEN_AREA" && cullExiled(p) < 25) return false;
    if ((c.id === "DECAY_CRAFT" || c.id === "MAJESTY_RITE") && p.field.length === 0) return false;
    // 버프/체력 강화 마법은 대상이 없으면 낭비 (엔진은 마나만 소모하고 "대상 없음")
    if ((c.act === "buffPerm" || c.act === "buffAllDef" || c.act === "buffTurn" || c.act === "buffAllTurn") && p.field.length === 0) return false;
    if (c.id === "VAMP_PACT" && p.field.length >= 7) return false;
    if (c.star === "chest" && chestLocked(g)) return false;
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
    if (c.act === "destroyMon" && c.cap && !o.field.some((m) => m.cost <= c.cap!)) return false; // 룬 파열: 코스트 캡 대상 필요
    if (c.id === "WALLBREAK1" && !o.field.some((m) => effAtk(o, m) <= 1)) return false;
    if (c.id === "WALLBREAK2" && !o.field.some((m) => effAtk(o, m) <= 2)) return false;
    if (c.id === "SNIPE1" && !o.field.some((m) => curHp(o, m) <= 1)) return false;
    if (c.id === "SNIPE2" && !o.field.some((m) => curHp(o, m) <= 2)) return false;
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
    if (c.id === "BLOOD1" && p.hp <= 16) return false;
    if (c.id === "BLOOD2" && (p.hp <= 16 || o.traps.length + o.enchants.length === 0)) return false;
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
    // forbidden ritual: needs HP to spare AND a non-시초 tribe monster to duplicate
    if (c.id === "FORBIDDEN" && (p.hp <= 17 || !p.field.some((m) => m.tribe && m.tribe !== "시초"))) return false;
    return true;
  };
  const spells = p.hand.map((c, i) => ({ c, i })).filter((x) => x.c.t === "spell" && playCost(x.c, p) <= p.mana && castable(x.c));

  const stFull = p.traps.length + p.enchants.length >= 7;
  // summonable monsters, best value first (respect the 9-monster zone cap)
  const monsters = p.field.length >= 7 ? [] : p.hand
    .map((c, i) => ({ c, i }))
    .filter((x) => x.c.t === "mon" && playCost(x.c, p) <= p.mana && !(oppNoLow && (x.c.cost ?? 0) <= 3) && summonReqMet(p, x.c, o) && (p.summonLockUntil ?? 0) <= g.turn)
    .sort((a, b) => cardPower(b.c) - cardPower(a.c));

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
    ((x.c.act === "buffPerm" || x.c.act === "buffAllDef") && p.field.length > 0) ||
    ((x.c.act === "buffTurn" || x.c.act === "buffAllTurn") && ready.length > 0) ||
    (x.c.id === "TRUMPET" && ready.length > 0)); // 지원 나팔: 공격 직전 몬스터 2체 +1
  if (buff) return { type: "play", idx: buff.i };

  // 6) attack — assassins go face; otherwise attack when it kills (a blocked
  //    swing does nothing, so never chip into a bigger defense).
  //    Biggest attacker first: same kill, more penetration (관통) face damage.
  if (!noAtk) {
    const ban = glassBanActive(g);
    const lowBan = o.field.some((tm) => tm.aura === "lowAtkBan");
    const canSwing = (m: FieldMon): boolean => (!ban || effDef(p, m) > 1) && !(lowBan && (m.cost ?? 0) <= 2);
    const eliteWall = o.field.some((tm) => tm.aura === "eliteGuard");
    const assassin = ready.find((m) => m.directOnly && canSwing(m) && !p.noDirectTurn && !eliteWall);
    if (assassin) return { type: "attack", uid: assassin.uid };
    for (const m of [...ready].filter((m2) => canSwing(m2) && !m2.directOnly).sort((a, b) => effAtk(p, b) - effAtk(p, a))) {
      if (o.field.length === 0) { if (p.noDirectTurn || eliteWall) break; return { type: "attack", uid: m.uid }; } // 천궁의 폐문 / 귀족 영주
      const a = effAtk(p, m);
      if (o.field.some((tm) => a >= curHp(o, tm) && !(tm.aura === "eliteGuard" && (m.cost ?? 0) <= 6))) return { type: "attack", uid: m.uid };
    }
  }

  // 7) trap-break / wipe / direct damage
  if (trapbreak) return { type: "play", idx: trapbreak.i };
  // 블러드 샤워: 상대 영구마법·세트 함정 제거 (castable가 대상 존재·자해 리스크를 게이트)
  const shower = spells.find((x) => x.c.id === "BLOOD2");
  if (shower) return { type: "play", idx: shower.i };
  const wipe = spells.find((x) => x.c.act === "wipeBack" && p.field.length === 0 && (o.traps.length + o.enchants.length) > 0);
  if (wipe) return { type: "play", idx: wipe.i };
  // 역산: 상대 영구마법 파괴 (castable가 상대 최대 마나<=6 & 영구마법 존재를 보장)
  const disenchant = spells.find((x) => x.c.id === "COUNTERCALC");
  if (disenchant) return { type: "play", idx: disenchant.i };
  // 직접 데미지 마법 + 불꽃/기습 번 (castable가 자해 리스크를 게이트)
  const direct = spells.find((x) => x.c.act === "dmg" || x.c.act === "siphon" || burnDmg(x.c, o) > 0);
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
  const trap = p.trapBlockTurn ? undefined : p.hand.map((c, i) => ({ c, i })).find((x) => x.c.t === "trap" && playCost(x.c, p) <= p.mana);
  if (trap && p.traps.length < 3 && !stFull) return { type: "play", idx: trap.i };

  // 11) Attune (max mana +1) — always good
  const attune = p.hand.findIndex((c) => c.star === "mana" && playCost(c, p) <= p.mana && castable(c));
  if (attune >= 0) return { type: "play", idx: attune };

  // 12) buy from supply, then common market — attack-weighted scoring (races are
  //     won with face damage), and once the economy is online (maxMana>=5) stop
  //     buying chaff: weak buys dilute the deck and starve the late game.
  //     Early game also has a floor (11): cheap chaff bought on turns 1-4 is
  //     what clogs the deck at turn 15. Defense weighted 1.2 — walls soak
  //     penetration damage. (A/B: ~66% vs v1 bot, then +4% more in round 2.)
  const buyScore = (c: CardInst): number => cardPower(c) - buyCost(p, c) * TUNE.costW;
  // 구매 하한: 고정 하한과 "현재 덱 평균의 배수" 중 높은 쪽.
  // 고정값만 쓰면 후반에 덱이 좋아져도 같은 쓰레기를 계속 사서 덱이 희석되고,
  // 덱 평균만 쓰면 초반(컬 뿐인 덱)에 아무거나 사버린다.
  const deckAvg = avgPower([...p.deck, ...p.hand, ...p.discard]);
  const minBuy = Math.max(p.maxMana >= 5 ? T.minBuy : T.minBuyEarly, TUNE.floorK * deckAvg);
  let bi = -1, bs = minBuy;
  p.supply.forEach((c, i) => { if (c && buyableByBot(p, c)) { const s = buyScore(c); if (s > bs) { bs = s; bi = i; } } });
  if (bi >= 0) return { type: "buySupply", i: bi };
  let mbi = -1, mbs = minBuy;
  g.market.forEach((c, i) => { if (buyableByBot(p, c)) { const s = buyScore(c); if (s > mbs) { mbs = s; mbi = i; } } });
  if (mbi >= 0) return { type: "buyMarket", i: mbi };

  // 12.5) 마나가 크게 남아도는데 살 만한 게 없으면 제시 리롤 — 마나를 카드로 환전
  //       (램프 폭발 후반: 리롤로 폭탄을 파는 게 정답. 8마나+ 여유일 때만 → 일반 게임 영향 최소)
  // 턴당 리롤 횟수 상한: 정책이 무상태라 "이번 턴에 쓴 마나"로 간접 제한한다.
  if (p.mana >= 8 && p.mana > effMaxMana(p) - TUNE.maxRerolls) return { type: "refresh" };

  // 13) spare mana → Pry Chest (not before turn 7 — early mimic risk outweighs the payout; not while sealed)
  const chest = (g.turn <= T.chestTurn || chestLocked(g)) ? -1 : p.hand.findIndex((c) => c.star === "chest" && playCost(c, p) <= p.mana && castable(c));
  if (chest >= 0) return { type: "play", idx: chest };

  // 14) spare mana → Cull (deck thinning)
  const cull = p.hand.findIndex((c) => c.star === "trash" && playCost(c, p) <= p.mana && castable(c));
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
    .map((x) => ({ i: x.i, cost: playCost(x.c, p), d: (x.c.act === "dmg" || x.c.act === "siphon") ? (x.c.val || 0) : burnDmg(x.c, o) }))
    .filter((x) => x.d > 0)
    .sort((a, b) => b.d - a.d);
  for (const s of dmg) {
    if (s.cost <= manaLeft) { manaLeft -= s.cost; total += s.d; if (spellIdx === null) spellIdx = s.i; }
  }
  let attackUid: string | null = null;
  if (!noAtk) {
    // 유리 병기 금지령: 방어 1 이하는 공격 자체가 불가 → 리썰 계산에서 제외
    const ban = [p, o].some((pl) => pl.enchants.some((e) => e.card.ench === "glassBan"));
    const defs = o.field.filter((m) => m.uid !== withoutUid).map((m) => curHp(o, m)).sort((a, b) => b - a); // toughest first
    for (const m of [...ready].sort((a, b) => effAtk(p, b) - effAtk(p, a))) {
      const a = effAtk(p, m);
      if (a <= 0) continue;
      if (ban && effDef(p, m) <= 1) continue;
      if (m.directOnly || defs.length === 0) {
        if (p.noDirectTurn || o.field.some((tm) => tm.aura === "eliteGuard")) continue; // 폐문/귀족 영주 — 리썰 계산 제외
        total += a; if (!attackUid) attackUid = m.uid; continue;
      }
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
      uniqueCards(p.deck, (a, b) => cardPower(b) - cardPower(a)).forEach((c) => add(pick(c.uid)));
      if (pend.allowCancel) add(pick(null));
    } else if (pend.kind === "recall") {
      uniqueCards(p.discard, (a, b) => cardPower(b) - cardPower(a)).forEach((c) => add(pick(c.uid)));
      if (pend.allowCancel) add(pick(null));
    } else if (pend.kind === "purge") {
      uniqueCards([...p.deck, ...p.discard], (a, b) => cardPower(a) - cardPower(b)).forEach((c) => add(pick(c.uid)));
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
  if (c.act === "buffAllDef") return 20;
  if (c.t === "mon") return 55 + (c.atk || 0) * 2 + (c.def || 0);
  if (c.act === "draw" || c.act === "seek" || c.act === "recall" || c.act === "chestToMana" || c.act === "manaUpGain") return 45;
  return 10 + cardPower(c);
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
      // 알은 부화 임박도(진행도)를 위협으로 환산 — 부화 직전 알은 최우선으로 깬다
      const threat = (tm: FieldMon): number =>
        tm.hatch != null ? Math.max(0, (tm.hatchTurns ?? 8) - tm.hatch) * 4 * (tm.id === "BEAST_EGG" ? 1.4 : 1)
        : effAtk(o, tm) * 2 + effDef(o, tm);
      const legal = (tm: FieldMon): boolean => !(tm.aura === "eliteGuard" && (att?.cost ?? 0) <= 6); // 귀족 영주
      const killable = o.field
        .filter(legal)
        .filter((tm) => a > effDef(o, tm) || tm.hatch != null)
        .sort((x, y) => threat(y) - threat(x));
      const target = killable[0] ?? lowestDef(o, o.field.filter(legal));
      return { type: "chooseTarget", uid: target ? target.uid : null };
    }
    if (pending.reason === "decayMark") { // 러스트캡 슬러그: 알·아우라 제외, 가장 위협적인 몬스터에 카운터
      const t0 = [...o.field].filter((m) => m.hatch == null && !hasPassive(m, "aura"))
        .sort((a, b) => (effAtk(o, b) + b.def!) - (effAtk(o, a) + a.def!))[0];
      return { type: "chooseTarget", uid: t0 ? t0.uid : null };
    }
    // destroy / debuff → hit the most valuable enemy monster (아우라 몬스터는 대상 불가 · 룬 파열 코스트 캡 준수)
    const mc0 = pending.data?.maxCost as number | undefined; // destroyMon/bounceLow 등 코스트 캡 공통
    const t = [...o.field].filter((m) => !hasPassive(m, "aura") && (mc0 == null || m.cost <= mc0)).sort((a, b) => (effAtk(o, b) + b.def!) - (effAtk(o, a) + a.def!))[0];
    if (t) return { type: "chooseTarget", uid: t.uid };
    // anySide 파괴에서 적 대상이 없고 취소도 불가능하면(포식 등) 자기 최저가치 몬스터로 해소 (봇 무한 pending 방지)
    if ((pending.data?.anySide as boolean | undefined) && !pending.allowCancel) {
      const own = [...p.field].filter((m) => mc0 == null || m.cost <= mc0).sort((a, b) => (effAtk(p, a) + (a.def || 0)) - (effAtk(p, b) + (b.def || 0)))[0];
      if (own) return { type: "chooseTarget", uid: own.uid };
    }
    return { type: "chooseTarget", uid: null };
  }
  if (pending.kind === "myMon") {
    if (pending.reason === "incubate") { // 고급 부화기: 부화가 가장 임박한 알
      const egg = [...p.field].filter((m) => m.hatch != null).sort((a, b) => (a.hatch ?? 99) - (b.hatch ?? 99))[0];
      return { type: "chooseTarget", uid: egg ? egg.uid : null };
    }
    if (pending.reason === "bloodSecret") { // 비술: 가장 약한 흡혈귀를 대가로 바친다
      const v = [...p.field].filter((m) => isVampFamily(m)).sort((a, b) => (effAtk(p, a) + effDef(p, a)) - (effAtk(p, b) + effDef(p, b)))[0];
      return { type: "chooseTarget", uid: v ? v.uid : null };
    }
    if (pending.reason === "chosenMage") { // 선택받은 마법사: 미발동 마법사가 있으면 발동 (6뎀 이득)
      const fired = (pending.data?.fired as string[] | undefined) ?? [];
      const mage = p.field.find((m) => m.id === "CHOSEN_MAGE" && !fired.includes(m.uid));
      return { type: "chooseTarget", uid: mage ? mage.uid : null };
    }
    if (pending.reason === "grantDecay") { // 암기 제작: 부패가 없는 몬스터 중 공격력 높은 순
      const t0 = [...p.field].filter((m) => !hasPassive(m, "decay")).sort((x, y) => effAtk(p, y) - effAtk(p, x))[0];
      return { type: "chooseTarget", uid: t0 ? t0.uid : null };
    }
    if (pending.reason === "grantMajesty") { // 각인 비술: 위엄이 없는 몬스터 중 방어 높은 순 (오래 버틸 몸)
      const t0 = [...p.field].filter((m) => !hasPassive(m, "majesty")).sort((x, y) => effDef(p, y) - effDef(p, x))[0];
      return { type: "chooseTarget", uid: t0 ? t0.uid : null };
    }
    // 지원 나팔의 exclude(중복 선택 불가)를 지켜야 무한 재무장 루프에 안 빠진다
    const excl = (pending.data?.excl as string[] | undefined) ?? [];
    const t = [...p.field].filter((x) => !excl.includes(x.uid)).sort((x, y) => effAtk(p, y) - effAtk(p, x))[0];
    return { type: "chooseTarget", uid: t ? t.uid : null };
  }
  if (pending.kind === "seek") {
    const best = bestOf(p.deck);
    return { type: "pick", uid: best ? best.uid : (p.deck[0]?.uid ?? null) };
  }
  if (pending.kind === "purge") { // 덱·묘지에서 제외: 저가치부터, 살릴 가치가 있으면 종료
    const discOnly = pending.data?.zone === "discard"; // 시련의 영역: 묘지에서만 — 컬 우선 제외 (선택받은 시리즈 연료)
    const pool = (discOnly ? [...p.discard] : [...p.deck, ...p.discard]).sort((a, b) => cardPower(a) - cardPower(b));
    if (discOnly) {
      const cull = pool.find((c) => c.star === "trash");
      if (cull) return { type: "pick", uid: cull.uid };
    }
    const worst = pool[0];
    if (worst && cardPower(worst) < 8) return { type: "pick", uid: worst.uid };
    return { type: "pick", uid: null };
  }
  if (pending.kind === "recall") {
    if (pending.reason === "exilePick") { // 게임에서 제외 → 가장 쓸모없는 카드
      const worst = [...p.discard].sort((a, b) => cardPower(a) - cardPower(b))[0];
      return { type: "pick", uid: worst ? worst.uid : (p.discard[0]?.uid ?? null) };
    }
    const best = bestOf(p.discard);
    return { type: "pick", uid: best ? best.uid : (p.discard[0]?.uid ?? null) };
  }
  if (pending.kind === "reroll") return { type: "pick", uid: null }; // 수레바퀴: 봇은 결과 유지
  if (pending.kind === "giantShop") {
    if (pending.reason === "civChoice") { // 고대 문명: 무료 — 신수의 알(상위 페이오프) 우선
      const ids0 = (pending.data?.ids as string[] | undefined) ?? [];
      return { type: "pick", uid: ids0.includes("BEAST_EGG") ? "BEAST_EGG" : (ids0[0] ?? null) };
    }
    // 시초의 거인 교역: 살 수 있는 가장 비싼 시초 카드
    const ids = ((pending.data?.ids as string[] | undefined) ?? []).filter((id) => DB[id] && DB[id].cost <= p.mana);
    const best = ids.sort((a, b) => DB[b].cost - DB[a].cost)[0];
    return { type: "pick", uid: best ?? null };
  }
  if (pending.kind === "oppRmz") { // 흑룡: 상대 묘지 오염 — 가치가 낮은 카드(컬 등)를 되돌린다
    const worst = [...(o.removed ?? [])].sort((a, b) => cardPower(a) - cardPower(b))[0];
    return { type: "pick", uid: worst ? worst.uid : null };
  }
  if (pending.kind === "oppBoard") { // 파괴 선택: 가장 위협적인 적 몬스터 → 적 함정 → 적 영구마법 순 (봇은 자기 카드를 부수지 않는다 — 없으면 취소)
    const d0 = (pending.data || {}) as { noMon?: boolean; trapOnly?: boolean; enchOnly?: boolean };
    const wantMon = !d0.noMon && !d0.trapOnly && !d0.enchOnly;
    const wantTrap = !d0.enchOnly;
    const wantEnch = !d0.trapOnly;
    const best = wantMon ? [...o.field].filter((m) => !hasPassive(m, "aura"))
      .sort((a, b) => (effAtk(o, b) + (b.def || 0)) - (effAtk(o, a) + (a.def || 0)))[0] : undefined;
    const uid = best?.uid ?? (wantTrap ? o.traps[0]?.card.uid : undefined) ?? (wantEnch ? o.enchants[0]?.card.uid : undefined) ?? null;
    return { type: "pick", uid };
  }
  return { type: "chooseTarget", uid: null };
}

function lowestDef(p: PlayerState, field: FieldMon[]): FieldMon | undefined {
  return [...field].sort((a, b) => effDef(p, a) - effDef(p, b))[0];
}
function bestOf(pool: CardInst[]): CardInst | undefined {
  return [...pool].sort((a, b) => cardPower(b) - cardPower(a))[0];
}
