// Four difficulty levels share the same rules and legal-action safety.
// Hard/hell use paired imperfect-information rollouts; easy/normal retain mistakes.
import type { Action, CardInst, FieldMon, GameState, PlayerState, Side } from "./types";
import { purgeChoices, effectChoices, purchaseAllowed, playBlockReason, monsterCanAttack } from "./engine";
import { ST_MAX, buyCost, chestLocked, cullExiled, curHp, effAtk, effDef, freeBuyBlocked, isVampFamily, playCost, reduce, spellDeckHalf, summonReqMet, sealLowBlocks, isGolem, isAssassinCard } from "./engine";
import { cardPower } from "./cardEval";
import { searchDecide } from "./botSearch";
import { observationSample } from "./botObservation";
import { botActions, actionChangesState, withinBotTurnBudget } from "./botActions";
import { DB, hasPassive } from "./cards";
import { withoutMonsterPresentation } from './monsterEffects';
import { enteringAttack, matchupPlan, removalHits } from './botMatchup';
import { recoveryEngine } from './botStrategy';
import { purchaseEvaluator, refreshValue, publicInventory } from './botEconomy';

export type BotDifficulty = "easy" | "normal" | "hard" | "hell";

const SELF_HARM_SPELLS = new Set(['CATALYST','BLOOD1','BLOOD2','BLOOD_JOY','BLOOD_ANGER','BLOOD_SORROW','BLOOD_PLEASURE','VAMP_PACT','SHATTER','GREED_PRICE','MASSACRE','FLAME','AMBUSH','FORBIDDEN']);

const BLUNDER: Record<BotDifficulty, number> = { easy: 0.45, normal: 0.18, hard: 0, hell: 0 };

export function botDecide(g: GameState, diff: BotDifficulty = "hard", onProgress?: (action: Action) => void): Action {
  return withoutMonsterPresentation(() => decideFromObservation(g, diff, onProgress));
}

function decideFromObservation(g: GameState, diff: BotDifficulty, onProgress?: (action: Action) => void): Action {
  // All policies, including tactical checks, see sampled hidden information.
  const view = observationSample(g, g.pending?.owner ?? g.cur, 0);
  let best = diff === "hard" || diff === "hell" ? searchDecide(view, diff, true, onProgress ? a => onProgress(legalBotAction(g, a, view)) : undefined) : safeGreedy(view);
  if (BLUNDER[diff] > 0 && Math.random() < BLUNDER[diff]) {
    const alternatives = botActions(view).filter(a => JSON.stringify(a) !== JSON.stringify(best))
      .filter(a => actionChangesState(view, reduce(view, a).state));
    if (alternatives.length) best = alternatives[Math.floor(Math.random() * alternatives.length)];
  }
  return legalBotAction(g, best, view);
}

/** The engine can refuse a sampled play (e.g. Inquisition has no real target).
 * Inspect only acceptance here, never score the authoritative hidden outcome.
 */
export function legalBotAction(g: GameState, proposed: Action, view = observationSample(g, g.pending?.owner ?? g.cur, 0)): Action {
  const accepted = (a: Action): boolean => {
    if (!withinBotTurnBudget(g, a)) return false;
    const next = reduce(g, a).state;
    // A random action was accepted even if its actual outcome changes no material.
    // Never use the live die/draw result to reject an unlucky outcome.
    return next.rng !== g.rng || actionChangesState(g, next);
  };
  if (accepted(proposed)) return proposed;
  for (const a of [safeGreedy(view), ...botActions(view)]) {
    if (accepted(a)) return a;
  }
  return { type: 'endTurn' };
}

/** Reducer-verified fallback also covers mandatory targets, not only hand plays. */
export function safeGreedy(g: GameState): Action { return greedyStep(g).action; }
export function greedyStep(g: GameState): { action: Action; state: GameState } {
  const best = g.pending?.kind === 'cardChoice' ? greedyDecide(g, false) : greedyDecideRaw(g, false);
  const state = reduce(g, best).state;
  if (withinBotTurnBudget(g, best) && actionChangesState(g, state)) return { action: best, state };
  for (const a of botActions(g)) {
    const next = reduce(g, a).state;
    if (actionChangesState(g, next)) return { action: a, state: next };
  }
  return { action: { type: 'endTurn' }, state };
}

const LETHAL_DEPTH = 10;
const LETHAL_NODES = 260;

// candidate actions, deduped + trimmed (used to sample a random legal "blunder",
// for value-net search, and for self-play exploration)
/** 구매 가능 여부. 0코스트 무한 구매 상한은 이제 엔진 규칙(FREE_BUY_MAX, 턴당 3장)이
 *  담당한다 — 예전의 봇 전용 게임당 상한은 사람 플레이어를 막지 못했다.
 *  엔진이 거부하는 수를 후보에 남기면 봇이 같은 수를 계속 골라 무한 재선택에 빠진다. */
export function buyableByBot(p: PlayerState, c: CardInst, g?: GameState): boolean {
  if (g && !purchaseAllowed(g, p, c)) return false;
  if (buyCost(p, c) > p.mana) return false;
  return !freeBuyBlocked(p, c);
}

export function candidates(g: GameState): Action[] {
  return botActions(g).filter(a => actionChangesState(g, reduce(g, a).state));
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

// per-bot buy discipline: archetype overrides on top of the shared TUNE defaults.
function tuneFor(p: PlayerState): typeof TUNE {
  return { ...TUNE, ...(p.botTune ?? {}) };
}
// FLAME/AMBUSH deal face damage but the engine resolves them by id (no `act`),
// so the lethal planner and the burn branch look their damage up here.
// castable() already gates self-damage and the opposing max-mana requirement.
function burnDmg(c: CardInst, p: PlayerState, o: PlayerState): number {
  if (c.id === "FLAME") return (p.uses.FLAME ?? 0) >= 9 ? 5 : 2;
  if (c.id === "AMBUSH") return o.maxMana === 4 ? 13 : 0;
  return 0;
}

function reflectedOverflow(att: FieldMon, target: FieldMon, attack: number, hp: number): number {
  if (target.hatch!=null) return 0;
  if (hasPassive(att,'decay') && (target.decayCnt??0)+(att.id==='POISON_MASTER'?3:1)>=3) return 0;
  return Math.max(0,attack-hp);
}

export { BOT_DECKS, BOT_ELITE_DECKS, BOT_HELL_DECKS, pickBotDeck } from "./botDecks";
export type { BotDeck } from "./botDecks";

// ---------------- greedy policy (the difficulty-neutral heuristic) ----------------
/** SAFETY NET (2026-07-31): the engine refuses some plays *before* paying, leaving the
 *  state untouched. If castable() below ever misses one of those conditions the bot
 *  re-picks the same card forever (this class of bug has shipped 5 times: 침묵/나팔/알/
 *  봉인된 스타터/선견지명). castable() stays the fast path — this wrapper is the backstop:
 *  a "play" that provably changes nothing is retried with that card excluded, so a future
 *  card with a new engine-side condition degrades into a slightly worse move, never a hang. */
export function greedyDecide(g: GameState, useLethal = true): Action {
  if (g.pending?.kind === "cardChoice") {
    const pool = effectChoices(g).filter(c => g.pending?.reason !== "QUICK_REBIRTH" || c.cost <= 7);
    const owner = g.pending.owner ?? g.cur;
    if (g.pending.reason === 'NIGHT_CASTLE_GIFT') {
      const ally=g.players[owner];
      const vampire=ally.field.some(m=>/^VAMP[1-5]$/.test(m.id));
      const protectedAlready=g.players.some(p=>p.enchants.some(e=>e.card.ench==='vampWard')) || ally.hand.some(c=>c.id==='VAMP_WARD');
      return {type:'pick',uid:vampire && !protectedAlready ? 'VAMP_WARD' : 'VAMP_PACT'};
    }
    if (g.pending.reason === 'WORLD_TREE_ATTACK' || g.pending.reason === 'WORLD_TREE_DEFEND') return {type:'pick',uid:(g.players[owner].dew ?? 0)>0?'grow':'pass'};
    if (g.pending.reason === 'HIGH_ELF_HAND') return {type:'pick',uid:[...pool].filter(c=>c.uid!=='done' && !hasPassive(c,'relic')).sort((a,b)=>cardPower(b)-cardPower(a))[0]?.uid ?? 'done'};
    if (g.pending.reason === 'ARMORER_MODE') {const ally=g.players[owner];return {type:'pick',uid:ally.hp+(ally.shield ?? 0)<25||!pool.some(c=>c.uid==='buff')?'shield':'buff'};}
    if (g.pending.reason === 'FIRE_BALL') { const reversed = g.players.some(p => p.enchants.some(e => e.card.ench === 'blackReverse')), heals = g.players.some(p => p.enchants.some(e => e.card.ench === 'spellHeal')); return { type: 'pick', uid: `player-${reversed !== heals ? owner : 1-owner}` }; }
    if (g.pending.reason === 'SELECTED_SWORD') return {type:'pick',uid:[...g.players[owner].field].sort((a,b)=>cardPower(b)-cardPower(a))[0]?.uid??null};
    if (g.pending.reason === 'FIRE_ZONE') return { type: 'pick', uid: [...pool].sort((a,b) => cardPower(a)-cardPower(b))[0]?.uid ?? null };
    const best = [...pool].sort((a, b) => cardPower(b) - cardPower(a))[0] ?? effectChoices(g)[0];
    return { type: "pick", uid: best?.uid ?? null };
  }
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

  const quest = p.hand.findIndex(c => c.t === "quest" && playCost(c, p) <= p.mana && p.traps.length + p.enchants.length + (p.quests?.length ?? 0) < 14);
  if (!g.pending && quest >= 0) return { type: "play", idx: quest };

  // 0) resolve a pending target/pick automatically
  if (g.pending) return autoTarget(g);

  const noAtk = g.players.some((pl) => pl.enchants.some((e) => e.card.ench === "noAttack"));
  const reflected = g.players.some(pl=>pl.enchants.some(e=>e.card.ench==='blackReverse'));
  const damageModified = reflected || g.players.some(pl=>pl.enchants.some(e=>e.card.ench==='spellHeal'||e.card.ench==='blackInfinity'));
  const oppNoLow = o.enchants.some((e) => e.card.ench === "noSummonLow"); // blocks my cost<=3 summons

  const ready = p.field.filter((m) => monsterCanAttack(g, p, m));

  let previews: Map<number,GameState> | undefined;
  const previewPlay = (idx: number): GameState => {
    const cached=previews?.get(idx);if(cached)return cached;
    const next=reduce(g,{type:'play',idx}).state;(previews??=new Map()).set(idx,next);return next;
  };
  const survivesPlay = (idx: number): boolean => {
    const next=previewPlay(idx);
    return next.players[g.cur].hp>0 && (!next.over || next.winner===g.cur);
  };

  // castable(): reject spells that would be refused before paying (avoids the bot
  // re-picking an uncastable card forever) OR that would be self-defeating.
  const castable = (c: CardInst): boolean => {
    if (c.quick || playBlockReason(g, g.cur, c)) return false;
    // Shields, amplification, reflection and healing can change self-damage.
    if (SELF_HARM_SPELLS.has(c.id) && !survivesPlay(p.hand.findIndex(x=>x.uid===c.uid))) return false;
    // 침묵 오라 / 침묵의 심판: 마법 봉인 — v5부터 스타터(컬/상자/어튠)도 대상 (엔진 거부 → 봇도 스킵)
    if (c.t === "spell" || c.t === "starter") {
      if (g.players.some((pl) => pl.field.some((m) => m.aura === "sealAll"))) return false;
      if (sealLowBlocks(g, playCost(c, p))) return false;
      if (p.spellSealTurn) return false;
    }
    if (c.t === "spell" && p.spellCastCap != null && (p.spellsCastTurn || 0) >= p.spellCastCap) return false; // 마족 시너지
    if (blocked?.has(c.uid)) return false; // proven no-op this decision (safety-net retry)
    // 영구마법 중복/존 제약 — 엔진이 지불 전에 거부하는 조건들 (누락 시 무한 재시도)
    if(c.ench==='weakenAll') {
      const lost=(q:PlayerState):number=>q.field.reduce((n,m)=>n+Math.min(2,Math.max(0,effAtk(q,m,g)))*(m.mult??1)
        +(hasPassive(m,'decay')&&effAtk(q,m,g)>0&&effAtk(q,m,g)<=2?3:0),0);
      if(lost(o)<=lost(p))return false;
    }
    if (c.ench === "worldCare" && p.enchants.some((e) => e.card.ench === "worldCare")) return false;
    if (c.ench === "foresight" && p.enchants.some((e) => e.card.ench === "foresight")) return false;
    if (c.ench === "guild" && p.enchants.some((e) => e.card.ench === "guild")) return false; // 상회 중복
    if (c.id === "SLUM" && !p.enchants.some((e) => e.card.ench === "guild")) return false; // 슬럼가: 상회 필요
    if (c.id === "DUNGEON_FLOOR" && o.maxMana < 7) return false; // 던전 최하층: 상대 최대 마나 7+ 필요
    if (c.ench && p.traps.length + p.enchants.length >= ST_MAX) return false;
    if (c.id === "BLOOD_SECRET" && !p.field.some((m) => isVampFamily(m))) return false;
    if (c.id === "CHOSEN_AREA" && cullExiled(p) < 25) return false;
    // v41b 조건부 마법 (엔진이 지불 전에 거부) + 낭비 방지
    if (c.t === "mon" && o.enchants.some((e) => e.card.ench === "spaceLock")) return false;
    if ((c.t === "spell" || c.t === "starter") && o.enchants.some((e) => e.card.ench === "spaceLock")) return false;
    if (c.id === "BEGINNER_MIND" && p.hand.length !== 1) return false;
    if (c.id === "SPACE_RITE" && o.field.length + o.traps.length + o.enchants.length < 6) return false;
    if (c.id === "BUYOUT" && !Object.values(p.buysTurn ?? {}).some((n2) => n2 >= 2)) return false;
    if (c.id === "PACK_INSTINCT" && !p.field.some((m) => p.field.filter((x) => x.id === m.id).length >= 2)) return false;
    if (c.id === "MIND_BURST" && !p.field.some((m) => (m.guts || 0) > 0)) return false;
    if (c.id === "PENANCE" && !(p.brand ?? 0)) return false;
    if (c.id === "ORIGIN_QUEST" && !g.players.some((pl) => pl.field.some((m) => (m.cost ?? 0) === 0) || pl.enchants.some((e) => (e.card.cost ?? 0) === 0))) return false;
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
    if ((c.id === "RUNE2" || c.id === "RUNE3") && !spellDeckHalf(p)) return false; // v34: 덱 절반 마법 조건
    if ((c.id === "DISARM1" || c.id === "DISARM2" || c.id === "DISARM3") && o.enchants.length === 0) return false;
    // don't waste heals at (near) full HP
    // 어튠-마: needs a chest in hand (봉인 중에도 사용 가능 — 상자를 '여는' 게 아니라 소모)
    if (c.act === "chestToMana" && !p.hand.some((h) => h.star === "chest")) return false;
    // 길드 상자: 자해 10 리스크 — 체력 여유 필요
    if (c.id === "GUILD_CHEST" && p.hp <= 12) return false;
    // 안식 계열: "이번 턴 다른 플레이 없음" / "필드 비어있음" 조건
    if (c.id === "MEDITATE" && (p.maxMana > 11 || p.hp >= 40)) return false; // v34
    if (c.id === "HERMIT" && (p.field.length > 0 || (p.uses["HERMIT"] || 0) >= 5)) return false;
    if (c.id === "MULTI_CULTURE" && new Set(p.field.filter((m) => m.tribe).map((m) => m.tribe)).size < 2) return false; // v34
    if (c.id === "GS6_4" && !(o.brand ?? 0)) return false; // 화맥 점화: 상대 낙인 필요
    if (c.id === "S3" && !p.field.some((m) => !m.tribe)) return false; // 칼날의 속삭임: 비종족 대상 필요
    // 폐기 경제 카드: 대상이 있어야 시전
    if (c.act === "exilePick" && p.discard.length === 0) return false;
    if (c.act === 'destroyMon' && !o.field.some(m=>removalHits(g,o,c,m))) return false;
    if (c.act === "destroyMon" && c.cap && !o.field.some((m) => m.cost <= c.cap!)) return false; // 룬 파열: 코스트 캡 대상 필요
    if (c.id === "WALLBREAK1" && ![...o.field, ...p.field].some((m) => effAtk(o, m, g) <= 2)) return false;
    if (c.id === "WALLBREAK2" && !o.field.some((m) => effAtk(o, m, g) <= 2)) return false;
    if (c.id === "SNIPE1" && ![...o.field, ...p.field].some((m) => curHp(o, m) <= 3)) return false;
    if (c.id === "SNIPE2" && !o.field.some((m) => curHp(o, m) <= 2)) return false;
    if (c.id === "GOLIATH_HUNT" && !o.field.some((m) => effDef(o, m) >= 10)) return false;
    if (c.id === "MASSACRE" && o.field.length === 0) return false;
    // Live decisions receive a public-information hypothesis. Hidden starter
    // identities are guesses; the final acceptance guard handles a false target.
    if (c.id === "INQUISITION" && ![...o.field, ...o.discard, ...o.hand, ...o.deck, ...o.traps.map((tr) => tr.card)].some((m) => m.t === "mon" && m.tribe)) return false;
    // blood magic hurts the caster — don't suicide
    if (c.id === "BLOOD2" && o.traps.length + o.enchants.length === 0) return false;
    if (c.id === "BLOOD_SORROW" && p.discard.length === 0) return false;
    if (c.id === "VAMP_PACT" && p.field.length >= 7) return false;
    if (c.id === "INCUBATOR" && !p.field.some((m) => m.hatch != null && m.hatch > 0)) return false;
    if (c.id === "INCUBATOR_S" && !p.field.some((m) => m.hatch != null && m.hatch > 0)) return false;
    if (c.id === "AMBUSH" && o.maxMana !== 4) return false;
    if (c.id === "COUNTERCALC" && (o.maxMana > 7 || o.enchants.length === 0)) return false;
    if ((c.id === "EXPANSION" || c.id === "LAND_GRANT") && !p.field.some((m) => m.id === "CASTLE")) return false; // 성 필요
    if (c.id === "TREASON" && !o.field.some((m) => m.id === "CASTLE")) return false;
    if (c.id === "AEM" && (!p.field.some((m) => isGolem(m)) || new Set([...p.deck, ...p.hand, ...p.discard, ...p.field].filter((x) => x.t === "mon" && isGolem(x)).map((x) => x.id)).size < 2)) return false;
    if ((c.id === "KNIGHT_TEACH" || c.id === "NL_SECRET") && p.field.length === 0) return false;
    if (c.id === "TRUMPET" && p.field.length === 0) return false;
    if(c.id==='MANA_BACKFLOW') return false; // No immediate benefit; its own countdown eventually resets our mana.
    if(c.act==='relicProtection' && !(p.shield??0)) return false;
    if (c.id === "NEGOTIATE") return false; // 봇은 상대 마나를 올려주지 않는다
    // forbidden ritual: needs HP to spare AND a non-시초 tribe monster to duplicate
    if (c.id === "FORBIDDEN" && !p.field.some((m) => m.tribe && m.tribe !== "시초")) return false;
    return true;
  };
  const spells = p.hand.map((c, i) => ({ c, i })).filter((x) => x.c.t === "spell" && playCost(x.c, p) <= p.mana && castable(x.c))
    .map(x => {
      if (!damageModified || !(['S13','FLAME','AMBUSH'].includes(x.c.id)||x.c.act==='siphon')) return {...x,useful:true,faceDamage:undefined as number|undefined};
      // These public permanents change who is hurt, healed or protected.
      // Read the engine outcome on the sampled view, not the printed damage.
      const next=previewPlay(x.i),ally=next.players[g.cur],enemy=next.players[1-g.cur];
      return {...x,faceDamage:Math.max(0,o.hp-enemy.hp),useful:next.over?next.winner===g.cur:ally.hp-p.hp>enemy.hp-o.hp};
    }).filter(x=>x.useful);

  const stFull = p.traps.length + p.enchants.length >= ST_MAX;
  // summonable monsters, best value first (respect the 9-monster zone cap)
  const monsters = p.field.length >= 7 ? [] : p.hand
    .map((c, i) => ({ c, i }))
    .filter((x) => x.c.t === "mon" && playCost(x.c, p) <= p.mana && !(oppNoLow && (x.c.cost ?? 0) <= 3) && !(p.lowSummonBanTurn && (x.c.cost ?? 0) <= 3) && summonReqMet(p, x.c, o) && (p.summonLockUntil ?? 0) <= g.turn)
    .filter((x) => !((x.c.cost ?? 0) >= 5 && p.field.some((m2) => m2.id === "CASTLE"))) // 성: 5코 이상 소환 불가
    .filter(() => !(p.summonCap != null && p.field.length >= p.summonCap)) // 고독의 저주(v38)
    .filter(x=>x.c.onSummon!=='voidApostle'||survivesPlay(x.i))
    .sort((a, b) => cardPower(b.c) - cardPower(a.c));

  // 1) LETHAL: direct spells + attacks (with 관통 penetration) that kill THIS turn.
  //    Cast the guaranteed damage spells first, then swing.
  const plan = facePlan(p, o, ready, spells, noAtk);
  if (plan.total >= o.hp + (o.shield ?? 0)) {
    if (plan.spellIdx !== null) return { type: "play", idx: plan.spellIdx };
    if (plan.attackUid && p.field.some(m => m.uid === plan.attackUid && monsterCanAttack(g, p, m))) return { type: "attack", uid: plan.attackUid };
  }

  // 1.5) removal-lethal: if clearing the biggest blocker makes the swing lethal, do it now
  const removal = spells.find((x) => (x.c.act === "destroyMon" || x.c.act === "weaken") && o.field.length > 0);
  if (removal && removal.c.act === "destroyMon" && !noAtk && o.field.length > 0) {
    const big = [...o.field].sort((a, b) => (effAtk(o, b, g) + b.def!) - (effAtk(o, a, g) + a.def!))[0]; // autoTarget picks this one
    const after = facePlan(p, o, ready, spells.filter((x) => x.i !== removal.i), noAtk, big.uid);
    if (after.total >= o.hp + (o.shield ?? 0)) return { type: "play", idx: removal.i };
  }

  // 2) break traps BEFORE summoning/attacking (pitfall kills summons, counters kill attackers)
  const trapbreak = spells.find((x) => x.c.act === "destroyTrap" && o.traps.length > 0);
  if (trapbreak && (monsters.length > 0 || ready.length > 0)) return { type: "play", idx: trapbreak.i };

  // Use acquired enchantment answers. Previously DISARM1/2 were never
  // selected by rollout policy, so search undervalued even a good tech buy.
  const enchantRemoval = spells.find(({c}) => c.act === 'destroyEnch' || c.id === 'DISARM3');
  if (enchantRemoval && o.enchants.length) return {type:'play',idx:enchantRemoval.i};

  // A recurring removal can consume the entire budget forever. Grow past
  // that maintenance cost instead of repeatedly answering and never improving.
  const growth=p.hand.findIndex(c=>c.star==='mana' && castable(c) && playCost(c,p)<=p.mana);
  if(growth>=0 && p.maxMana<Math.max(5,Math.min(10,o.maxMana+1))
    && (p.field.length>=2 || o.field.length===0)) return {type:'play',idx:growth};

  // Preserve the setup mana that a summon-first rollout used to spend.
  // Suppression matters when it removes substantially more enemy pressure.
  const suppress = spells.find(({c})=>c.ench==='weakenAll');
  if (suppress) {
    const lost = (owner: PlayerState): number => owner.field.reduce((n,m)=>n+Math.min(2,Math.max(0,effAtk(owner,m,g)))*(m.mult??1),0);
    const pressure = o.field.reduce((n,m)=>n+Math.max(0,effAtk(o,m,g))*(m.mult??1),0);
    if (lost(o)>lost(p)+3 && pressure>=Math.max(6,p.hp/4)) return {type:'play',idx:suppress.i};
  }
  const unlockAttacks = spells.find(({c})=>c.id==='COUNTERCALC');
  if (unlockAttacks && p.field.length && o.enchants.some(e=>e.card.ench==='weakenAll'||e.card.ench==='noAttack')) return {type:'play',idx:unlockAttacks.i};
  const riftSetup = spells.find(({c})=>c.ench==='rift');
  if (riftSetup && p.hand.filter(c=>c.star==='trash'&&playCost(c,p)===0).length>=2) return {type:'play',idx:riftSetup.i};

  // 3) removal on a blocker (clear the way before swinging)
  if (removal) return { type: "play", idx: removal.i };

  // Remove sustained recovery / shield before spending mana on chip attackers.
  const counter = spells.find(({c}) => (c.act === 'desertification' && (o.dew ?? 0) >= 2)
    || (c.act === 'armorBreak' && (o.shield ?? 0) >= 3)
    || (c.act === 'spearShield' && (o.shield ?? 0) > 0 && (o.shield ?? 0) < p.field.reduce((n,m) => n + Math.max(0,effAtk(p,m,g)),0)));
  if (counter) return {type:'play',idx:counter.i};

  // Break a stalled attack plan before spending the turn on more low-ATK bodies.
  // This also supplies a realistic continuation to both sides of the search.
  const matchup=matchupPlan(g,p,publicInventory(o));
  if (matchup.blocked || matchup.walls.length) {
    const advance=spells.find(({c})=>c.id==='ADVANCE'||c.act==='buffAllTurn'||c.act==='buffPerm');
    if (advance && p.field.length>=2) return {type:'play',idx:advance.i};
    const ramp=p.hand.findIndex(c=>c.star==='mana' && castable(c) && playCost(c,p)<=p.mana);
    if (ramp>=0) return {type:'play',idx:ramp};
    const evaluate=purchaseEvaluator(g,p,T);
    const needsAnswer=!matchup.own.some(c=>(c.act==='destroyEnch'&&o.enchants.length)
      || c.id==='ADVANCE' || matchup.walls.some(m=>removalHits(g,o,c,m)));
    // Preserve the price of the first way out; purchases enter the discard,
    // so immediate lethal/blocking moves above still take precedence.
    if (needsAnswer && (p.field.length>=2 || !monsters.length || monsters.every(({c})=>enteringAttack(g,p,c)<=2))) {
      let best: Action|undefined, margin=0;
      for (const [pool,type] of [[g.market,'buyMarket'],[p.supply,'buySupply']] as const) pool.forEach((c,i)=>{
        if (!c || !buyableByBot(p,c,g)) return;
        const answer=(matchup.blocked && (c.act==='destroyEnch'||c.id==='DISARM3'||c.id==='ADVANCE'))
          || matchup.walls.some(m=>removalHits(g,o,c,m));
        if (!answer) return;
        const v=evaluate(c,type==='buyMarket'?i:undefined).margin;
        if(v>margin){margin=v;best={type,i};}
      });
      if(best)return best;
    }
  }

  // 4) develop board — summon the strongest affordable monster
  const development=monsters.find(({c})=>!matchup.blocked || enteringAttack(g,p,c)>0
    || c.onSummon || c.turnFx || c.aura || p.field.length<2);
  if (development) return { type: "play", idx: development.i };

  // 5) buffs — only when there is a ready attacker to benefit
  const buff = spells.find((x) =>
    ((x.c.act === "buffPerm" || x.c.act === "buffAllDef") && p.field.length > 0) ||
    ((x.c.act === "buffTurn" || x.c.act === "buffAllTurn") && ready.length > 0) ||
    (x.c.id === "TRUMPET" && ready.length > 0)); // 지원 나팔: 공격 직전 몬스터 2체 +1
  if (buff) return { type: "play", idx: buff.i };

  // 6) Use current-HP combat: chip damage persists and can set up the next attacker.
  if (!noAtk) {
    const canSwing = (m: FieldMon): boolean => monsterCanAttack(g, p, m);
    const eliteWall = o.field.some((tm) => tm.aura === "eliteGuard");
    const assassin = ready.find((m) => m.directOnly && canSwing(m) && !p.noDirectTurn && !reflected && !eliteWall);
    if (assassin) return { type: "attack", uid: assassin.uid };
    for (const m of [...ready].filter((m2) => canSwing(m2) && !m2.directOnly).sort((a, b) => effAtk(p, b, g) - effAtk(p, a, g))) {
      if (o.field.length === 0) { if (p.noDirectTurn || reflected || eliteWall) break; return { type: "attack", uid: m.uid }; } // 천궁의 폐문 / 귀족 영주
      const a = effAtk(p, m, g);
      if (a > 0 && o.field.some((tm) => !(tm.aura === "eliteGuard" && (m.cost ?? 0) <= 6) && (!reflected || reflectedOverflow(m,tm,a,curHp(o,tm)) < p.hp+(p.shield??0)))) return { type: "attack", uid: m.uid };
    }
  }

  // 7) trap-break / wipe / direct damage
  if (trapbreak) return { type: "play", idx: trapbreak.i };
  // 블러드 샤워: 상대 영구마법·세트 함정 제거 (castable가 대상 존재·자해 리스크를 게이트)
  const shower = spells.find((x) => x.c.id === "BLOOD2");
  if (shower) return { type: "play", idx: shower.i };
  const wipe = spells.find((x) => x.c.act === "wipeBack" && p.field.length === 0 && (o.traps.length + o.enchants.length) > 0);
  if (wipe) return { type: "play", idx: wipe.i };
  // 역산: 상대 영구마법 파괴 (castable가 상대 최대 마나<=7 & 영구마법 존재를 보장)
  const disenchant = spells.find((x) => x.c.id === "COUNTERCALC");
  if (disenchant) return { type: "play", idx: disenchant.i };
  // 직접 데미지 마법 + 불꽃/기습 번 (castable가 자해 리스크를 게이트)
  const direct = spells.find((x) => x.c.act === "dmg" || x.c.act === "siphon" || burnDmg(x.c, p, o) > 0);
  if (direct) return { type: "play", idx: direct.i };
  // The Night Castle reward must be usable after the bot chooses the Pact.
  const vampirePact = spells.find(({c}) => c.id === 'VAMP_PACT');
  if (vampirePact) return {type:'play',idx:vampirePact.i};

  // Expansion spells participate in normal bot play; conditions come from the shared engine.
  const expanded = spells.find(({c}) => c.act === 'expansion' && !c.ench && c.id !== 'BLACK_NOVA'
    && !(c.id === 'ANESTHESIA' && !ready.length)
    && !(['EARTHQUAKE','MAGMA_RAIN'].includes(c.id) && o.field.length <= p.field.length)
    && !(c.id === 'FIRE_BALL' && p.hp <= 2) && !(c.id === 'FIRE_ARROW' && p.hp <= 1));
  if (expanded) return { type: 'play', idx: expanded.i };

  // 8) utility spells (draw / ramp / disruption)
  const util = spells.find((x) => x.c.id === "CATALYST" || ["draw", "seek", "crash", "exile", "recall", "heal", "manaUp", "manaDown", "manaUpGain", "chestToMana"].includes(x.c.act || ""));
  if (util) return { type: "play", idx: util.i };
  const sustain = spells.find(({c}) => c.act === 'apple' || c.act === 'relicProtection' || c.act === 'dew' || c.act === 'golemShield' || c.act === 'cullShield');
  if (sustain) return {type:'play',idx:sustain.i};

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

  // Compare the marginal value of one purchase, including build, public
  // matchup, cast conditions, cycle delay and the last shared-market copy.
  const purchase = purchaseEvaluator(g, p, T);
  let purchaseAction: Action | undefined, purchaseMargin = 0;
  p.supply.forEach((c, i) => { if (c && buyableByBot(p,c,g)) {
    const margin = purchase(c).margin;
    if (margin > purchaseMargin) { purchaseMargin = margin; purchaseAction = {type:'buySupply',i}; }
  } });
  g.market.forEach((c, i) => { if (buyableByBot(p,c,g)) {
    const margin = purchase(c,i).margin;
    if (margin > purchaseMargin) { purchaseMargin = margin; purchaseAction = {type:'buyMarket',i}; }
  } });
  if (purchaseAction) return purchaseAction;

  // Spend spare mana on a refresh only when the affordable offer pool has
  // enough expected value. Public refresh history bounds repeated searches.
  const refreshes = (p.supplyHist ?? []).filter(h=>h.turn===g.turn).length;
  if (p.mana >= 3 && refreshes <= TUNE.maxRerolls && refreshValue(g,p,T) > 2) return {type:'refresh'};
  // 12.6) 렐릭 헌터 카운터: 살 게 없으면 무료 갱신
  if ((p.refreshTokens || 0) > 0 && !p.refreshBlockTurn) return { type: "refresh" };

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
function facePlan(p: PlayerState, o: PlayerState, ready: FieldMon[], spells: { c: CardInst; i: number; faceDamage?: number }[], noAtk: boolean, withoutUid?: string): FacePlan {
  const g: Pick<GameState, "players"> = { players: [p, { ...o, field: o.field.filter(m => m.uid !== withoutUid) }] };
  let total = 0;
  let spellIdx: number | null = null;
  let manaLeft = p.mana;
  const dmg = spells
    .map((x) => ({ i: x.i, cost: playCost(x.c, p), d: x.faceDamage ?? ((x.c.act === "dmg" || x.c.act === "siphon") ? (['S1','GS8_0','TIMEWARP','GAMBLE'].includes(x.c.id) ? 0 : x.c.val || 0) : burnDmg(x.c, p, o)) }))
    .filter((x) => x.d > 0)
    .sort((a, b) => b.d - a.d);
  for (const s of dmg) {
    if (s.cost <= manaLeft) { manaLeft -= s.cost; total += s.d; if (spellIdx === null) spellIdx = s.i; }
  }
  let attackUid: string | null = null;
  if (!noAtk && ![p,o].some(pl=>pl.enchants.some(e=>e.card.ench==='blackReverse'))) {
    // 유리 병기 금지령: 방어 1 이하는 공격 자체가 불가 → 리썰 계산에서 제외
    const ban = [p, o].some((pl) => pl.enchants.some((e) => e.card.ench === "glassBan"));
    const defs = o.field.filter((m) => m.uid !== withoutUid)
      .map((m) => ({ hp: curHp(o, m), elite: m.aura === "eliteGuard" }))
      .sort((a, b) => b.hp - a.hp); // toughest first
    for (const m of [...ready].sort((a, b) => effAtk(p, b, g) - effAtk(p, a, g))) {
      const a = effAtk(p, m, g);
      if (a <= 0) continue;
      if (ban && Math.abs(effAtk(p, m, g) - effDef(p, m)) >= 4) continue;
      if (m.directOnly || defs.length === 0) {
        if (p.noDirectTurn || o.field.some((tm) => tm.aura === "eliteGuard")) continue; // 폐문/귀족 영주 — 리썰 계산 제외
        total += a; if (!attackUid) attackUid = m.uid; continue;
      }
      // 귀족 영주(eliteGuard)는 코스트 6 이하 공격자가 칠 수 없다 — 리썰 후보에서 제외
      const k = defs.findIndex((d) => a > d.hp && !(d.elite && (m.cost ?? 0) <= 6));
      if (k >= 0) { total += a - defs[k].hp; defs.splice(k, 1); if (!attackUid) attackUid = m.uid; }
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
    if (playCost(c, p) <= p.mana) {
      if (c.act === "dmg" || c.act === "siphon") ceiling += c.val || 0;
      else if (c.act === "buffTurn" || c.act === "buffAllTurn" || c.act === "buffPerm") ceiling += (c.val || 0) * Math.max(1, p.field.length);
      else if (c.t === "mon") ceiling += c.atk || 0;
      else if (c.act === "destroyTrap" || c.act === "destroyMon" || c.act === "weaken" || c.act === "draw" || c.act === "seek" || c.act === "recall") ceiling += 4;
    }
  }
  for (const m of p.field) if (!m.exhausted) ceiling += Math.max(0, effAtk(p, m, g));
  return ceiling >= o.hp;
}

function lethalActions(g: GameState): Action[] {
  const p = g.players[g.cur];
  const o = g.players[1 - g.cur];
  const out: Action[] = [];
  const add = (a: Action) => out.push(a);

  if (g.pending) {
    if (g.pending.kind === "cardChoice") return effectChoices(g).map(c => ({ type: "pick", uid: c.uid }));
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
      const zpool = purgeChoices(p, pend);
      uniqueCards(zpool, (a, b) => cardPower(a) - cardPower(b)).forEach((c) => add(pick(c.uid)));
      if (pend.allowCancel) add(pick(null));
    }
    return out.slice(0, 18);
  }

  const playable = p.hand
    .map((c, idx) => ({ c, idx }))
    .filter(({ c }) => !playBlockReason(g, g.cur, c))
    .sort((a, b) => lethalPlayPriority(b.c) - lethalPlayPriority(a.c));
  playable.forEach(({ idx }) => add({ type: "play", idx }));

  const noAtk = g.players.some((pl) => pl.enchants.some((e) => e.card.ench === "noAttack"));
  // Set traps are hidden information. Unless the search first removes them, do
  // not prove a lethal line by peeking at what the trap actually is.
  if (!noAtk && o.traps.length === 0) {
    [...p.field]
      .filter((m) => monsterCanAttack(g, p, m))
      .sort((a, b) => effAtk(p, b, g) - effAtk(p, a, g))
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
  if (a.type === "chooseTarget" || a.type === "pick") return actionChangesState(before, after);
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
  const evaluate=purchaseEvaluator(g,p);
  const usable=(c:CardInst):number=>{const v=evaluate(c);return Math.max(0,v.base+v.synergy+v.matchup+v.readiness);};
  const bestUsable=(pool:CardInst[])=>[...pool].sort((a,b)=>usable(b)-usable(a))[0];

  if (pending.kind === "oppMon") {
    if (pending.reason === "attack") {
      const att = p.field.find((m) => m.uid === (pending.data!.attackerUid as string));
      const a = att ? effAtk(p, att, g) : 0;
      // among killable targets, take out the biggest THREAT (atk-weighted), not just the softest
      // 알은 부화 임박도(진행도)를 위협으로 환산 — 부화 직전 알은 최우선으로 깬다
      const threat = (tm: FieldMon): number =>
        tm.hatch != null ? Math.max(0, (tm.hatchTurns ?? 8) - tm.hatch) * 4 * (tm.id === "BEAST_EGG" ? 1.4 : 1)
        : effAtk(o, tm, g) * 2 + effDef(o, tm) + recoveryEngine(tm) * 2;
      const reflected = [p,o].some(pl=>pl.enchants.some(e=>e.card.ench==='blackReverse'));
      const legal = (tm: FieldMon): boolean => !(tm.aura === "eliteGuard" && (att?.cost ?? 0) <= 6) && (!reflected || !att || reflectedOverflow(att,tm,a,curHp(o,tm)) < p.hp+(p.shield??0)); // 귀족 영주
      const killable = o.field
        .filter(legal)
        .filter((tm) => (a >= curHp(o, tm) && !(tm.guts??0)) || tm.hatch != null || (att && hasPassive(att,'decay') && (tm.decayCnt ?? 0) + (att.id==='POISON_MASTER'?3:1) >= 3))
        .sort((x, y) => (threat(y)-(reflected&&att?reflectedOverflow(att,y,a,curHp(o,y))*2:0)) - (threat(x)-(reflected&&att?reflectedOverflow(att,x,a,curHp(o,x))*2:0)));
      const target = killable[0] ?? lowestDef(o, o.field.filter(legal));
      return { type: "chooseTarget", uid: target ? target.uid : null };
    }
    if (pending.reason === "decayMark") { // 러스트캡 슬러그: 알·아우라 제외, 가장 위협적인 몬스터에 카운터
      const t0 = [...o.field].filter((m) => m.hatch == null && !hasPassive(m, "aura"))
        .sort((a, b) => (effAtk(o, b, g) + b.def!) - (effAtk(o, a, g) + a.def!))[0];
      return { type: "chooseTarget", uid: t0 ? t0.uid : null };
    }
    // destroy / debuff → hit the most valuable enemy monster (아우라 몬스터는 대상 불가 · 룬 파열 코스트 캡 준수)
    const mc0 = pending.data?.maxCost as number | undefined; // destroyMon/bounceLow 등 코스트 캡 공통
    const targetValue = (m: FieldMon): number => effAtk(o, m, g) + curHp(o, m) + recoveryEngine(m) * 2;
    const t = [...o.field].filter((m) => !hasPassive(m, "aura") && (mc0 == null || m.cost <= mc0)).sort((a, b) => targetValue(b) - targetValue(a))[0];
    if (t) return { type: "chooseTarget", uid: t.uid };
    // anySide 파괴에서 적 대상이 없고 취소도 불가능하면(포식 등) 자기 최저가치 몬스터로 해소 (봇 무한 pending 방지)
    if ((pending.data?.anySide as boolean | undefined) && !pending.allowCancel) {
      const own = [...p.field].filter((m) => mc0 == null || m.cost <= mc0).sort((a, b) => (effAtk(p, a, g) + (a.def || 0)) - (effAtk(p, b, g) + (b.def || 0)))[0];
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
      const v = [...p.field].filter((m) => isVampFamily(m)).sort((a, b) => (effAtk(p, a, g) + effDef(p, a)) - (effAtk(p, b, g) + effDef(p, b)))[0];
      return { type: "chooseTarget", uid: v ? v.uid : null };
    }
    if (pending.reason === "chosenMage") { // 선택받은 마법사: 미발동 마법사가 있으면 발동 (6뎀 이득)
      const fired = (pending.data?.fired as string[] | undefined) ?? [];
      const mage = p.field.find((m) => m.id === "CHOSEN_MAGE" && !fired.includes(m.uid));
      return { type: "chooseTarget", uid: mage ? mage.uid : null };
    }
    if (pending.reason === "grantDecay") { // 암기 제작: 부패가 없는 몬스터 중 공격력 높은 순
      const t0 = [...p.field].filter((m) => !hasPassive(m, "decay")).sort((x, y) => effAtk(p, y, g) - effAtk(p, x, g))[0];
      return { type: "chooseTarget", uid: t0 ? t0.uid : null };
    }
    if (pending.reason === "grantMajesty") { // 각인 비술: 위엄이 없는 몬스터 중 방어 높은 순 (오래 버틸 몸)
      const t0 = [...p.field].filter((m) => !hasPassive(m, "majesty")).sort((x, y) => effDef(p, y) - effDef(p, x))[0];
      return { type: "chooseTarget", uid: t0 ? t0.uid : null };
    }
    if (pending.reason === "golemBuff") { // 앤티크 인핸스 매직: 공격력 높은 골램부터
      const excl = (pending.data?.excl as string[] | undefined) ?? [];
      const t0 = [...p.field].filter((m) => isGolem(m) && !excl.includes(m.uid)).sort((x, y) => effAtk(p, y, g) - effAtk(p, x, g))[0];
      return { type: "chooseTarget", uid: t0 ? t0.uid : null };
    }
    if (pending.reason === "nlTarget") { // 나이트로드의 비기: 가장 강한 암살자(없으면 최강 몬스터)
      const t0 = ([...p.field].filter((m) => isAssassinCard(m)).sort((x, y) => effAtk(p, y, g) - effAtk(p, x, g))[0]) ?? [...p.field].sort((x, y) => effAtk(p, y, g) - effAtk(p, x, g))[0];
      return { type: "chooseTarget", uid: t0 ? t0.uid : null };
    }
    if (pending.reason === "emberBuff") { // 시초의 불씨: 다른 시초 몬스터 중 공격력 높은 순
      const excl = (pending.data?.excl as string[] | undefined) ?? [];
      const t0 = [...p.field].filter((m) => m.tribe === "시초" && !excl.includes(m.uid)).sort((x, y) => effAtk(p, y, g) - effAtk(p, x, g))[0];
      return { type: "chooseTarget", uid: t0 ? t0.uid : null };
    }
    // 지원 나팔의 exclude(중복 선택 불가)를 지켜야 무한 재무장 루프에 안 빠진다
    const excl = (pending.data?.excl as string[] | undefined) ?? [];
    const t = [...p.field].filter((x) => !excl.includes(x.uid)).sort((x, y) => effAtk(p, y, g) - effAtk(p, x, g))[0];
    return { type: "chooseTarget", uid: t ? t.uid : null };
  }
  if (pending.kind === "seek") {
    const best = bestUsable(p.deck);
    return { type: "pick", uid: best ? best.uid : (p.deck[0]?.uid ?? null) };
  }
  if (pending.kind === "purge") { // 덱·묘지(또는 패)에서 제외: 저가치부터, 살릴 가치가 있으면 종료
    const discOnly = pending.data?.zone === "discard"; // 시련의 영역: 묘지에서만 — 컬 우선 제외 (선택받은 시리즈 연료)
    const pool = purgeChoices(p, pending).sort((a, b) => usable(a) - usable(b));
    if (pending.reason === "handCap" || pending.reason === "scrapper") { // mandatory choice: 턴 종료 손패 이월 — 반드시 val장 버린다: 가장 가치 낮은 카드부터
      const worst0 = pool[0] ?? p.hand[p.hand.length - 1];
      return { type: "pick", uid: worst0 ? worst0.uid : null };
    }
    if (discOnly) {
      const cull = pool.find((c) => c.star === "trash");
      if (cull) return { type: "pick", uid: cull.uid };
    }
    const worst = pool[0];
    if (worst && usable(worst) < 8) return { type: "pick", uid: worst.uid };
    return { type: "pick", uid: null };
  }
  if (pending.kind === "recall") {
    if (pending.reason === "exilePick") { // 게임에서 제외 → 가장 쓸모없는 카드
      const worst = [...p.discard].sort((a, b) => cardPower(a) - cardPower(b))[0];
      return { type: "pick", uid: worst ? worst.uid : (p.discard[0]?.uid ?? null) };
    }
    const best = bestUsable(p.discard.filter(c => c.uid !== pending.data?.exclude));
    return { type: "pick", uid: best ? best.uid : (p.discard[0]?.uid ?? null) };
  }
  if (pending.kind === "reroll") return { type: "pick", uid: null }; // 수레바퀴: 봇은 결과 유지
  if (pending.kind === "giantShop") {
    if (pending.reason === "civChoice") { // 고대 문명: 무료 — 신수의 알(상위 페이오프) 우선
      const ids0 = (pending.data?.ids as string[] | undefined) ?? [];
      return { type: "pick", uid: ids0.includes("BEAST_EGG") ? "BEAST_EGG" : (ids0[0] ?? null) };
    }
    if (pending.reason === "gamblerGuess") return { type: "pick", uid: "3" }; // Any face is equiprobable; never read the live dice RNG.
    if (pending.reason === "gamblerPick") { // 도박꾼 효과: 상대 카드 2장+ → ③, 최대 마나 12 미만 → ①, 그 외 ②
      const oc = o.field.length + o.traps.length + o.enchants.length;
      return { type: "pick", uid: oc >= 2 ? "3" : p.maxMana < 12 ? "1" : "2" };
    }
    if (pending.reason === "dragonFuse") return { type: "pick", uid: "ANTIQUE_DK" };
    if (pending.reason === "samsaraPick") { // 윤회(v41b): 가장 가치 높은 몬스터
      const ids0 = (pending.data?.ids as string[] | undefined) ?? [];
      const best0 = [...ids0].sort((a, b) => cardPower(DB[b]) - cardPower(DB[a]))[0];
      return { type: "pick", uid: best0 ?? null };
    }
    if (pending.reason === "colosseumPick") { // 콜로세움(v41): 컬 2장당 공격력 +2 → 궁수(암습·회피) 우선
      const ids0 = (pending.data?.ids as string[] | undefined) ?? [];
      return { type: "pick", uid: ids0.includes("CHOSEN_ARCHER") ? "CHOSEN_ARCHER" : (ids0[0] ?? null) };
    }
    if (pending.reason === "nlGrant") return { type: "pick", uid: "evade" };
    if (pending.reason === "landGrant") { // 영토 하사: 가장 비싼 귀족 카드
      const ids0 = (pending.data?.ids as string[] | undefined) ?? [];
      const best0 = [...ids0].sort((a, b) => ((DB[b]?.cost ?? 0) - (DB[a]?.cost ?? 0)))[0];
      return { type: "pick", uid: best0 ?? null };
    }
    if (pending.reason === "exileOppDeck") { // 은월포: 상대 덱에서 가장 비싼 카드를 제외
      const ids0 = (pending.data?.ids as string[] | undefined) ?? [];
      const best0 = [...ids0].sort((a, b) => ((DB[b]?.cost ?? 0) - (DB[a]?.cost ?? 0)))[0];
      return { type: "pick", uid: best0 ?? null };
    }
    // 시초의 거인 교역 / 기록자 / 나이트 마켓: 살 수 있는 카드 중 가장 가치 높은 것 (구매 하한 미달이면 취소)
    const ids = ((pending.data?.ids as string[] | undefined) ?? []).filter((id) => DB[id] && DB[id].cost <= p.mana && purchaseAllowed(g, p, { ...DB[id], uid: id }));
    const best = ids.sort((a, b) => (cardPower(DB[b]) - DB[b].cost) - (cardPower(DB[a]) - DB[a].cost))[0];
    if (best && pending.reason !== "giantShop" && pending.reason !== "darkMarket" && cardPower(DB[best]) - DB[best].cost < TUNE.minBuy) return { type: "pick", uid: null };
    return { type: "pick", uid: best ?? null };
  }
  if (pending.kind === "oppRmz") { // 흑룡: 상대 묘지 오염 — 가치가 낮은 카드(컬 등)를 되돌린다 · 유폐자: 컬(선택받은 연료) 우선
    const pool = [...(o.removed ?? [])];
    if (pending.reason === "jailer") { const cull = pool.find((c) => c.star === "trash"); const pick = cull ?? pool.sort((a, b) => cardPower(b) - cardPower(a))[0]; return { type: "pick", uid: pick ? pick.uid : null }; }
    const worst = pool.sort((a, b) => cardPower(a) - cardPower(b))[0];
    return { type: "pick", uid: worst ? worst.uid : null };
  }
  if (pending.kind === "oppBoard") { // 파괴 선택: 가장 위협적인 적 몬스터 → 적 함정 → 적 영구마법 순 (봇은 자기 카드를 부수지 않는다 — 없으면 취소)
    const d0 = (pending.data || {}) as { noMon?: boolean; trapOnly?: boolean; enchOnly?: boolean };
    const wantMon = !d0.noMon && !d0.trapOnly && !d0.enchOnly;
    const wantTrap = !d0.enchOnly;
    const wantEnch = !d0.trapOnly;
    const best = wantMon ? [...o.field].filter((m) => !hasPassive(m, "aura"))
      .sort((a, b) => (effAtk(o, b, g) + (b.def || 0)) - (effAtk(o, a, g) + (a.def || 0)))[0] : undefined;
    const uid = best?.uid ?? (wantTrap ? o.traps[0]?.card.uid : undefined) ?? (wantEnch ? o.enchants[0]?.card.uid : undefined) ?? null;
    return { type: "pick", uid };
  }
  return { type: "chooseTarget", uid: null };
}

function lowestDef(p: PlayerState, field: FieldMon[]): FieldMon | undefined {
  return [...field].sort((a, b) => curHp(p, a) - curHp(p, b))[0];
}
