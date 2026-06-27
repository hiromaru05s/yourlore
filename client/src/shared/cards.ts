// ============================================================
// LORE — card database. Names + text in Korean.
// Effects are generalized (effect key + val/val2); see engine.ts.
// Core hand-tuned set (cost 1–4) + a generated high-cost curve
// (cost 5–12) so the deck-building space is large.
// ============================================================
import type { CardDef, CardType } from "./types";

// ---------------- core set (cost 1–4) ----------------
const CORE: Record<string, CardDef> = {
  // Monsters
  M1: { id: "M1", t: "mon", cost: 1, name: "스파크 임프", atk: 3, def: 1, text: "—" },
  M2: { id: "M2", t: "mon", cost: 1, name: "스톤 펍", atk: 1, def: 3, text: "—" },
  M3: { id: "M3", t: "mon", cost: 1, name: "더스트 스카우트", atk: 2, def: 2, text: "소환시: 카드 1장 드로우", onSummon: "draw", val: 1 },
  M4: { id: "M4", t: "mon", cost: 2, name: "블레이드 헤어", atk: 5, def: 2, text: "—" },
  M5: { id: "M5", t: "mon", cost: 2, name: "아이언 셸", atk: 2, def: 5, text: "—" },
  M6: { id: "M6", t: "mon", cost: 2, name: "트윈 팽", atk: 4, def: 3, text: "소환시: 적 몬스터 방어 -2(영구)", onSummon: "defDown", val: 2 },
  M7: { id: "M7", t: "mon", cost: 3, name: "엠버 드레이크", atk: 7, def: 3, text: "소환시: 상대 체력에 2 데미지", onSummon: "burn", val: 2 },
  M8: { id: "M8", t: "mon", cost: 3, name: "그로브 워든", atk: 4, def: 5, text: "소환시: 체력 3 회복", onSummon: "heal", val: 3 },
  M9: { id: "M9", t: "mon", cost: 3, name: "렐릭 헌터", atk: 5, def: 4, text: "소환시: 자신의 제시를 무료 갱신", onSummon: "refresh" },
  M10: { id: "M10", t: "mon", cost: 3, name: "마나 골렘", atk: 3, def: 5, text: "필드에 있는 동안 최대 마나 +1", aura: "mana1" },
  M11: { id: "M11", t: "mon", cost: 4, name: "워로드", atk: 8, def: 4, text: "아군 몬스터 2체 이상이면 공격 +2", condAtk: "twoPlus" },
  M12: { id: "M12", t: "mon", cost: 4, name: "타이탄 게이트", atk: 4, def: 7, text: "—" },
  M13: { id: "M13", t: "mon", cost: 4, name: "보이드 리버", atk: 7, def: 5, text: "소환시: 상대의 세트 함정 1장 파괴", onSummon: "breaktrap" },
  // Spells
  S1: { id: "S1", t: "spell", cost: 1, name: "퀵 잽", text: "상대 체력에 3 데미지", act: "dmg", val: 3 },
  S2: { id: "S2", t: "spell", cost: 1, name: "마인드 플럭", text: "상대 패에서 무작위 1장을 2턴간 제외", act: "exile" },
  S10: { id: "S10", t: "spell", cost: 1, name: "마나 차지", text: "카드 1장 드로우", act: "draw", val: 1 },
  S3: { id: "S3", t: "spell", cost: 2, name: "샤픈", text: "자신 몬스터 1체의 공격 +3(이번 턴)", act: "buffTurn", val: 3 },
  S4: { id: "S4", t: "spell", cost: 2, name: "더블 드로우", text: "카드 2장 드로우", act: "draw", val: 2 },
  S5: { id: "S5", t: "spell", cost: 2, name: "마켓 크래시", text: "상대의 제시를 강제 갱신", act: "crash" },
  S8: { id: "S8", t: "spell", cost: 2, name: "리콜", text: "버린 패에서 1장을 패로", act: "recall" },
  S11: { id: "S11", t: "spell", cost: 2, name: "파이어볼", text: "상대 체력에 5 데미지", act: "dmg", val: 5 },
  S6: { id: "S6", t: "spell", cost: 3, name: "시크", text: "덱에서 원하는 1장을 패로", act: "seek" },
  S7: { id: "S7", t: "spell", cost: 3, name: "오버로드", text: "자신 몬스터 전체의 공격 +2(이번 턴)", act: "buffAllTurn", val: 2 },
  S9: { id: "S9", t: "spell", cost: 3, name: "사이펀", text: "상대에게 4 데미지 + 자신 체력 2 회복", act: "siphon", val: 4, val2: 2 },
  S12: { id: "S12", t: "spell", cost: 3, name: "강화 주문", text: "자신 몬스터 1체에 공격+2 / 방어+2(영구)", act: "buffPerm", val: 2, val2: 2 },
  S13: { id: "S13", t: "spell", cost: 4, name: "메테오", text: "상대 체력에 8 데미지", act: "dmg", val: 8 },
  S14: { id: "S14", t: "spell", cost: 4, name: "대지의 축복", text: "체력 5 회복 + 카드 1장 드로우", act: "heal", val: 5, val2: 1 },
  S15: { id: "S15", t: "spell", cost: 4, name: "룬 파열", text: "적 몬스터 1체를 파괴", act: "destroyMon" },
  // Traps
  T1: { id: "T1", t: "trap", cost: 1, name: "하프 가드", text: "공격해온 몬스터의 공격을 절반으로", react: "half" },
  T8: { id: "T8", t: "trap", cost: 1, name: "가시 덫", text: "공격을 받으면 공격측에 4 데미지", react: "spikes", val: 4 },
  T2: { id: "T2", t: "trap", cost: 2, name: "널 필드", text: "상대가 발동한 마법 1장을 무효화", react: "nullspell" },
  T3: { id: "T3", t: "trap", cost: 2, name: "함정 구덩이", text: "상대가 소환한 몬스터를 파괴", react: "pitfall" },
  T6: { id: "T6", t: "trap", cost: 2, name: "카운터 서지", text: "공격 몬스터를 파괴하고 공격력 절반 반사", react: "counter" },
  T9: { id: "T9", t: "trap", cost: 2, name: "역류", text: "이번 공격을 무효화한다", react: "fullguard" },
  T4: { id: "T4", t: "trap", cost: 3, name: "미러 손", text: "공격해온 몬스터의 공격력만큼 반사", react: "reflect" },
  T10: { id: "T10", t: "trap", cost: 3, name: "영혼 포식", text: "공격 몬스터를 파괴하고 체력 3 회복", react: "devour", val: 3 },
  T11: { id: "T11", t: "trap", cost: 3, name: "시간 왜곡", text: "공격을 받으면 카드 2장 드로우", react: "drawtrap", val: 2 },
  T12: { id: "T12", t: "trap", cost: 4, name: "절대 방벽", text: "이번 공격 무효 + 공격 몬스터 방어 -3(영구)", react: "bulwark", val: 3 },
  T13: { id: "T13", t: "trap", cost: 4, name: "천벌", text: "공격 몬스터를 파괴하고 상대 체력에 8 데미지", react: "judgment", val: 8 },
};

// ---------------- generated high-cost curve (cost 5–12) ----------------
const R = (n: number) => Math.max(1, Math.round(n));
const PREFIX = ["고대의", "심연의", "강철의", "화염의", "서리의", "폭풍의", "황금의", "저주받은", "신성한", "그림자", "용암의", "천공의", "피의", "비취의", "흑요석", "은빛", "파멸의", "여명의", "심판의", "광휘의", "태초의", "무한의", "공허의", "붕괴의"];
let pfx = 0;
const usedNames = new Set<string>();
const ROMAN = ["", " II", " III", " IV", " V", " VI"];
function nextName(noun: string): string {
  const base = `${PREFIX[pfx++ % PREFIX.length]} ${noun}`;
  let n = base, k = 1;
  while (usedNames.has(n)) { n = base + (ROMAN[k] ?? ` ${k + 1}`); k++; }
  usedNames.add(n);
  return n;
}

interface MonTpl { nouns: string[]; atk: (c: number) => number; def: (c: number) => number; mk?: (c: number) => Partial<CardDef> & { text: string }; }
const MON_TPL: MonTpl[] = [
  { nouns: ["광전사", "약탈자", "맹수"], atk: (c) => R(c * 1.5), def: (c) => R(c * 0.45) },
  { nouns: ["수호자", "성벽", "거인"], atk: (c) => R(c * 0.6), def: (c) => R(c * 1.6) },
  { nouns: ["기사", "용병", "전사"], atk: (c) => R(c * 1.05), def: (c) => R(c * 0.95) },
  { nouns: ["드레이크", "폭격수", "화염술사"], atk: (c) => R(c * 1.3), def: (c) => R(c * 0.5), mk: (c) => ({ onSummon: "burn", val: R(c / 2), text: `소환시: 상대 체력에 ${R(c / 2)} 데미지` }) },
  { nouns: ["사제", "수도승", "치유사"], atk: (c) => R(c * 0.6), def: (c) => R(c * 1.4), mk: (c) => ({ onSummon: "heal", val: R(c / 2), text: `소환시: 체력 ${R(c / 2)} 회복` }) },
  { nouns: ["정찰병", "탐색자", "사냥꾼"], atk: (c) => R(c * 0.9), def: (c) => R(c * 0.9), mk: (c) => ({ onSummon: "draw", val: Math.max(1, R(c / 4)), text: `소환시: ${Math.max(1, R(c / 4))}장 드로우` }) },
  { nouns: ["주술사", "저주술사", "마녀"], atk: (c) => R(c * 1.1), def: (c) => R(c * 0.8), mk: (c) => ({ onSummon: "defDown", val: R(c / 3), text: `소환시: 적 몬스터 방어 -${R(c / 3)}(영구)` }) },
  { nouns: ["지휘관", "장군", "대장"], atk: (c) => R(c * 1.25), def: (c) => R(c * 0.8), mk: () => ({ condAtk: "twoPlus", text: "아군 몬스터 2체 이상이면 공격 +2" }) },
  { nouns: ["파괴자", "해체자", "공성병"], atk: (c) => R(c * 1.1), def: (c) => R(c * 0.85), mk: () => ({ onSummon: "breaktrap", text: "소환시: 상대의 세트 함정 1장 파괴" }) },
];

interface FxTpl { nouns: string[]; mk: (c: number) => Partial<CardDef> & { text: string }; }
const SPELL_TPL: FxTpl[] = [
  { nouns: ["화염구", "작렬", "겁화"], mk: (c) => ({ act: "dmg", val: c + 2, text: `상대 체력에 ${c + 2} 데미지` }) },
  { nouns: ["한파", "빙결", "서리창"], mk: (c) => ({ act: "dmg", val: R(c * 0.9) + 1, text: `상대 체력에 ${R(c * 0.9) + 1} 데미지` }) },
  { nouns: ["치유술", "회복", "생명의 빛"], mk: (c) => ({ act: "heal", val: R(c * 0.9), text: `체력 ${R(c * 0.9)} 회복` }) },
  { nouns: ["통찰", "예지", "지식"], mk: (c) => ({ act: "draw", val: Math.max(2, R(c / 2)), text: `카드 ${Math.max(2, R(c / 2))}장 드로우` }) },
  { nouns: ["강타", "예리함", "투기"], mk: (c) => ({ act: "buffTurn", val: R(c / 2) + 1, text: `자신 몬스터 1체 공격 +${R(c / 2) + 1}(이번 턴)` }) },
  { nouns: ["진군", "돌격 명령", "전군 강화"], mk: (c) => ({ act: "buffAllTurn", val: Math.max(1, R(c / 3)), text: `아군 전체 공격 +${Math.max(1, R(c / 3))}(이번 턴)` }) },
  { nouns: ["룬 각인", "축복", "룬 강화"], mk: (c) => ({ act: "buffPerm", val: R(c / 3) + 1, val2: R(c / 3) + 1, text: `자신 몬스터 1체 공격+${R(c / 3) + 1}/방어+${R(c / 3) + 1}(영구)` }) },
  { nouns: ["파멸", "소멸", "붕괴"], mk: () => ({ act: "destroyMon", text: "적 몬스터 1체를 파괴" }) },
  { nouns: ["약화", "쇠약", "부식"], mk: (c) => ({ act: "weaken", val: R(c / 2), text: `적 몬스터 1체 방어 -${R(c / 2)}(영구)` }) },
  { nouns: ["생명 갈취", "착취", "흡수"], mk: (c) => ({ act: "siphon", val: R(c / 2) + 1, val2: R(c / 3), text: `상대에게 ${R(c / 2) + 1} 데미지 + 체력 ${R(c / 3)} 회복` }) },
  { nouns: ["마나 결정", "룬 충전"], mk: () => ({ act: "manaUp", val: 1, text: "최대 마나 +1" }) },
  { nouns: ["시장 교란", "혼란"], mk: () => ({ act: "crash", text: "상대의 제시를 강제 갱신" }) },
];

const TRAP_TPL: FxTpl[] = [
  { nouns: ["방어 태세", "수비 진형"], mk: () => ({ react: "half", text: "공격해온 몬스터의 공격을 절반으로" }) },
  { nouns: ["무효화", "차단막"], mk: () => ({ react: "fullguard", text: "이번 공격을 무효화한다" }) },
  { nouns: ["반사막", "거울 장막"], mk: () => ({ react: "reflect", text: "공격해온 몬스터의 공격력만큼 반사" }) },
  { nouns: ["역습", "반격"], mk: () => ({ react: "counter", text: "공격 몬스터를 파괴하고 공격력 절반 반사" }) },
  { nouns: ["포식", "집어삼킴"], mk: (c) => ({ react: "devour", val: R(c / 2), text: `공격 몬스터 파괴 + 체력 ${R(c / 2)} 회복` }) },
  { nouns: ["심판", "천벌"], mk: (c) => ({ react: "judgment", val: R(c * 0.7), text: `공격 몬스터 파괴 + 상대 체력에 ${R(c * 0.7)} 데미지` }) },
  { nouns: ["가시 함정", "철침 덫"], mk: (c) => ({ react: "spikes", val: R(c / 2), text: `공격을 받으면 공격측에 ${R(c / 2)} 데미지` }) },
  { nouns: ["시간 왜곡", "예지의 덫"], mk: (c) => ({ react: "drawtrap", val: Math.max(1, R(c / 4)), text: `공격을 받으면 ${Math.max(1, R(c / 4))}장 드로우` }) },
  { nouns: ["방벽", "철벽"], mk: (c) => ({ react: "bulwark", val: R(c / 3) + 1, text: `이번 공격 무효 + 공격 몬스터 방어 -${R(c / 3) + 1}(영구)` }) },
  { nouns: ["가시 갑옷", "복수의 가시"], mk: (c) => ({ react: "thorns", val: R(c / 2), text: `공격을 받으면 ${R(c / 2)} 반사` }) },
];

// per-cost counts: [monsters, spells, traps]
const PLAN: Record<number, [number, number, number]> = {
  5: [4, 5, 5], 6: [9, 6, 6], 7: [8, 6, 6], 8: [8, 6, 6],
  9: [5, 4, 4], 10: [5, 4, 4], 11: [3, 2, 2], 12: [3, 2, 2],
};

function generate(): Record<string, CardDef> {
  const out: Record<string, CardDef> = {};
  for (const costStr of Object.keys(PLAN)) {
    const c = Number(costStr);
    const [nm, ns, nt] = PLAN[c];
    for (let i = 0; i < nm; i++) {
      const tpl = MON_TPL[i % MON_TPL.length];
      const id = `GM${c}_${i}`;
      const extra = tpl.mk ? tpl.mk(c) : { text: "—" };
      out[id] = { id, t: "mon", cost: c, name: nextName(tpl.nouns[i % tpl.nouns.length]), atk: tpl.atk(c), def: tpl.def(c), ...extra };
    }
    for (let i = 0; i < ns; i++) {
      const tpl = SPELL_TPL[i % SPELL_TPL.length];
      const id = `GS${c}_${i}`;
      out[id] = { id, t: "spell", cost: c, name: nextName(tpl.nouns[i % tpl.nouns.length]), ...tpl.mk(c) };
    }
    for (let i = 0; i < nt; i++) {
      const tpl = TRAP_TPL[i % TRAP_TPL.length];
      const id = `GT${c}_${i}`;
      out[id] = { id, t: "trap", cost: c, name: nextName(tpl.nouns[i % tpl.nouns.length]), ...tpl.mk(c) };
    }
  }
  return out;
}

export const DB: Record<string, CardDef> = { ...CORE, ...generate() };

export const STARTERS: Record<string, CardDef> = {
  STARTER_TRASH: { id: "STARTER_TRASH", t: "starter", cost: 1, name: "컬", text: "마나1: 이 카드를 폐기(덱에서 제거)", star: "trash" },
  STARTER_CHEST: { id: "STARTER_CHEST", t: "starter", cost: 1, name: "보물상자", text: "마나1: 보물상자를 연다", star: "chest" },
  STARTER_MANA: { id: "STARTER_MANA", t: "starter", cost: 3, name: "어튠", text: "마나3: 최대 마나 +1", star: "mana" },
};

export const ALL_IDS = Object.keys(DB);
export const BUYABLE_POOL = ALL_IDS.slice();

export function idsOfCost(cost: number): string[] {
  return ALL_IDS.filter((id) => DB[id].cost === cost);
}

// initial deck: Cull x9 / Pry Chest x2 / Attune x1  (12 cards)
export const STARTER_DECK = [
  ...Array<string>(9).fill("STARTER_TRASH"),
  "STARTER_CHEST", "STARTER_CHEST",
  "STARTER_MANA",
];

export function frameFor(t: CardType): string {
  if (t === "mon") return "/frames/red.png";
  if (t === "trap") return "/frames/green.png";
  return "/frames/blue.png"; // spell + starter
}
export const FRAME_BACK = "/frames/back.png";
