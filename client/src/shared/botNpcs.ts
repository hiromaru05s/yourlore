import type { BotDeck, BotDifficulty } from "./bot";

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
    id: "lumi", difficulty: "easy", avatar: "NPC_LUMI", portrait: "/art/npcs/v1/lumi.webp",
    name: text("ルミ", "Lumi", "루미"), title: text("新米シーカー", "New Seeker", "새내기 시커"),
    style: text("エルフと基礎戦術", "Elves & fundamentals", "엘프와 기본 전술"),
    decks: [
      deck("lumi-grove", ["ELF_HAVEN", "HALF_ELF", "HALF_ELF", C, C, C, T, T], 7, 10, 5),
      deck("lumi-spark", ["HALF_ELF", "HALF_ELF", "FLAME", "FLAME", C, C, T, T], 6, 9, 4),
      deck("lumi-growth", ["ELF_HAVEN", "HALF_ELF", "FORESIGHT", C, C, C, T, T], 8, 11, 5),
    ],
  },
  {
    id: "noel", difficulty: "normal", avatar: "NPC_NOEL", portrait: "/art/npcs/v1/noel.webp",
    name: text("ノエル", "Noel", "노엘"), title: text("思索のシーカー", "Thoughtful Seeker", "사색의 시커"),
    style: text("マナを育てて展開", "Build mana, then develop", "마나를 키워 전개"),
    decks: [
      deck("noel-foresight", [C, C, C, C, "FORESIGHT", T, T, T], 8, 13, 6),
      deck("noel-fortune", ["GAMBLER", "GAMBLER", "GAMBLER", C, C, C, T, T], 8, 11, 6),
      deck("noel-preparation", ["FORESIGHT", "GAMBLER", "FLAME", C, C, C, T, T], 7, 11, 5),
    ],
  },
  {
    id: "vera", difficulty: "hard", avatar: "NPC_VERA", portrait: "/art/npcs/v1/vera.webp",
    name: text("ヴェラ", "Vera", "베라"), title: text("果敢なシーカー", "Daring Seeker", "과감한 시커"),
    style: text("速攻と盤面の圧力", "Fast attacks & board pressure", "속공과 필드 압박"),
    decks: [
      deck("vera-assault", ["AMBUSH", "FLAME", "FLAME", "FLAME", "GHOST", "GHOST", "TRUMPET", T], 5, 8, 4),
      deck("vera-command", ["GHOST", "GHOST", "TRUMPET", "GUILD_HALL", "FLAME", C, T, T], 7, 10, 5),
      deck("vera-ambush", ["AMBUSH", "GUILD_HALL", "GUILD_HALL", "GHOST", "FLAME", C, T, T], 6, 9, 4),
    ],
  },
  {
    id: "sion", difficulty: "hell", avatar: "NPC_SION", portrait: "/art/npcs/v1/sion.webp",
    name: text("シオン", "Sion", "시온"), title: text("熟練のシーカー", "Master Seeker", "숙련된 시커"),
    style: text("先読みと多彩な戦術", "Foresight & versatile tactics", "수 읽기와 다채로운 전술"),
    decks: [
      deck("sion-tempo", ["GHOST", "TRUMPET", "GUILD_HALL", "FLAME", "FLAME", C, T, T], 7, 10, 5),
      deck("sion-engine", ["FORESIGHT", "GAMBLER", "GAMBLER", C, C, C, T, T], 8, 12, 6),
      deck("sion-canopy", ["ELF_HAVEN", "HALF_ELF", "HALF_ELF", "FORESIGHT", C, C, T, T], 8, 11, 5),
    ],
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
