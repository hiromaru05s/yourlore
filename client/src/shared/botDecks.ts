import type { PlayerState } from "./types";
import type { BotDifficulty } from "./bot";

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
// v62: counter-market selection on current rules, including double suppression,
// Guardian, recovery and stronger Goblin/mixed opponents. Ordinary starters;
// deck selection is independent of the opponent's private cards and market RNG.
// Evidence: docs/bot-strength/2026-10-23-rework.
export const BOT_HELL_DECKS: BotDeck[] = [
  {"name": "BOT · MIXED_RALLY", "cards": ["RUST_SHROOM", "RUST_SHROOM", "GOBLIN", "GOBLIN", "GOBLIN_RAIDER", "GOBLIN_RAIDER", "COUNTERCALC", "TRUMPET"], "tune": {}},
  {"name": "BOT · GOBLIN_SWARM", "cards": ["GOBLIN", "GOBLIN", "GOBLIN", "GOBLIN", "GOBLIN_RAIDER", "GOBLIN_RAIDER", "COUNTERCALC", "TRUMPET"], "tune": {}},
  {"name": "BOT · GOBLIN_RALLY", "cards": ["GOBLIN", "GOBLIN", "GOBLIN", "GOBLIN_RAIDER", "GOBLIN_RAIDER", "GOBLIN_RAIDER", "COUNTERCALC", "BLOOD_RITE"], "tune": {}},
  {"name": "BOT · SWARM_BLOOD", "cards": ["GOBLIN", "GOBLIN", "GOBLIN", "GOBLIN", "GOBLIN_RAIDER", "GOBLIN_RAIDER", "COUNTERCALC", "BLOOD_RITE"], "tune": {}},
  {"name": "BOT · RALLY_COUNTER", "cards": ["GOBLIN", "GOBLIN", "GOBLIN", "GOBLIN_RAIDER", "GOBLIN_RAIDER", "GOBLIN_RAIDER", "COUNTERCALC", "COUNTERCALC"], "tune": {}},
  {"name": "BOT · RALLY_TRUMPET", "cards": ["GOBLIN", "GOBLIN", "GOBLIN", "GOBLIN_RAIDER", "GOBLIN_RAIDER", "GOBLIN_RAIDER", "COUNTERCALC", "TRUMPET"], "tune": {}},
  {"name": "BOT · MIXED_BLOOD", "cards": ["RUST_SHROOM", "RUST_SHROOM", "GOBLIN", "GOBLIN", "GOBLIN_RAIDER", "GOBLIN_RAIDER", "COUNTERCALC", "BLOOD_RITE"], "tune": {}},
];
export const BOT_ELITE_DECKS: BotDeck[] = [0, 1, 2, 5, 6].map(i => BOT_HELL_DECKS[i]);
export function pickBotDeck(rnd: number = Math.random(), difficulty: BotDifficulty = 'normal'): BotDeck {
  const roster = difficulty === 'hell' ? BOT_HELL_DECKS : difficulty === 'hard' ? BOT_ELITE_DECKS : BOT_DECKS;
  const roll = Number.isFinite(rnd) ? rnd : 0;
  return roster[Math.min(roster.length - 1, Math.max(0, Math.floor(roll * roster.length)))];
}
