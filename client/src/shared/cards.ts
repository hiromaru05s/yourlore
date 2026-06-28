// ============================================================
// LORE — card database. Names + text in Korean.
// Effects generalized (effect key + val/val2 [+ play cost]); see engine.ts.
// Values scale monotonically with cost. IDs/names/types are STABLE so the
// pre-made card art (named <id>.webp) keeps mapping.
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
  M7: { id: "M7", t: "mon", cost: 3, name: "엠버 드레이크", atk: 7, def: 3, text: "소환시: 상대 체력에 3 데미지", onSummon: "burn", val: 3 },
  M8: { id: "M8", t: "mon", cost: 3, name: "그로브 워든", atk: 4, def: 6, text: "소환시: 체력 5 회복", onSummon: "heal", val: 5 },
  M9: { id: "M9", t: "mon", cost: 3, name: "렐릭 헌터", atk: 5, def: 4, text: "소환시: 자신의 제시를 무료 갱신 + 1장 드로우", onSummon: "refresh" },
  M10: { id: "M10", t: "mon", cost: 3, name: "마나 골렘", atk: 3, def: 5, text: "필드에 있는 동안 최대 마나 +1", aura: "mana1" },
  M11: { id: "M11", t: "mon", cost: 4, name: "워로드", atk: 8, def: 4, text: "아군 몬스터 2체 이상이면 공격 +2", condAtk: "twoPlus" },
  M12: { id: "M12", t: "mon", cost: 4, name: "타이탄 게이트", atk: 4, def: 8, text: "—" },
  M13: { id: "M13", t: "mon", cost: 4, name: "보이드 리버", atk: 7, def: 5, text: "소환시: 상대의 세트 함정 1장 파괴", onSummon: "breaktrap" },
  // Spells
  S1: { id: "S1", t: "spell", cost: 1, name: "퀵 잽", text: "상대 체력에 2 데미지", act: "dmg", val: 2 },
  S10: { id: "S10", t: "spell", cost: 1, name: "마나 차지", text: "카드 2장 드로우", act: "draw", val: 2, play: 1 },
  S3: { id: "S3", t: "spell", cost: 2, name: "샤픈", text: "자신 몬스터 1체의 공격 +3(이번 턴)", act: "buffTurn", val: 3 },
  S4: { id: "S4", t: "spell", cost: 2, name: "더블 드로우", text: "카드 3장 드로우 (시전 1)", act: "draw", val: 3, play: 1 },
  S5: { id: "S5", t: "spell", cost: 2, name: "마켓 크래시", text: "상대 제시 강제 갱신 + 1장 드로우 (시전 1)", act: "crash", val2: 1, play: 1 },
  S8: { id: "S8", t: "spell", cost: 2, name: "리콜", text: "버린 패에서 1장을 패로", act: "recall" },
  S11: { id: "S11", t: "spell", cost: 2, name: "파이어볼", text: "상대 체력에 4 데미지", act: "dmg", val: 4 },
  S6: { id: "S6", t: "spell", cost: 3, name: "시크", text: "덱에서 원하는 1장을 패로", act: "seek" },
  S7: { id: "S7", t: "spell", cost: 3, name: "오버로드", text: "자신 몬스터 전체의 공격 +3(이번 턴)", act: "buffAllTurn", val: 3 },
  S9: { id: "S9", t: "spell", cost: 3, name: "사이펀", text: "상대에게 5 데미지 + 자신 체력 5 회복", act: "siphon", val: 5, val2: 5 },
  S12: { id: "S12", t: "spell", cost: 3, name: "강화 주문", text: "자신 몬스터 1체에 공격+3 / 방어+3(영구)", act: "buffPerm", val: 3, val2: 3 },
  S13: { id: "S13", t: "spell", cost: 4, name: "메테오", text: "상대 체력에 8 데미지", act: "dmg", val: 8 },
  S14: { id: "S14", t: "spell", cost: 4, name: "대지의 축복", text: "체력 10 회복 + 카드 1장 드로우", act: "heal", val: 10, val2: 1 },
  S15: { id: "S15", t: "spell", cost: 4, name: "룬 파열", text: "적 몬스터 1체를 파괴", act: "destroyMon" },
  // Traps (vals follow the same curve as the generated traps → monotonic)
  T1: { id: "T1", t: "trap", cost: 1, name: "하프 가드", text: "공격 절반 + 공격측에 1 데미지", react: "half", val: 1 },
  T8: { id: "T8", t: "trap", cost: 1, name: "가시 덫", text: "공격을 받으면 공격측에 2 데미지", react: "spikes", val: 2 },
  T2: { id: "T2", t: "trap", cost: 2, name: "널 필드", text: "상대가 발동한 마법 1장을 무효화", react: "nullspell" },
  T3: { id: "T3", t: "trap", cost: 2, name: "함정 구덩이", text: "상대가 소환한 몬스터를 파괴", react: "pitfall" },
  T6: { id: "T6", t: "trap", cost: 2, name: "카운터 서지", text: "공격 몬스터 파괴 + 공격력 절반 반사", react: "counter" },
  T9: { id: "T9", t: "trap", cost: 2, name: "역류", text: "이번 공격을 무효화한다", react: "fullguard" },
  T4: { id: "T4", t: "trap", cost: 3, name: "미러 손", text: "공격해온 몬스터의 공격력만큼 반사", react: "reflect" },
  T10: { id: "T10", t: "trap", cost: 3, name: "영혼 포식", text: "공격 몬스터 파괴 + 체력 5 회복", react: "devour", val: 5 },
  T11: { id: "T11", t: "trap", cost: 3, name: "시간 왜곡", text: "공격을 받으면 카드 3장 드로우", react: "drawtrap", val: 3 },
  T12: { id: "T12", t: "trap", cost: 4, name: "절대 방벽", text: "이번 공격 무효 + 공격 몬스터 방어 -4(영구)", react: "bulwark", val: 4 },
  T13: { id: "T13", t: "trap", cost: 4, name: "천벌", text: "공격 몬스터 파괴 + 상대 체력에 7 데미지", react: "judgment", val: 7 },
  // Special token (꽝 from treasure) — never appears in markets (cost 0)
  MIMIC: { id: "MIMIC", t: "mon", cost: 0, name: "미믹", atk: 3, def: 2, text: "보물상자 꽝으로 상대 필드에 소환된다" },
  // Trap-destroy spells (no art yet → ◆ placeholder)
  SX2: { id: "SX2", t: "spell", cost: 2, name: "파훼술", text: "상대의 세트 함정 1장 파괴", act: "destroyTrap", val: 1 },
  SX4: { id: "SX4", t: "spell", cost: 4, name: "봉인 해제", text: "상대의 세트 함정 2장 파괴", act: "destroyTrap", val: 2 },
  SX6: { id: "SX6", t: "spell", cost: 6, name: "함정 붕괴", text: "상대의 세트 함정 전부 파괴 + 1장 드로우", act: "destroyTrap", val: 99, val2: 1 },
  // Persistent enchantment spells (stay on the field for a duration)
  E1: { id: "E1", t: "spell", cost: 3, name: "봉쇄령", text: "2턴 동안 상대는 코스트 3 이하 몬스터를 소환할 수 없다", ench: "noSummonLow", val: 2 },
  E2: { id: "E2", t: "spell", cost: 3, name: "평화 협정", text: "3턴 동안 서로 몬스터로 공격할 수 없다", ench: "noAttack", val: 3 },
  E3: { id: "E3", t: "spell", cost: 3, name: "지식의 샘", text: "자신의 4턴 동안 턴 시작시 1장 추가 드로우", ench: "bonusDraw", val: 4, val2: 1 },
  // ---- Tribe monsters (slightly weaker stats; synergy bonuses once per game) ----
  // 고독(Solitary)
  TSO2: { id: "TSO2", t: "mon", cost: 2, name: "외로운 늑대", atk: 4, def: 2, tribe: "고독", text: "[고독] 동족 시너지" },
  TSO5: { id: "TSO5", t: "mon", cost: 5, name: "고독한 방랑자", atk: 5, def: 5, tribe: "고독", text: "[고독] 동족 시너지" },
  TSO7: { id: "TSO7", t: "mon", cost: 7, name: "고독한 군주", atk: 7, def: 7, tribe: "고독", text: "[고독] 동족 시너지" },
  // 고귀(Noble)
  TNO2: { id: "TNO2", t: "mon", cost: 2, name: "고귀한 기사", atk: 4, def: 2, tribe: "고귀", text: "[고귀] 동족 시너지" },
  TNO5: { id: "TNO5", t: "mon", cost: 5, name: "고귀한 성기사", atk: 5, def: 5, tribe: "고귀", text: "[고귀] 동족 시너지" },
  TNO7: { id: "TNO7", t: "mon", cost: 7, name: "고귀한 대공", atk: 7, def: 7, tribe: "고귀", text: "[고귀] 동족 시너지" },
  // 포식(Devour)
  TPO2: { id: "TPO2", t: "mon", cost: 2, name: "굶주린 짐승", atk: 4, def: 2, tribe: "포식", text: "[포식] 동족 시너지" },
  TPO5: { id: "TPO5", t: "mon", cost: 5, name: "포식자", atk: 5, def: 5, tribe: "포식", text: "[포식] 동족 시너지" },
  TPO7: { id: "TPO7", t: "mon", cost: 7, name: "포식의 군주", atk: 7, def: 7, tribe: "포식", text: "[포식] 동족 시너지" },
  // 귀족(Aristocrat)
  TAR2: { id: "TAR2", t: "mon", cost: 2, name: "몰락 귀족", atk: 4, def: 2, tribe: "귀족", text: "[귀족] 동족 시너지" },
  TAR5: { id: "TAR5", t: "mon", cost: 5, name: "귀족 영주", atk: 5, def: 5, tribe: "귀족", text: "[귀족] 동족 시너지" },
  TAR7: { id: "TAR7", t: "mon", cost: 7, name: "귀족 왕", atk: 7, def: 7, tribe: "귀족", text: "[귀족] 동족 시너지" },
};

// Tribe synergy descriptions (shown when the player taps a tribe tag).
export const TRIBES: Record<string, { name: string; bonuses: string[] }> = {
  "고독": { name: "고독", bonuses: ["2마리 소환: 최대 체력 +10", "3마리 소환: 최대 체력 +30, 최대 마나 +1"] },
  "고귀": { name: "고귀", bonuses: ["2마리 소환: 최대 마나 +1", "3마리 소환: 최대 마나 +3, 상대 함정 2장 파괴"] },
  "포식": { name: "포식", bonuses: ["2마리 소환: 상대 몬스터 1체 파괴 + 상대에게 4 데미지", "3마리 소환: 상대 몬스터 2체 파괴 + 상대에게 10 데미지"] },
  "귀족": { name: "귀족", bonuses: ["2마리 소환: 자신의 최대 마나 -1", "3마리 소환: 최대 마나 +5, 매 턴 +2 드로우(영구), 최대 체력 +15"] },
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
  { nouns: ["광전사", "약탈자", "맹수"], atk: (c) => R(c * 1.7), def: (c) => R(c * 0.6) },
  { nouns: ["수호자", "성벽", "거인"], atk: (c) => R(c * 0.7), def: (c) => R(c * 1.8) },
  { nouns: ["기사", "용병", "전사"], atk: (c) => R(c * 1.2), def: (c) => R(c * 1.05) },
  { nouns: ["드레이크", "폭격수", "화염술사"], atk: (c) => R(c * 1.35), def: (c) => R(c * 0.7), mk: (c) => ({ onSummon: "burn", val: R(c * 0.8), text: `소환시: 상대 체력에 ${R(c * 0.8)} 데미지` }) },
  { nouns: ["사제", "수도승", "치유사"], atk: (c) => R(c * 0.75), def: (c) => R(c * 1.5), mk: (c) => ({ onSummon: "heal", val: R(c * 1.4), text: `소환시: 체력 ${R(c * 1.4)} 회복` }) },
  { nouns: ["정찰병", "탐색자", "사냥꾼"], atk: (c) => R(c * 1.05), def: (c) => R(c * 1.0), mk: (c) => ({ onSummon: "draw", val: R(c / 3) + 1, text: `소환시: ${R(c / 3) + 1}장 드로우` }) },
  { nouns: ["주술사", "저주술사", "마녀"], atk: (c) => R(c * 1.2), def: (c) => R(c * 0.9), mk: (c) => ({ onSummon: "defDown", val: R(c * 0.8), text: `소환시: 적 몬스터 방어 -${R(c * 0.8)}(영구)` }) },
  { nouns: ["지휘관", "장군", "대장"], atk: (c) => R(c * 1.45), def: (c) => R(c * 0.95), mk: () => ({ condAtk: "twoPlus", text: "아군 몬스터 2체 이상이면 공격 +2" }) },
  { nouns: ["파괴자", "해체자", "공성병"], atk: (c) => R(c * 1.3), def: (c) => R(c * 0.95), mk: () => ({ onSummon: "breaktrap", text: "소환시: 상대의 세트 함정 1장 파괴" }) },
];

interface FxTpl { nouns: string[]; mk: (c: number) => Partial<CardDef> & { text: string }; }
const SPELL_TPL: FxTpl[] = [
  { nouns: ["화염구", "작렬", "겁화"], mk: (c) => ({ act: "dmg", val: R(c * 2), text: `상대 체력에 ${R(c * 2)} 데미지` }) },
  { nouns: ["한파", "빙결", "서리창"], mk: (c) => ({ act: "dmg", val: R(c * 1.6), play: Math.max(1, c - 2), text: `상대 체력에 ${R(c * 1.6)} 데미지 (시전 ${Math.max(1, c - 2)})` }) },
  { nouns: ["치유술", "회복", "생명의 빛"], mk: (c) => ({ act: "heal", val: R(c * 1.8), text: `체력 ${R(c * 1.8)} 회복` }) },
  { nouns: ["통찰", "예지", "지식"], mk: (c) => ({ act: "draw", val: R(c / 2) + 1, play: Math.max(1, R(c / 3)), text: `카드 ${R(c / 2) + 1}장 드로우 (시전 ${Math.max(1, R(c / 3))})` }) },
  { nouns: ["강타", "예리함", "투기"], mk: (c) => ({ act: "buffTurn", val: R(c * 1.6), text: `자신 몬스터 1체 공격 +${R(c * 1.6)}(이번 턴)` }) },
  { nouns: ["진군", "돌격 명령", "전군 강화"], mk: (c) => ({ act: "buffAllTurn", val: R(c * 0.9), text: `아군 전체 공격 +${R(c * 0.9)}(이번 턴)` }) },
  { nouns: ["룬 각인", "축복", "룬 강화"], mk: (c) => ({ act: "buffPerm", val: R(c * 0.8), val2: R(c * 0.8), text: `자신 몬스터 1체 공격+${R(c * 0.8)}/방어+${R(c * 0.8)}(영구)` }) },
  { nouns: ["파멸", "소멸", "붕괴"], mk: () => ({ act: "destroyMon", text: "적 몬스터 1체를 파괴" }) },
  { nouns: ["약화", "쇠약", "부식"], mk: (c) => ({ act: "weaken", val: R(c * 1.3), text: `적 몬스터 1체 방어 -${R(c * 1.3)}(영구)` }) },
  { nouns: ["생명 갈취", "착취", "흡수"], mk: (c) => ({ act: "siphon", val: R(c * 1.4), val2: R(c * 1.1), text: `상대에게 ${R(c * 1.4)} 데미지 + 체력 ${R(c * 1.1)} 회복` }) },
  { nouns: ["마나 결정", "룬 충전"], mk: (c) => ({ act: "manaUp", val: c >= 10 ? 2 : 1, play: 1, text: `최대 마나 +${c >= 10 ? 2 : 1} (시전 1)` }) },
  { nouns: ["시장 교란", "혼란"], mk: (c) => ({ act: "crash", val2: R(c / 3), play: Math.max(1, c - 2), text: `상대 제시 강제 갱신 + ${R(c / 3)}장 드로우 (시전 ${Math.max(1, c - 2)})` }) },
];

const TRAP_TPL: FxTpl[] = [
  { nouns: ["방어 태세", "수비 진형"], mk: (c) => ({ react: "half", val: R(c * 0.6), text: `공격 절반 + 공격측에 ${R(c * 0.6)} 데미지` }) },
  { nouns: ["무효화", "차단막"], mk: () => ({ react: "fullguard", text: "이번 공격을 무효화한다" }) },
  { nouns: ["반사막", "거울 장막"], mk: () => ({ react: "reflect", text: "공격해온 몬스터의 공격력만큼 반사" }) },
  { nouns: ["역습", "반격"], mk: () => ({ react: "counter", text: "공격 몬스터 파괴 + 공격력 절반 반사" }) },
  { nouns: ["포식", "집어삼킴"], mk: (c) => ({ react: "devour", val: R(c * 1.4) + 1, text: `공격 몬스터 파괴 + 체력 ${R(c * 1.4) + 1} 회복` }) },
  { nouns: ["심판", "천벌"], mk: (c) => ({ react: "judgment", val: R(c * 1.5) + 1, text: `공격 몬스터 파괴 + 상대 체력에 ${R(c * 1.5) + 1} 데미지` }) },
  { nouns: ["가시 함정", "철침 덫"], mk: (c) => ({ react: "spikes", val: R(c * 1.3) + 1, text: `공격을 받으면 공격측에 ${R(c * 1.3) + 1} 데미지` }) },
  { nouns: ["시간 왜곡", "예지의 덫"], mk: (c) => ({ react: "drawtrap", val: R(c / 2) + 1, text: `공격을 받으면 ${R(c / 2) + 1}장 드로우` }) },
  { nouns: ["방벽", "철벽"], mk: (c) => ({ react: "bulwark", val: R(c), text: `이번 공격 무효 + 공격 몬스터 방어 -${R(c)}(영구)` }) },
  { nouns: ["가시 갑옷", "복수의 가시"], mk: (c) => ({ react: "thorns", val: R(c * 1.3), text: `공격을 받으면 ${R(c * 1.3)} 반사` }) },
];

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
// markets never offer the Mimic token (cost 0) — excluded from buyable pool
export const BUYABLE_POOL = ALL_IDS.filter((id) => DB[id].cost > 0);

export function idsOfCost(cost: number): string[] {
  return BUYABLE_POOL.filter((id) => DB[id].cost === cost);
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
