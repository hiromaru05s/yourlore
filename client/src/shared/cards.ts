// ============================================================
// LORE — card database (single source of truth).
// Effect texts are Korean (per game spec); names stay English.
// ============================================================
import type { CardDef, CardType } from "./types";

export const DB: Record<string, CardDef> = {
  // --- Monsters (13) ---
  M1: { id: "M1", t: "mon", cost: 1, name: "Spark Imp", atk: 3, def: 1, text: "—" },
  M2: { id: "M2", t: "mon", cost: 1, name: "Stone Pup", atk: 1, def: 4, text: "—" },
  M3: { id: "M3", t: "mon", cost: 1, name: "Dust Scout", atk: 2, def: 2, text: "소환시: 카드 1장 드로우", onSummon: "draw1" },
  M4: { id: "M4", t: "mon", cost: 2, name: "Blade Hare", atk: 5, def: 2, text: "—" },
  M5: { id: "M5", t: "mon", cost: 2, name: "Iron Shell", atk: 2, def: 6, text: "—" },
  M6: { id: "M6", t: "mon", cost: 2, name: "Twin Fang", atk: 4, def: 3, text: "소환시: 적 몬스터 1체의 방어 -1(영구)", onSummon: "def1" },
  M7: { id: "M7", t: "mon", cost: 3, name: "Ember Drake", atk: 7, def: 3, text: "소환시: 상대 HP에 1 데미지", onSummon: "burn1" },
  M8: { id: "M8", t: "mon", cost: 3, name: "Grove Warden", atk: 4, def: 6, text: "소환시: HP 5 회복", onSummon: "heal5" },
  M9: { id: "M9", t: "mon", cost: 3, name: "Relic Hunter", atk: 5, def: 4, text: "소환시: 자신의 제시를 무료 갱신", onSummon: "refresh" },
  M10: { id: "M10", t: "mon", cost: 3, name: "Mana Golem", atk: 3, def: 5, text: "필드에 있는 동안 최대 mana +1", aura: "mana1" },
  M11: { id: "M11", t: "mon", cost: 4, name: "Warlord", atk: 9, def: 4, text: "자신 필드에 몬스터 2체 이상이면 공격 +2", condAtk: "twoPlus" },
  M12: { id: "M12", t: "mon", cost: 4, name: "Titan Gate", atk: 5, def: 9, text: "—" },
  M13: { id: "M13", t: "mon", cost: 4, name: "Void Reaver", atk: 8, def: 5, text: "소환시: 상대의 세트된 함정 1장 파괴", onSummon: "breaktrap" },
  // --- Spells (9) ---
  S1: { id: "S1", t: "spell", cost: 1, name: "Quick Jab", text: "상대 HP에 3 데미지", act: "dmg3" },
  S2: { id: "S2", t: "spell", cost: 1, name: "Mind Pluck", text: "상대 패에서 무작위 1장을 2턴간 제외", act: "exile" },
  S3: { id: "S3", t: "spell", cost: 2, name: "Sharpen", text: "자신 몬스터 1체의 공격 +3(이번 턴)", act: "buff3" },
  S4: { id: "S4", t: "spell", cost: 2, name: "Double Draw", text: "카드 2장 드로우", act: "draw2" },
  S5: { id: "S5", t: "spell", cost: 2, name: "Market Crash", text: "상대의 제시를 강제 갱신", act: "crash" },
  S6: { id: "S6", t: "spell", cost: 3, name: "Seek", text: "덱에서 원하는 1장을 패로", act: "seek" },
  S7: { id: "S7", t: "spell", cost: 3, name: "Overload", text: "자신 몬스터 전체의 공격 +2(이번 턴)", act: "buffall" },
  S8: { id: "S8", t: "spell", cost: 2, name: "Recall", text: "버린 패에서 1장을 패로", act: "recall" },
  S9: { id: "S9", t: "spell", cost: 3, name: "Siphon", text: "상대에게 4 데미지 + 자신 HP 4 회복", act: "siphon" },
  // --- Traps (7) — set face-down, auto-react on opponent turn ---
  T1: { id: "T1", t: "trap", cost: 1, name: "Half Guard", text: "공격해온 몬스터의 공격을 절반으로", react: "half" },
  T2: { id: "T2", t: "trap", cost: 2, name: "Null Field", text: "상대가 발동한 마법 1장을 무효화", react: "nullspell" },
  T3: { id: "T3", t: "trap", cost: 2, name: "Pitfall", text: "상대가 소환한 몬스터를 파괴", react: "pitfall" },
  T4: { id: "T4", t: "trap", cost: 3, name: "Mirror Thorn", text: "공격해온 몬스터의 공격력만큼 반사", react: "reflect" },
  T5: { id: "T5", t: "trap", cost: 1, name: "Mana Leak", text: "상대의 최대 mana를 1턴간 -2", react: "manaleak" },
  T6: { id: "T6", t: "trap", cost: 2, name: "Counter Surge", text: "공격 몬스터를 파괴하고 공격력의 절반을 반사", react: "counter" },
  T7: { id: "T7", t: "trap", cost: 1, name: "Tax", text: "상대가 구매한 다음 자기 턴까지 최대 mana -1", react: "tax" },
};

export const STARTERS: Record<string, CardDef> = {
  STARTER_TRASH: { id: "STARTER_TRASH", t: "starter", cost: 1, name: "Cull", text: "mana1: 이 카드를 폐기(덱에서 제거)", star: "trash" },
  STARTER_CHEST: { id: "STARTER_CHEST", t: "starter", cost: 1, name: "Pry Chest", text: "mana1: 보물상자를 연다", star: "chest" },
  STARTER_MANA: { id: "STARTER_MANA", t: "starter", cost: 3, name: "Attune", text: "mana3: 최대 mana +1", star: "mana" },
};

export const ALL_IDS = Object.keys(DB);
export const BUYABLE_POOL = ALL_IDS.slice(); // fluid + common market supply source
export const FIXED_MARKET = ["M1", "M4", "M7", "M12"]; // cost 1/2/3/4

// initial 6-card deck: Cull x3 / Pry Chest x2 / Attune x1
export const STARTER_DECK = [
  "STARTER_TRASH", "STARTER_TRASH", "STARTER_TRASH",
  "STARTER_CHEST", "STARTER_CHEST",
  "STARTER_MANA",
];

// card frame image per type (asset path served from /public)
export function frameFor(t: CardType): string {
  if (t === "mon") return "/frames/red.png";
  if (t === "trap") return "/frames/green.png";
  return "/frames/blue.png"; // spell + starter
}
export const FRAME_BACK = "/frames/back.png";
