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
  T8: { id: "T8", t: "trap", cost: 1, name: "가시 덫", text: "공격을 받으면 공격측에 4 데미지", react: "spikes", val: 4 },
  T2: { id: "T2", t: "trap", cost: 2, name: "널 필드", text: "상대가 발동한 마법 1장을 무효화", react: "nullspell" },
  T3: { id: "T3", t: "trap", cost: 2, name: "함정 구덩이", text: "상대가 소환한 몬스터를 파괴", react: "pitfall" },
  T6: { id: "T6", t: "trap", cost: 2, name: "카운터 서지", text: "공격 몬스터 파괴 + 공격력 절반 반사", react: "counter" },
  T9: { id: "T9", t: "trap", cost: 2, name: "역류", text: "공격 무효 + 공격측에 2 데미지", react: "fullguard", val: 2 },
  T4: { id: "T4", t: "trap", cost: 3, name: "미러 손", text: "공격해온 몬스터의 공격력만큼 반사", react: "reflect" },
  T10: { id: "T10", t: "trap", cost: 3, name: "영혼 포식", text: "공격 몬스터 파괴 + 체력 7 회복", react: "devour", val: 7 },
  T11: { id: "T11", t: "trap", cost: 3, name: "시간 왜곡", text: "공격을 받으면 카드 3장 드로우", react: "drawtrap", val: 3 },
  T12: { id: "T12", t: "trap", cost: 4, name: "절대 방벽", text: "이번 공격 무효 + 공격 몬스터 방어 -6(영구)", react: "bulwark", val: 6 },
  T13: { id: "T13", t: "trap", cost: 4, name: "천벌", text: "공격 몬스터 파괴 + 상대 체력에 10 데미지", react: "judgment", val: 10 },
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
  // ---- draw cards (spells + monsters) ----
  ND2: { id: "ND2", t: "spell", cost: 2, name: "예지의 룬", text: "카드 2장 드로우 (시전 1)", act: "draw", val: 2, play: 1 },
  ND3: { id: "ND3", t: "spell", cost: 3, name: "현자의 예언", text: "카드 3장 드로우 (시전 2)", act: "draw", val: 3, play: 2 },
  ND5: { id: "ND5", t: "spell", cost: 5, name: "고대의 지식", text: "카드 5장 드로우 (시전 3)", act: "draw", val: 5, play: 3 },
  NMD2: { id: "NMD2", t: "mon", cost: 2, name: "탐서 정령", atk: 2, def: 2, text: "소환시: 카드 1장 드로우", onSummon: "draw", val: 1 },
  NMD4: { id: "NMD4", t: "mon", cost: 4, name: "기록자", atk: 3, def: 4, text: "소환시: 카드 2장 드로우", onSummon: "draw", val: 2 },
  NMD6: { id: "NMD6", t: "mon", cost: 6, name: "대현자", atk: 5, def: 5, text: "소환시: 카드 3장 드로우", onSummon: "draw", val: 3 },
  // ---- extreme stat monsters ----
  NGA3: { id: "NGA3", t: "mon", cost: 3, name: "유리 대포", atk: 9, def: 1, text: "공격 특화 (방어 매우 낮음)" },
  NGA4: { id: "NGA4", t: "mon", cost: 4, name: "광폭한 검귀", atk: 13, def: 0, text: "공격 특화 (방어 0)" },
  NWL3: { id: "NWL3", t: "mon", cost: 3, name: "바위 거북", atk: 1, def: 11, text: "방어 특화 (공격 매우 낮음)" },
  NWL4: { id: "NWL4", t: "mon", cost: 4, name: "철벽 수문장", atk: 0, def: 15, text: "방어 특화 (공격 0)" },
  // ---- fragile but strong effect monsters ----
  NHEX: { id: "NHEX", t: "mon", cost: 3, name: "꼬마 주술사", atk: 0, def: 1, text: "소환시: 상대 체력에 6 데미지", onSummon: "burn", val: 6 },
  NSPR: { id: "NSPR", t: "mon", cost: 4, name: "수정 정령", atk: 0, def: 2, text: "필드에 있는 동안 최대 마나 +1, 소환시 2장 드로우", aura: "mana1", onSummon: "draw", val: 2 },
  // ---- Attune variants ----
  AHEUK: { id: "AHEUK", t: "spell", cost: 6, name: "어튠 - 흑", text: "상대 최대 마나 -1. 자신 필드 몬스터 1 이하면 추가로 -1 (시전 4)", act: "manaDown", play: 4 },
  AJIN: { id: "AJIN", t: "spell", cost: 4, name: "어튠 - 진", text: "최대 마나 +1, 묘지에 어튠 1장 추가", act: "manaUpGain" },
  AMA: { id: "AMA", t: "spell", cost: 2, name: "어튠 - 마", text: "패의 보물상자 1장을 묘지로 → 최대 마나 +1, 1장 드로우", act: "chestToMana" },
  // ---- persistent / conditional ----
  NHEAL: { id: "NHEAL", t: "spell", cost: 3, name: "생명의 가호", text: "영구: 몬스터를 소환할 때마다 체력 1 회복", ench: "healSummon", val: 99, val2: 1 },
  NWIPE: { id: "NWIPE", t: "spell", cost: 5, name: "정화의 폭발", text: "자신 필드에 몬스터가 없을 때만. 상대 함정·마법 전부 파괴 후 자신 6 데미지", act: "wipeBack" },
};

// Tribe synergy descriptions (shown when the player taps a tribe tag).
interface TribeInfo { name: string; note: string; bonuses: string[]; }
export const TRIBES: Record<string, { ko: TribeInfo; ja: TribeInfo }> = {
  "고독": {
    ko: { name: "고독", note: "※ 서로 다른 종족 카드여야 발동 (같은 카드 2장은 X)", bonuses: ["서로 다른 2종: 최대 체력 +10", "서로 다른 3종: 최대 체력 +30, 최대 마나 +1"] },
    ja: { name: "孤独", note: "※ 異なる種族カードが必要 (同じカード2枚は不可)", bonuses: ["異なる2種: 最大体力 +10", "異なる3種: 最大体力 +30, 最大マナ +1"] },
  },
  "고귀": {
    ko: { name: "고귀", note: "※ 서로 다른 종족 카드여야 발동", bonuses: ["서로 다른 2종: 최대 마나 +1", "서로 다른 3종: 최대 마나 +3, 상대 함정 2장 파괴"] },
    ja: { name: "高貴", note: "※ 異なる種族カードが必要", bonuses: ["異なる2種: 最大マナ +1", "異なる3種: 最大マナ +3, 相手の罠2枚を破壊"] },
  },
  "포식": {
    ko: { name: "포식", note: "※ 서로 다른 종족 카드여야 발동", bonuses: ["서로 다른 2종: 상대 몬스터 1체 파괴 + 상대에게 4 데미지", "서로 다른 3종: 상대 몬스터 2체 파괴 + 상대에게 10 데미지"] },
    ja: { name: "捕食", note: "※ 異なる種族カードが必要", bonuses: ["異なる2種: 相手モンスター1体破壊 + 相手に4ダメージ", "異なる3種: 相手モンスター2体破壊 + 相手に10ダメージ"] },
  },
  "귀족": {
    ko: { name: "귀족", note: "※ 서로 다른 종족 카드여야 발동", bonuses: ["서로 다른 2종: 자신의 최대 마나 -1", "서로 다른 3종: 최대 마나 +5, 매 턴 +2 드로우(영구), 최대 체력 +15"] },
    ja: { name: "貴族", note: "※ 異なる種族カードが必要", bonuses: ["異なる2種: 自分の最大マナ -1", "異なる3種: 最大マナ +5, 毎ターン+2ドロー(永続), 最大体力 +15"] },
  },
};

// ---------------- generated high-cost curve (cost 5–12) ----------------
const R = (n: number) => Math.max(1, Math.round(n));
const PREFIX = ["고대의", "심연의", "강철의", "화염의", "서리의", "폭풍의", "황금의", "저주받은", "신성한", "그림자", "용암의", "천공의", "피의", "비취의", "흑요석", "은빛", "파멸의", "여명의", "심판의", "광휘의", "태초의", "무한의", "공허의", "붕괴의"];
const PREFIX_JA = ["古代の", "深淵の", "鋼鉄の", "業火の", "氷霜の", "嵐の", "黄金の", "呪われし", "神聖な", "影の", "溶岩の", "天空の", "血の", "翡翠の", "黒曜石の", "銀の", "破滅の", "黎明の", "審判の", "光輝の", "太初の", "無限の", "虚空の", "崩壊の"];
let pfx = 0;
const usedNames = new Set<string>();
const ROMAN = ["", " II", " III", " IV", " V", " VI"];
function nextName(nounKo: string, nounJa: string): { ko: string; ja: string } {
  const idx = pfx++ % PREFIX.length;
  const baseKo = `${PREFIX[idx]} ${nounKo}`;
  const baseJa = `${PREFIX_JA[idx]}${nounJa}`;
  let suffix = "", k = 1;
  while (usedNames.has(baseKo + suffix)) { suffix = ROMAN[k] ?? ` ${k + 1}`; k++; }
  usedNames.add(baseKo + suffix);
  return { ko: baseKo + suffix, ja: baseJa + suffix };
}

type Ext = Partial<CardDef> & { text: string; textJa: string };
interface MonTpl { nouns: string[]; nounsJa: string[]; atk: (c: number) => number; def: (c: number) => number; mk?: (c: number) => Ext; }
const MON_TPL: MonTpl[] = [
  { nouns: ["광전사", "약탈자", "맹수"], nounsJa: ["狂戦士", "略奪者", "猛獣"], atk: (c) => R(c * 1.7), def: (c) => R(c * 0.6) },
  { nouns: ["수호자", "성벽", "거인"], nounsJa: ["守護者", "城壁", "巨人"], atk: (c) => R(c * 0.7), def: (c) => R(c * 1.8) },
  { nouns: ["기사", "용병", "전사"], nounsJa: ["騎士", "傭兵", "戦士"], atk: (c) => R(c * 1.2), def: (c) => R(c * 1.05) },
  { nouns: ["드레이크", "폭격수", "화염술사"], nounsJa: ["ドレイク", "爆撃手", "火術士"], atk: (c) => R(c * 1.35), def: (c) => R(c * 0.7), mk: (c) => ({ onSummon: "burn", val: R(c * 0.8), text: `소환시: 상대 체력에 ${R(c * 0.8)} 데미지`, textJa: `召喚時: 相手の体力に${R(c * 0.8)}ダメージ` }) },
  { nouns: ["사제", "수도승", "치유사"], nounsJa: ["司祭", "修道僧", "治癒師"], atk: (c) => R(c * 0.75), def: (c) => R(c * 1.5), mk: (c) => ({ onSummon: "heal", val: R(c * 1.4), text: `소환시: 체력 ${R(c * 1.4)} 회복`, textJa: `召喚時: 体力${R(c * 1.4)}回復` }) },
  { nouns: ["정찰병", "탐색자", "사냥꾼"], nounsJa: ["斥候", "探索者", "狩人"], atk: (c) => R(c * 1.05), def: (c) => R(c * 1.0), mk: (c) => ({ onSummon: "draw", val: R(c / 3) + 1, text: `소환시: ${R(c / 3) + 1}장 드로우`, textJa: `召喚時: ${R(c / 3) + 1}枚ドロー` }) },
  { nouns: ["주술사", "저주술사", "마녀"], nounsJa: ["呪術師", "呪詛師", "魔女"], atk: (c) => R(c * 1.2), def: (c) => R(c * 0.9), mk: (c) => ({ onSummon: "defDown", val: R(c * 0.8), text: `소환시: 적 몬스터 방어 -${R(c * 0.8)}(영구)`, textJa: `召喚時: 敵モンスターの防御-${R(c * 0.8)}(永続)` }) },
  { nouns: ["지휘관", "장군", "대장"], nounsJa: ["指揮官", "将軍", "隊長"], atk: (c) => R(c * 1.45), def: (c) => R(c * 0.95), mk: () => ({ condAtk: "twoPlus", text: "아군 몬스터 2체 이상이면 공격 +2", textJa: "味方モンスター2体以上で攻撃+2" }) },
  { nouns: ["파괴자", "해체자", "공성병"], nounsJa: ["破壊者", "解体者", "攻城兵"], atk: (c) => R(c * 1.3), def: (c) => R(c * 0.95), mk: () => ({ onSummon: "breaktrap", text: "소환시: 상대의 세트 함정 1장 파괴", textJa: "召喚時: 相手のセット罠1枚を破壊" }) },
];

interface FxTpl { nouns: string[]; nounsJa: string[]; mk: (c: number) => Ext; }
const SPELL_TPL: FxTpl[] = [
  { nouns: ["화염구", "작렬", "겁화"], nounsJa: ["火球", "炸裂", "劫火"], mk: (c) => ({ act: "dmg", val: R(c * 2), text: `상대 체력에 ${R(c * 2)} 데미지`, textJa: `相手の体力に${R(c * 2)}ダメージ` }) },
  { nouns: ["한파", "빙결", "서리창"], nounsJa: ["寒波", "氷結", "霜槍"], mk: (c) => ({ act: "dmg", val: R(c * 1.6), play: Math.max(1, c - 2), text: `상대 체력에 ${R(c * 1.6)} 데미지 (시전 ${Math.max(1, c - 2)})`, textJa: `相手の体力に${R(c * 1.6)}ダメージ (発動${Math.max(1, c - 2)})` }) },
  { nouns: ["치유술", "회복", "생명의 빛"], nounsJa: ["治癒術", "回復", "生命の光"], mk: (c) => ({ act: "heal", val: R(c * 1.8), text: `체력 ${R(c * 1.8)} 회복`, textJa: `体力${R(c * 1.8)}回復` }) },
  { nouns: ["통찰", "예지", "지식"], nounsJa: ["洞察", "予知", "知識"], mk: (c) => ({ act: "draw", val: R(c / 2) + 1, play: Math.max(1, R(c / 3)), text: `카드 ${R(c / 2) + 1}장 드로우 (시전 ${Math.max(1, R(c / 3))})`, textJa: `カード${R(c / 2) + 1}枚ドロー (発動${Math.max(1, R(c / 3))})` }) },
  { nouns: ["강타", "예리함", "투기"], nounsJa: ["強打", "鋭利", "闘気"], mk: (c) => ({ act: "buffTurn", val: R(c * 1.6), text: `자신 몬스터 1체 공격 +${R(c * 1.6)}(이번 턴)`, textJa: `自分のモンスター1体の攻撃+${R(c * 1.6)}(このターン)` }) },
  { nouns: ["진군", "돌격 명령", "전군 강화"], nounsJa: ["進軍", "突撃命令", "全軍強化"], mk: (c) => ({ act: "buffAllTurn", val: R(c * 0.9), text: `아군 전체 공격 +${R(c * 0.9)}(이번 턴)`, textJa: `味方全体の攻撃+${R(c * 0.9)}(このターン)` }) },
  { nouns: ["룬 각인", "축복", "룬 강화"], nounsJa: ["ルーン刻印", "祝福", "ルーン強化"], mk: (c) => ({ act: "buffPerm", val: R(c * 0.8), val2: R(c * 0.8), text: `자신 몬스터 1체 공격+${R(c * 0.8)}/방어+${R(c * 0.8)}(영구)`, textJa: `自分のモンスター1体の攻撃+${R(c * 0.8)}/防御+${R(c * 0.8)}(永続)` }) },
  { nouns: ["파멸", "소멸", "붕괴"], nounsJa: ["破滅", "消滅", "崩壊"], mk: () => ({ act: "destroyMon", text: "적 몬스터 1체를 파괴", textJa: "敵モンスター1体を破壊" }) },
  { nouns: ["약화", "쇠약", "부식"], nounsJa: ["弱化", "衰弱", "腐食"], mk: (c) => ({ act: "weaken", val: R(c * 1.3), text: `적 몬스터 1체 방어 -${R(c * 1.3)}(영구)`, textJa: `敵モンスター1体の防御-${R(c * 1.3)}(永続)` }) },
  { nouns: ["생명 갈취", "착취", "흡수"], nounsJa: ["生命奪取", "搾取", "吸収"], mk: (c) => ({ act: "siphon", val: R(c * 1.4), val2: R(c * 1.1), text: `상대에게 ${R(c * 1.4)} 데미지 + 체력 ${R(c * 1.1)} 회복`, textJa: `相手に${R(c * 1.4)}ダメージ + 体力${R(c * 1.1)}回復` }) },
  { nouns: ["마나 결정", "룬 충전"], nounsJa: ["マナ結晶", "ルーン充填"], mk: (c) => ({ act: "manaUp", val: c >= 10 ? 2 : 1, play: 1, text: `최대 마나 +${c >= 10 ? 2 : 1} (시전 1)`, textJa: `最大マナ+${c >= 10 ? 2 : 1} (発動1)` }) },
  { nouns: ["시장 교란", "혼란"], nounsJa: ["市場攪乱", "混乱"], mk: (c) => ({ act: "crash", val2: R(c / 3), play: Math.max(1, c - 2), text: `상대 제시 강제 갱신 + ${R(c / 3)}장 드로우 (시전 ${Math.max(1, c - 2)})`, textJa: `相手の提示を強制更新 + ${R(c / 3)}枚ドロー (発動${Math.max(1, c - 2)})` }) },
];

const TRAP_TPL: FxTpl[] = [
  { nouns: ["방어 태세", "수비 진형"], nounsJa: ["防御態勢", "守備陣形"], mk: (c) => ({ react: "half", val: R(c * 1.0), text: `공격 절반 + 공격측에 ${R(c * 1.0)} 데미지`, textJa: `攻撃を半減 + 攻撃側に${R(c * 1.0)}ダメージ` }) },
  { nouns: ["무효화", "차단막"], nounsJa: ["無効化", "遮断幕"], mk: (c) => ({ react: "fullguard", val: R(c * 0.9), text: `공격 무효 + 공격측에 ${R(c * 0.9)} 데미지`, textJa: `攻撃無効 + 攻撃側に${R(c * 0.9)}ダメージ` }) },
  { nouns: ["반사막", "거울 장막"], nounsJa: ["反射膜", "鏡の帳"], mk: () => ({ react: "reflect", text: "공격해온 몬스터의 공격력만큼 반사", textJa: "攻撃モンスターの攻撃力分を反射" }) },
  { nouns: ["역습", "반격"], nounsJa: ["逆襲", "反撃"], mk: () => ({ react: "counter", text: "공격 몬스터 파괴 + 공격력 절반 반사", textJa: "攻撃モンスターを破壊 + 攻撃力の半分を反射" }) },
  { nouns: ["포식", "집어삼킴"], nounsJa: ["捕食", "丸呑み"], mk: (c) => ({ react: "devour", val: R(c * 1.6) + 2, text: `공격 몬스터 파괴 + 체력 ${R(c * 1.6) + 2} 회복`, textJa: `攻撃モンスターを破壊 + 体力${R(c * 1.6) + 2}回復` }) },
  { nouns: ["심판", "천벌"], nounsJa: ["審判", "天罰"], mk: (c) => ({ react: "judgment", val: R(c * 1.9) + 2, text: `공격 몬스터 파괴 + 상대 체력에 ${R(c * 1.9) + 2} 데미지`, textJa: `攻撃モンスターを破壊 + 相手の体力に${R(c * 1.9) + 2}ダメージ` }) },
  { nouns: ["가시 함정", "철침 덫"], nounsJa: ["棘の罠", "鉄針の罠"], mk: (c) => ({ react: "spikes", val: R(c * 1.6) + 2, text: `공격을 받으면 공격측에 ${R(c * 1.6) + 2} 데미지`, textJa: `攻撃を受けると攻撃側に${R(c * 1.6) + 2}ダメージ` }) },
  { nouns: ["시간 왜곡", "예지의 덫"], nounsJa: ["時間歪曲", "予知の罠"], mk: (c) => ({ react: "drawtrap", val: R(c * 0.7) + 1, text: `공격을 받으면 ${R(c * 0.7) + 1}장 드로우`, textJa: `攻撃を受けると${R(c * 0.7) + 1}枚ドロー` }) },
  { nouns: ["방벽", "철벽"], nounsJa: ["防壁", "鉄壁"], mk: (c) => ({ react: "bulwark", val: R(c * 1.4), text: `이번 공격 무효 + 공격 몬스터 방어 -${R(c * 1.4)}(영구)`, textJa: `この攻撃を無効 + 攻撃モンスターの防御-${R(c * 1.4)}(永続)` }) },
  { nouns: ["가시 갑옷", "복수의 가시"], nounsJa: ["棘の鎧", "復讐の棘"], mk: (c) => ({ react: "thorns", val: R(c * 1.7), text: `공격을 받으면 ${R(c * 1.7)} 반사`, textJa: `攻撃を受けると${R(c * 1.7)}反射` }) },
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
      const nn = nextName(tpl.nouns[i % tpl.nouns.length], tpl.nounsJa[i % tpl.nounsJa.length]);
      const extra = tpl.mk ? tpl.mk(c) : { text: "—", textJa: "—" };
      out[id] = { id, t: "mon", cost: c, name: nn.ko, nameJa: nn.ja, atk: tpl.atk(c), def: tpl.def(c), ...extra };
    }
    for (let i = 0; i < ns; i++) {
      const tpl = SPELL_TPL[i % SPELL_TPL.length];
      const id = `GS${c}_${i}`;
      const nn = nextName(tpl.nouns[i % tpl.nouns.length], tpl.nounsJa[i % tpl.nounsJa.length]);
      out[id] = { id, t: "spell", cost: c, name: nn.ko, nameJa: nn.ja, ...tpl.mk(c) };
    }
    for (let i = 0; i < nt; i++) {
      const tpl = TRAP_TPL[i % TRAP_TPL.length];
      const id = `GT${c}_${i}`;
      const nn = nextName(tpl.nouns[i % tpl.nouns.length], tpl.nounsJa[i % tpl.nounsJa.length]);
      out[id] = { id, t: "trap", cost: c, name: nn.ko, nameJa: nn.ja, ...tpl.mk(c) };
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

// ---- Japanese names/texts for the hand-written cards + starters ----
const CORE_JA: Record<string, { name: string; text?: string }> = {
  M1: { name: "スパーク・インプ" }, M2: { name: "ストーン・パップ" },
  M3: { name: "ダスト・スカウト", text: "召喚時: カード1枚ドロー" },
  M4: { name: "ブレード・ヘア" }, M5: { name: "アイアン・シェル" },
  M6: { name: "ツイン・ファング", text: "召喚時: 敵モンスターの防御-2(永続)" },
  M7: { name: "エンバー・ドレイク", text: "召喚時: 相手の体力に3ダメージ" },
  M8: { name: "グローブ・ウォーデン", text: "召喚時: 体力5回復" },
  M9: { name: "レリック・ハンター", text: "召喚時: 自分の提示を無料更新 + 1枚ドロー" },
  M10: { name: "マナ・ゴーレム", text: "場にいる間 最大マナ+1" },
  M11: { name: "ウォーロード", text: "味方モンスター2体以上で攻撃+2" },
  M12: { name: "タイタン・ゲート" },
  M13: { name: "ヴォイド・リーヴァー", text: "召喚時: 相手のセット罠1枚を破壊" },
  S1: { name: "クイック・ジャブ", text: "相手の体力に2ダメージ" },
  S10: { name: "マナ・チャージ", text: "カード2枚ドロー" },
  S3: { name: "シャープン", text: "自分のモンスター1体の攻撃+3(このターン)" },
  S4: { name: "ダブル・ドロー", text: "カード3枚ドロー (発動1)" },
  S5: { name: "マーケット・クラッシュ", text: "相手の提示を強制更新 + 1枚ドロー (発動1)" },
  S8: { name: "リコール", text: "捨て札から1枚を手札へ" },
  S11: { name: "ファイアボール", text: "相手の体力に4ダメージ" },
  S6: { name: "シーク", text: "デッキから好きな1枚を手札へ" },
  S7: { name: "オーバーロード", text: "自分のモンスター全体の攻撃+3(このターン)" },
  S9: { name: "サイフォン", text: "相手に5ダメージ + 自分の体力5回復" },
  S12: { name: "強化の呪文", text: "自分のモンスター1体に攻撃+3/防御+3(永続)" },
  S13: { name: "メテオ", text: "相手の体力に8ダメージ" },
  S14: { name: "大地の祝福", text: "体力10回復 + カード1枚ドロー" },
  S15: { name: "ルーン爆裂", text: "敵モンスター1体を破壊" },
  T1: { name: "ハーフ・ガード", text: "攻撃を半減 + 攻撃側に1ダメージ" },
  T8: { name: "棘の罠", text: "攻撃を受けると攻撃側に4ダメージ" },
  T2: { name: "ヌル・フィールド", text: "相手が発動した魔法1枚を無効化" },
  T3: { name: "落とし穴", text: "相手が召喚したモンスターを破壊" },
  T6: { name: "カウンター・サージ", text: "攻撃モンスターを破壊 + 攻撃力の半分を反射" },
  T9: { name: "逆流", text: "攻撃無効 + 攻撃側に2ダメージ" },
  T4: { name: "ミラー・ソーン", text: "攻撃モンスターの攻撃力分を反射" },
  T10: { name: "魂の捕食", text: "攻撃モンスターを破壊 + 体力7回復" },
  T11: { name: "時間歪曲", text: "攻撃を受けるとカード3枚ドロー" },
  T12: { name: "絶対防壁", text: "この攻撃を無効 + 攻撃モンスターの防御-6(永続)" },
  T13: { name: "天罰", text: "攻撃モンスターを破壊 + 相手の体力に10ダメージ" },
  MIMIC: { name: "ミミック", text: "宝箱のハズレで相手の場に召喚される" },
  SX2: { name: "罠破り", text: "相手のセット罠1枚を破壊" },
  SX4: { name: "封印解除", text: "相手のセット罠2枚を破壊" },
  SX6: { name: "罠崩し", text: "相手のセット罠を全て破壊 + 1枚ドロー" },
  E1: { name: "封鎖令", text: "2ターンの間 相手はコスト3以下のモンスターを召喚できない" },
  E2: { name: "平和協定", text: "3ターンの間 互いにモンスターで攻撃できない" },
  E3: { name: "知識の泉", text: "自分の4ターンの間 ターン開始時に1枚追加ドロー" },
  TSO2: { name: "孤独な狼", text: "[孤独] 同族シナジー" }, TSO5: { name: "孤独な放浪者", text: "[孤独] 同族シナジー" }, TSO7: { name: "孤独な君主", text: "[孤独] 同族シナジー" },
  TNO2: { name: "高貴な騎士", text: "[高貴] 同族シナジー" }, TNO5: { name: "高貴な聖騎士", text: "[高貴] 同族シナジー" }, TNO7: { name: "高貴な大公", text: "[高貴] 同族シナジー" },
  TPO2: { name: "飢えた獣", text: "[捕食] 同族シナジー" }, TPO5: { name: "捕食者", text: "[捕食] 同族シナジー" }, TPO7: { name: "捕食の君主", text: "[捕食] 同族シナジー" },
  TAR2: { name: "没落貴族", text: "[貴族] 同族シナジー" }, TAR5: { name: "貴族領主", text: "[貴族] 同族シナジー" }, TAR7: { name: "貴族王", text: "[貴族] 同族シナジー" },
  ND2: { name: "予知のルーン", text: "カード2枚ドロー (発動1)" },
  ND3: { name: "賢者の予言", text: "カード3枚ドロー (発動2)" },
  ND5: { name: "古代の知識", text: "カード5枚ドロー (発動3)" },
  NMD2: { name: "探書の精霊", text: "召喚時: カード1枚ドロー" },
  NMD4: { name: "記録者", text: "召喚時: カード2枚ドロー" },
  NMD6: { name: "大賢者", text: "召喚時: カード3枚ドロー" },
  NGA3: { name: "ガラスの大砲", text: "攻撃特化 (防御が非常に低い)" },
  NGA4: { name: "狂暴な剣鬼", text: "攻撃特化 (防御0)" },
  NWL3: { name: "岩亀", text: "防御特化 (攻撃が非常に低い)" },
  NWL4: { name: "鉄壁の門番", text: "防御特化 (攻撃0)" },
  NHEX: { name: "小さな呪術師", text: "召喚時: 相手の体力に6ダメージ" },
  NSPR: { name: "水晶の精霊", text: "場にいる間 最大マナ+1, 召喚時2枚ドロー" },
  AHEUK: { name: "アチューン・黒", text: "相手の最大マナ-1。自分の場のモンスターが1体以下なら追加で-1 (発動4)" },
  AJIN: { name: "アチューン・真", text: "最大マナ+1、捨て札にアチューンを1枚追加" },
  AMA: { name: "アチューン・魔", text: "手札の宝箱1枚を捨て札へ → 最大マナ+1、1枚ドロー" },
  NHEAL: { name: "生命の加護", text: "永続: モンスターを召喚するたびに体力1回復" },
  NWIPE: { name: "浄化の爆発", text: "自分の場にモンスターがいない時のみ。相手の罠・魔法を全て破壊し自分に6ダメージ" },
  STARTER_TRASH: { name: "カル", text: "マナ1: このカードを廃棄(デッキから除去)" },
  STARTER_CHEST: { name: "宝箱", text: "マナ1: 宝箱を開く" },
  STARTER_MANA: { name: "アチューン", text: "マナ3: 最大マナ+1" },
};
for (const id of Object.keys(CORE_JA)) {
  const ja = CORE_JA[id];
  const card = DB[id] || STARTERS[id];
  if (card) { card.nameJa = ja.name; if (ja.text) card.textJa = ja.text; }
}

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
