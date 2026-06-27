// ============================================================
// LORE — card database (single source of truth).
// Names + effect text in Korean. Balanced around player HP 100.
// ============================================================
import type { CardDef, CardType } from "./types";

export const DB: Record<string, CardDef> = {
  // ---------- Monsters (13) ----------
  // aggro / wall / value spread across cost 1–4
  M1: { id: "M1", t: "mon", cost: 1, name: "스파크 임프", atk: 3, def: 1, text: "—" },
  M2: { id: "M2", t: "mon", cost: 1, name: "스톤 펍", atk: 1, def: 3, text: "—" },
  M3: { id: "M3", t: "mon", cost: 1, name: "더스트 스카우트", atk: 2, def: 2, text: "소환시: 카드 1장 드로우", onSummon: "draw1" },
  M4: { id: "M4", t: "mon", cost: 2, name: "블레이드 헤어", atk: 5, def: 2, text: "—" },
  M5: { id: "M5", t: "mon", cost: 2, name: "아이언 셸", atk: 2, def: 5, text: "—" },
  M6: { id: "M6", t: "mon", cost: 2, name: "트윈 팽", atk: 4, def: 3, text: "소환시: 적 몬스터 1체의 방어 -2(영구)", onSummon: "def2" },
  M7: { id: "M7", t: "mon", cost: 3, name: "엠버 드레이크", atk: 7, def: 3, text: "소환시: 상대 체력에 2 데미지", onSummon: "burn2" },
  M8: { id: "M8", t: "mon", cost: 3, name: "그로브 워든", atk: 4, def: 5, text: "소환시: 체력 3 회복", onSummon: "heal6" },
  M9: { id: "M9", t: "mon", cost: 3, name: "렐릭 헌터", atk: 5, def: 4, text: "소환시: 자신의 제시를 무료 갱신", onSummon: "refresh" },
  M10: { id: "M10", t: "mon", cost: 3, name: "마나 골렘", atk: 3, def: 5, text: "필드에 있는 동안 최대 마나 +1", aura: "mana1" },
  M11: { id: "M11", t: "mon", cost: 4, name: "워로드", atk: 8, def: 4, text: "아군 몬스터 2체 이상이면 공격 +2", condAtk: "twoPlus" },
  M12: { id: "M12", t: "mon", cost: 4, name: "타이탄 게이트", atk: 4, def: 7, text: "—" },
  M13: { id: "M13", t: "mon", cost: 4, name: "보이드 리버", atk: 7, def: 5, text: "소환시: 상대의 세트된 함정 1장 파괴", onSummon: "breaktrap" },

  // ---------- Spells (15) — cost 1–4 ----------
  S1: { id: "S1", t: "spell", cost: 1, name: "퀵 잽", text: "상대 체력에 3 데미지", act: "dmg3" },
  S2: { id: "S2", t: "spell", cost: 1, name: "마인드 플럭", text: "상대 패에서 무작위 1장을 2턴간 제외", act: "exile" },
  S10: { id: "S10", t: "spell", cost: 1, name: "마나 차지", text: "카드 1장 드로우", act: "draw1" },
  S3: { id: "S3", t: "spell", cost: 2, name: "샤픈", text: "자신 몬스터 1체의 공격 +3(이번 턴)", act: "buff3" },
  S4: { id: "S4", t: "spell", cost: 2, name: "더블 드로우", text: "카드 2장 드로우", act: "draw2" },
  S5: { id: "S5", t: "spell", cost: 2, name: "마켓 크래시", text: "상대의 제시를 강제 갱신", act: "crash" },
  S8: { id: "S8", t: "spell", cost: 2, name: "리콜", text: "버린 패에서 1장을 패로", act: "recall" },
  S11: { id: "S11", t: "spell", cost: 2, name: "파이어볼", text: "상대 체력에 5 데미지", act: "dmg5" },
  S6: { id: "S6", t: "spell", cost: 3, name: "시크", text: "덱에서 원하는 1장을 패로", act: "seek" },
  S7: { id: "S7", t: "spell", cost: 3, name: "오버로드", text: "자신 몬스터 전체의 공격 +2(이번 턴)", act: "buffall" },
  S9: { id: "S9", t: "spell", cost: 3, name: "사이펀", text: "상대에게 4 데미지 + 자신 체력 2 회복", act: "siphon" },
  S12: { id: "S12", t: "spell", cost: 3, name: "강화 주문", text: "자신 몬스터 1체에 공격+2 / 방어+2(영구)", act: "buff_perm" },
  S13: { id: "S13", t: "spell", cost: 4, name: "메테오", text: "상대 체력에 8 데미지", act: "dmg8" },
  S14: { id: "S14", t: "spell", cost: 4, name: "대지의 축복", text: "체력 5 회복 + 카드 1장 드로우", act: "blessing" },
  S15: { id: "S15", t: "spell", cost: 4, name: "룬 파열", text: "적 몬스터 1체를 파괴", act: "destroyMon" },

  // ---------- Traps (11) — set face-down, react on opponent turn ----------
  T1: { id: "T1", t: "trap", cost: 1, name: "하프 가드", text: "공격해온 몬스터의 공격을 절반으로", react: "half" },
  T8: { id: "T8", t: "trap", cost: 1, name: "가시 덫", text: "공격을 받으면 공격측 상대에게 4 데미지", react: "spikes" },
  T2: { id: "T2", t: "trap", cost: 2, name: "널 필드", text: "상대가 발동한 마법 1장을 무효화", react: "nullspell" },
  T3: { id: "T3", t: "trap", cost: 2, name: "함정 구덩이", text: "상대가 소환한 몬스터를 파괴", react: "pitfall" },
  T6: { id: "T6", t: "trap", cost: 2, name: "카운터 서지", text: "공격 몬스터를 파괴하고 공격력의 절반을 반사", react: "counter" },
  T9: { id: "T9", t: "trap", cost: 2, name: "역류", text: "이번 공격을 무효화한다", react: "fullguard" },
  T4: { id: "T4", t: "trap", cost: 3, name: "미러 손", text: "공격해온 몬스터의 공격력만큼 반사", react: "reflect" },
  T10: { id: "T10", t: "trap", cost: 3, name: "영혼 포식", text: "공격 몬스터를 파괴하고 자신 체력 3 회복", react: "devour" },
  T11: { id: "T11", t: "trap", cost: 3, name: "시간 왜곡", text: "공격을 받으면 카드 2장 드로우", react: "drawtrap2" },
  T12: { id: "T12", t: "trap", cost: 4, name: "절대 방벽", text: "이번 공격 무효 + 공격 몬스터 방어 -3(영구)", react: "bulwark" },
  T13: { id: "T13", t: "trap", cost: 4, name: "천벌", text: "공격 몬스터를 파괴하고 상대 체력에 8 데미지", react: "judgment" },
};

export const STARTERS: Record<string, CardDef> = {
  STARTER_TRASH: { id: "STARTER_TRASH", t: "starter", cost: 1, name: "컬", text: "마나1: 이 카드를 폐기(덱에서 제거)", star: "trash" },
  STARTER_CHEST: { id: "STARTER_CHEST", t: "starter", cost: 1, name: "보물상자", text: "마나1: 보물상자를 연다", star: "chest" },
  STARTER_MANA: { id: "STARTER_MANA", t: "starter", cost: 3, name: "어튠", text: "마나3: 최대 마나 +1", star: "mana" },
};

export const ALL_IDS = Object.keys(DB);
export const BUYABLE_POOL = ALL_IDS.slice(); // fluid (제시) + standard supply source

// STANDARD market is now randomized per game: one card of each cost 1/2/3/4,
// drawn from ALL types (monster / spell / trap). Built in engine.createGame.
export const COSTS_FOR_STANDARD = [1, 2, 3, 4];
export function idsOfCost(cost: number): string[] {
  return ALL_IDS.filter((id) => DB[id].cost === cost);
}

// initial 6-card deck: Cull x3 / Pry Chest x2 / Attune x1
export const STARTER_DECK = [
  "STARTER_TRASH", "STARTER_TRASH", "STARTER_TRASH",
  "STARTER_CHEST", "STARTER_CHEST",
  "STARTER_MANA",
];

export function frameFor(t: CardType): string {
  if (t === "mon") return "/frames/red.png";
  if (t === "trap") return "/frames/green.png";
  return "/frames/blue.png"; // spell + starter
}
export const FRAME_BACK = "/frames/back.png";
