// ============================================================
// LORE — effect-aware card valuation.
//
// The old heuristic (engine.cardValue) scored every spell as
// `6 + val*0.6 + cost*0.6` and every trap as `6 + val*0.5 + cost*0.5`,
// never reading the effect. Measured over 120k self-play games that
// produced 88 distinct scores across 119 monsters but only 21 across
// 129 spells — and since the highest trap score (16.5) sat below the
// bot's buy floor (17), the bot bought ZERO of the 42 traps, ever.
//
// cardPower() reads the actual effect keys instead. Everything is
// denominated in "damage-equivalent points" (1 pt ≈ 1 point of face
// damage) so monsters, spells and traps land on one comparable scale.
//
// This is the bot's heuristic, NOT a balance verdict: card rankings
// come from measured A/B win-rate deltas, not from these numbers.
// ============================================================
import type { CardDef } from "./types";
import { DB, cardPassives } from "./cards";

// ---- exchange rates (points per unit) ----
const DRAW = 3.0;    // a drawn card
const HEAL = 0.55;   // 1 HP healed (worth less than 1 damage dealt)
const MANA = 5.5;    // +1 max mana — compounds every later turn (top eval feature)
const MAXHP = 0.45;  // +1 max HP
const KILL = 10;     // destroying an average blocker
const NEGATE = 7;    // negating one attack
const FIELD_TURNS = 4.5; // turns a summoned monster is expected to survive
const ENCH_TURNS = 7;    // turns a persistent enchant is expected to pay out

const n = (x: number | undefined, d = 0): number => (typeof x === "number" ? x : d);

// ---- one-shot spell actions (act) ----
function actValue(c: CardDef): number {
  const v = n(c.val), v2 = n(c.val2);
  switch (c.act) {
    case "dmg": return v + v2 * DRAW;
    case "draw": return v * DRAW;
    case "heal": return v * HEAL + v2 * DRAW;
    case "siphon": return v + v2 * HEAL;
    case "destroyMon": return KILL;
    case "destroyTrap": return 4;
    case "destroyEnch": return 4;
    case "buffTurn": return v * 1.1;
    case "buffAllTurn": return v * 1.1 * 2.2;   // hits the whole board
    case "buffPerm": return v * 2.4;            // sticks for the rest of the game
    case "manaUp": return MANA * 2;
    case "manaUpGain": return MANA * 1.2;
    case "manaDown": return MANA * 0.8;
    case "seek": return 5;                      // tutor: a drawn card you get to choose
    case "recall": return 3.5;
    case "exilePick": return 2.5;
    case "crash": return 2;
    case "chestToMana": return MANA * 0.6;
    case "incubate": return v * 1.6;
    case "wipeBack": return 8;
    case "maxHpUp": return v * 0.9 + v2 * DRAW;   // 최대 체력은 회복 겸 성장
    default: return c.act ? 5 : 0;
  }
}

// ---- summon-triggered effects (onSummon) — one shot ----
const SUMMON_FLAT: Record<string, number> = {
  preyBounce: 4, preyExec: 6, soloLock: -3, hermitBuff: 3, gravePure: 4, manaDebt5: -2, manaSet4: -5,
  guildCnt: 5, // 상회 카운터 가속 (상회가 없으면 불발이지만 봇 덱 시너지 기준)
  refresh: 3, breaktrap: 4, parity: 4, cullTitan: 5, worldGuard: 6, halfElf: 6,
  eggMaster: 6, decayMark: 6, hordeBuff: 6, eliteBuff: 6, trapsmithBuff: 6,
  summonKnight: 8, summonRandom: 8, cloneSelf: 8, golemKing: 8,
  mimicLord: 8, mimicKing: 8, mimicKing2: 8, awakenMimic: 8, originMimic: 8,
  wipeTraps: 6, elderKing: 10, creator: 15,
};
function summonValue(c: CardDef): number {
  const v = n(c.val);
  switch (c.onSummon) {
    case undefined: return 0;
    case "draw": return v * DRAW;
    case "heal": return v * HEAL;
    case "burn": case "smite": return v;
    case "selfBurn": return -v * 0.6;           // self-damage is a real cost
    case "defDown": case "atkDown": return v * 1.1;
    case "maxHpUp": return v * MAXHP;
    case "maxHpMana": return MANA + v * MAXHP;
    case "drakeRamp": return MANA + v;
    case "burnBleed": return v + 4;
    case "burnBreak2": return v + 6;
    case "breaktrapDraw": return 4 + DRAW;
    case "guardianDraw": case "giantDraw": return DRAW * 2;
    default: return SUMMON_FLAT[c.onSummon] ?? 5;
  }
}

// ---- per-turn effects while the monster sits on the field ----
function turnFxValue(c: CardDef): number {
  const v = n(c.val), v2 = n(c.val2);
  let perTurn = 0;
  switch (c.turnFx) {
    case undefined: return 0;
    case "growAtk": perTurn = v * 1.7 * 0.5; break;   // accumulating buff → half credit
    case "growDef": perTurn = v * 1.0 * 0.5; break;
    case "turnBurn": perTurn = v; break;
    case "turnHeal": perTurn = v * HEAL; break;
    case "payDefHeal": perTurn = v * 0.5 + v2 * HEAL; break;
    case "chestDraw": perTurn = v2 * DRAW * 0.5; break; // needs a chest in hand
    case "gambler": perTurn = 0.5 * (MANA + 5 * MAXHP); break;
    case "legendGambler": perTurn = 2.0 * MANA; break;
    default: perTurn = 2; break;
  }
  return perTurn * FIELD_TURNS;
}

// ---- static auras (while on the field) ----
function auraValue(c: CardDef): number {
  const v = n(c.val);
  switch (c.aura) {
    case undefined: return 0;
    case "mana1": return MANA;
    case "mana2": return MANA * 2;
    case "ward": return 0;                       // egg bodies are valued separately
    case "summonBuff": return v * 1.7 * 3;
    case "wallDef": return v * 1.0 * 2.5;
    case "discardBreak": return 4;
    case "drainMana": return MANA * v * 0.8;
    case "sealLow": return 6;
    case "sealAll": return 10;
    case "originLord": return 12;
    case "eggHunter": return 3;
    case "vampButler": return 6;
    case "assassinGuild": return 8;
    // ---- v32 종족 리워크 ----
    case "devourGrow": return 5;   // 전투 킬마다 영구 성장
    case "scavenger": return 7;    // 상대 몬스터 사망시 33%로 복제
    case "pageDraw": return DRAW * 2.2; // 매턴 +1 드로우
    case "lowAtkBan": return 4;
    case "trapBan": return 4;
    case "eliteGuard": return 8;   // 직접 공격 봉쇄 + 6코 이하 도발 벽
    case "demonTax2": return -MANA * 1.6; // 몸집 대가: 최대 마나 -2
    default: return 4;
  }
}

// ---- attack-triggered effects ----
function attackFxValue(c: CardDef): number {
  switch (c.attackFx) {
    case undefined: return 0;
    case "rampFace": return 2 * 1.7 * 2.5;       // +2/+2 per face hit, compounding
    case "cullOnFace": return 3;
    case "atkDownOnAttack": return -n(c.val) * 1.7; // self-debuff: a real cost
    default: return 3;
  }
}

// ---- traps (react) — reactive, but a negate+kill is huge tempo ----
const REACT: Record<string, (c: CardDef) => number> = {
  counter: () => KILL,
  counterFull: () => KILL + 3,
  devour: (c) => KILL + n(c.val) * HEAL,
  judgment: (c) => KILL + n(c.val),
  slaughterHeal: () => KILL + 2,
  slaughterRaise: () => KILL + 8,                 // steals the attacker
  slayLowAll: () => KILL + 8,                     // plus a board wipe
  slayWeakAll: (c) => KILL + n(c.val) * 2,
  pitfall: () => KILL,
  fullguard: (c) => NEGATE + n(c.val),
  guardBreakDraw: () => NEGATE + 4 + DRAW,
  guardEnemyDef: (c) => NEGATE + n(c.val) * 1.5,
  guardMana: (c) => NEGATE + MANA * n(c.val),
  guardPurge: () => NEGATE + 12 - MANA,           // costs 1 max mana
  guardWipe: () => NEGATE + 8,
  guardbuff: (c) => NEGATE + n(c.val) * 2,
  guarddraw: (c) => NEGATE + n(c.val) * DRAW,
  wardheal: (c) => NEGATE + n(c.val) * HEAL,
  reflect: () => 8,
  half: (c) => 3 + n(c.val),
  spikes: (c) => n(c.val),
  nullspell: () => 6,
  magmaTrial: () => KILL * (2 / 6) + 3,   // 5+ 에서만 발동하지만 파괴가 아니라 영구 제외
  mimicParty: () => 3,
  // ---- v25 리워크 함정 ----
  soulSwap: () => KILL + 8,               // 공격 몬스터 탈취 (최저 코스트 반납)
  counterOrder: () => 10,                 // 절반 + 아군 일제 반격 (필드 의존)
  lastBastion: () => NEGATE + 12,         // 치명타 무효 + 턴 종료 + 대회복 (조건부지만 게임을 살린다)
  devourGuard: () => NEGATE + KILL,       // 무효 + 파괴 (50%로 제외)
  brandMagic: () => 10,                   // 낙인: 영구 주사위 자해 (기대 3.5/턴)
  toll: () => 7,                          // 구매 반응 (50% 발동)
  gateClose: () => NEGATE + 3,            // 직접 공격 전용 무효 + 턴 봉쇄
  doomsday: () => 8,                      // 3턴 후 전체 필드 청소 (자해 5 포함)
  infoDealer: () => NEGATE * 2.5,         // 다회용 무효 (기대 4.5회)
  secondNull: () => 5,                    // 조건부(2번째 마법) 무효 + 마나 -1
  snare: () => 8,                         // 함정 파괴 억제 + 10뎀 (재세트)
  collusion: () => KILL + 4,              // 종족 보호: 무효+파괴 (+동족 카드 획득)
  // ---- v26 리워크 함정 ----
  decaytrap: () => 6,                     // 부패 2개 (3개째면 파괴 + 3뎀)
  undertow: () => NEGATE + 5,             // 무효 + 바운스 (템포 + 재소환 비용 강요)
  boltcost: () => KILL + 4,               // 파괴 + 평균 코스트만큼 데미지
  gateLockAll: () => NEGATE + 8,          // 무효 + 이번 턴 전체 공격 봉쇄
  spellSteal: () => 9,                    // 저코스트 마법 무효 + 복제 강탈 (2:1 교환)
  omen: () => KILL + 4,                   // 파괴 + 드로우 -2
};
// Traps proved far stronger in measurement than a naive tempo count suggests:
// a set trap also *deters* attacks, and the attacker pays full cost to find out.
// REACT_W is fitted by self-play A/B (see the sweep in the harness), not guessed.
const REACT_W = 1.5;
function reactValue(c: CardDef): number {
  if (!c.react) return 0;
  return (REACT[c.react] ?? (() => 8))(c) * REACT_W;
}

// ---- persistent field enchantments (ench) ----
function enchValue(c: CardDef): number {
  const v = n(c.val), v2 = n(c.val2);
  switch (c.ench) {
    case undefined: return 0;
    case "guild": return 7;    // 20턴 주기로 전 풀 구매권 — 느리지만 확정 가치
    case "brewing": return 6;  // 포도 → 와인(최대 체력+18·2드로우) 변환
    case "bonusDraw": return v * v2 * DRAW + MANA; // val = duration in turns
    case "noAttack": return 6;
    case "noSummonLow": return 5;
    case "healSummon": return v2 * HEAL * ENCH_TURNS;
    case "inferno": return (5 - 6) * ENCH_TURNS;   // 6 self / 5 enemy → net negative
    case "kinDiscount": return 4;
    case "cultureMana": return MANA * 2;
    case "slayArt": return 2 * ENCH_TURNS * 0.5;
    case "seedMana": return 0.33 * MANA * ENCH_TURNS;
    case "healMana": return 0.17 * MANA * ENCH_TURNS;
    case "growHp": return v2 * MAXHP * ENCH_TURNS;
    case "growHpMana": return v2 * MAXHP * ENCH_TURNS - MANA * 2;
    case "worldBless": return MANA * ENCH_TURNS * 0.35;  // both players ramp; edge is small
    case "glassBan": return 3;
    case "cullOnHit": case "cullTurn": return 1;   // stuffs the deck with culls
    case "furnace": return 2;
    case "bloodFest": return MANA * 2;
    case "bloodShield": return 3;
    case "vampWard": return 4;
    case "spellHeal": return 5;
    case "weakenAll": return 6;
    case "fateWheel": return 0.8 * ENCH_TURNS; // v25: no cast cost, rerolls only
    case "foresight": return MANA * 2 * 0.5;       // only pays out at 10+ max mana
    case "tribeContract": return 3;
    case "trialArea": return -6 * HEAL + 4;        // 6 self-damage up front
    case "ancientCiv": return 3;
    case "elfHaven": return 4; // v25: +10 max HP per World Tree offer buy
    default: return 4;
  }
}

// ---- keyword passives ----
const PASSIVE_PTS: Record<string, number> = {
  dual: 0,        // already priced via `mult` on the body
  ambush: 0,      // already priced via `directOnly` on the body
  aura: 5,        // untargetable by spells / monster effects
  trapmaster: 3,
  void: -1,       // leaves the deck cycle on death
  guts: 4,        // eats one combat destruction
  decay: 5,       // 3 hits kills anything + 3 face damage
  majesty: 4,     // enemy summons can't attack the turn they land
  taunt: 3,
  evade: 5,       // 50% to blank an incoming attack
};
function passiveValue(c: CardDef): number {
  let t = 0;
  for (const k of cardPassives(c)) t += PASSIVE_PTS[k] ?? 2;
  return t;
}

// ---- cards the engine resolves by id instead of by an effect key ----
// (values read off the card text, in the same damage-equivalent units)
const ID_PTS: Record<string, number> = {
  TGE1: 3, GENESIS_SONG: 8, GENESIS_MAGIC: 12,
  BLOOD2: 2, DISARM3: 5, FORBIDDEN: -4,
  LUCKY_CHEST: 4, GUILD_CHEST: 6,
  CATALYST: 3.3, SHATTER: 5, SCARECROW: 3, LEVY: 16,
  INQUISITION: 10, CULL_FLOOD: 1, PURGE_ALL: 6,
  EXILE_NUKE1: 8, EXILE_NUKE2: 14, GOLIATH_HUNT: 6, MASSACRE: 15.6,
  GREED_PRICE: 13.3, MARKET_CRISIS: 3, SCRAPPER: 6.5,
  BLOOD_JOY: 1, BLOOD_ANGER: 4.7, BLOOD_SORROW: -4.6, BLOOD_PLEASURE: -2.2,
  VAMP_PACT: 2.7, VAMP_PACT2: 1.8, BLOOD_SECRET: 8,
  DECAY_CRAFT: 4, MAJESTY_RITE: -1.4, CROSSROADS: 0.5,
  CHOSEN_MAGE: 12, CHOSEN_ARCHER: 12, CHOSEN_ROGUE: 12,
  FLAME: 1.5, NEGOTIATE: -2.5, COUNTERCALC: 4, AMBUSH: 4,
  TRUMPET: 3.4, TRICKROOM: 4, RUST_SHROOM: 4, CHOSEN_AREA: 6,
};

/** Monster body value: attack clocks, defense soaks penetration. */
function bodyValue(c: CardDef): number {
  if (c.t !== "mon") return 0;
  const atk = n(c.atk), def = n(c.def);
  if (c.hatchTurns != null) {
    // egg: no body of its own — worth a fraction of what it hatches into
    const pool = c.hatchInto ?? [];
    const avg = pool.length
      ? pool.reduce((s, id) => s + (DB[id] ? n(DB[id].atk) * 1.7 + n(DB[id].def) : 0), 0) / pool.length
      : 12;
    return avg * 0.6;
  }
  const mult = Math.max(1, n(c.mult, 1));
  const atkW = c.directOnly ? 2.1 : 1.7;          // assassins always connect face
  return atk * atkW * mult + def * 1.0;
}

/**
 * Static, board-independent power estimate in damage-equivalent points.
 * Used for buy decisions, deck-quality measurement, and pick ordering.
 */
export function cardPower(c: CardDef): number {
  // starters (cull / chest / attune) have no effect keys — value them by hand
  if (c.t === "starter") {
    if (c.star === "mana") return MANA;
    if (c.star === "chest") return 6;
    return 1.5;                                   // cull: thins the deck, does nothing else
  }
  return bodyValue(c) + passiveValue(c) + (ID_PTS[c.id] ?? 0)
    + summonValue(c) + turnFxValue(c) + auraValue(c)
    + attackFxValue(c) + actValue(c) + reactValue(c) + enchValue(c);
}

/** Average power of everything currently in a player's deck cycle. */
export function avgPower(cards: CardDef[]): number {
  if (!cards.length) return 0;
  return cards.reduce((s, c) => s + cardPower(c), 0) / cards.length;
}
