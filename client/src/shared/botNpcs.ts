import type { BotDeck, BotDifficulty } from "./bot";
import { BOT_ELITE_DECKS, BOT_HELL_DECKS } from "./botDecks";
const trainedDeck = (deck: BotDeck): BotDeck => ({...deck,cards:[...deck.cards],tune:{minBuyEarly:6,minBuy:11,chestTurn:6,...deck.tune}});

type NpcText = { ja: string; en: string; ko: string };
export interface BotNpc {
  id: string;
  difficulty: BotDifficulty;
  avatar: string;
  portrait: string;
  name: NpcText;
  title: NpcText;
  style: NpcText;
  decks: readonly [BotDeck, BotDeck, BotDeck];
}
const text = (ja: string, en: string, ko: string): NpcText => ({ ja, en, ko });
const deck = (name: string, cards: string[], minBuyEarly: number, minBuy: number, chestTurn: number): BotDeck =>
  ({ name, cards, tune: { minBuyEarly, minBuy, chestTurn } });
const C = "STARTER_TRASH", T = "STARTER_CHEST";

/** NPC identity is independent of the deck rolled for each duel. */
export const BOT_NPCS: readonly BotNpc[] = [
  {
    id: "lumi", difficulty: "easy", avatar: "NPC_LUMI", portrait: "/art/npcs/v2/lumi.webp",
    name: text("ルミ", "Lumi", "루미"), title: text("新米シーカー", "New Seeker", "새내기 시커"),
    style: text("エルフと基礎戦術", "Elves & fundamentals", "엘프와 기본 전술"),
    decks: [
      deck("lumi-grove", ["ELF_HAVEN", "HALF_ELF", "HALF_ELF", C, C, C, T, T], 7, 10, 5),
      deck("lumi-spark", ["HALF_ELF", "HALF_ELF", "FLAME", "FLAME", C, C, T, T], 6, 9, 4),
      deck("lumi-growth", ["ELF_HAVEN", "HALF_ELF", "FORESIGHT", C, C, C, T, T], 8, 11, 5),
    ],
  },
  {
    id: "noel", difficulty: "normal", avatar: "NPC_NOEL", portrait: "/art/npcs/v2/noel.webp",
    name: text("ノエル", "Noel", "노엘"), title: text("思索のシーカー", "Thoughtful Seeker", "사색의 시커"),
    style: text("マナを育てて展開", "Build mana, then develop", "마나를 키워 전개"),
    decks: [
      deck("noel-foresight", [C, C, C, C, "FORESIGHT", T, T, T], 8, 13, 6),
      deck("noel-fortune", ["GAMBLER", "GAMBLER", "GAMBLER", C, C, C, T, T], 8, 11, 6),
      deck("noel-preparation", ["FORESIGHT", "GAMBLER", "FLAME", C, C, C, T, T], 7, 11, 5),
    ],
  },
  {
    id: "vera", difficulty: "hard", avatar: "NPC_VERA", portrait: "/art/npcs/v2/vera.webp",
    name: text("ヴェラ", "Vera", "베라"), title: text("果敢なシーカー", "Daring Seeker", "과감한 시커"),
    style: text("盤面展開と回復エンジン", "Board development & recovery", "필드 전개와 회복"),
    decks: [trainedDeck(BOT_ELITE_DECKS[2]), trainedDeck(BOT_ELITE_DECKS[0]), trainedDeck(BOT_ELITE_DECKS[1])],
  },
  {
    id: "sion", difficulty: "hell", avatar: "NPC_SION", portrait: "/art/npcs/v2/sion.webp",
    name: text("シオン", "Sion", "시온"), title: text("熟練のシーカー", "Master Seeker", "숙련된 시커"),
    style: text("速攻・腐敗・妨害", "Pressure, decay & disruption", "속공・부패・방해"),
    decks: [trainedDeck(BOT_HELL_DECKS[0]), trainedDeck(BOT_HELL_DECKS[1]), trainedDeck(BOT_HELL_DECKS[2])],
  },
];

export function botNpc(difficulty: BotDifficulty): BotNpc {
  return BOT_NPCS.find(npc => npc.difficulty === difficulty)!;
}
export function npcPortrait(avatar: string | null | undefined): string | undefined {
  return BOT_NPCS.find(npc => npc.avatar === avatar)?.portrait;
}

/** Uniform first roll; subsequent rolls exclude this NPC's previous deck. */
export function pickNpcDeck(npc: BotNpc, previous?: number, random = Math.random()): { index: number; deck: BotDeck } {
  const choices = npc.decks.map((_, index) => index).filter(index => index !== previous);
  const roll = Number.isFinite(random) ? Math.min(1, Math.max(0, random)) : 0;
  const index = choices[Math.min(choices.length - 1, Math.floor(roll * choices.length))];
  const selected = npc.decks[index];
  return { index, deck: { ...selected, cards: [...selected.cards], tune: { ...selected.tune } } };
}
