import { applyEnglish } from "./cards.en.mjs";
import { applyFlavorCardNames } from "./cardNames.flavor.mjs";
import { standardizeCardTexts } from "./cardText.mjs";
// ---------------- core set (cost 1–4) ----------------
const CORE = {
    // Monsters
    M1: { id: "M1", t: "mon", cost: 1, name: "스파크 임프", atk: 3, def: 1, text: "—" },
    M2: { id: "M2", t: "mon", cost: 1, name: "스톤 펍", atk: 1, def: 3, text: "—" },
    M3: { id: "M3", t: "mon", cost: 1, name: "더스트 스카우트", atk: 2, def: 2, text: "소환시: 카드 1장 드로우", onSummon: "draw", val: 1 },
    M4: { id: "M4", t: "mon", cost: 2, name: "블레이드 헤어", atk: 5, def: 2, text: "—" },
    M5: { id: "M5", t: "mon", cost: 2, name: "아이언 셸", atk: 2, def: 5, text: "—" },
    M6: { id: "M6", t: "mon", cost: 2, name: "트윈 팽", atk: 4, def: 3, text: "소환시: 적 몬스터 1체의 체력 -2(지속)", onSummon: "defDown", val: 2 },
    M7: { id: "M7", t: "mon", cost: 3, name: "엠버 드레이크", atk: 7, def: 3, text: "소환시: 상대 체력에 3 데미지", onSummon: "burn", val: 3 },
    M8: { id: "M8", t: "mon", cost: 3, name: "그로브 워든", atk: 4, def: 6, text: "소환시: 자신 체력 5 회복", onSummon: "heal", val: 5 },
    M9: { id: "M9", t: "mon", cost: 3, name: "렐릭 헌터", atk: 5, def: 4, text: "소환시: 자신의 제시를 무료 갱신 + 1장 드로우", onSummon: "refresh" },
    M10: { id: "M10", t: "mon", cost: 3, name: "마나 골렘", atk: 3, def: 5, text: "필드에 있는 동안 최대 마나 +1", aura: "mana1" },
    M11: { id: "M11", t: "mon", cost: 4, name: "워로드", atk: 8, def: 4, text: "아군 몬스터 2체 이상이면 공격력 +2", condAtk: "twoPlus" },
    M12: { id: "M12", t: "mon", cost: 4, name: "타이탄 게이트", atk: 4, def: 8, text: "—" },
    M13: { id: "M13", t: "mon", cost: 4, name: "보이드 리버", atk: 7, def: 5, text: "소환시: 상대의 세트 함정 1장 파괴", onSummon: "breaktrap" },
    // Spells
    S1: { id: "S1", t: "spell", cost: 1, name: "퀵 잽", text: "상대 체력에 2 데미지", act: "dmg", val: 2 },
    S10: { id: "S10", t: "spell", cost: 1, name: "마나 차지", text: "카드 2장 드로우", act: "draw", val: 2, play: 1 },
    S3: { id: "S3", t: "spell", cost: 2, name: "샤픈", text: "자신 몬스터 1체의 공격력 +3(이번 턴)", act: "buffTurn", val: 3 },
    S4: { id: "S4", t: "spell", cost: 2, name: "더블 드로우", text: "카드 3장 드로우 (시전 1)", act: "draw", val: 3, play: 1 },
    S5: { id: "S5", t: "spell", cost: 2, name: "마켓 크래시", text: "상대 제시 강제 갱신 + 1장 드로우 (시전 1)", act: "crash", val2: 1, play: 1 },
    S8: { id: "S8", t: "spell", cost: 2, name: "리콜", text: "버린 패에서 1장을 패로", act: "recall" },
    S11: { id: "S11", t: "spell", cost: 2, name: "파이어볼", text: "상대 체력에 4 데미지", act: "dmg", val: 4 },
    S6: { id: "S6", t: "spell", cost: 3, name: "시크", text: "덱에서 원하는 1장을 패로", act: "seek" },
    S7: { id: "S7", t: "spell", cost: 3, name: "오버로드", text: "자신 몬스터 전체의 공격력 +3(이번 턴)", act: "buffAllTurn", val: 3 },
    S9: { id: "S9", t: "spell", cost: 3, name: "사이펀", text: "상대에게 5 데미지 + 자신 체력 5 회복", act: "siphon", val: 5, val2: 5 },
    S12: { id: "S12", t: "spell", cost: 3, name: "강화 주문", text: "자신 몬스터 1체에 공격력+2 / 체력+2(지속)", act: "buffPerm", val: 2, val2: 2 },
    S13: { id: "S13", t: "spell", cost: 4, name: "메테오", text: "상대 체력에 8 데미지", act: "dmg", val: 8 },
    S14: { id: "S14", t: "spell", cost: 4, name: "대지의 축복", text: "자신 체력 10 회복 + 카드 1장 드로우", act: "heal", val: 10, val2: 1 },
    S15: { id: "S15", t: "spell", cost: 4, name: "룬 파열", text: "적 몬스터 1체를 파괴", act: "destroyMon" },
    // Traps (vals follow the same curve as the generated traps → monotonic)
    T1: { id: "T1", t: "trap", cost: 1, name: "하프 가드", text: "공격 절반 + 공격측에 1 데미지", react: "half", val: 1 },
    T8: { id: "T8", t: "trap", cost: 1, name: "가시 덫", text: "공격을 받으면 공격측에 4 데미지", react: "spikes", val: 4 },
    T2: { id: "T2", t: "trap", cost: 2, name: "널 필드", text: "상대가 발동한 마법 1장을 무효화", react: "nullspell" },
    T3: { id: "T3", t: "trap", cost: 2, name: "함정 구덩이", text: "상대가 소환한 몬스터를 파괴", react: "pitfall" },
    T6: { id: "T6", t: "trap", cost: 2, name: "카운터 서지", text: "공격 몬스터 파괴 + 공격력 절반 반사", react: "counter" },
    T9: { id: "T9", t: "trap", cost: 2, name: "역류", text: "공격 무효 + 공격측에 2 데미지", react: "fullguard", val: 2 },
    T4: { id: "T4", t: "trap", cost: 3, name: "미러 손", text: "공격해온 몬스터의 공격력만큼 반사", react: "reflect" },
    T10: { id: "T10", t: "trap", cost: 3, name: "영혼 포식", text: "공격 몬스터 파괴 + 자신 체력 7 회복", react: "devour", val: 7 },
    T11: { id: "T11", t: "trap", cost: 3, name: "시간 왜곡", text: "공격을 받으면 카드 3장 드로우", react: "drawtrap", val: 3 },
    T12: { id: "T12", t: "trap", cost: 4, name: "절대 방벽", text: "이번 공격 무효 + 공격 몬스터 체력 -6(지속)", react: "bulwark", val: 6 },
    T13: { id: "T13", t: "trap", cost: 4, name: "천벌", text: "공격 몬스터 파괴 + 상대 체력에 10 데미지", react: "judgment", val: 10 },
    // Special token (꽝 from treasure) — never appears in markets (cost 0)
    MIMIC: { id: "MIMIC", t: "mon", cost: 0, name: "미믹", atk: 3, def: 2, text: "보물상자 꽝으로 상대 필드에 소환된다 · 죽으면 게임에서 제외" },
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
    NGA3: { id: "NGA3", t: "mon", cost: 3, name: "유리 대포", atk: 7, def: 1, text: "—" },
    NGA4: { id: "NGA4", t: "mon", cost: 4, name: "광폭한 검귀", atk: 11, def: 1, text: "—" },
    NWL3: { id: "NWL3", t: "mon", cost: 3, name: "바위 거북", atk: 1, def: 8, text: "—" }, // v25: 5→8 (체력 전투 보상)
    NWL4: { id: "NWL4", t: "mon", cost: 3, name: "철벽 수문장", atk: 0, def: 13, text: "—" }, // v25: 4코 0/10 → 3코 0/13
    // ---- fragile but strong effect monsters ----
    NHEX: { id: "NHEX", t: "mon", cost: 3, name: "꼬마 주술사", atk: 0, def: 1, text: "소환시: 상대 체력에 6 데미지", onSummon: "burn", val: 6 },
    NSPR: { id: "NSPR", t: "mon", cost: 4, name: "수정 정령", atk: 0, def: 2, text: "필드에 있는 동안 최대 마나 +1, 소환시 2장 드로우", aura: "mana1", onSummon: "draw", val: 2 },
    // ---- Attune variants ----
    AHEUK: { id: "AHEUK", t: "spell", cost: 6, name: "어튠 - 흑", text: "상대 최대 마나 -1. 자신 필드 몬스터 1 이하면 추가로 -1 (시전 4)", act: "manaDown", play: 4 },
    AJIN: { id: "AJIN", t: "spell", cost: 4, name: "어튠 - 진", text: "최대 마나 +1, 묘지에 어튠 1장 추가", act: "manaUpGain" },
    AMA: { id: "AMA", t: "spell", cost: 2, name: "어튠 - 마", text: "패의 보물상자 1장을 묘지로 → 최대 마나 +1, 1장 드로우", act: "chestToMana" },
    // ---- persistent / conditional ----
    NHEAL: { id: "NHEAL", t: "spell", cost: 3, name: "생명의 가호", text: "영구: 몬스터를 소환할 때마다 자신 체력 1 회복", ench: "healSummon", val: 99, val2: 1 },
    NWIPE: { id: "NWIPE", t: "spell", cost: 5, name: "정화의 폭발", text: "자신 필드에 몬스터가 없을 때만. 상대 함정·마법 전부 파괴 후 자신 6 데미지", act: "wipeBack" },
};
export const TRIBES = {
    "고독": {
        ko: { name: "고독", note: "※ 서로 다른 종족 카드여야 발동 (같은 카드 2장은 X) · 각 단계 보상은 게임당 1회씩 따로 지급", bonuses: ["서로 다른 2종: 최대 체력 +25", "서로 다른 3종: 최대 체력 +50, 최대 마나 +2"] },
        ja: { name: "孤独", note: "※ 異なる種族カードが必要 (同じカード2枚は不可) · 各段階の報酬はゲーム中1回ずつ別々に発生", bonuses: ["異なる2種: 最大体力 +25", "異なる3種: 最大体力 +50, 最大マナ +2"] },
        en: { name: "Solitary", note: "* Requires DIFFERENT cards of the tribe · each tier's reward fires once, separately", bonuses: ["2 different: max HP +25", "3 different: max HP +50, max mana +2"] },
    },
    "고귀": {
        ko: { name: "고귀", note: "※ 서로 다른 종족 카드여야 발동 · 각 단계 보상은 게임당 1회씩 따로 지급", bonuses: ["서로 다른 2종: 매 턴 드로우 +1(영구), 상대 세트 함정 2장 파괴", "서로 다른 3종: 매 턴 드로우 +4(영구), 상대 세트 함정 전부 파괴 후 그중 1장 게임에서 제외"] },
        ja: { name: "高貴", note: "※ 異なる種族カードが必要 · 各段階の報酬はゲーム中1回ずつ", bonuses: ["異なる2種: 毎ターンドロー+1(永続), 相手のセットトラップ2枚破壊", "異なる3種: 毎ターンドロー+4(永続), 相手のセットトラップを全破壊し、うち1枚をゲームから除外"] },
        en: { name: "Noble", note: "* Requires different cards of the tribe · each tier fires once, separately", bonuses: ["2 different: +1 draw each turn (permanent), destroy 2 enemy set traps", "3 different: +4 draw each turn (permanent), destroy ALL enemy set traps and exile 1 of them"] },
    },
    "포식": {
        ko: { name: "포식", note: "※ 서로 다른 종족 카드여야 발동 · 각 단계 보상은 게임당 1회씩 따로 지급", bonuses: ["서로 다른 2종: 선택한 상대 몬스터 1체 파괴 후 상대에게 12 데미지", "서로 다른 3종: 선택한 상대 몬스터 2체 파괴 후 상대에게 20 데미지"] },
        ja: { name: "捕食", note: "※ 異なる種族カードが必要 · 各段階の報酬はゲーム中1回ずつ", bonuses: ["異なる2種: 選んだ敵モンスター1体を破壊し、相手に12ダメージ", "異なる3種: 選んだ敵モンスター2体を破壊し、相手に20ダメージ"] },
        en: { name: "Devour", note: "* Requires different cards of the tribe · each tier fires once, separately", bonuses: ["2 different: destroy 1 chosen enemy monster, then 12 damage", "3 different: destroy 2 chosen enemy monsters, then 20 damage"] },
    },
    "귀족": {
        ko: { name: "귀족", note: "※ 서로 다른 종족 카드여야 발동 · 각 단계 보상은 게임당 1회씩 따로 지급", bonuses: ["서로 다른 2종: 최대 마나 +2", "서로 다른 3종: 최대 마나 +6"] },
        ja: { name: "貴族", note: "※ 異なる種族カードが必要 · 各段階の報酬はゲーム中1回ずつ", bonuses: ["異なる2種: 最大マナ +2", "異なる3種: 最大マナ +6"] },
        en: { name: "Aristocrat", note: "* Requires different cards of the tribe · each tier fires once, separately", bonuses: ["2 different: max mana +2", "3 different: max mana +6"] },
    },
    "시초": {
        ko: { name: "시초", note: "※ 1~8코스트 각 1종(8코 '시초의 미믹' 포함) · 각 단계 보상은 게임당 1회씩 따로 지급", bonuses: ["서로 다른 2종: 최대 체력 +10", "서로 다른 3종: 최대 체력 +15, 상대 최대 체력 -5", "서로 다른 4종: 최대 마나 +10, 최대 체력 +25, 5장 드로우, 상대 필드의 모든 카드 파괴+게임에서 제외, 상대에게 10 데미지"] },
        ja: { name: "始原", note: "※ 1~8コスト各1種(8コスト「始原のミミック」を含む) · 各段階の報酬はゲーム中1回ずつ", bonuses: ["異なる2種: 最大体力 +10", "異なる3種: 最大体力 +15, 相手の最大体力 -5", "異なる4種: 最大マナ +10, 最大体力 +25, 5枚ドロー, 相手の場の全カードを破壊+ゲームから除外, 相手に10ダメージ"] },
        en: { name: "Origin", note: "* Collect different cards, one each of cost 1-8 (incl. cost-8 'Origin Mimic') · each tier fires once, separately", bonuses: ["2 different: max HP +10", "3 different: max HP +15, enemy max HP -5", "4 different: max mana +10, max HP +25, draw 5, destroy & exile every card on the enemy field, 10 damage"] },
    },
};
// ---------------- generated high-cost curve (cost 5–12) ----------------
const R = (n) => Math.max(1, Math.round(n));
const PREFIX = ["고대의", "심연의", "강철의", "화염의", "서리의", "폭풍의", "황금의", "저주받은", "신성한", "그림자", "용암의", "천공의", "피의", "비취의", "흑요석", "은빛", "파멸의", "여명의", "심판의", "광휘의", "태초의", "무한의", "공허의", "붕괴의"];
const PREFIX_JA = ["古代の", "深淵の", "鋼鉄の", "業火の", "氷霜の", "嵐の", "黄金の", "呪われし", "神聖な", "影の", "溶岩の", "天空の", "血の", "翡翠の", "黒曜石の", "銀の", "破滅の", "黎明の", "審判の", "光輝の", "太初の", "無限の", "虚空の", "崩壊の"];
let pfx = 0;
const usedNames = new Set();
const ROMAN = ["", " II", " III", " IV", " V", " VI"];
function nextName(nounKo, nounJa) {
    const idx = pfx++ % PREFIX.length;
    const baseKo = `${PREFIX[idx]} ${nounKo}`;
    const baseJa = `${PREFIX_JA[idx]}${nounJa}`;
    let suffix = "", k = 1;
    while (usedNames.has(baseKo + suffix)) {
        suffix = ROMAN[k] ?? ` ${k + 1}`;
        k++;
    }
    usedNames.add(baseKo + suffix);
    return { ko: baseKo + suffix, ja: baseJa + suffix };
}
const MON_TPL = [
    { nouns: ["광전사", "약탈자", "맹수"], nounsJa: ["狂戦士", "略奪者", "猛獣"], atk: (c) => R(c * 1.7), def: (c) => R(c * 0.6) },
    { nouns: ["수호자", "성벽", "거인"], nounsJa: ["守護者", "城壁", "巨人"], atk: (c) => R(c * 0.7), def: (c) => R(c * 1.8) },
    { nouns: ["기사", "용병", "전사"], nounsJa: ["騎士", "傭兵", "戦士"], atk: (c) => R(c * 1.2), def: (c) => R(c * 1.05) },
    { nouns: ["드레이크", "폭격수", "화염술사"], nounsJa: ["ドレイク", "爆撃手", "火術士"], atk: (c) => R(c * 1.35), def: (c) => R(c * 0.7), mk: (c) => ({ onSummon: "burn", val: R(c * 0.8), text: `소환시: 상대 체력에 ${R(c * 0.8)} 데미지`, textJa: `召喚時: 相手の体力に${R(c * 0.8)}ダメージ` }) },
    { nouns: ["사제", "수도승", "치유사"], nounsJa: ["司祭", "修道僧", "治癒師"], atk: (c) => R(c * 0.75), def: (c) => R(c * 1.5), mk: (c) => ({ onSummon: "heal", val: R(c * 1.4), text: `소환시: 자신 체력 ${R(c * 1.4)} 회복`, textJa: `召喚時: 自分の体力${R(c * 1.4)}回復` }) },
    { nouns: ["정찰병", "탐색자", "사냥꾼"], nounsJa: ["斥候", "探索者", "狩人"], atk: (c) => R(c * 1.05), def: (c) => R(c * 1.0), mk: (c) => ({ onSummon: "draw", val: R(c / 3) + 1, text: `소환시: ${R(c / 3) + 1}장 드로우`, textJa: `召喚時: ${R(c / 3) + 1}枚ドロー` }) },
    { nouns: ["주술사", "저주술사", "마녀"], nounsJa: ["呪術師", "呪詛師", "魔女"], atk: (c) => R(c * 1.2), def: (c) => R(c * 0.9), mk: (c) => ({ onSummon: "defDown", val: R(c * 0.8), text: `소환시: 적 몬스터 1체의 체력 -${R(c * 0.8)}(지속)`, textJa: `召喚時: 敵モンスター1体の体力-${R(c * 0.8)}(持続)` }) },
    { nouns: ["지휘관", "장군", "대장"], nounsJa: ["指揮官", "将軍", "隊長"], atk: (c) => R(c * 1.45), def: (c) => R(c * 0.95), mk: () => ({ condAtk: "twoPlus", text: "아군 몬스터 2체 이상이면 공격력 +2", textJa: "味方モンスター2体以上で攻撃力+2" }) },
    { nouns: ["파괴자", "해체자", "공성병"], nounsJa: ["破壊者", "解体者", "攻城兵"], atk: (c) => R(c * 1.3), def: (c) => R(c * 0.95), mk: () => ({ onSummon: "breaktrap", text: "소환시: 상대의 세트 함정 1장 파괴", textJa: "召喚時: 相手のセット罠1枚を破壊" }) },
];
const SPELL_TPL = [
    { nouns: ["화염구", "작렬", "겁화"], nounsJa: ["火球", "炸裂", "劫火"], mk: (c) => ({ act: "dmg", val: R(c * 2), text: `상대 체력에 ${R(c * 2)} 데미지`, textJa: `相手の体力に${R(c * 2)}ダメージ` }) },
    { nouns: ["한파", "빙결", "서리창"], nounsJa: ["寒波", "氷結", "霜槍"], mk: (c) => ({ act: "dmg", val: R(c * 1.6), play: Math.max(1, c - 2), text: `상대 체력에 ${R(c * 1.6)} 데미지 (시전 ${Math.max(1, c - 2)})`, textJa: `相手の体力に${R(c * 1.6)}ダメージ (発動${Math.max(1, c - 2)})` }) },
    { nouns: ["치유술", "회복", "생명의 빛"], nounsJa: ["治癒術", "回復", "生命の光"], mk: (c) => ({ act: "heal", val: R(c * 1.8), text: `자신 체력 ${R(c * 1.8)} 회복`, textJa: `自分の体力${R(c * 1.8)}回復` }) },
    { nouns: ["통찰", "예지", "지식"], nounsJa: ["洞察", "予知", "知識"], mk: (c) => ({ act: "draw", val: R(c / 2) + 1, play: Math.max(1, R(c / 3)), text: `카드 ${R(c / 2) + 1}장 드로우 (시전 ${Math.max(1, R(c / 3))})`, textJa: `カード${R(c / 2) + 1}枚ドロー (発動${Math.max(1, R(c / 3))})` }) },
    { nouns: ["강타", "예리함", "투기"], nounsJa: ["強打", "鋭利", "闘気"], mk: (c) => ({ act: "buffTurn", val: R(c * 1.6), text: `자신 몬스터 1체 공격력 +${R(c * 1.6)}(이번 턴)`, textJa: `自分のモンスター1体の攻撃力+${R(c * 1.6)}(このターン)` }) },
    { nouns: ["진군", "돌격 명령", "전군 강화"], nounsJa: ["進軍", "突撃命令", "全軍強化"], mk: (c) => ({ act: "buffAllTurn", val: R(c * 0.9), text: `아군 전체 공격력 +${R(c * 0.9)}(이번 턴)`, textJa: `味方全体の攻撃力+${R(c * 0.9)}(このターン)` }) },
    { nouns: ["룬 각인", "축복", "룬 강화"], nounsJa: ["ルーン刻印", "祝福", "ルーン強化"], mk: (c) => ({ act: "buffPerm", val: R(c * 0.8), val2: R(c * 0.8), text: `자신 몬스터 1체 공격력+${R(c * 0.8)}/체력+${R(c * 0.8)}(지속)`, textJa: `自分のモンスター1体の攻撃力+${R(c * 0.8)}/体力+${R(c * 0.8)}(持続)` }) },
    { nouns: ["파멸", "소멸", "붕괴"], nounsJa: ["破滅", "消滅", "崩壊"], mk: () => ({ act: "destroyMon", text: "적 몬스터 1체를 파괴", textJa: "敵モンスター1体を破壊" }) },
    { nouns: ["약화", "쇠약", "부식"], nounsJa: ["弱化", "衰弱", "腐食"], mk: (c) => ({ act: "weaken", val: R(c * 1.3), text: `적 몬스터 1체 체력 -${R(c * 1.3)}(지속)`, textJa: `敵モンスター1体の体力-${R(c * 1.3)}(持続)` }) },
    { nouns: ["생명 갈취", "착취", "흡수"], nounsJa: ["生命奪取", "搾取", "吸収"], mk: (c) => ({ act: "siphon", val: R(c * 1.4), val2: R(c * 1.1), text: `상대에게 ${R(c * 1.4)} 데미지 + 자신 체력 ${R(c * 1.1)} 회복`, textJa: `相手に${R(c * 1.4)}ダメージ + 自分の体力${R(c * 1.1)}回復` }) },
    { nouns: ["마나 결정", "룬 충전"], nounsJa: ["マナ結晶", "ルーン充填"], mk: (c) => ({ act: "manaUp", val: c >= 10 ? 2 : 1, play: 1, text: `최대 마나 +${c >= 10 ? 2 : 1} (시전 1)`, textJa: `最大マナ+${c >= 10 ? 2 : 1} (発動1)` }) },
    { nouns: ["시장 교란", "혼란"], nounsJa: ["市場攪乱", "混乱"], mk: (c) => ({ act: "crash", val2: R(c / 3), play: Math.max(1, c - 2), text: `상대 제시 강제 갱신 + ${R(c / 3)}장 드로우 (시전 ${Math.max(1, c - 2)})`, textJa: `相手の提示を強制更新 + ${R(c / 3)}枚ドロー (発動${Math.max(1, c - 2)})` }) },
];
const TRAP_TPL = [
    { nouns: ["방어 태세", "수비 진형"], nounsJa: ["防御態勢", "守備陣形"], mk: (c) => ({ react: "half", val: R(c * 1.0), text: `공격 절반 + 공격측에 ${R(c * 1.0)} 데미지`, textJa: `攻撃を半減 + 攻撃側に${R(c * 1.0)}ダメージ` }) },
    { nouns: ["무효화", "차단막"], nounsJa: ["無効化", "遮断幕"], mk: (c) => ({ react: "fullguard", val: R(c * 0.9), text: `공격 무효 + 공격측에 ${R(c * 0.9)} 데미지`, textJa: `攻撃無効 + 攻撃側に${R(c * 0.9)}ダメージ` }) },
    { nouns: ["반사막", "거울 장막"], nounsJa: ["反射膜", "鏡の帳"], mk: () => ({ react: "reflect", text: "공격해온 몬스터의 공격력만큼 반사", textJa: "攻撃モンスターの攻撃力分を反射" }) },
    { nouns: ["역습", "반격"], nounsJa: ["逆襲", "反撃"], mk: () => ({ react: "counter", text: "공격 몬스터 파괴 + 공격력 절반 반사", textJa: "攻撃モンスターを破壊 + 攻撃力の半分を反射" }) },
    { nouns: ["포식", "집어삼킴"], nounsJa: ["捕食", "丸呑み"], mk: (c) => ({ react: "devour", val: R(c * 1.6) + 2, text: `공격 몬스터 파괴 + 자신 체력 ${R(c * 1.6) + 2} 회복`, textJa: `攻撃モンスターを破壊 + 自分の体力${R(c * 1.6) + 2}回復` }) },
    { nouns: ["심판", "천벌"], nounsJa: ["審判", "天罰"], mk: (c) => ({ react: "judgment", val: R(c * 1.9) + 2, text: `공격 몬스터 파괴 + 상대 체력에 ${R(c * 1.9) + 2} 데미지`, textJa: `攻撃モンスターを破壊 + 相手の体力に${R(c * 1.9) + 2}ダメージ` }) },
    { nouns: ["가시 함정", "철침 덫"], nounsJa: ["棘の罠", "鉄針の罠"], mk: (c) => ({ react: "spikes", val: R(c * 1.6) + 2, text: `공격을 받으면 공격측에 ${R(c * 1.6) + 2} 데미지`, textJa: `攻撃を受けると攻撃側に${R(c * 1.6) + 2}ダメージ` }) },
    { nouns: ["시간 왜곡", "예지의 덫"], nounsJa: ["時間歪曲", "予知の罠"], mk: (c) => ({ react: "drawtrap", val: R(c * 0.7) + 1, text: `공격을 받으면 ${R(c * 0.7) + 1}장 드로우`, textJa: `攻撃を受けると${R(c * 0.7) + 1}枚ドロー` }) },
    { nouns: ["방벽", "철벽"], nounsJa: ["防壁", "鉄壁"], mk: (c) => ({ react: "bulwark", val: R(c * 1.4), text: `이번 공격 무효 + 공격 몬스터 체력 -${R(c * 1.4)}(지속)`, textJa: `この攻撃を無効 + 攻撃モンスターの体力-${R(c * 1.4)}(持続)` }) },
    { nouns: ["가시 갑옷", "복수의 가시"], nounsJa: ["棘の鎧", "復讐の棘"], mk: (c) => ({ react: "thorns", val: R(c * 1.7), text: `공격을 받으면 ${R(c * 1.7)} 반사`, textJa: `攻撃を受けると${R(c * 1.7)}反射` }) },
];
const PLAN = {
    5: [4, 5, 5], 6: [9, 6, 6], 7: [8, 6, 6], 8: [8, 6, 6],
    9: [5, 4, 4], 10: [5, 4, 4], 11: [3, 2, 2], 12: [3, 2, 2],
};
function generate() {
    const out = {};
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
export const DB = { ...CORE, ...generate() };
export const STARTERS = {
    STARTER_TRASH: { id: "STARTER_TRASH", t: "starter", cost: 1, name: "컬", text: "마나1: 이 카드를 게임에서 제외(덱 압축)", star: "trash" },
    STARTER_CHEST: { id: "STARTER_CHEST", t: "starter", cost: 1, name: "보물상자", text: "마나1: 보물상자를 연다", star: "chest" },
    STARTER_MANA: { id: "STARTER_MANA", t: "starter", cost: 3, name: "어튠", text: "마나3: 최대 마나 +1", star: "mana" },
};
// ---- Japanese names/texts for the hand-written cards + starters ----
const CORE_JA = {
    M1: { name: "スパーク・インプ" }, M2: { name: "ストーン・パップ" },
    M3: { name: "ダスト・スカウト", text: "召喚時: カード1枚ドロー" },
    M4: { name: "ブレード・ヘア" }, M5: { name: "アイアン・シェル" },
    M6: { name: "ツイン・ファング", text: "召喚時: 敵モンスター1体の体力-2(持続)" },
    M7: { name: "エンバー・ドレイク", text: "召喚時: 相手の体力に3ダメージ" },
    M8: { name: "グローブ・ウォーデン", text: "召喚時: 自分の体力5回復" },
    M9: { name: "レリック・ハンター", text: "召喚時: 自分の提示を無料更新 + 1枚ドロー" },
    M10: { name: "マナ・ゴーレム", text: "場にいる間 最大マナ+1" },
    M11: { name: "ウォーロード", text: "味方モンスター2体以上で攻撃力+2" },
    M12: { name: "タイタン・ゲート" },
    M13: { name: "ヴォイド・リーヴァー", text: "召喚時: 相手のセット罠1枚を破壊" },
    S1: { name: "クイック・ジャブ", text: "相手の体力に2ダメージ" },
    S10: { name: "マナ・チャージ", text: "カード2枚ドロー" },
    S3: { name: "シャープン", text: "自分のモンスター1体の攻撃力+3(このターン)" },
    S4: { name: "ダブル・ドロー", text: "カード3枚ドロー (発動1)" },
    S5: { name: "マーケット・クラッシュ", text: "相手の提示を強制更新 + 1枚ドロー (発動1)" },
    S8: { name: "リコール", text: "捨て札から1枚を手札へ" },
    S11: { name: "ファイアボール", text: "相手の体力に4ダメージ" },
    S6: { name: "シーク", text: "デッキから好きな1枚を手札へ" },
    S7: { name: "オーバーロード", text: "自分のモンスター全体の攻撃力+3(このターン)" },
    S9: { name: "サイフォン", text: "相手に5ダメージ + 自分の体力5回復" },
    S12: { name: "強化の呪文", text: "自分のモンスター1体に攻撃力+2/体力+2(持続)" },
    S13: { name: "メテオ", text: "相手の体力に8ダメージ" },
    S14: { name: "大地の祝福", text: "自分の体力10回復 + カード1枚ドロー" },
    S15: { name: "ルーン爆裂", text: "敵モンスター1体を破壊" },
    T1: { name: "ハーフ・ガード", text: "攻撃を半減 + 攻撃側に1ダメージ" },
    T8: { name: "棘の罠", text: "攻撃を受けると攻撃側に4ダメージ" },
    T2: { name: "ヌル・フィールド", text: "相手が発動した魔法1枚を無効化" },
    T3: { name: "落とし穴", text: "相手が召喚したモンスターを破壊" },
    T6: { name: "カウンター・サージ", text: "攻撃モンスターを破壊 + 攻撃力の半分を反射" },
    T9: { name: "逆流", text: "攻撃無効 + 攻撃側に2ダメージ" },
    T4: { name: "ミラー・ソーン", text: "攻撃モンスターの攻撃力分を反射" },
    T10: { name: "魂の捕食", text: "攻撃モンスターを破壊 + 自分の体力7回復" },
    T11: { name: "時間歪曲", text: "攻撃を受けるとカード3枚ドロー" },
    T12: { name: "絶対防壁", text: "この攻撃を無効 + 攻撃モンスターの体力-6(持続)" },
    T13: { name: "天罰", text: "攻撃モンスターを破壊 + 相手の体力に10ダメージ" },
    MIMIC: { name: "ミミック", text: "宝箱のハズレで相手の場に召喚される · 死亡時ゲームから除外" },
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
    NGA3: { name: "ガラスの大砲" },
    NGA4: { name: "狂暴な剣鬼" },
    NWL3: { name: "岩亀" },
    NWL4: { name: "鉄壁の門番" },
    NHEX: { name: "小さな呪術師", text: "召喚時: 相手の体力に6ダメージ" },
    NSPR: { name: "水晶の精霊", text: "場にいる間 最大マナ+1, 召喚時2枚ドロー" },
    AHEUK: { name: "アチューン・黒", text: "相手の最大マナ-1。自分の場のモンスターが1体以下なら追加で-1 (発動4)" },
    AJIN: { name: "アチューン・真", text: "最大マナ+1、捨て札にアチューンを1枚追加" },
    AMA: { name: "アチューン・魔", text: "手札の宝箱1枚を捨て札へ → 最大マナ+1、1枚ドロー" },
    NHEAL: { name: "生命の加護", text: "永続: モンスターを召喚するたびに自分の体力1回復" },
    NWIPE: { name: "浄化の爆発", text: "自分の場にモンスターがいない時のみ。相手の罠・魔法を全て破壊し自分に6ダメージ" },
    STARTER_TRASH: { name: "カル", text: "マナ1: このカードをゲームから除外(デッキ圧縮)" },
    STARTER_CHEST: { name: "宝箱", text: "マナ1: 宝箱を開く" },
    STARTER_MANA: { name: "アチューン", text: "マナ3: 最大マナ+1" },
};
for (const id of Object.keys(CORE_JA)) {
    const ja = CORE_JA[id];
    const card = DB[id] || STARTERS[id];
    if (card) {
        card.nameJa = ja.name;
        if (ja.text)
            card.textJa = ja.text;
    }
}
// ============================================================
// BALANCE PATCH — applied AFTER generation/JA so card art (by id) stays mapped.
//   PATCH = stat/effect/text changes · DELETE_IDS = removed cards · NEW_CARDS = added
// ============================================================
const PATCH = {
    // core monsters
    M3: { atk: 2, def: 1 },
    M6: { def: 2 },
    M12: { onSummon: "allEnemyAtkDown", val: 2, text: "소환시: 적 몬스터 전체 공격력 -2(지속)", textJa: "召喚時: 敵モンスター全体の攻撃力-2(持続)" },
    // tribe monsters
    TSO2: { atk: 3, def: 2 }, TNO2: { atk: 3, def: 2 }, TPO2: { atk: 3, def: 2 }, TAR2: { atk: 3, def: 2 },
    TSO5: { atk: 6, def: 5 }, TNO5: { atk: 6, def: 5 }, TPO5: { atk: 6, def: 5 }, TAR5: { atk: 6, def: 5 },
    TSO7: { atk: 8, def: 6 }, TNO7: { atk: 8, def: 6 }, TPO7: { atk: 8, def: 6 }, TAR7: { atk: 8, def: 6 },
    // generated monsters — cost 5
    GM5_0: { turnFx: "growAtk", val: 2, text: "매 턴 시작 시 공격력 +2(지속)", textJa: "毎ターン開始時 攻撃力+2(持続)" },
    GM5_1: { atk: 3, def: 9, turnFx: "growDef", val: 2, text: "매 턴 시작 시 이 몬스터의 체력 +2(지속)", textJa: "毎ターン開始時 このモンスターの体力+2(持続)" },
    GM5_2: { atk: 6, def: 6, aura: "summonBuff", val: 1, text: "상시: 몬스터를 소환할 때 그 몬스터 +1/+1", textJa: "常時: モンスター召喚時、そのモンスターに+1/+1" },
    GM5_3: { onSummon: undefined, turnFx: "turnBurn", val: 3, text: "매 턴 시작 시 상대 체력에 3 데미지", textJa: "毎ターン開始時 相手の体力に3ダメージ" },
    // cost 6
    GM6_0: { atk: 11 },
    GM6_2: { aura: "discardBreak", text: "코스트3 이상 카드를 버릴 때마다 상대 함정 1장 파괴", textJa: "コスト3以上のカードを捨てるたび相手の罠1枚を破壊" },
    GM6_3: { atk: 9 },
    GM6_6: { def: 4 },
    GM6_7: { atk: 6, def: 6, condAtk: undefined, onSummon: "summonKnight", text: "소환시: 마나 3 지불 → 4/4 '무한의 기사' 소환", textJa: "召喚時: マナ3支払い → 4/4「無限の騎士」召喚" },
    GM6_8: { onSummon: "breaktrapDraw", val: 2, text: "소환시: 상대 함정 1장 파괴, 성공 시 2장 드로우", textJa: "召喚時: 相手の罠1枚破壊、成功で2枚ドロー" },
    // cost 7
    GM7_0: { atk: 13, def: 5 },
    GM7_1: { def: 14 },
    GM7_2: { onSummon: "maxHpMana", val: 4, val2: 1, text: "소환시: 자신 최대 체력 +4, 최대 마나 +1", textJa: "召喚時: 自分の最大体力+4, 最大マナ+1" },
    GM7_3: { atk: 11 },
    GM7_5: { onSummon: "draw", val: 4, text: "소환시: 4장 드로우", textJa: "召喚時: 4枚ドロー" },
    // cost 8
    GM8_0: { atk: 18, def: 6, attackFx: "atkDownOnAttack", val: 2, text: "공격할 때마다 자신의 공격력 -2(지속)", textJa: "攻撃するたび自身の攻撃力-2(持続)" },
    GM8_1: { def: 13, turnFx: "turnHeal", val: 3, text: "매 턴 시작 시 자신 체력 +3 회복", textJa: "毎ターン開始時 自分の体力+3回復" },
    GM8_2: { atk: 5, def: 3, play: 3, onSummon: "cloneSelf", text: "소환시 50%로 자신을 복제 소환", textJa: "召喚時50%で自身を複製召喚" },
    GM8_3: { onSummon: "burnBleed", val: 6, text: "소환시: 상대에 6 데미지. 이후 상대는 매 턴 1 데미지(중첩 불가)", textJa: "召喚時: 相手に6ダメージ。以降 相手は毎ターン1ダメージ(重複不可)" },
    GM8_4: { onSummon: "heal", val: 13, text: "소환시: 자신 체력 13 회복", textJa: "召喚時: 自分の体力13回復" },
    GM8_5: { onSummon: "parity", text: "소환시: 상대 체력 홀수면 5 데미지, 짝수면 4장 드로우", textJa: "召喚時: 相手の体力が奇数なら5ダメージ、偶数なら4枚ドロー" },
    GM8_7: { atk: 14, def: 9 },
    // cost 9
    GM9_0: { atk: 13, def: 5, onSummon: "smite", val: 6, text: "소환시: 공격력 6 이하 상대 몬스터 전멸", textJa: "召喚時: 攻撃力6以下の敵モンスターを全滅" },
    GM9_1: { turnFx: "payDefHeal", val: 3, val2: 2, text: "매 턴 마나 1로 이 몬스터의 체력 +3, 자신 체력 +2 회복", textJa: "毎ターン マナ1でこのモンスターの体力+3, 自分の体力+2回復" },
    GM9_2: { mult: 2, text: "한 턴에 2번 공격할 수 있다", textJa: "1ターンに2回攻撃できる" },
    GM9_3: { onSummon: "drakeRamp", val: 7, turnFx: "chestDraw", val2: 4, text: "소환시: 상대에 7 데미지 + 최대 마나 +1 · 매 턴 패의 보물상자를 묘지로 보내면 4장 드로우", textJa: "召喚時: 相手に7ダメージ + 最大マナ+1 · 毎ターン手札の宝箱を墓地へ送ると4枚ドロー" },
    GM9_4: { onSummon: "heal", val: 15, text: "소환시: 자신 체력 15 회복", textJa: "召喚時: 自分の体力15回復" },
    // cost 10
    GM10_0: { atk: 24, def: 8 },
    GM10_1: { atk: 10, def: 25 },
    GM10_2: { atk: 13, def: 10, onSummon: "summonRandom", text: "소환시: 덱에서 랜덤 몬스터 1체 무료 소환", textJa: "召喚時: デッキからランダムなモンスター1体を無料召喚" },
    GM10_3: { onSummon: "burnBreak2", val: 8, text: "소환시: 상대에 8 데미지 + 상대 함정 2장 파괴", textJa: "召喚時: 相手に8ダメージ + 相手の罠2枚破壊" },
    GM10_4: { onSummon: "heal", val: 19, text: "소환시: 자신 체력 19 회복", textJa: "召喚時: 自分の体力19回復" },
    // core traps
    T1: { cost: 2, play: 1 },
    T2: { cost: 3, play: 3, val: 3, text: "상대가 발동한 마법 1장을 무효화. 발동 시 자신에게 3 데미지", textJa: "相手が発動した魔法1枚を無効化。発動時 自分に3ダメージ" },
    T3: { val: 6, text: "상대가 소환한 코스트 6 이하 몬스터를 파괴", textJa: "相手が召喚したコスト6以下のモンスターを破壊" },
    T4: { cost: 4, play: 3, react: "counterFull", text: "공격 몬스터 파괴 + 그 공격력만큼 상대에게 데미지", textJa: "攻撃モンスターを破壊 + その攻撃力分を相手に与える" },
    T6: { cost: 3, play: 2 },
    T9: { cost: 3, play: 1, react: "wardheal", val: 3, val2: 1, text: "공격 무효 + 자신 체력 3 회복 + 1장 드로우", textJa: "攻撃無効 + 自分の体力3回復 + 1枚ドロー" },
    T11: { react: "drawtrap", val: 5, text: "공격을 받으면 카드 5장 드로우", textJa: "攻撃を受けるとカード5枚ドロー" },
    T12: { react: "guardbuff", val: 4, text: "이번 공격 무효 + 자신 몬스터 전체 체력 +4(지속)", textJa: "この攻撃を無効 + 自分のモンスター全体の体力+4(持続)" },
    // generated traps — cost 5 / 6
    GT5_0: { react: "guardBreakDraw", text: "공격 무효 + 공격측 함정 1장 파괴 + 1장 드로우", textJa: "攻撃無効 + 攻撃側の罠1枚破壊 + 1枚ドロー" },
    GT5_1: { react: "guarddraw", val: 2, text: "공격 무효 + 2장 드로우", textJa: "攻撃無効 + 2枚ドロー" },
    GT5_2: { react: "slaughterHeal", text: "공격 몬스터 파괴 + 30%로 그 몬스터의 최대 체력만큼 자신 체력 회복", textJa: "攻撃モンスターを破壊 + 30%でそのモンスターの最大体力分、自分の体力を回復" },
    GT5_3: { react: "slaughterRaise", text: "공격 몬스터 파괴 + 30%로 자신 필드에 소생(소유권 이동)", textJa: "攻撃モンスターを破壊 + 30%で自分の場に蘇生(所有権移動)" },
    GT6_0: { react: "guardPurge", val: 3, text: "공격 무효 + 최대 마나 -1로 상대 몬스터 최대 3체 파괴", textJa: "攻撃無効 + 最大マナ-1で敵モンスター最大3体を破壊" },
    GT6_1: { react: "guarddraw", val: 3, text: "공격 무효 + 3장 드로우", textJa: "攻撃無効 + 3枚ドロー" },
    GT6_2: { react: "slayWeakAll", val: 3, text: "공격 몬스터 파괴 + 상대 전체 공격력 -3(이번 턴)", textJa: "攻撃モンスターを破壊 + 敵全体の攻撃力-3(このターン)" },
    GT6_3: { react: "slayLowAll", val: 5, text: "공격 몬스터 파괴 + 공격력 5 이하 상대 몬스터 전멸", textJa: "攻撃モンスターを破壊 + 攻撃力5以下の敵モンスター全滅" },
    // generated traps — cost 8 (play-cost reductions per request)
    GT8_0: { play: 7, react: "guardbuff", val: 4, val2: 1, text: "공격 무효 + 자신 몬스터 전체의 체력 +4(지속) + 1장 드로우", textJa: "攻撃無効 + 自分のモンスター全体の体力+4(持続) + 1枚ドロー" },
    GT8_1: { react: "guardEnemyDef", val: 4, text: "공격 무효 + 상대 몬스터 전체의 체력 -4(지속)", textJa: "攻撃無効 + 敵モンスター全体の体力-4(持続)" },
    GT8_2: { react: "guardWipe", val: 2, text: "공격 무효 + 상대 함정·영구마법 2장 파괴", textJa: "攻撃無効 + 相手の罠・永続魔法2枚を破壊" },
    GT8_3: { play: 4, react: "guardMana", text: "공격 무효 + 최대 마나 +1", textJa: "攻撃無効 + 最大マナ+1" },
};
const DELETE_IDS = [
    "GM8_6", "GM11_1", "GM11_2", "GM12_0", "GM12_1", "GM12_2",
    "GT7_0", "GT7_1", "GT7_2", "GT7_3", "GT7_4", "GT7_5", "GT8_4", "GT9_0", "GT9_1",
];
const NEW_CARDS = [
    { id: "INFKNIGHT", t: "mon", cost: 0, name: "무한의 기사", nameJa: "無限の騎士", atk: 4, def: 4, text: "—", textJa: "—" },
    { id: "NT_NULL3", t: "trap", cost: 3, name: "마력 차단", nameJa: "魔力遮断", react: "nullspell", val: 3, text: "상대 마법 1장 무효화 + 자신에게 3 데미지", textJa: "相手の魔法1枚を無効化 + 自分に3ダメージ" },
    { id: "NT_NULL5", t: "trap", cost: 5, name: "마법 봉인", nameJa: "魔法封印", react: "nullspell", text: "상대 마법 1장 무효화", textJa: "相手の魔法1枚を無効化" },
    { id: "NT_NULL6", t: "trap", cost: 6, name: "반마술 결계", nameJa: "反魔術結界", react: "nullspell", val2: 2, text: "상대 마법 1장 무효화 + 상대에게 2 데미지", textJa: "相手の魔法1枚を無効化 + 相手に2ダメージ" },
    { id: "NT_NULL4", t: "trap", cost: 3, name: "주문 파쇄", nameJa: "呪文破砕", react: "nullspell", cap: 6,
        text: "코스트 6 이하 마법 1장을 무효화", textJa: "コスト6以下の魔法1枚を無効化" },
    { id: "NT_NULL8", t: "trap", cost: 8, name: "침묵의 심판", nameJa: "沈黙の審判", react: "nullspell", lockSpell: true,
        text: "상대 마법 1장 무효화 + 이번 상대 턴 동안 상대는 마법 카드를 사용할 수 없다 (시전 6)", textJa: "相手の魔法1枚を無効化 + このターン中、相手は魔法カードを使用できない (発動6)" },
    { id: "NT_SEAL3", t: "mon", cost: 3, name: "침묵의 파수꾼", nameJa: "沈黙の番人", atk: 1, def: 3, aura: "sealLow",
        text: "이 카드가 필드에 있는 한 양 플레이어는 코스트 5 이하 마법을 사용할 수 없다", textJa: "このカードが場にある限り、両プレイヤーはコスト5以下の魔法を使用できない" },
    { id: "NT_SEAL5", t: "mon", cost: 5, name: "침묵의 거신", nameJa: "沈黙の巨神", atk: 3, def: 4, aura: "sealAll",
        text: "이 카드가 필드에 있는 한 양 플레이어는 마법 카드를 사용할 수 없다", textJa: "このカードが場にある限り、両プレイヤーは魔法カードを使用できない" },
];
for (const id of Object.keys(PATCH)) {
    if (DB[id])
        Object.assign(DB[id], PATCH[id]);
}
for (const id of DELETE_IDS) {
    delete DB[id];
}
for (const c of NEW_CARDS) {
    DB[c.id] = c;
}
// ============================================================
// BALANCE PATCH 2 — spell reworks (bespoke effects live in engine customSpell)
// ============================================================
const PATCH2 = {
    // core spells
    S1: { val: 2, text: "상대 체력에 2 데미지 · 이번 턴 3회째부터 1장 드로우", textJa: "相手の体力に2ダメージ · このターン3回目から1枚ドロー" },
    S4: { play: 1, text: "카드 3장 드로우 (시전 1) · 이번 턴 1회만", textJa: "カード3枚ドロー (発動1) · このターン1回のみ" },
    S5: { cost: 2, play: 2, val2: undefined, text: "다음 상대 제시를 3장 → 2장으로 축소 (시전 2)", textJa: "次の相手の提示を3枚→2枚に縮小 (発動2)" },
    S6: { play: 2, text: "덱에서 원하는 1장을 패로 (시전 2)", textJa: "デッキから好きな1枚を手札へ (発動2)" },
    S7: { val: 3, text: "자신 몬스터 전체 공격력 +3(이번 턴) + 자신 최대 체력 +2", textJa: "自分のモンスター全体の攻撃力+3(このターン) + 自分の最大体力+2" },
    S8: { text: "묘지에서 원하는 1장을 패로", textJa: "墓地から好きな1枚を手札へ" },
    S12: { val: 2, val2: 1, text: "자신 몬스터 1체에 공격력+2 / 체력+1(지속)", textJa: "自分のモンスター1体に攻撃力+2/体力+1(持続)" },
    S13: { val: 9, text: "상대 체력에 9 데미지", textJa: "相手の体力に9ダメージ" },
    E3: { play: 4, text: "자신의 4턴 동안 턴 시작시 1장 추가 드로우 · 종료 다음 턴 최대 마나 +1 (시전 4)", textJa: "自分の4ターンの間ターン開始時に1枚追加ドロー · 終了の翌ターン最大マナ+1 (発動4)" },
    NHEAL: { play: 2, text: "영구: 몬스터를 소환할 때마다 자신 체력 1 회복 (시전 2)", textJa: "永続: モンスターを召喚するたびに自分の体力1回復 (発動2)" },
    AMA: { text: "패의 보물상자 1장을 묘지로 → 최대 마나 +1", textJa: "手札の宝箱1枚を捨て札へ → 最大マナ+1" },
    AJIN: { text: "최대 마나 +1, 50% 확률로 묘지에 어튠 1장 추가", textJa: "最大マナ+1、50%で捨て札にアチューンを1枚追加" },
    AHEUK: { play: 5, text: "상대 최대 마나 -1. 자신 필드 몬스터가 없으면 추가로 -1 (시전 5)", textJa: "相手の最大マナ-1。自分の場のモンスターがいなければ追加で-1 (発動5)" },
    NWIPE: { val: 5, text: "자신 필드에 몬스터가 없을 때만 발동 가능 · 상대 함정·마법 전부 파괴 후 자신 5 데미지", textJa: "自分の場にモンスターがいない時のみ発動可能 · 相手の罠・魔法を全て破壊し自分に5ダメージ" },
    ND2: { val: 2, val2: 2, play: 1, text: "카드 2장 드로우 + 자신 체력 2 회복 (시전 1)", textJa: "カード2枚ドロー + 自分の体力2回復 (発動1)" },
    ND3: { val: 3, play: 2, text: "카드 3장 드로우, 30% 확률로 2장 추가 (시전 2)", textJa: "カード3枚ドロー、30%で2枚追加 (発動2)" },
    ND5: { val: 5, play: 3, text: "카드 5장 드로우, 20% 확률로 최대 마나 +1 (시전 3)", textJa: "カード5枚ドロー、20%で最大マナ+1 (発動3)" },
    // generated spells
    GS5_0: { val: 10, text: "상대 체력에 10 데미지, 10% 확률로 상대 최대 마나 -1", textJa: "相手の体力に10ダメージ、10%で相手の最大マナ-1" },
    GS5_2: { text: "자신 체력 9 회복 · 자신 체력 20 이상이면 자신 최대 체력 +4", textJa: "自分の体力9回復 · 自分の体力20以上なら自分の最大体力+4" },
    GS6_0: { text: "상대 체력에 12 데미지 + 자신 체력 2 회복", textJa: "相手の体力に12ダメージ + 自分の体力2回復" },
    GS6_2: { text: "자신 체력 13 회복, 20% 확률로 자신 최대 체력 +5", textJa: "自分の体力13回復、20%で自分の最大体力+5" },
    GS6_3: { val: 4, play: 2, text: "카드 4장 드로우 · 자신 최대 체력 55 이상이면 2장 추가 (시전 2)", textJa: "カード4枚ドロー · 自分の最大体力55以上なら2枚追加 (発動2)" },
    GS6_4: { val: 11, text: "자신 몬스터 1체 공격력 +11(이번 턴)", textJa: "自分のモンスター1体の攻撃力+11(このターン)" },
    GS7_0: { text: "상대 체력에 16 데미지, 20% 확률로 자신 최대 마나 -1", textJa: "相手の体力に16ダメージ、20%で自分の最大マナ-1" },
    GS7_2: { text: "자신 체력 13 회복 · 이 마법 3번째 사용부터 피격 시마다 자신 체력 5 회복", textJa: "自分の体力13回復 · この魔法3回目使用から被攻撃ごとに自分の体力5回復" },
    GS7_4: { val: 13, text: "자신 몬스터 1체 공격력 +13(이번 턴)", textJa: "自分のモンスター1体の攻撃力+13(このターン)" },
    GS8_0: { text: "상대 체력에 11 데미지 · 사용 시 50%로 상대 덱 맨 위 1장 제외", textJa: "相手の体力に11ダメージ · 使用時50%で相手のデッキトップ1枚を除外" },
    GS8_1: { play: 5, text: "상대 체력에 13 데미지 (시전 5)", textJa: "相手の体力に13ダメージ (発動5)" },
    GS8_2: { text: "자신 체력 14 회복 · 자신 최대 마나가 10 이하면 자신 체력 완전 회복", textJa: "自分の体力14回復 · 自分の最大マナが10以下なら自分の体力全回復" },
    GS8_3: { val: 5, text: "카드 5장 드로우 · 60%로 상대 몬스터/함정/마법 1장 무작위 파괴", textJa: "カード5枚ドロー · 60%で相手のモンスター/罠/魔法1枚をランダム破壊" },
    GS8_4: { val: 13, text: "아군 전체 공격력 +13(이번 턴) · 이번 턴 종료 후 공격력 +2(지속)", textJa: "味方全体の攻撃力+13(このターン) · ターン終了後 攻撃力+2(持続)" },
    GS8_5: { val: 7, text: "아군 전체 공격력 +7 · 20%로 6코스트 이하 몬스터 무작위 소환", textJa: "味方全体の攻撃力+7 · 20%でコスト6以下のモンスターをランダム召喚" },
    GS9_0: { text: "상대 체력에 21 데미지 (상대 체력 21 이하면 사용 불가)", textJa: "相手の体力に21ダメージ (相手の体力21以下では使用不可)" },
    GS9_1: { val: 15, text: "상대 체력에 15 데미지 (시전 7)", textJa: "相手の体力に15ダメージ (発動7)" },
    GS9_2: { val: 16, text: "자신 체력 16 회복 · 패의 생명 계열 주문 1장을 묘지로 보내면 자신 최대 체력 +15", textJa: "自分の体力16回復 · 手札の生命系呪文1枚を墓地へ送ると自分の最大体力+15" },
    GS10_0: { text: "상대 체력에 23 데미지 (자신 필드 몬스터 1체 이하일 때만)", textJa: "相手の体力に23ダメージ (自分の場のモンスターが1体以下の時のみ)" },
    GS10_1: { text: "상대 체력에 17 데미지 + 카드 1장 드로우 (시전 8)", textJa: "相手の体力に17ダメージ + カード1枚ドロー (発動8)" },
    GS10_2: { text: "자신 체력 19 회복 · 상대 몬스터 1체 + 마법/함정 1장 파괴", textJa: "自分の体力19回復 · 相手モンスター1体 + 魔法/罠1枚を破壊" },
    GS10_3: { play: 2, text: "카드 5장 드로우 (시전 2)", textJa: "カード5枚ドロー (発動2)" },
    GS11_0: { val: 25, text: "상대 체력에 25 데미지", textJa: "相手の体力に25ダメージ" },
    GS11_1: { val: 20, text: "상대 체력에 20 데미지 (시전 9)", textJa: "相手の体力に20ダメージ (発動9)" },
};
const DELETE_IDS2 = ["GS12_0", "GS12_1"];
const NEW_CARDS2 = [
    // ---- existing tribes: a 3-cost member each (slightly under-statted, like the 2-cost) ----
    { id: "TSO3", t: "mon", cost: 3, name: "고독한 사냥꾼", nameJa: "孤独な狩人", atk: 4, def: 2, tribe: "고독", text: "[고독] 동족 시너지", textJa: "[孤独] 同族シナジー" },
    { id: "TNO3", t: "mon", cost: 3, name: "고귀한 종자", nameJa: "高貴な従者", atk: 4, def: 2, tribe: "고귀", text: "[고귀] 동족 시너지", textJa: "[高貴] 同族シナジー" },
    { id: "TPO3", t: "mon", cost: 3, name: "굶주린 추격자", nameJa: "飢えた追跡者", atk: 4, def: 2, tribe: "포식", text: "[포식] 동족 시너지", textJa: "[捕食] 同族シナジー" },
    { id: "TAR3", t: "mon", cost: 3, name: "몰락한 기사", nameJa: "没落した騎士", atk: 4, def: 2, tribe: "귀족", text: "[귀족] 동족 시너지", textJa: "[貴族] 同族シナジー" },
    // ---- NEW tribe 시초(Genesis): cost 1~8, one each (cost-8 시초의 미믹/ORIGIN_MIMIC added in a later PATCH) ----
    { id: "TGE1", t: "mon", cost: 1, play: 2, name: "시초의 알", nameJa: "始原の卵", atk: 0, def: 1, tribe: "시초", text: "[시초] 동족 시너지", textJa: "[始原] 同族シナジー" },
    { id: "TGE2", t: "mon", cost: 2, name: "시초의 불씨", nameJa: "始原の火種", atk: 2, def: 1, tribe: "시초", text: "[시초] 동족 시너지", textJa: "[始原] 同族シナジー" },
    { id: "TGE3", t: "mon", cost: 3, name: "시초의 새싹", nameJa: "始原の芽", atk: 1, def: 3, tribe: "시초", text: "[시초] 동족 시너지", textJa: "[始原] 同族シナジー" },
    { id: "TGE4", t: "mon", cost: 4, name: "시초의 정령", nameJa: "始原の精霊", atk: 2, def: 3, tribe: "시초", onSummon: "draw", val: 2, text: "[시초] 소환시: 카드 2장 드로우", textJa: "[始原] 召喚時: カード2枚ドロー" },
    { id: "TGE5", t: "mon", cost: 5, name: "시초의 수호자", nameJa: "始原の守護者", atk: 3, def: 4, tribe: "시초", onSummon: "guardianDraw", text: "[시초] 소환시: 1장 드로우 — 몬스터 카드면 선택한 적 몬스터 1체의 공격력을 2로 변경", textJa: "[始原] 召喚時: 1枚ドロー — モンスターなら選んだ敵モンスター1体の攻撃力を2にする" },
    { id: "TGE6", t: "mon", cost: 6, name: "시초의 거인", nameJa: "始原の巨人", atk: 4, def: 5, tribe: "시초", onSummon: "giantDraw", text: "[시초] 소환시: 1장 드로우 — 몬스터 카드면 코스트 5 이상의 원하는 시초 카드를 마나를 지불해 구매할 수 있다", textJa: "[始原] 召喚時: 1枚ドロー — モンスターならコスト5以上の好きな始原カードをマナを払って購入できる" },
    { id: "TGE7", t: "mon", cost: 7, name: "시초의 군주", nameJa: "始原の君主", atk: 4, def: 5, tribe: "시초", aura: "originLord", text: "[시초] 상시: 자신 필드의 모든 '시초' 몬스터 +3/+3", textJa: "[始原] 常時: 自分の場の全ての「始原」モンスター+3/+3" },
    // ---- NEW spells (bespoke effects in engine customSpell / enchant) ----
    { id: "HANDRESET", t: "spell", cost: 3, play: 2, act: "draw", name: "핸드 리셋", nameJa: "ハンドリセット", text: "패를 모두 버리고 4장 드로우, 자신 최대 체력 +1 (시전 2)", textJa: "手札を全て捨て4枚ドロー, 自分の最大体力+1 (発動2)" },
    { id: "TIMEWARP", t: "spell", cost: 13, act: "dmg", name: "시공간 조작", nameJa: "時空間操作", text: "60% 확률로 다음 상대 턴을 스킵", textJa: "60%で次の相手のターンをスキップ" },
    { id: "INFERNO", t: "spell", cost: 5, ench: "inferno", val: 99, name: "지옥", nameJa: "地獄", text: "영구마법: 자신의 턴마다 자신에게 6 데미지 · 상대에게 5 데미지", textJa: "永続魔法: 自分のターンごとに自分に6ダメージ · 相手に5ダメージ" },
    { id: "GAMBLE", t: "spell", cost: 4, act: "dmg", name: "갬블", nameJa: "ギャンブル", text: "주사위 — 1·2: 자신 8뎀 / 3·4: 상대 5뎀 / 5: 마나 골렘 / 6: 유리 대포 ×3", textJa: "ダイス — 1·2: 自分8 / 3·4: 相手5 / 5: マナゴーレム / 6: ガラスの大砲×3" },
    { id: "DICE8", t: "spell", cost: 8, act: "dmg", name: "악마의 주사위", nameJa: "悪魔のダイス", text: "주사위 — 1·2: 자신 최대마나-4 / 3·4: 상대 마나-1·14뎀 / 5: 폭풍의 전사 / 6: 상대 마법함정 전멸·전사 2체·최대마나+2·자신 체력+10", textJa: "ダイス — 1·2: 自分の最大マナ-4 / 3·4: 相手のマナ-1·14 / 5: 嵐の戦士 / 6: 相手の魔法罠全滅·戦士2体·最大マナ+2·自分の体力+10" },
];
for (const id of Object.keys(PATCH2)) {
    if (DB[id])
        Object.assign(DB[id], PATCH2[id]);
}
for (const id of DELETE_IDS2) {
    delete DB[id];
}
for (const c of NEW_CARDS2) {
    DB[c.id] = c;
}
// ============================================================
// BALANCE PATCH 3 — user rebalance + new mechanics
// ============================================================
const PATCH3 = {
    // 광폭한 검귀: 소환시 자신에게 2 데미지
    NGA4: { onSummon: "selfBurn", val: 2, text: "소환시: 자신에게 2 데미지", textJa: "召喚時: 自分に2ダメージ" },
    // 기록자: 카드 3장 드로우
    NMD4: { onSummon: "draw", val: 3, text: "소환시: 카드 3장 드로우", textJa: "召喚時: カード3枚ドロー" },
    // 수정 정령: 0/6 버프
    NSPR: { def: 9 }, // v25: 6→9 (체력 전투 보상)
    // 대현자: 카드 5장 드로우
    NMD6: { onSummon: "draw", val: 5, text: "소환시: 카드 5장 드로우", textJa: "召喚時: カード5枚ドロー" },
    // 흑요석 광전사: 상대 플레이어에게 데미지를 입힐 때마다 +2/+2
    GM6_0: { attackFx: "rampFace", text: "상대 플레이어에게 데미지를 입힐 때마다 +2/+2(지속)", textJa: "相手プレイヤーにダメージを与えるたび+2/+2(持続)" },
    // 은빛 성벽: 상시 아군 몬스터 전체 방어 +3
    GM6_1: { aura: "wallDef", val: 3, text: "상시: 자신 필드의 아군 몬스터 체력 +3", textJa: "常時: 自分の場の味方モンスターの体力+3" },
    // 폭풍의 광전사: 필드에 있는 한 상대 최대 마나 -3
    GM11_0: { aura: "drainMana", val: 3, text: "이 카드가 필드에 있는 한 상대 최대 마나 -3", textJa: "このカードが場にいる限り相手の最大マナ-3" },
    // 트윈 팽: 3/2로 너프
    M6: { atk: 3, def: 2 },
    // 5코스트 종족카드 → 4코스트 / 5·5 하향 (시초 제외)
    TSO5: { cost: 4, atk: 5, def: 5 }, TNO5: { cost: 4, atk: 5, def: 5 },
    TPO5: { cost: 4, atk: 5, def: 5 }, TAR5: { cost: 4, atk: 5, def: 5 },
    // 어튠 - 흑: 시전6 (구매코스트와 동일 → 시전 표기 삭제)
    AHEUK: { play: 6, text: "상대 최대 마나 -1 · 자신 필드 몬스터가 없으면 추가로 -1", textJa: "相手の最大マナ-1 · 自分の場のモンスターがいなければ追加で-1" },
    // 시공간 조작: 코스트14 / 시전12 / 70% 스킵
    TIMEWARP: { cost: 14, play: 12, text: "70% 확률로 다음 상대 턴을 스킵", textJa: "70%で次の相手のターンをスキップ" },
    // 갬블 / 악마의 주사위: 알기 쉬운 텍스트 + 소환 몬스터 명시
    GAMBLE: { text: "주사위 1~6 — ①② 자신에게 8 데미지 / ③④ 상대에게 5 데미지 / ⑤ 마나 골렘 소환 / ⑥ 유리 대포 3체 소환", textJa: "ダイス1~6 — ①② 自分に8ダメージ / ③④ 相手に5ダメージ / ⑤ マナゴーレム召喚 / ⑥ ガラス大砲3体召喚" },
    DICE8: { text: "주사위 1~6 — ①② 자신 최대마나-4 / ③④ 상대 마나-1·14뎀 / ⑤ 폭풍의 전사(2회공격) 소환 / ⑥ 상대 마법·함정 전멸+폭풍의 전사 2체+최대마나+2+자신 체력+10", textJa: "ダイス1~6 — ①② 自分の最大マナ-4 / ③④ 相手マナ-1・14 / ⑤ 嵐の戦士(2回攻撃)召喚 / ⑥ 相手の魔法・罠全滅+嵐の戦士2体+最大マナ+2+自分の体力+10" },
};
const NEW_CARDS3 = [
    // ---- monsters ----
    { id: "CREATOR", t: "mon", cost: 13, name: "창조신", nameJa: "創造神", atk: 20, def: 20, onSummon: "creator", text: "소환시: 양측 덱·묘지에서 무작위 몬스터 3체를 자신 필드에 소환", textJa: "召喚時: 両者のデッキ・墓地からランダムなモンスター3体を自分の場に召喚" },
    { id: "ASSASSIN1", t: "mon", cost: 2, name: "초급 암살자", nameJa: "初級アサシン", atk: 4, def: 1, directOnly: true, text: "상대 플레이어만 직접 공격 가능 (몬스터 공격 불가)", textJa: "相手プレイヤーのみ直接攻撃可能 (モンスターは攻撃不可)" },
    { id: "ASSASSIN2", t: "mon", cost: 4, name: "중급 암살자", nameJa: "中級アサシン", atk: 9, def: 1, directOnly: true, text: "상대 플레이어만 직접 공격 가능 (몬스터 공격 불가)", textJa: "相手プレイヤーのみ直接攻撃可能 (モンスターは攻撃不可)" },
    { id: "ASSASSIN3", t: "mon", cost: 6, name: "상급 암살자", nameJa: "上級アサシン", atk: 15, def: 1, directOnly: true, summonReq: "assassinField", text: "상대 플레이어만 직접 공격 가능. 자신 필드에 '암살자'가 있어야 소환 가능", textJa: "相手プレイヤーのみ直接攻撃可能。自分の場に「アサシン」がいる時のみ召喚可能" },
    { id: "ASSASSIN4", t: "mon", cost: 8, name: "특급 암살자 - 나이트로드", nameJa: "特級アサシン - ナイトロード", atk: 23, def: 5, mult: 2, summonReq: "assassinAll", onSummon: "wipeTraps", text: "소환시: 상대의 세트 함정을 모두 파괴 · 1턴에 2번 공격 · 패 제외 필드·덱·묘지에 초급·중급·상급 암살자가 각 1장 이상일 때 소환 가능", textJa: "召喚時: 相手のセット罠を全て破壊 · 1ターンに2回攻撃 · 手札を除く場・デッキ・墓地に初級・中級・上級アサシンが各1枚以上で召喚可能" },
    // ---- spells: rune ----
    { id: "RUNE1", t: "spell", cost: 2, play: 3, act: "destroyMon", name: "룬 학문 - 초급", nameJa: "ルーン学問 - 初級", text: "코스트 5 이상 상대 몬스터 1체 파괴 (시전 3)", textJa: "コスト5以上の敵モンスター1体を破壊 (発動3)" },
    { id: "RUNE2", t: "spell", cost: 5, act: "manaUp", name: "룬 학문 - 중급", nameJa: "ルーン学問 - 中級", text: "패의 '룬 학문 - 초급'을 버리면 최대 마나 +2", textJa: "手札の「ルーン学問 - 初級」を捨てると最大マナ+2" },
    { id: "RUNE3", t: "spell", cost: 7, play: 8, act: "manaUp", name: "룬 학문 - 상급", nameJa: "ルーン学問 - 上級", text: "패의 초급·중급을 1장씩 버리면 최대 마나 +4 (시전 8)", textJa: "手札の初級・中級を1枚ずつ捨てると最大マナ+4 (発動8)" },
    // ---- spells: genesis(시초) ----
    { id: "GENESIS_SONG", t: "spell", cost: 3, play: 2, name: "시초의 노래", nameJa: "始原の歌", text: "덱·묘지의 '시초' 몬스터 1체를 무작위 소환 (시전 2)", textJa: "デッキ・墓地の「始原」モンスター1体をランダム召喚 (発動2)" },
    { id: "GENESIS_MAGIC", t: "spell", cost: 5, play: 0, name: "시초의 마법", nameJa: "始原の魔法", text: "자신 필드의 '시초' 몬스터 모두 +4/+4", textJa: "自分の場の「始原」モンスター全てに+4/+4" },
    // ---- spells: enchant(영구마법) ----
    { id: "KIN_CALL", t: "spell", cost: 3, ench: "kinDiscount", val: 99, name: "동족의 부름", nameJa: "同族の呼び声", text: "영구: 자신 필드에 종족 몬스터가 있으면 마켓의 종족카드 구매코스트 -2(최소1)", textJa: "永続: 自分の場に種族モンスターがいれば、マーケットの種族カード購入コスト-2(最低1)" },
    { id: "MULTI_CULTURE", t: "spell", cost: 3, play: 4, ench: "cultureMana", val: 99, name: "다양한 문화", nameJa: "多様な文化", text: "영구: '시초' 제외, 필드의 종족 몬스터 1체당 임시 최대 마나 +1 (시전 4)", textJa: "永続: 「始原」を除く、場の種族モンスター1体ごとに一時的に最大マナ+1 (発動4)" },
    { id: "SLAY_ART", t: "spell", cost: 2, ench: "slayArt", val: 99, name: "살생의 극의", nameJa: "殺生の極意", text: "영구: 양 플레이어 중 누구든 데미지를 받을 때마다 추가 데미지 +2", textJa: "永続: どちらのプレイヤーがダメージを受けるたび追加ダメージ+2" },
    // ---- spells: blood magic ----
    { id: "BLOOD1", t: "spell", cost: 2, play: 1, act: "draw", name: "피의 마법 - 블러드 드로우", nameJa: "血の魔法 - ブラッドドロー", text: "자신에게 15 데미지, 카드 6장 드로우 (시전 1)", textJa: "自分に15ダメージ、カード6枚ドロー (発動1)" },
    { id: "BLOOD2", t: "spell", cost: 4, play: 2, name: "피의 마법 - 블러드 샤워", nameJa: "血の魔法 - ブラッドシャワー", text: "자신에게 15 데미지 · 상대의 영구마법 또는 세트 함정 2장을 선택해 파괴 (시전 2)", textJa: "自分に15ダメージ · 相手の永続魔法またはセットトラップを2枚選んで破壊 (発動2)" },
    // ---- spells: disarm(장치) ----
    { id: "DISARM1", t: "spell", cost: 2, play: 0, act: "destroyEnch", val: 1, name: "장치해제", nameJa: "装置解除", text: "상대 영구마법 1장 파괴", textJa: "相手の永続魔法1枚を破壊" },
    { id: "DISARM2", t: "spell", cost: 3, play: 2, act: "destroyEnch", val: 2, name: "장치분석", nameJa: "装置分析", text: "상대 영구마법 2장 파괴 (시전 2)", textJa: "相手の永続魔法2枚を破壊 (発動2)" },
    { id: "DISARM3", t: "spell", cost: 4, play: 3, name: "마법연구기관", nameJa: "魔法研究機関", text: "상대 영구마법 1장 파괴 후 게임에서 제외 (시전 3)", textJa: "相手の永続魔法1枚を破壊しゲームから除外 (発動3)" },
    // ---- spells: forbidden ----
    { id: "FORBIDDEN", t: "spell", cost: 3, name: "금단의 술식", nameJa: "禁断の術式", text: "자신 체력 -15, 최대 마나 -2 · 주사위 4~6이면 필드 한 종족(시초 제외)의 나머지 몬스터를 모두 소환", textJa: "自分の体力-15、最大マナ-2 · ダイス4~6なら場の一種族(始原除く)の残りモンスターを全て召喚" },
];
// 7코스트 종족 카드 삭제 (시초 제외 각 종족은 2·3·4코스트 3종으로 유지)
const DELETE_IDS3 = ["TSO7", "TNO7", "TPO7", "TAR7"];
for (const id of Object.keys(PATCH3)) {
    if (DB[id])
        Object.assign(DB[id], PATCH3[id]);
}
for (const id of DELETE_IDS3) {
    delete DB[id];
}
for (const c of NEW_CARDS3) {
    DB[c.id] = c;
}
// ============================================================
// BALANCE PATCH 4 — data-driven nerfs (3000-game random-buy winrate analysis)
// ============================================================
const PATCH4 = {
    M13: { atk: 4, def: 4 }, // 보이드 리버 7/5 → 4/4 (효과가 본체라 스탯 대폭 하향)
    M11: { atk: 6, def: 2 }, // 워로드 8/4 → 6/2 (조건부 +2는 유지)
    T6: { cost: 4, play: 3, text: "공격 몬스터 파괴 + 공격력 절반 반사 (시전 3)", textJa: "攻撃モンスターを破壊 + 攻撃力の半分を反射 (発動3)" }, // 카운터 서지 구매 3→4, 시전 2→3 + 표기
    NGA3: { atk: 6, def: 1 }, // 유리 대포 7/1 → 6/0
    M7: { atk: 5, def: 1, val: 2, text: "소환시: 상대 체력에 2 데미지", textJa: "召喚時: 相手の体力に2ダメージ" }, // 엠버 드레이크 7/3+번3 → 5/0+번2
    T13: { cost: 5, val: 6, text: "공격 몬스터 파괴 + 상대 체력에 6 데미지", textJa: "攻撃モンスターを破壊 + 相手の体力に6ダメージ" }, // 천벌 10뎀→6뎀, 4코→5코
    M8: { def: 4, onSummon: undefined, val: undefined, text: "—", textJa: "—" }, // 그로브 워든 4/6+회복5 → 4/4 바닐라
    M10: { atk: 2 }, // 마나 골렘 3/5 → 2/5
    NGA4: { val: 3, text: "소환시: 자신에게 3 데미지", textJa: "召喚時: 自分に3ダメージ" }, // 광폭한 검귀 자해 2 → 3
    // 종족 4코스트 몬스터 전원 5/5 → 4/5
    TSO5: { atk: 3, def: 4 }, TNO5: { atk: 3, def: 4 }, TPO5: { atk: 3, def: 4 }, TAR5: { atk: 3, def: 4 },
    // ---- 3차 (미구현이던 렐릭 헌터의 '드로우'는 텍스트에서도 삭제) ----
    M9: { atk: 4, text: "소환시: 자신의 제시를 무료 갱신", textJa: "召喚時: 自分の提示を無料更新" }, // 렐릭 헌터 5/4 → 4/4
    S9: { val2: 3, text: "상대에게 5 데미지 + 자신 체력 3 회복", textJa: "相手に5ダメージ + 自分の体力3回復" }, // 사이펀 회복 5 → 3
    M12: { def: 5 }, // 타이탄 게이트 4/8 → 4/5
    M4: { atk: 4, def: 1 }, // 블레이드 헤어 5/2 → 4/1
    M6: { atk: 2, def: 1 }, // 트윈 팽 3/2 → 2/1 (방어-2 유지)
    // ---- 4차 ----
    T10: { val: 2, text: "공격 몬스터 파괴 + 자신 체력 2 회복", textJa: "攻撃モンスターを破壊 + 自分の体力2回復" }, // 영혼 포식 회복 7 → 2
    T9: { val2: 0, text: "공격 무효 + 자신 체력 3 회복 (시전 1)", textJa: "攻撃無効 + 自分の体力3回復 (発動1)" }, // 역류 드로우 삭제
    M5: { onSummon: "selfBurn", val: 2, text: "소환시: 자신에게 2 데미지", textJa: "召喚時: 自分に2ダメージ" }, // 아이언 셸 자해 2 추가
    // ---- 구매/시전 코스트 상이 카드: "(시전 N)" 표기 일괄 추가 (수치 변경 없음) ----
    T1: { text: "공격 절반 + 공격측에 1 데미지 (시전 1)", textJa: "攻撃を半減 + 攻撃側に1ダメージ (発動1)" },
    T4: { text: "공격 몬스터 파괴 + 그 공격력만큼 상대에게 데미지 (시전 3)", textJa: "攻撃モンスターを破壊 + その攻撃力分を相手にダメージ (発動3)" },
    GT8_0: { text: "공격 무효 + 자신 몬스터 전체의 체력 +4(지속) + 1장 드로우 (시전 7)", textJa: "攻撃無効 + 自分のモンスター全体の体力+4(持続) + 1枚ドロー (発動7)" },
    GT8_3: { text: "공격 무효 + 최대 마나 +1 (시전 4)", textJa: "攻撃無効 + 最大マナ+1 (発動4)" },
    GS8_3: { text: "카드 5장 드로우 · 60%로 상대 몬스터/함정/마법 1장 무작위 파괴 (시전 3)", textJa: "カード5枚ドロー · 60%で相手のモンスター/罠/魔法1枚をランダム破壊 (発動3)" },
    DISARM1: { text: "상대 영구마법 1장 파괴 (시전 0)", textJa: "相手の永続魔法1枚を破壊 (発動0)" },
    GENESIS_MAGIC: { text: "자신 필드의 '시초' 몬스터 모두 +4/+4 (시전 0)", textJa: "自分の場の「始原」モンスター全てに+4/+4 (発動0)" },
    TIMEWARP: { text: "70% 확률로 다음 상대 턴을 스킵 (시전 12)", textJa: "70%で次の相手のターンをスキップ (発動12)" },
};
for (const id of Object.keys(PATCH4)) {
    if (DB[id])
        Object.assign(DB[id], PATCH4[id]);
}
// ============================================================
// BALANCE PATCH 5 — 타이탄 게이트 단일화 + 함정 리워크
//   · 널계 함정: 전부 승률 마이너스 → 자해 삭제·코스트 인하
//   · 고코스트 함정(8c+): 승률 최하위 → 구매가 유지, 시전(설치)비 대폭 할인
//     ("비싸게 사서 싸게 깔고, 발동하면 크게" 정체성)
// ============================================================
const PATCH5 = {
    // 타이탄 게이트: 적 전체 -2 → 적 1체 -2 (엔진 onSummon "atkDown")
    M12: { onSummon: "atkDown", text: "소환시: 적 몬스터 1체 공격력 -2(지속)", textJa: "召喚時: 敵モンスター1体の攻撃力-2(持続)" },
    // 널(마법 무효)계 리워크 — "저코스트 마법은 싸게 카운터" (cap = 무효화 가능한 최대 시전코스트)
    NT_NULL3: { cost: 1, cap: 2, val: 0, text: "코스트 2 이하 마법 1장을 무효화", textJa: "コスト2以下の魔法1枚を無効化" },
    T2: { cost: 2, play: 2, cap: 4, val: 0, text: "코스트 4 이하 마법 1장을 무효화", textJa: "コスト4以下の魔法1枚を無効化" },
    NT_NULL5: { cost: 4, val2: 4, text: "상대 마법 1장 무효화 + 상대에게 4 데미지", textJa: "相手の魔法1枚を無効化 + 相手に4ダメージ" }, // 전체 대응 프리미엄: 5 → 4, 상대 4뎀 버프
    NT_NULL6: { cost: 6, val2: 8, text: "상대 마법 1장 무효화 + 상대에게 8 데미지", textJa: "相手の魔法1枚を無効化 + 相手に8ダメージ" }, // 6코 유지, 상대 8뎀 버프
    // 5~6코 조정
    GT5_0: { play: 1 }, // 그림자 방어 태세 (최하위 -12.5%, 무효+부가라 효과 자체가 약함 → 설치 1)
    GT5_3: { val: 60, text: "공격 몬스터 파괴 + 60%로 자신 필드에 소생(소유권 이동)", textJa: "攻撃モンスターを破壊 + 60%で自分の場に蘇生(所有権移動)" }, // 30% → 60%
    T13: { play: 3 }, // 천벌: 구매 5 유지, 시전 3
    GT6_0: { play: 3 }, GT6_1: { play: 3 },
    // 8코+ 시전비 대할인
    GT8_0: { play: 4, text: "공격 무효 + 자신 몬스터 전체의 체력 +4(지속) + 1장 드로우 (시전 4)", textJa: "攻撃無効 + 自分のモンスター全体の体力+4(持続) + 1枚ドロー (発動4)" },
    GT8_1: { play: 4 }, GT8_2: { play: 4 },
    GT8_3: { play: 3, val: 2, text: "공격 무효 + 최대 마나 +2 (시전 3)", textJa: "攻撃無効 + 最大マナ+2 (発動3)" },
    GT8_5: { play: 4 },
    GT9_2: { play: 4 }, GT9_3: { play: 4 },
    GT10_0: { play: 4 }, GT10_1: { play: 4 }, GT10_2: { play: 4 }, GT10_3: { play: 4 },
    GT11_0: { play: 5 }, GT11_1: { play: 5 },
    GT12_0: { play: 5 }, GT12_1: { play: 5 },
};
for (const id of Object.keys(PATCH5)) {
    if (DB[id])
        Object.assign(DB[id], PATCH5[id]);
}
// 구매/시전 코스트가 다른 카드는 텍스트에 자동 표기 — 몬스터는 "(소환 N)", 그 외 "(시전 N)"
for (const id of Object.keys(DB)) {
    const c = DB[id];
    if (c.play === undefined || c.play === c.cost)
        continue;
    if (!/시전|소환 코스트|\(소환 /.test(c.text))
        c.text += c.t === "mon" ? ` (소환 ${c.play})` : ` (시전 ${c.play})`;
    if (c.textJa && !/発動|召喚コスト|\(召喚/.test(c.textJa))
        c.textJa += c.t === "mon" ? ` (召喚${c.play})` : ` (発動${c.play})`;
}
// ============================================================
// BALANCE PATCH 6 — 드로우 주문 버프: 시전 2 이상인 순수 드로우 주문만 시전 -1
// (시전 1 이하는 유지 → 0마나 캔트립 방지. 드로우 주문은 전 구간 승률 마이너스였음)
// ============================================================
const DRAW_BUFF = ["ND3", "ND5", "GS5_3", "GS6_3", "GS7_3", "GS8_3", "GS9_3", "GS10_3"]; // BLOOD2는 v14 리워크로 순수 드로우 주문이 아니게 되어 제외
for (const id of DRAW_BUFF) {
    const c = DB[id];
    if (!c || c.play === undefined || c.play < 2)
        continue;
    c.play -= 1;
    c.text = c.text.replace(/\(시전 \d+\)/, `(시전 ${c.play})`);
    if (c.textJa)
        c.textJa = c.textJa.replace(/\(発動\d+\)/, `(発動${c.play})`);
}
// ============================================================
// NEW CARDS 4 — 행운의 보물상자 (복권 + 양측 보물상자 봉인)
// ============================================================
const NEW_CARDS4 = [
    { id: "LUCKY_CHEST", t: "spell", cost: 3, name: "행운의 보물상자", nameJa: "幸運の宝箱",
        text: "10%: 최대 마나+3·2장 드로우 / 40%: 최대 마나+1 / 30%: 자신 최대 체력+8 / 5%: 자신 최대 체력+12 / 15%: 꽝(상대 필드에 마스터 미믹 10/3)",
        textJa: "10%: 最大マナ+3・2枚ドロー / 40%: 最大マナ+1 / 30%: 自分の最大体力+8 / 5%: 自分の最大体力+12 / 15%: ハズレ(相手の場にマスターミミック10/3)" },
    { id: "MIMIC2", t: "mon", cost: 0, aura: "chestLock", name: "마스터 미믹", nameJa: "マスターミミック", atk: 10, def: 3,
        text: "이 몬스터가 필드에 있는 한 양 플레이어는 보물상자를 사용할 수 없다 (어튠 - 마는 가능)", textJa: "このモンスターが場にいる限り両者は宝箱を使用できない (アチューン・魔は可能)" },
    { id: "GUILD_CHEST", t: "spell", cost: 5, play: 3, name: "암살자 길드의 보물상자", nameJa: "アサシンギルドの宝箱",
        text: "10%: 최대 마나+3 / 10%: 턴 시작 드로우+1(영구) / 20%: 최대 마나+2 / 10%: 최대 마나+1 / 10%: 자신 최대 체력+10 / 20%: 상대 필드에 초급·중급 암살자 소환 / 20%: 초급·중급·상급 암살자 소환 + 자신에게 10 데미지 (시전 3)",
        textJa: "10%: 最大マナ+3 / 10%: ターン開始ドロー+1(永続) / 20%: 最大マナ+2 / 10%: 最大マナ+1 / 10%: 自分の最大体力+10 / 20%: 相手の場に初級・中級アサシン召喚 / 20%: 初級・中級・上級アサシン召喚 + 自分に10ダメージ (発動3)" },
    { id: "GUILD_EYE", t: "spell", cost: 0, ench: "bonusDraw", val: 99, val2: 1, name: "길드의 정보망", nameJa: "ギルドの情報網",
        text: "영구: 자신의 턴 시작시 1장 추가 드로우", textJa: "永続: 自分のターン開始時に1枚追加ドロー" },
];
for (const c of NEW_CARDS4) {
    DB[c.id] = c;
}
// ============================================================
// BALANCE PATCH 7 — 상자 회복 너프 후 레이스 메타 상위권 조정
// ============================================================
const PATCH7 = {
    M11: { atk: 5, val: 1, text: "아군 몬스터 2체 이상이면 공격력 +1", textJa: "味方モンスター2体以上で攻撃力+1" }, // 워로드 6/2+2 → 5/2+1
    NGA3: { atk: 5, onSummon: "selfBurn", val: 2, text: "소환시: 자신에게 2 데미지", textJa: "召喚時: 自分に2ダメージ" }, // 유리 대포 6/0 → 5/0 + 자해 2
    M13: { atk: 3, def: 3 }, // 보이드 리버 4/4 → 3/3
    T4: { val2: 30, text: "공격 몬스터 파괴 + 30% 확률로 그 공격력만큼 상대에게 데미지 (시전 3)", textJa: "攻撃モンスターを破壊 + 30%でその攻撃力分を相手にダメージ (発動3)" }, // 미러 손 반사 30%
    M8: { atk: 3, def: 4, onSummon: "heal", val: 2, text: "소환시: 자신 체력 2 회복", textJa: "召喚時: 自分の体力2回復" }, // 그로브 워든 4/4 → 3/4 + 회복 2
    NMD4: { val: 2, text: "소환시: 카드 2장 드로우", textJa: "召喚時: カード2枚ドロー" }, // 기록자 드로우 3 → 2
    S9: { val: 4, text: "상대에게 4 데미지 + 자신 체력 3 회복", textJa: "相手に4ダメージ + 自分の体力3回復" }, // 사이펀 5뎀 → 4뎀
};
for (const id of Object.keys(PATCH7)) {
    if (DB[id])
        Object.assign(DB[id], PATCH7[id]);
}
// ============================================================
// NEW CARDS 5 — 마나 램프 5종 (미드~엔드게임 아키타입 개방)
// 고코스트 카드 플레이률이 0.16~0.95회/구매로 죽어 있어, 커브 점프 수단 추가
// ============================================================
const NEW_CARDS5 = [
    { id: "CATALYST", t: "spell", cost: 2, name: "균열의 촉매", nameJa: "亀裂の触媒",
        text: "자신에게 4 데미지, 최대 마나 +1", textJa: "自分に4ダメージ、最大マナ+1" },
    { id: "WORLD_SEED", t: "spell", cost: 4, ench: "seedMana", val: 99, val2: 33, name: "세계수의 씨앗", nameJa: "世界樹の種",
        text: "영구: 자신의 턴 시작마다 33% 확률로 최대 마나 +1", textJa: "永続: 自分のターン開始時、33%で最大マナ+1" },
    { id: "MANA_GIANT", t: "mon", cost: 5, atk: 1, def: 10, aura: "mana2", name: "마나 수정 거인", nameJa: "マナ水晶の巨人", // v25: 7→10
        text: "필드에 있는 동안 최대 마나 +2", textJa: "場にいる間、最大マナ+2" },
    { id: "HOURGLASS", t: "spell", cost: 6, act: "manaUp", val: 2, val2: 2, name: "시간의 모래시계", nameJa: "時の砂時計",
        text: "최대 마나 +2, 카드 2장 드로우", textJa: "最大マナ+2、カード2枚ドロー" },
    { id: "LIFE_CYCLE", t: "spell", cost: 3, play: 2, ench: "healMana", val: 99, name: "생명의 순환", nameJa: "生命の循環",
        text: "영구: 자신이 체력을 회복할 때마다 15% 확률로 최대 마나 +1 (시전 2)", textJa: "永続: 自分が体力を回復するたび15%で最大マナ+1 (発動2)" },
    { id: "LIFE_SANCTUM", t: "spell", cost: 3, play: 2, ench: "growHp", val: 99, val2: 3, name: "생명의 성소", nameJa: "生命の聖域",
        text: "영구: 자신의 턴마다 자신 최대 체력 +3 (시전 2)", textJa: "永続: 自分のターンごとに自分の最大体力+3 (発動2)" },
    { id: "WORLD_HEART", t: "spell", cost: 5, play: 4, ench: "growHpMana", val: 99, val2: 7, name: "세계수의 심장", nameJa: "世界樹の心臓",
        text: "영구: 자신의 턴마다 자신 최대 체력 +7 · 이 마법이 필드에 있는 한 자신의 최대 마나 -2 (시전 4)", textJa: "永続: 自分のターンごとに自分の最大体力+7 · この魔法が場にある限り自分の最大マナ-2 (発動4)" },
    { id: "MEDITATE", t: "spell", cost: 2, play: 3, act: "heal", val: 8, name: "명상", nameJa: "瞑想",
        text: "이번 턴에 다른 카드를 플레이하지 않았을 경우에만 발동 가능. 자신 최대 체력의 80%까지 자신 체력 회복 (시전 3)", textJa: "このターンに他のカードをプレイしていない場合のみ発動可能。自分の最大体力の80%まで回復 (発動3)" },
    { id: "PRAYER", t: "spell", cost: 4, play: 5, act: "heal", val: 8, name: "성역의 기도", nameJa: "聖域の祈り",
        text: "최대 마나가 12 이하이고 이번 턴에 다른 카드를 플레이하지 않았을 경우에만 발동 가능. 자신 최대 체력의 80%까지 자신 체력 회복 (시전 5)", textJa: "最大マナが12以下で、このターンに他のカードをプレイしていない場合のみ発動可能。自分の最大体力の80%まで回復 (発動5)" },
    { id: "HERMIT", t: "spell", cost: 8, play: 7, act: "heal", val: 8, name: "은둔의 안식", nameJa: "隠遁の安息",
        text: "자신 필드에 몬스터가 없을 때만 발동 가능 · 자신 체력 완전 회복 + 자신 최대 체력 +15 (시전 7)", textJa: "自分の場にモンスターがいない時のみ発動可能 · 自分の体力全回復 + 自分の最大体力+15 (発動7)" },
    { id: "WORLD_BLESS", t: "spell", cost: 7, play: 6, ench: "worldBless", val: 99, name: "세계수의 축복", nameJa: "世界樹の祝福",
        text: "영구: 양 플레이어는 자신의 턴 시작마다 최대 마나 +1. 이 카드의 시전자는 매턴 40% 확률로 최대 마나 +2 추가 (시전 6)",
        textJa: "永続: 両プレイヤーは自分のターン開始時に最大マナ+1。このカードの使用者は毎ターン40%で最大マナ+2追加 (発動6)" },
];
for (const c of NEW_CARDS5) {
    DB[c.id] = c;
}
// ============================================================
// BALANCE PATCH 8
// ============================================================
const PATCH9 = {
    GM5_3: { atk: 6, def: 2, text: "매 턴 시작 시 상대 체력에 3 데미지", textJa: "毎ターン開始時 相手の体力に3ダメージ" }, // 화염의 드레이크 7/4 → 6/2
    GM5_2: { atk: 5, def: 5, text: "상시: 몬스터를 소환할 때 그 몬스터 공격력 +1", textJa: "常時: モンスター召喚時、そのモンスターの攻撃力+1" }, // 강철의 전사 6/6 → 5/5, 버프 +1/+0
    GM5_0: { atk: 9, def: 2 }, // 고대의 광전사 9/3 → 9/2
    T13: { val: 4, text: "공격 몬스터 파괴 + 상대 체력에 4 데미지 (시전 3)", textJa: "攻撃モンスターを破壊 + 相手の体力に4ダメージ (発動3)" }, // 천벌 6뎀 → 4뎀
};
const PATCH8 = {
    M12: { def: 4 }, // 타이탄 게이트 4/5 → 4/4
    M7: { atk: 4 }, // 엠버 드레이크 5/0 → 4/0 (번 2 유지)
    M8: { val: 1, text: "소환시: 자신 체력 1 회복", textJa: "召喚時: 自分の体力1回復" }, // 그로브 워든 회복 2 → 1
};
for (const id of Object.keys(PATCH8)) {
    if (DB[id])
        Object.assign(DB[id], PATCH8[id]);
}
for (const id of Object.keys(PATCH9)) {
    if (DB[id])
        Object.assign(DB[id], PATCH9[id]);
}
// chest (golden treasure) outcome odds — shown when the chest card is enlarged
export const CHEST_ODDS = {
    ko: { title: "황금상자 확률 (각 25%)", rows: ["최대 마나 +1 — 25%", "체력 +3 — 25%", "최대 체력 +5 — 25%", "꽝: 상대 필드에 미믹(3/2) — 25%"] },
    ja: { title: "宝箱の確率 (各25%)", rows: ["最大マナ +1 — 25%", "体力 +3 — 25%", "最大体力 +5 — 25%", "ハズレ: 相手の場にミミック(3/2) — 25%"] },
    en: { title: "Golden chest odds (25% each)", rows: ["Max mana +1 — 25%", "HP +3 — 25%", "Max HP +5 — 25%", "Dud: Mimic (3/2) on enemy field — 25%"] },
};
// ============================================================
// BALANCE PATCH 10 — 3코 만성 상위권 + 2코 종족 시소 조정
// ============================================================
const PATCH10 = {
    M8: { atk: 2 }, // 그로브 워든 3/4 → 2/4
    M9: { atk: 3 }, // 렐릭 헌터 4/4 → 3/4
    LIFE_SANCTUM: { cost: 4 }, // 생명의 성소 3c → 4c (시전 2 유지)
    NHEX: { val: 5, text: "소환시: 상대 체력에 5 데미지", textJa: "召喚時: 相手の体力に5ダメージ" }, // 꼬마 주술사 번 6 → 5
    NMD2: { atk: 1 }, // 탐서 정령 2/2 → 1/2
    // 2코 종족 몸집 3/2 → 2/2 (시초 제외)
    TSO2: { atk: 2 }, TNO2: { atk: 2 }, TPO2: { atk: 2 }, TAR2: { atk: 2 },
};
for (const id of Object.keys(PATCH10)) {
    if (DB[id])
        Object.assign(DB[id], PATCH10[id]);
}
// ============================================================
// BALANCE PATCH 11
// ============================================================
const PATCH11 = {
    M12: { atk: 3 }, // 타이탄 게이트 4/4 → 3/4
    TSO3: { def: 1 }, TNO3: { def: 1 }, TPO3: { def: 1 }, TAR3: { def: 1 }, // 3코 종족 4/2 → 4/1
    S12: { val: 2, val2: 0, text: "자신 몬스터 1체에 공격력+2(지속)", textJa: "自分のモンスター1体に攻撃力+2(持続)" }, // 강화 주문 방어 삭제
    ELITE: { text: "소환시: 자신의 덱+묘지가 7장 이하면 공격력 +3", textJa: "召喚時: 自分のデッキ+墓地が7枚以下なら攻撃力+3" }, // (엔진 수치와 동기)
    NGA4: { atk: 10, val: 4, text: "소환시: 자신에게 4 데미지", textJa: "召喚時: 自分に4ダメージ" }, // 광폭한 검귀 11/0·자해3 → 10/0·자해4
    E2: { val: 4, text: "4턴 동안 서로 몬스터로 공격할 수 없다", textJa: "4ターンの間 互いにモンスターで攻撃できない" }, // 평화 협정 3 → 4턴
};
for (const id of Object.keys(PATCH11)) {
    if (DB[id])
        Object.assign(DB[id], PATCH11[id]);
}
// ============================================================
// BALANCE PATCH 12 — TOP5 소폭 조정
// ============================================================
const PATCH12 = {
    TRAPSMITH: { atk: 1 }, // 함정 기술자 2/4 → 1/4
    LIFE_SANCTUM: { val2: 2, text: "영구: 자신의 턴마다 자신 최대 체력 +2 (시전 2)", textJa: "永続: 自分のターンごとに自分の最大体力+2 (発動2)" }, // +3 → +2
    HORDE: { text: "소환시: 자신의 덱+묘지가 24장 이상이면 +3/+3", textJa: "召喚時: 自分のデッキ+墓地が24枚以上なら+3/+3" }, // 20 → 24장 (엔진 동기)
    M13: { def: 2 }, // 보이드 리버 3/3 → 3/2
    M12: { val: 1, text: "소환시: 적 몬스터 1체 공격력 -1(지속)", textJa: "召喚時: 敵モンスター1体の攻撃力-1(持続)" }, // 타이탄 게이트 효과 -2 → -1
    S15: { cost: 3 }, // 룬 파열 4c → 3c
};
for (const id of Object.keys(PATCH12)) {
    if (DB[id])
        Object.assign(DB[id], PATCH12[id]);
}
// ============================================================
// NEW CARDS 7 — 메타/제외(Exile) 아키타입 확장
// ============================================================
const NEW_CARDS7 = [
    { id: "GLASS_BAN", t: "spell", cost: 3, play: 2, ench: "glassBan", val: 99, name: "유리 병기 금지령", nameJa: "ガラス兵器禁止令",
        text: "영구: 양측 필드의 최대 체력 1 이하 몬스터는 공격할 수 없다 (시전 2)", textJa: "永続: 両方の場の最大体力1以下のモンスターは攻撃できない (発動2)" },
    { id: "SHATTER", t: "spell", cost: 3, play: 2, name: "붕괴 진동", nameJa: "崩壊振動",
        text: "자신에게 5 데미지. 양 필드의 모든 몬스터의 체력이 1이 된다(지속) (시전 2)", textJa: "自分に5ダメージ。両方の場の全モンスターの体力が1になる(持続) (発動2)" },
    { id: "SCARECROW", t: "spell", cost: 2, name: "허수아비 소집", nameJa: "かかし召集",
        text: "허수아비(0/1) 3체를 자신 필드에 소환", textJa: "かかし(0/1)3体を自分の場に召喚" },
    { id: "LEVY", t: "spell", cost: 7, play: 4, name: "병력 소집", nameJa: "兵力召集",
        text: "병사(2/2) 3체를 자신 필드에 소환 (시전 4)", textJa: "兵士(2/2)3体を自分の場に召喚 (発動4)" },
    { id: "INQUISITION", t: "spell", cost: 3, play: 2, name: "이단 심문", nameJa: "異端審問",
        text: "상대의 덱·묘지·필드에 있는 종족 몬스터 1장당 상대에게 4 데미지 (시전 2)", textJa: "相手のデッキ・墓地・場の種族モンスター1枚につき相手に4ダメージ (発動2)" },
    { id: "MIMIC_LORD", t: "mon", cost: 2, atk: 0, def: 1, onSummon: "mimicLord", name: "미믹 리더", nameJa: "ミミックリーダー",
        text: "소환시: 자신을 제외한 양측 필드의 '미믹' 계열 1마리당 +3/+3", textJa: "召喚時: 自身を除く両者の場の「ミミック」系1体につき+3/+3" },
    { id: "AWAKENED_MIMIC", t: "mon", cost: 5, atk: 3, def: 4, onSummon: "awakenMimic", name: "각성한 미믹", nameJa: "覚醒ミミック",
        text: "소환시: 자신의 필드에 '미믹'(3/2) 2마리를 소환", textJa: "召喚時: 自分の場に「ミミック」(3/2)2体を召喚" },
    { id: "MIMIC_KING", t: "mon", cost: 6, atk: 6, def: 6, onSummon: "mimicKing", name: "미믹 킹", nameJa: "ミミックキング",
        text: "소환시: 제외된 자신의 '미믹' 계열 1장당 +1/+1 · 제외가 6장 이상이면 '마스터 미믹' 소환", textJa: "召喚時: 除外された自分の「ミミック」系1枚につき+1/+1 · 6枚以上なら「マスターミミック」を自分の場に召喚" },
    { id: "VITAL2", t: "mon", cost: 2, atk: 2, def: 1, onSummon: "maxHpUp", val: 2, name: "활력 신도", nameJa: "活力の信徒",
        text: "소환시: 자신 최대 체력 +2", textJa: "召喚時: 自分の最大体力+2" },
    { id: "VITAL3", t: "mon", cost: 3, atk: 3, def: 1, onSummon: "maxHpUp", val: 4, name: "활력 사제", nameJa: "活力の司祭",
        text: "소환시: 자신 최대 체력 +4", textJa: "召喚時: 自分の最大体力+4" },
    { id: "VITAL4", t: "mon", cost: 4, atk: 4, def: 1, condAtk: "hp45", name: "혈기왕성한 전사", nameJa: "血気盛んな戦士",
        text: "상시: 자신의 체력이 45 이상이면 +1/+3", textJa: "常時: 自分の体力が45以上なら+1/+3" },
    { id: "CULL_FLOOD", t: "spell", cost: 2, name: "컬 세례", nameJa: "カルの洗礼",
        text: "자신의 묘지에 컬 4장을 추가한 후, 덱·묘지에서 원하는 카드 3장을 게임에서 제외", textJa: "自分の墓地にカル4枚を追加し、デッキ・墓地から好きなカード3枚をゲームから除外" },
    { id: "PAIN_HARVEST", t: "spell", cost: 3, play: 2, ench: "cullOnHit", val: 99, name: "고통 수확", nameJa: "苦痛の収穫",
        text: "영구: 상대가 데미지를 입을 때마다 자신의 패에 컬 1장을 얻는다 (시전 2)", textJa: "永続: 相手がダメージを受けるたび手札にカル1枚を得る (発動2)" },
    { id: "CULL_FARM", t: "spell", cost: 3, play: 2, ench: "cullTurn", val: 99, name: "컬 재배", nameJa: "カル栽培",
        text: "영구: 자신의 턴 시작마다 패에 컬 1장을 얻는다 (시전 2)", textJa: "永続: 自分のターン開始時に手札にカル1枚を得る (発動2)" },
    { id: "PURGE_ALL", t: "spell", cost: 5, name: "대숙청", nameJa: "大粛清",
        text: "자신의 덱·묘지에서 원하는 카드를 원하는 만큼 게임에서 제외한다", textJa: "自分のデッキ・墓地から好きなカードを好きなだけゲームから除外する" },
    { id: "EXILE_NUKE1", t: "spell", cost: 6, play: 10, name: "공허 포격", nameJa: "虚空砲撃",
        text: "게임에서 제외된 자신의 카드 1장당 상대에게 2 데미지 (시전 10)", textJa: "ゲームから除外された自分のカード1枚につき相手に2ダメージ (発動10)" },
    { id: "EXILE_NUKE2", t: "spell", cost: 8, play: 12, name: "공허 대붕괴", nameJa: "虚空大崩壊",
        text: "게임에서 제외된 자신의 카드 1장당 상대에게 3 데미지 (시전 12)", textJa: "ゲームから除外された自分のカード1枚につき相手に3ダメージ (発動12)" },
    { id: "CULL_TITAN", t: "mon", cost: 9, atk: 1, def: 1, onSummon: "cullTitan", name: "컬의 화신", nameJa: "カルの化身",
        text: "소환시: 게임에서 제외된 자신의 '컬' 1장당 +1/+1", textJa: "召喚時: ゲームから除外された自分の「カル」1枚につき+1/+1" },
    { id: "WORLD_GUARD", t: "mon", cost: 8, atk: 6, def: 5, onSummon: "worldGuard", name: "세계수의 수호자", nameJa: "世界樹の守護者",
        text: "소환시: 자신의 최대 체력이 90 이상이면 최대 마나 +1, 자신 최대 체력 +15", textJa: "召喚時: 自分の最大体力が90以上なら最大マナ+1、自分の最大体力+15" },
    { id: "GOLIATH_HUNT", t: "spell", cost: 3, name: "골리앗 사냥", nameJa: "ゴリアテ狩り",
        text: "최대 체력 20 이상의 적 몬스터 1체를 파괴", textJa: "最大体力20以上の敵モンスター1体を破壊" },
    { id: "DOUBLE_EXEC", t: "spell", cost: 6, act: "destroyMon", val: 2, name: "이중 처형", nameJa: "二重処刑",
        text: "적 몬스터 2체를 파괴", textJa: "敵モンスター2体を破壊" },
    { id: "MASSACRE", t: "spell", cost: 7, name: "대학살", nameJa: "大虐殺",
        text: "상대의 몬스터를 전부 파괴하고 자신에게 8 데미지", textJa: "相手のモンスターを全て破壊し、自分に8ダメージ" },
    { id: "MIMIC_KING2", t: "mon", cost: 7, atk: 6, def: 6, onSummon: "mimicKing2", name: "미믹 킹 2세", nameJa: "ミミックキング2世",
        text: "소환시: 자신 필드·묘지·제외의 '미믹' 계열 1장당 +1/+1 · 제외가 6장 이상이면 '마스터 미믹' 소환", textJa: "召喚時: 自分の場・墓地・除外の「ミミック」系1枚につき+1/+1 · 除外が6枚以上なら「マスターミミック」を召喚" },
    { id: "ORIGIN_MIMIC", t: "mon", cost: 8, atk: 3, def: 3, tribe: "시초", onSummon: "originMimic", name: "시초의 미믹", nameJa: "始原のミミック",
        text: "소환시: 자신 필드·묘지·제외의 '미믹' 계열 1장당 +2/+2 · 제외가 8장 이상이면 상대 함정 2장까지 파괴", textJa: "召喚時: 自分の場・墓地・除外の「ミミック」系1枚につき+2/+2 · 除外が8枚以上なら相手の罠を2枚まで破壊" },
    { id: "GREED_PRICE", t: "spell", cost: 4, name: "탐욕의 대가", nameJa: "強欲の代価",
        text: "자신에게 2 데미지 · 자신 필드에 '미믹'(3/2) 2마리 소환 · 추가로 '미믹' 3장을 게임에서 제외", textJa: "自分に2ダメージ · 自分の場に「ミミック」(3/2)2体を召喚 · さらに「ミミック」3枚をゲームから除外" },
    { id: "MARKET_CRISIS", t: "spell", cost: 3, name: "경제 위기", nameJa: "経済危機",
        text: "고정 마켓 8장을 전부 갱신한다", textJa: "固定マーケット8枚を全て更新する" },
    // 토큰 (구매 불가, cost 0)
    { id: "TOKEN00", t: "mon", cost: 0, atk: 0, def: 1, name: "허수아비", nameJa: "かかし", text: "죽으면 게임에서 제외", textJa: "死亡時ゲームから除外" },
    { id: "SOLDIER2", t: "mon", cost: 0, atk: 2, def: 2, name: "병사", nameJa: "兵士", text: "죽으면 게임에서 제외", textJa: "死亡時ゲームから除外" },
];
for (const c of NEW_CARDS7) {
    DB[c.id] = c;
}
// ============================================================
// NEW CARDS 6 — 덱빌딩 강화: 폐기(압축) 경제 + 덱 스케일링 페이오프
// ============================================================
const NEW_CARDS6 = [
    { id: "FURNACE", t: "spell", cost: 3, ench: "furnace", val: 99, name: "용광로", nameJa: "溶鉱炉",
        text: "영구: 자신의 턴 시작마다 묘지에서 가장 코스트가 낮은 카드 1장을 게임에서 제외", textJa: "永続: 自分のターン開始時、墓地から最もコストの低いカード1枚をゲームから除外" },
    { id: "PURGE_TOUCH", t: "spell", cost: 2, play: 1, act: "exilePick", name: "정화의 손길", nameJa: "浄化の手",
        text: "묘지에서 카드 1장을 골라 게임에서 제외 + 1장 드로우 (시전 1)", textJa: "墓地からカード1枚を選びゲームから除外 + 1枚ドロー (発動1)" },
    { id: "SCRAPPER", t: "spell", cost: 3, play: 2, name: "고철 수집상", nameJa: "スクラップ収集家",
        text: "덱·묘지의 코스트 1 이하 카드 2장을 게임에서 제외 → 최대 마나 +1 (시전 2)", textJa: "デッキ・墓地のコスト1以下のカード2枚をゲームから除外 → 最大マナ+1 (発動2)" },
    { id: "HORDE", t: "mon", cost: 4, atk: 3, def: 3, onSummon: "hordeBuff", name: "군단의 기수", nameJa: "軍団の旗手",
        text: "소환시: 자신의 덱+묘지가 20장 이상이면 +3/+3", textJa: "召喚時: 自分のデッキ+墓地が20枚以上なら+3/+3" },
    { id: "ELITE", t: "mon", cost: 4, atk: 2, def: 4, onSummon: "eliteBuff", name: "정예 기사단장", nameJa: "精鋭騎士団長",
        text: "소환시: 자신의 덱+묘지가 8장 이하면 이 몬스터의 공격력 +4(지속)", textJa: "召喚時: 自分のデッキ+墓地が8枚以下ならこのモンスターの攻撃力+4(持続)" },
    { id: "TRAPSMITH", t: "mon", cost: 4, atk: 2, def: 4, onSummon: "trapsmithBuff", name: "함정 기술자", nameJa: "罠職人",
        text: "소환시: 덱·묘지·세트한 함정 1장당 +1/+1", textJa: "召喚時: デッキ・墓地・セットした罠1枚につき+1/+1" },
    // ---- 극단 스탯 메타 카운터 ----
    { id: "WALLBREAK1", t: "spell", cost: 2, play: 1, act: "destroyMon", name: "성벽 파쇄", nameJa: "城壁破砕",
        text: "공격력 1 이하의 적 몬스터 1체 파괴 (시전 1)", textJa: "攻撃力1以下の敵モンスター1体を破壊 (発動1)" },
    { id: "WALLBREAK2", t: "spell", cost: 4, act: "destroyMon", name: "공성 붕괴", nameJa: "攻城崩壊",
        text: "공격력 2 이하의 적 몬스터를 모두 파괴", textJa: "攻撃力2以下の敵モンスターを全て破壊" },
    { id: "SNIPE1", t: "spell", cost: 2, play: 1, act: "destroyMon", name: "저격", nameJa: "狙撃",
        text: "체력 1 이하의 적 몬스터 1체 파괴 (시전 1)", textJa: "体力1以下の敵モンスター1体を破壊 (発動1)" },
    { id: "SNIPE2", t: "spell", cost: 4, act: "destroyMon", name: "일제 사격", nameJa: "一斉射撃",
        text: "체력 2 이하의 적 몬스터를 모두 파괴", textJa: "体力2以下の敵モンスターを全て破壊" },
];
for (const c of NEW_CARDS6) {
    DB[c.id] = c;
}
// ============================================================
// NEW CARDS 8 — 알(egg) 아키타입: 부화 카운터 + 내구도 카운터
// 알은 공격 불가·전투 데미지 무시(내구도만 소모), 단 파괴·약화 "효과"에는 취약.
// 부화 몬스터는 cost 0 (BUYABLE_POOL 자동 제외) + 죽으면 게임에서 제외(토큰 규칙).
// ============================================================
const NEW_CARDS8 = [
    { id: "DRAGON_EGG", t: "mon", cost: 6, play: 4, atk: 0, def: 1, hatchTurns: 8, hatchDur: 4, hatchInto: ["D_BLACK", "D_RED", "D_BLUE"],
        name: "드래곤의 알", nameJa: "ドラゴンの卵",
        text: "공격 불가 · 부화 8턴(양측 턴 포함) / 내구도 4 · 상대 몬스터의 공격은 내구도만 1 소모 · 내구도가 남은 채 부화가 완료되면 흑룡·적룡·청룡 중 하나가 소환된다",
        textJa: "攻撃不可 · 孵化8ターン(両者のターンを含む) / 耐久4 · 敵モンスターの攻撃は耐久を1消費するのみ · 耐久が残ったまま孵化が完了すると黒竜・赤竜・青竜のいずれかが召喚される" },
    { id: "BEAST_EGG", t: "mon", cost: 8, play: 5, atk: 0, def: 1, hatchTurns: 10, hatchDur: 4, hatchInto: ["DIVINE"],
        name: "신수의 알", nameJa: "神獣の卵",
        text: "공격 불가 · 부화 10턴(양측 턴 포함) / 내구도 4 · 상대 몬스터의 공격은 내구도만 1 소모 · 내구도가 남은 채 부화가 완료되면 신수가 소환된다",
        textJa: "攻撃不可 · 孵化10ターン(両者のターンを含む) / 耐久4 · 敵モンスターの攻撃は耐久を1消費するのみ · 耐久が残ったまま孵化が完了すると神獣が召喚される" },
    // ---- 부화 몬스터 (cost 0, 구매 불가) ----
    { id: "D_BLACK", t: "mon", cost: 0, atk: 20, def: 20, onSummon: "blackDragon", val: 3, name: "흑룡", nameJa: "黒竜",
        text: "소환시: 상대가 제외한 카드 중 최대 8장을 선택해 상대 묘지로 보낸다 · 상대 필드 몬스터 전체 체력 -3(지속) · 죽으면 게임에서 제외",
        textJa: "召喚時: 相手が除外したカードから最大8枚を選び相手の墓地へ送る · 敵モンスター全体の体力-3(持続) · 死亡時ゲームから除外" },
    { id: "D_RED", t: "mon", cost: 0, atk: 20, def: 15, onSummon: "burn", val: 15, aura: "spellAmp", name: "적룡", nameJa: "赤竜",
        text: "소환시: 상대에게 15 데미지 · 상시: 자신의 마법이 상대에게 데미지를 줄 때마다 +3 추가 데미지 · 죽으면 게임에서 제외",
        textJa: "召喚時: 相手に15ダメージ · 常時: 自分の魔法が相手にダメージを与えるたび+3追加ダメージ · 死亡時ゲームから除外" },
    { id: "D_BLUE", t: "mon", cost: 0, atk: 15, def: 20, onSummon: "blueDragon", val: 20, turnFx: "growMaxHp", name: "청룡", nameJa: "青竜",
        text: "소환시: 자신의 최대 체력 +20 · 자신의 턴 시작마다 상대 필드 몬스터 수만큼 자신 최대 체력 증가 · 죽으면 게임에서 제외",
        textJa: "召喚時: 自分の最大体力+20 · 自分のターン開始時、敵モンスターの数だけ自分の最大体力増加 · 死亡時ゲームから除外" },
    { id: "DIVINE", t: "mon", cost: 0, atk: 25, def: 25, onSummon: "divine", aura: "ward", name: "신수", nameJa: "神獣",
        text: "소환시: 최대 마나 +15 · 매 턴 드로우 +1(영구) · 상대 필드의 카드 3장 선택 파괴(몬스터·세트 함정·영구마법) · 상시: 상대의 마법·몬스터 효과의 대상이 되지 않는다 · 죽으면 게임에서 제외",
        textJa: "召喚時: 最大マナ+15 · 毎ターンドロー+1(永続) · 相手の場のカード3枚を選んで破壊(モンスター・セットトラップ・永続魔法) · 常時: 相手の魔法・モンスター効果の対象にならない · 死亡時ゲームから除外" },
];
for (const c of NEW_CARDS8) {
    DB[c.id] = c;
}
// ============================================================
// NEW CARDS 9 — 알 대응 테크 + 피의 마법(희로애락) + 흡혈귀 진화 아키타입
// 흡혈귀는 cost 0 (구매 불가, 흡혈 계약/진화로만 등장) + 죽으면 게임에서 제외.
// "피의 마법" 트리거는 카드 이름이 '피의 마법'으로 시작하는지로 판정.
// ============================================================
const NEW_CARDS9 = [
    // ---- 알 대응 테크 ----
    { id: "EGG_HUNTER", t: "mon", cost: 3, atk: 0, def: 4, aura: "eggHunter", name: "에그헌터", nameJa: "エッグハンター",
        text: "이 몬스터가 '알'을 공격하면 내구도 카운터를 3 소모시킨다", textJa: "このモンスターが「卵」を攻撃すると耐久カウンターを3消費させる" },
    { id: "INCUBATOR", t: "spell", cost: 3, act: "incubate", val: 5, name: "고급 부화기", nameJa: "高級孵化器",
        text: "자신의 '알' 1개의 부화 카운터를 5턴 줄인다", textJa: "自分の「卵」1つの孵化カウンターを5ターン減らす" },
    { id: "EGG_MASTER", t: "mon", cost: 3, atk: 0, def: 4, onSummon: "eggMaster", val: 1, name: "부화 마스터", nameJa: "孵化マスター",
        text: "소환시: 자신 필드의 모든 '알'의 내구도 카운터 +1", textJa: "召喚時: 自分の場の全ての「卵」の耐久カウンター+1" },
    // ---- 피의 마법 희로애락 ----
    { id: "BLOOD_JOY", t: "spell", cost: 3, name: "피의 마법 - 희", nameJa: "血の魔法 - 喜",
        text: "자신에게 6 데미지 · 상대와 자신은 최대 체력을 12 얻는다", textJa: "自分に6ダメージ · 相手と自分は最大体力を12得る" },
    { id: "BLOOD_ANGER", t: "spell", cost: 2, name: "피의 마법 - 노", nameJa: "血の魔法 - 怒",
        text: "자신에게 10 데미지 · 필드 위 모든 몬스터는 공격력 +3(지속)", textJa: "自分に10ダメージ · 場の全モンスターは攻撃力+3(持続)" },
    { id: "BLOOD_SORROW", t: "spell", cost: 2, name: "피의 마법 - 애", nameJa: "血の魔法 - 哀",
        text: "자신에게 12 데미지 · 자신의 묘지에서 가장 코스트가 높은 카드 1장을 게임에서 제외한다", textJa: "自分に12ダメージ · 自分の墓地から最もコストの高いカード1枚をゲームから除外する" },
    { id: "BLOOD_PLEASURE", t: "spell", cost: 4, name: "피의 마법 - 락", nameJa: "血の魔法 - 楽",
        text: "자신에게 14 데미지 · 자신의 최대 마나 +1", textJa: "自分に14ダメージ · 自分の最大マナ+1" },
    // ---- 흡혈 지원 ----
    { id: "VAMP_PACT", t: "spell", cost: 2, name: "흡혈 계약", nameJa: "吸血契約",
        text: "자신에게 6 데미지 · '견습 흡혈귀'를 자신 필드에 소환", textJa: "自分に6ダメージ · 「見習い吸血鬼」を自分の場に召喚" },
    { id: "BLOOD_FEST", t: "spell", cost: 3, ench: "bloodFest", val: 99, name: "피의 축제", nameJa: "血の祝祭",
        text: "영구: '피의 마법' 카드를 사용할 때마다 최대 마나 +1", textJa: "永続: 「血の魔法」カードを使うたび最大マナ+1" },
    { id: "BLOOD_SHIELD", t: "spell", cost: 1, ench: "bloodShield", val: 99, name: "흡혈 술식", nameJa: "吸血術式",
        text: "영구: 자신은 '피의 마법'으로 인한 데미지를 받지 않는다", textJa: "永続: 自分は「血の魔法」によるダメージを受けない" },
    { id: "VAMP_WARD", t: "spell", cost: 2, ench: "vampWard", val: 99, name: "흡혈의 극의", nameJa: "吸血の極意",
        text: "영구: 이 카드가 필드에 있는 한 양 필드의 '흡혈귀' 몬스터는 파괴되지 않는다", textJa: "永続: このカードが場にある限り両者の場の「吸血鬼」モンスターは破壊されない" },
    { id: "VAMP_PACT2", t: "spell", cost: 3, play: 2, name: "흡혈 각인 계약", nameJa: "吸血刻印契約",
        text: "자신에게 15 데미지 · '초급 흡혈귀'를 자신 필드에 소환 (시전 2)", textJa: "自分に15ダメージ · 「初級吸血鬼」を自分の場に召喚 (発動2)" },
    { id: "VAMP_BUTLER", t: "mon", cost: 2, atk: 1, def: 4, aura: "vampButler", name: "뱀파이어 집사", nameJa: "ヴァンパイア執事",
        text: "상시: 상대 몬스터 공격 시마다 카운트 +1 · 3카운트마다 '견습 흡혈귀' 소환 · '흡혈귀' 계열로 취급",
        textJa: "常時: 相手モンスターを攻撃するたびカウント+1 · 3カウントごとに「見習い吸血鬼」召喚 · 「吸血鬼」系列として扱う" },
    { id: "BLOOD_SECRET", t: "spell", cost: 2, name: "피의 마법 - 비술", nameJa: "血の魔法 - 秘術",
        text: "자신에게 9 데미지 · 자신 필드 '흡혈귀' 계열 1체 파괴 · 성공 시 최대 마나 +3·자신 최대 체력 +10",
        textJa: "自分に9ダメージ · 自分の場の「吸血鬼」系列1体を破壊 · 成功時、最大マナ+3、自分の最大体力+10" },
    // ---- 흡혈귀 진화 체인 (cost 0, 구매 불가) ----
    { id: "VAMP1", t: "mon", cost: 0, atk: 2, def: 2, evolveTo: "VAMP2", name: "견습 흡혈귀", nameJa: "見習い吸血鬼",
        text: "'피의 마법' 발동 시: 초급 흡혈귀를 자신 필드에 소환 (1회) · 죽으면 게임에서 제외", textJa: "「血の魔法」発動時: 初級吸血鬼を自分の場に召喚 (1回) · 死亡時ゲームから除外" },
    { id: "VAMP2", t: "mon", cost: 0, atk: 5, def: 2, evolveTo: "VAMP3", name: "초급 흡혈귀", nameJa: "初級吸血鬼",
        text: "'피의 마법' 발동 시: 중급 흡혈귀를 자신 필드에 소환 (1회) · 죽으면 게임에서 제외", textJa: "「血の魔法」発動時: 中級吸血鬼を自分の場に召喚 (1回) · 死亡時ゲームから除外" },
    { id: "VAMP3", t: "mon", cost: 0, atk: 9, def: 2, evolveTo: "VAMP4", name: "중급 흡혈귀", nameJa: "中級吸血鬼",
        text: "'피의 마법' 발동 시: 상급 흡혈귀를 자신 필드에 소환 (1회) · 죽으면 게임에서 제외", textJa: "「血の魔法」発動時: 上級吸血鬼を自分の場に召喚 (1回) · 死亡時ゲームから除外" },
    { id: "VAMP4", t: "mon", cost: 0, atk: 14, def: 3, evolveTo: "VAMP5", attackFx: "vampDrain", val: 50, name: "상급 흡혈귀", nameJa: "上級吸血鬼",
        text: "'피의 마법' 발동 시: 특급 흡혈귀를 자신 필드에 소환 (1회) · 상대에게 입힌 데미지의 50%만큼 자신 최대 체력 획득 · 죽으면 게임에서 제외", textJa: "「血の魔法」発動時: 特級吸血鬼を自分の場に召喚 (1回) · 相手に与えたダメージの50%だけ自分の最大体力を得る · 死亡時ゲームから除外" },
    { id: "VAMP5", t: "mon", cost: 0, atk: 21, def: 5, onSummon: "vampLord", attackFx: "vampDrain", val: 100, aura: "trapImmune", name: "특급 흡혈귀", nameJa: "特級吸血鬼",
        text: "소환시: 상대에게 15 데미지, 자신의 최대 체력 +30 · 상대에게 입힌 데미지만큼 자신 최대 체력 획득 · 함정 카드로 파괴되지 않는다 · 죽으면 게임에서 제외", textJa: "召喚時: 相手に15ダメージ、自分の最大体力+30 · 相手に与えたダメージだけ自分の最大体力を得る · 罠カードで破壊されない · 死亡時ゲームから除外" },
];
for (const c of NEW_CARDS9) {
    DB[c.id] = c;
}
// ============================================================
// NEW CARDS 10 — 스타팅(덱 구성) 전용 카드 15종. 전부 noShop:
// 고정/제시 마켓에 나오지 않고 초기 덱 빌딩으로만 넣을 수 있다.
// ============================================================
const NEW_CARDS10 = [
    { id: "FLAME", t: "spell", cost: 1, noShop: true, name: "불꽃", nameJa: "火花",
        text: "상대에게 2 데미지, 자신에게 1 데미지", textJa: "相手に2ダメージ、自分に1ダメージ" },
    { id: "GHOST", t: "mon", cost: 2, atk: 2, def: 1, directOnly: true, noShop: true, name: "유령", nameJa: "幽霊",
        text: "상대에게만 직접 공격할 수 있다 (몬스터 공격 불가) · 상대가 최대 마나/최대 체력을 늘릴 때마다 자신은 3 데미지를 입는다",
        textJa: "相手にのみ直接攻撃できる (モンスター攻撃不可) · 相手が最大マナ/最大体力を増やすたび自分は3ダメージを受ける" },
    { id: "NEGOTIATE", t: "spell", cost: 1, noShop: true, name: "협상", nameJa: "交渉",
        text: "상대의 최대 마나 +1 · 상대는 다음 턴에 함정을 설치할 수 없다", textJa: "相手の最大マナ+1 · 相手は次のターン罠を設置できない" },
    { id: "BLOOD_RITE", t: "spell", cost: 2, ench: "spellHeal", val: 99, exileOnDestroy: true, noShop: true, name: "혈귀술", nameJa: "血鬼術",
        text: "영구: 양 플레이어는 마법으로 인한 데미지를 받지 않고 그 수치만큼 회복한다 · 파괴되면 게임에서 제외", textJa: "永続: 両プレイヤーは魔法によるダメージを受けず、その数値だけ回復する · 破壊されたらゲームから除外" },
    { id: "WEAKEN_ALL", t: "spell", cost: 2, ench: "weakenAll", val: 99, exileOnDestroy: true, noShop: true, name: "약화술식", nameJa: "弱化術式",
        text: "영구: 양 필드의 모든 몬스터 공격력 -2 · 파괴되면 게임에서 제외", textJa: "永続: 両方の場の全モンスター攻撃力-2 · 破壊されたらゲームから除外" },
    { id: "GUILD_HALL", t: "mon", cost: 2, atk: 0, def: 2, aura: "assassinGuild", noShop: true, name: "암살자 길드", nameJa: "アサシンギルド",
        text: "상시: '암살자'나 이 몬스터가 상대 데미지 시 카운트 +1 · 3카운트마다 14 데미지 · 파괴 시 카운트 소멸",
        textJa: "常時: 「アサシン」かこのモンスターが相手にダメージ時カウント+1 · 3カウントごとに相手に14ダメージ · 破壊でカウント消滅" },
    { id: "MIMIC_PARTY", t: "trap", cost: 1, react: "mimicParty", noShop: true, name: "미믹 파티", nameJa: "ミミックパーティー",
        text: "함정: 상대가 보물상자를 사용하면 발동 — 상대 필드에 미믹 1마리, 자신 필드에 미믹 2마리 소환", textJa: "罠: 相手が宝箱を使うと発動 — 相手の場にミミック1体、自分の場にミミック2体召喚" },
    { id: "FATE_WHEEL", t: "spell", cost: 4, ench: "fateWheel", val: 99, exileOnDestroy: true, noShop: true, name: "운명의 수레바퀴", nameJa: "運命の輪",
        text: "영구: 시전 시 자신의 최대 마나 -1, 자신에게 8 데미지 · 주사위·확률 카드의 결과를 보고 나서 다시 굴릴 수 있다 (매턴 1회) · 파괴되면 게임에서 제외",
        textJa: "永続: 発動時に自分の最大マナ-1、自分に8ダメージ · ダイス・確率カードの結果を見てから振り直せる (毎ターン1回) · 破壊されたらゲームから除外" },
    { id: "COUNTERCALC", t: "spell", cost: 1, noShop: true, name: "역산", nameJa: "逆算",
        text: "상대 최대 마나 6 이하일 때만 사용 가능 · 상대 영구마법 1장 파괴 · 사용 후 게임에서 제외", textJa: "相手の最大マナが6以下の時のみ使用可能 · 相手の永続魔法1枚を破壊 · 使用後ゲームから除外" },
    { id: "AMBUSH", t: "spell", cost: 2, noShop: true, name: "기습", nameJa: "奇襲",
        text: "상대 최대 마나가 4일 때만 사용 가능 · 상대에게 7 데미지, 자신에게 3 데미지 · 사용 후 게임에서 제외", textJa: "相手の最大マナが4の時のみ使用可能 · 相手に7ダメージ、自分に3ダメージ · 使用後ゲームから除外" },
    { id: "TRUMPET", t: "spell", cost: 2, noShop: true, name: "지원 나팔", nameJa: "支援ラッパ",
        text: "자신 몬스터 최대 3체 공격력 +1(이번 턴)", textJa: "自分のモンスター最大3体の攻撃力+1(このターン)" },
    { id: "FORESIGHT", t: "spell", cost: 1, ench: "foresight", val: 99, exileOnDestroy: true, noShop: true, name: "선견지명", nameJa: "先見の明",
        text: "영구: 자신의 최대 마나가 9 이상이 되면 최대 마나 +2 후 이 카드를 파괴한다 · 필드를 떠나면 게임에서 제외", textJa: "永続: 自分の最大マナが9以上になると最大マナ+2してこのカードを破壊 · 場を離れるとゲームから除外" },
    { id: "TRICKROOM", t: "spell", cost: 3, noShop: true, name: "트릭룸", nameJa: "トリックルーム",
        text: "2턴 동안 필드 위 모든 몬스터의 공격력과 체력이 반전된다 · 반전 중에는 체력이 오르는 효과가 공격력을, 공격력이 오르는 효과가 체력을 올린다 · 효과가 끝나면 반전 중에 오른 스탯은 계승된다",
        textJa: "2ターンの間、場の全モンスターの攻撃力と体力が反転する · 反転中は体力が上がる効果は攻撃力を、攻撃力が上がる効果は体力を上げる · 効果終了後、反転中に上がったステータスは継承される" },
    { id: "INCUBATOR_S", t: "spell", cost: 1, act: "incubate", val: 2, noShop: true, name: "부화기", nameJa: "孵化器",
        text: "자신의 '알' 1개의 부화 카운터를 2턴 줄인다", textJa: "自分の「卵」1つの孵化カウンターを2ターン減らす" },
    { id: "TRIBE_PACT", t: "spell", cost: 2, ench: "tribeContract", val: 99, noShop: true, name: "다종족 계약", nameJa: "多種族契約",
        text: "영구: 종족 시너지 효과가 2배 · 턴 40까지 종족 시너지 미달성 시 최대 마나 -2, 자신에게 12 데미지", textJa: "永続: 種族シナジーの効果が2倍 · ターン40までに種族シナジー未達成で最大マナ-2、自分に12ダメージ" },
];
for (const c of NEW_CARDS10) {
    DB[c.id] = c;
}
export const PASSIVES = {
    dual: {
        ko: { name: "이도류", desc: "한 턴에 2번 공격할 수 있다." },
        ja: { name: "二刀流", desc: "1ターンに2回攻撃できる。" },
        en: { name: "Dual Wield", desc: "Can attack twice per turn." },
    },
    ambush: {
        ko: { name: "암습", desc: "상대 플레이어만 직접 공격할 수 있다 (몬스터는 공격 불가)." },
        ja: { name: "暗襲", desc: "相手プレイヤーのみ直接攻撃できる (モンスターは攻撃不可)。" },
        en: { name: "Infiltrate", desc: "Can only attack the opponent directly (never monsters)." },
    },
    aura: {
        ko: { name: "아우라", desc: "상대의 마법·몬스터 효과의 대상이 되지 않는다 (공격 대상 지정은 가능)." },
        ja: { name: "オーラ", desc: "相手の魔法・モンスター効果の対象にならない (攻撃対象には指定できる)。" },
        en: { name: "Aura", desc: "Cannot be targeted by the opponent's spell/monster effects (can still be attacked)." },
    },
    trapmaster: {
        ko: { name: "트랩마스터", desc: "함정 카드에 의해 파괴되지 않는다." },
        ja: { name: "トラップマスター", desc: "罠カードでは破壊されない。" },
        en: { name: "Trap Master", desc: "Cannot be destroyed by trap cards." },
    },
    void: {
        ko: { name: "공허", desc: "파괴되면 묘지 대신 게임에서 제외된다 (덱 순환에 들어가지 않는다)." },
        ja: { name: "虚無", desc: "破壊されると墓地の代わりにゲームから除外される (デッキ循環に入らない)。" },
        en: { name: "Void", desc: "When destroyed, it is exiled from the game instead of going to the graveyard." },
    },
    guts: {
        ko: { name: "기합", desc: "소환시 기합 토큰 1개를 얻는다. 전투로 치명 데미지를 받을 때 토큰 1개를 소모하고 체력 1로 살아남는다 (관통 데미지는 그대로 들어간다)." },
        ja: { name: "気合", desc: "召喚時に気合トークンを1個得る。戦闘で致命ダメージを受ける時、トークンを1個消費して体力1で生き残る (貫通ダメージはそのまま入る)。" },
        en: { name: "Guts", desc: "Gains 1 Guts token on summon. When it would take lethal combat damage, consume 1 token to survive at 1 HP (piercing damage still applies)." },
    },
    decay: {
        ko: { name: "부패", desc: "이 몬스터가 상대 몬스터를 공격할 때마다 부패 카운터 1개를 부여한다. 카운터가 3개 쌓인 몬스터는 파괴되고, 그 주인은 3 데미지를 받는다." },
        ja: { name: "腐敗", desc: "このモンスターが相手モンスターを攻撃するたび腐敗カウンターを1個与える。カウンターが3個貯まったモンスターは破壊され、その持ち主は3ダメージを受ける。" },
        en: { name: "Decay", desc: "Whenever this monster attacks an enemy monster, put 1 Decay counter on it. A monster with 3 counters is destroyed and its owner takes 3 damage." },
    },
    majesty: {
        ko: { name: "위엄", desc: "이 몬스터가 필드에 있는 한, 상대는 몬스터를 소환한 턴에 그 몬스터로 공격할 수 없다." },
        ja: { name: "威厳", desc: "このモンスターが場にいる限り、相手はモンスターを召喚したターンにそのモンスターで攻撃できない。" },
        en: { name: "Majesty", desc: "While this monster is on the field, the opponent's monsters cannot attack on the turn they were summoned." },
    },
    taunt: {
        ko: { name: "도발", desc: "상대가 다른 아군 몬스터를 공격할 때 50% 확률로 이 몬스터가 대신 공격받는다." },
        ja: { name: "挑発", desc: "相手が他の味方モンスターを攻撃する時、50%の確率でこのモンスターが代わりに攻撃を受ける。" },
        en: { name: "Taunt", desc: "When the opponent attacks another allied monster, 50% chance this monster is attacked instead." },
    },
    evade: {
        ko: { name: "회피", desc: "이 몬스터가 공격받을 때 주사위를 굴려 4·5·6이 아니면 그 공격을 무효화한다." },
        ja: { name: "回避", desc: "このモンスターが攻撃される時、ダイスを振って4・5・6以外ならその攻撃を無効化する。" },
        en: { name: "Evade", desc: "When this monster is attacked, roll a die — on anything but 4/5/6 the attack is negated." },
    },
};
export const PASSIVE_KEYS = Object.keys(PASSIVES);
/** 카드가 가진 패시브 키 목록 — 명시(passive 배열) + 기존 필드에서 유도(mult/directOnly/ward/trapImmune/exileOnDestroy). */
export function cardPassives(c) {
    const out = [];
    const has = (k) => !!c.passive?.includes(k);
    if ((c.mult ?? 1) >= 2 || has("dual"))
        out.push("dual");
    if (c.directOnly || has("ambush"))
        out.push("ambush");
    if (c.aura === "ward" || has("aura"))
        out.push("aura");
    if (c.aura === "trapImmune" || has("trapmaster"))
        out.push("trapmaster");
    for (const k of ["taunt", "evade", "guts", "decay", "majesty"])
        if (has(k))
            out.push(k);
    if (c.exileOnDestroy || has("void"))
        out.push("void");
    return out;
}
/** 런타임 패시브 판정 — 카드 자체 + 게임 중 부여된 패시브(passivesG)까지 포함. */
export function hasPassive(c, key) {
    if (c.passivesG?.includes(key))
        return true;
    return cardPassives(c).includes(key);
}
// ============================================================
// BALANCE PATCH 13 (v11) — 패시브 키워드화 + 골렘/부패/컬 아키타입 + 알 버프
// ============================================================
const PATCH13 = {
    // ---- 기존 효과 → 키워드 텍스트로 정리 ----
    GM9_2: { text: "이도류", textJa: "二刀流" },
    ASSASSIN1: { text: "암습", textJa: "暗襲" },
    ASSASSIN2: { text: "암습", textJa: "暗襲" },
    ASSASSIN3: { text: "암습 · 자신 필드에 '암살자'가 있어야 소환 가능", textJa: "暗襲 · 自分の場に「アサシン」がいる時のみ召喚可能" },
    ASSASSIN4: { text: "소환시: 상대 세트 함정 전부 파괴 · 이도류 · 패 제외 필드/덱/묘지에 초급/중급/상급 암살자가 각 1장 이상일 때 소환 가능", textJa: "召喚時: 相手のセット罠を全て破壊 · 二刀流 · 手札を除く場・デッキ・墓地に初級・中級・上級アサシンが各1枚以上で召喚可能" },
    GHOST: { text: "암습 · 상대가 최대 마나/최대 체력을 늘릴 때마다 자신은 3 데미지를 입는다", textJa: "暗襲 · 相手が最大マナ/最大体力を増やすたび自分は3ダメージを受ける" },
    MIMIC: { passive: ["void"], text: "보물상자 꽝으로 상대 필드에 소환된다 · 공허", textJa: "宝箱のハズレで相手の場に召喚される · 虚無" },
    TOKEN00: { passive: ["void"], text: "토큰 · 공허", textJa: "トークン · 虚無" },
    SOLDIER2: { passive: ["void"], text: "토큰 · 공허", textJa: "トークン · 虚無" },
    VAMP1: { passive: ["void"], text: "'피의 마법' 발동 시: 초급 흡혈귀를 자신 필드에 소환 (1회) · 공허", textJa: "「血の魔法」発動時: 初級吸血鬼を自分の場に召喚 (1回) · 虚無" },
    VAMP2: { passive: ["void"], text: "'피의 마법' 발동 시: 중급 흡혈귀를 자신 필드에 소환 (1회) · 공허", textJa: "「血の魔法」発動時: 中級吸血鬼を自分の場に召喚 (1回) · 虚無" },
    VAMP3: { passive: ["void"], text: "'피의 마법' 발동 시: 상급 흡혈귀를 자신 필드에 소환 (1회) · 공허", textJa: "「血の魔法」発動時: 上級吸血鬼を自分の場に召喚 (1回) · 虚無" },
    VAMP4: { passive: ["void"], text: "'피의 마법' 발동 시: 특급 흡혈귀 소환 (1회) · 상대에게 입힌 데미지의 50%만큼 자신 최대 체력 획득 · 공허", textJa: "「血の魔法」発動時: 特級吸血鬼を召喚 (1回) · 相手に与えたダメージの50%だけ自分の最大体力を得る · 虚無" },
    VAMP5: { passive: ["void"], text: "소환시: 상대에게 15 데미지, 자신의 최대 체력 +30 · 상대에게 입힌 데미지만큼 자신 최대 체력 획득 · 트랩마스터 · 공허", textJa: "召喚時: 相手に15ダメージ、自分の最大体力+30 · 相手に与えたダメージだけ自分の最大体力を得る · トラップマスター · 虚無" },
    // ---- 도발: 피의 성벽 / 신성한 성벽 ----
    GM7_1: { passive: ["taunt"], text: "도발", textJa: "挑発" },
    GM8_1: { passive: ["taunt"], text: "매 턴 시작 시 자신 체력 +3 회복 · 도발", textJa: "毎ターン開始時 自分の体力+3回復 · 挑発" },
    // ---- 알 아키타입 버프: 알·용 전원 아우라, 내구도 상향 ----
    DRAGON_EGG: { hatchDur: 6, aura: "ward",
        text: "상시: 공격 불가 · 부화 8턴(양측), 내구도 6(적 공격당 1) · 내구도 남기고 부화 시 흑/적/청룡 1체 소환 (소환 4)",
        textJa: "常時: 攻撃不可 · 孵化8ターン(両者)、耐久6(敵の攻撃は1消費) · 耐久を残して孵化で黒竜・赤竜・青竜から1体召喚 (召喚4)" },
    BEAST_EGG: { hatchDur: 7, aura: "ward",
        text: "상시: 공격 불가 · 부화 10턴(양측), 내구도 7(적 공격은 1 소모) · 내구도 남기고 부화 시 신수 소환 (소환 5)",
        textJa: "常時: 攻撃不可 · 孵化10ターン(両者)、耐久7(敵の攻撃は1消費) · 耐久を残して孵化で神獣を召喚 (召喚5)" },
    D_BLACK: { passive: ["aura", "void"],
        text: "소환시: 상대가 제외한 카드 중 최대 8장을 선택해 상대 묘지로 보낸다 · 상대 필드 몬스터 전체 체력 -3(지속) · 아우라 · 공허",
        textJa: "召喚時: 相手が除外したカードから最大8枚を選び相手の墓地へ送る · 敵モンスター全体の体力-3(持続) · オーラ · 虚無" },
    D_RED: { passive: ["aura", "void"],
        text: "소환시: 상대에게 15 데미지 · 상시: 자신의 마법이 상대에게 데미지를 줄 때마다 +3 추가 데미지 · 아우라 · 공허",
        textJa: "召喚時: 相手に15ダメージ · 常時: 自分の魔法が相手にダメージを与えるたび+3追加ダメージ · オーラ · 虚無" },
    D_BLUE: { passive: ["aura", "void"],
        text: "소환시: 자신의 최대 체력 +20 · 자신의 턴 시작마다 상대 필드 몬스터 수만큼 자신 최대 체력 증가 · 아우라 · 공허",
        textJa: "召喚時: 自分の最大体力+20 · 自分のターン開始時、敵モンスターの数だけ自分の最大体力増加 · オーラ · 虚無" },
    DIVINE: { passive: ["void"],
        text: "소환시: 최대 마나 +15 · 매 턴 드로우 +1(영구) · 카드 3장 선택 파괴(양측: 몬스터, 세트 함정, 영구마법) · 아우라 · 공허",
        textJa: "召喚時: 最大マナ+15 · 毎ターンドロー+1(永続) · カード3枚を選んで破壊(両方の場: モンスター・セット罠・永続魔法) · オーラ · 虚無" },
    EGG_MASTER: { def: 2, val: 3, text: "소환시: 자신 필드의 모든 '알'의 내구도 카운터 +3", textJa: "召喚時: 自分の場の全ての「卵」の耐久カウンター+3" },
    EGG_HUNTER: { val: 4, text: "이 몬스터가 '알'을 공격하면 내구도 카운터를 4 소모시킨다", textJa: "このモンスターが「卵」を攻撃すると耐久カウンターを4消費させる" },
    // ---- 영구마법 정리: 공허 표기 + 선견지명/혈귀술 너프 ----
    BLOOD_RITE: { text: "영구: 양 플레이어는 마법으로 인한 데미지를 받지 않고 그 수치만큼 회복한다 · 발동 14턴 후 이 카드는 파괴된다 · 공허", textJa: "永続: 両プレイヤーは魔法によるダメージを受けず、その数値だけ回復する · 発動14ターン後にこのカードは破壊される · 虚無" },
    WEAKEN_ALL: { text: "영구: 양 필드의 모든 몬스터 공격력 -2 · 공허", textJa: "永続: 両方の場の全モンスター攻撃力-2 · 虚無" },
    FATE_WHEEL: { text: "영구: 시전 시 자신의 최대 마나 -1 · 주사위·확률 카드의 결과를 보고 나서 다시 굴릴 수 있다 (매턴 1회) · 공허", textJa: "永続: 発動時に自分の最大マナ-1 · ダイス・確率カードの結果を見てから振り直せる (毎ターン1回) · 虚無" },
    FORESIGHT: { cost: 3, text: "영구: 자신의 최대 마나가 9 이상이 되면 최대 마나 +2 후 이 카드를 파괴한다 · 자신 필드에 '선견지명'이 없을 때만 발동 가능 · 공허", textJa: "永続: 自分の最大マナが9以上になると最大マナ+2してこのカードを破壊 · 自分の場に「先見の明」がない時のみ発動可能 · 虚無" },
    // ---- 공허 포격/대붕괴 너프: 시전비 인하 + 제외당 데미지 하향 ----
    EXILE_NUKE1: { play: 4, text: "게임에서 제외된 자신의 카드 1장당 상대에게 1 데미지 (시전 4)", textJa: "ゲームから除外された自分のカード1枚につき相手に1ダメージ (発動4)" },
    EXILE_NUKE2: { play: 10, text: "게임에서 제외된 자신의 카드 1장당 상대에게 2 데미지 (시전 10)", textJa: "ゲームから除外された自分のカード1枚につき相手に2ダメージ (発動10)" },
};
for (const id of Object.keys(PATCH13)) {
    if (DB[id])
        Object.assign(DB[id], PATCH13[id]);
}
// ---- 신규 마켓 카드: 골렘(기합) / 부패 / 위엄 / 컬 페이오프 ----
const NEW_CARDS11 = [
    { id: "GOLEM1", t: "mon", cost: 1, atk: 0, def: 2, passive: ["guts"], name: "병사 골램", nameJa: "兵士ゴーレム", text: "기합", textJa: "気合" },
    { id: "GOLEM2", t: "mon", cost: 3, atk: 1, def: 4, passive: ["guts"], name: "리더 골램", nameJa: "リーダーゴーレム", text: "기합", textJa: "気合" },
    { id: "GOLEM3", t: "mon", cost: 5, atk: 6, def: 8, passive: ["guts"], onSummon: "golemKing", name: "골램 킹", nameJa: "ゴーレムキング",
        text: "기합 · 자신의 필드/덱/패/묘지에 다른 '골램' 계열 몬스터가 없으면 소환시 -4/-4", textJa: "気合 · 自分の場・デッキ・手札・墓地に他の「ゴーレム」系モンスターがいなければ召喚時-4/-4" },
    { id: "DECAY_CRAFT", t: "spell", cost: 2, name: "암기 제작", nameJa: "暗器作製",
        text: "자신 필드의 몬스터 2체를 선택해 '부패'를 부여한다", textJa: "自分の場のモンスター2体を選んで「腐敗」を与える" },
    { id: "RUST_SLUG", t: "mon", cost: 3, atk: 1, def: 3, passive: ["decay"], onSummon: "decayMark", name: "러스트캡 슬러그", nameJa: "ラストキャップ・スラッグ",
        text: "부패 · 소환시: 상대 몬스터 1체에 부패 카운터 1개를 부여", textJa: "腐敗 · 召喚時: 相手モンスター1体に腐敗カウンターを1個与える" },
    { id: "MAJESTY_RITE", t: "spell", cost: 4, name: "각인 비술", nameJa: "刻印秘術",
        text: "자신에게 7 데미지, 최대 마나 -1 · 자신 필드의 몬스터 1체에 '위엄'을 부여한다", textJa: "自分に7ダメージ、最大マナ-1 · 自分の場のモンスター1体に「威厳」を与える" },
    { id: "CROSSROADS", t: "spell", cost: 1, name: "선택의 기로", nameJa: "選択の岐路",
        text: "자신의 묘지에 컬 2장을 추가한다", textJa: "自分の墓地にカル2枚を追加する" },
    { id: "CHOSEN_KNIGHT", t: "mon", cost: 7, atk: 0, def: 1, condAtk: "cullPlus", attackFx: "cullOnFace", name: "선택받은 검사", nameJa: "選ばれし剣士",
        text: "상시: 제외된 자신의 '컬' 2장당 +1/+1 · 상대에게 데미지를 입힐 때마다 자신 묘지에 컬 1장을 얻는다",
        textJa: "常時: 除外された自分の「カル」2枚につき+1/+1 · 相手にダメージを与えるたび自分の墓地にカル1枚を得る" },
    { id: "CHOSEN_MAGE", t: "mon", cost: 7, atk: 0, def: 1, condAtk: "cullPlus", name: "선택받은 마법사", nameJa: "選ばれし魔法使い",
        text: "상시: 제외된 자신의 '컬' 2장당 +1/+1 · (선택) 매 턴 제외 '컬' 1장을 묘지로 되돌리고 상대에 6 데미지",
        textJa: "常時: 除外された自分の「カル」2枚につき+1/+1 · (選択) 毎ターン 除外された「カル」1枚を墓地に戻し相手に6ダメージ" },
    { id: "CHOSEN_ARCHER", t: "mon", cost: 7, atk: 0, def: 1, condAtk: "cullAtk2", directOnly: true, passive: ["evade"], name: "선택받은 궁수", nameJa: "選ばれし弓手",
        text: "상시: 게임에서 제외된 자신의 '컬' 2장당 공격력 +2 · 암습 · 회피", textJa: "常時: ゲームから除外された自分の「カル」2枚につき攻撃力+2 · 暗襲 · 回避" },
    { id: "CHOSEN_ROGUE", t: "mon", cost: 7, atk: 0, def: 1, condAtk: "cullAtk1", directOnly: true, passive: ["evade"], name: "선택받은 도적", nameJa: "選ばれし盗賊",
        text: "상시: 게임에서 제외된 자신의 '컬' 2장당 공격력 +1 · 암습 · 회피", textJa: "常時: ゲームから除外された自分の「カル」2枚につき攻撃力+1 · 暗襲 · 回避" },
];
for (const c of NEW_CARDS11) {
    DB[c.id] = c;
}
// ---- 신규 스타팅(noShop) 카드 4종: 러스트 머쉬룸 / 선택받은 영역 / 시련의 영역 / 고대 문명 ----
const NEW_STARTERS11 = [
    { id: "RUST_SHROOM", t: "mon", cost: 1, atk: 1, def: 1, passive: ["decay"], noShop: true, name: "러스트 머쉬룸", nameJa: "ラストマッシュルーム", text: "부패", textJa: "腐敗" },
    { id: "CHOSEN_AREA", t: "spell", cost: 7, noShop: true, name: "선택받은 영역", nameJa: "選ばれし領域",
        text: "게임에서 제외된 자신의 '컬'이 25장 이상일 때만 발동 가능 · 게임에서 즉시 승리한다",
        textJa: "ゲームから除外された自分の「カル」が25枚以上の時のみ発動可能 · ゲームに即座に勝利する" },
    { id: "TRIAL_AREA", t: "spell", cost: 5, ench: "trialArea", val: 99, noShop: true, name: "시련의 영역", nameJa: "試練の領域",
        text: "영구: 시전 시 자신에게 6 데미지 · 매 턴 묘지에 컬 1장을 얻고, 그 후 묘지에서 카드 2장까지 제외할 수 있다",
        textJa: "永続: 発動時に自分に6ダメージ · 毎ターン墓地にカル1枚を得て、その後墓地からカード2枚まで除外できる" },
    { id: "ANCIENT_CIV", t: "spell", cost: 4, ench: "ancientCiv", val: 99, noShop: true, name: "고대 문명", nameJa: "古代文明",
        text: "영구: 발동 13턴 후 자신 최대 마나 -1, '드래곤의 알'·'신수의 알' 중 하나를 패에 넣는다 · 이 마법 파괴",
        textJa: "永続: 発動13ターン後に自分の最大マナ-1、「ドラゴンの卵」か「神獣の卵」を選んで手札に加える · この魔法は破壊される" },
];
for (const c of NEW_STARTERS11) {
    DB[c.id] = c;
}
// ============================================================
// v15 — 도박꾼 & 엘프 아키타입
// ============================================================
// ---- 신규 스타팅(noShop) 3종: 도박꾼 / 엘프의 쉼터 / 하프 엘프 ----
const NEW_STARTERS15 = [
    { id: "GAMBLER", t: "mon", cost: 3, atk: 0, def: 1, turnFx: "gambler", noShop: true, name: "도박꾼", nameJa: "ギャンブラー",
        text: "자신의 턴 시작시: 주사위를 굴려 4·5·6이면 최대 마나 +1", textJa: "自分のターン開始時: ダイスを振り4・5・6なら最大マナ+1" },
    { id: "ELF_HAVEN", t: "spell", cost: 3, ench: "elfHaven", val: 99, noShop: true, name: "엘프의 쉼터", nameJa: "エルフの憩い場",
        text: "영구: '세계수' 이름을 가진 카드의 구매/시전 코스트가 0이 된다 (0코스트 구매는 턴당 3장까지)", textJa: "永続: 「世界樹」の名を持つカードの購入/発動コストが0になる (0コスト購入は1ターン3枚まで)" },
    { id: "HALF_ELF", t: "mon", cost: 2, atk: 1, def: 1, onSummon: "halfElf", noShop: true, name: "하프 엘프", nameJa: "ハーフエルフ",
        text: "소환시: '세계수' 이름을 가진 카드가 자신 필드에 있으면 '세계수의 보살핌'을 필드에 전개", textJa: "召喚時: 「世界樹」の名を持つカードが自分の場にあれば「世界樹の慈しみ」を場に展開" },
];
for (const c of NEW_STARTERS15) {
    DB[c.id] = c;
}
// ---- 신규 마켓 카드 5종: 전설의 도박꾼 + 엘프 4종 ----
const NEW_CARDS15 = [
    { id: "LEGEND_GAMBLER", t: "mon", cost: 7, atk: 3, def: 4, passive: ["trapmaster", "void"], turnFx: "legendGambler", name: "전설의 도박꾼", nameJa: "伝説のギャンブラー",
        text: "자신의 턴 시작시: 주사위를 굴려 6이면 최대 마나 +10 · 자신의 덱/묘지에 '도박꾼'이 있으면 주사위를 총 3번 굴린다 · 트랩마스터 · 공허",
        textJa: "自分のターン開始時: ダイスを振り6なら最大マナ+10 · 自分のデッキ/墓地に「ギャンブラー」があればダイスを計3回振る · トラップマスター · 虚無" },
    { id: "ELF", t: "mon", cost: 4, atk: 9, def: 9, summonReq: "maxHp65", name: "엘프", nameJa: "エルフ",
        text: "자신의 최대 체력이 65 이상일 때만 소환 가능", textJa: "自分の最大体力が65以上の時のみ召喚可能" },
    { id: "DARK_ELF", t: "mon", cost: 4, atk: 14, def: 6, directOnly: true, summonReq: "darkElf", name: "다크 엘프", nameJa: "ダークエルフ",
        text: "암습 · 자신의 최대 체력이 65 이상이고 자신 필드에 '엘프' 계열 몬스터가 없을 때만 소환 가능",
        textJa: "暗襲 · 自分の最大体力が65以上で自分の場に「エルフ」系列モンスターがいない時のみ召喚可能" },
    { id: "HIGH_ELF", t: "mon", cost: 6, atk: 17, def: 15, passive: ["trapmaster", "aura"], summonReq: "maxHp99", name: "하이엘프", nameJa: "ハイエルフ",
        text: "트랩마스터 · 아우라 · 자신의 최대 체력이 99 이상일 때만 소환 가능", textJa: "トラップマスター · オーラ · 自分の最大体力が99以上の時のみ召喚可能" },
    { id: "ELDER_ELF_KING", t: "mon", cost: 7, atk: 2, def: 8, onSummon: "elderKing", summonReq: "elderKing", name: "엘더 하이엘프 킹", nameJa: "エルダーハイエルフキング",
        text: "【조건】묘지에 '하이엘프', 자신 최대 체력 99 이상 · 【소환시】하이엘프 2체 소환, '하이엘프' 전체 공격력 +15(지속)",
        textJa: "【条件】墓地に「ハイエルフ」、自分の最大体力99以上 · 【召喚時】ハイエルフ2体を召喚後、「ハイエルフ」全体の攻撃力+15(持続)" },
];
for (const c of NEW_CARDS15) {
    DB[c.id] = c;
}
// ---- 토큰: 세계수의 보살핌 (하프 엘프 전개 전용 — cost 0·noShop → 마켓/덱풀 제외) ----
DB.WORLD_CARE = { id: "WORLD_CARE", t: "spell", cost: 0, ench: "worldCare", val: 99, noShop: true, name: "세계수의 보살핌", nameJa: "世界樹の慈しみ",
    text: "영구: 자신의 턴 시작마다 자신 최대 체력 +15", textJa: "永続: 自分のターン開始時に自分の最大体力+15" };
// ---- 초기 덱 빌딩 풀: 컬/보물상자 + noShop 스타팅 카드 (어튠은 1장 고정으로 별도) ----
export const DECK_POOL = ["STARTER_TRASH", "STARTER_CHEST", ...NEW_CARDS10.map((c) => c.id), ...NEW_STARTERS11.map((c) => c.id), ...NEW_STARTERS15.map((c) => c.id)];
export const DECK_SIZE = 8; // 어튠 제외 자유 슬롯
export const DECK_MAX_COPIES = 8; // 카드별 보유량 = 8장씩
export const DEFAULT_DECK_8 = [...Array(6).fill("STARTER_TRASH"), "STARTER_CHEST", "STARTER_CHEST"];
/** 저장된 덱을 유효한 8장으로 정규화 (서버/클라 공용 — 불량 입력은 컬로 패딩). */
export function sanitizeDeck(ids) {
    const pool = new Set(DECK_POOL);
    const counts = {};
    const out = [];
    if (Array.isArray(ids)) {
        for (const id of ids) {
            if (typeof id !== "string" || !pool.has(id))
                continue;
            counts[id] = (counts[id] || 0) + 1;
            if (counts[id] > DECK_MAX_COPIES)
                continue;
            out.push(id);
            if (out.length === DECK_SIZE)
                break;
        }
    }
    while (out.length < DECK_SIZE)
        out.push("STARTER_TRASH");
    return out;
}
// ---- 덱 프리셋 (5슬롯) + 덱별 "마켓 알림이" 워치리스트 ----
export const DECK_SLOTS = 5;
export const WATCH_MAX = 12; // 알림이 최대 — 너무 많으면 하이라이트가 의미 없어짐
/** 저장된 프리셋 묶음을 항상 유효한 형태(5슬롯, 각 8장, 알림이는 구매 가능 카드만)로 정규화. */
export function sanitizeDecks(raw) {
    const o = (raw && typeof raw === "object" ? raw : {});
    const listIn = Array.isArray(o.list) ? o.list : [];
    const list = [];
    for (let i = 0; i < DECK_SLOTS; i++) {
        const d = (listIn[i] ?? {});
        const cards = sanitizeDeck(d.cards ?? DEFAULT_DECK_8);
        const wIn = Array.isArray(d.watch) ? d.watch : [];
        const watch = [];
        for (const id of wIn) {
            if (typeof id !== "string" || !DB[id] || DB[id].cost <= 0 || DB[id].noShop)
                continue;
            if (!watch.includes(id) && watch.length < WATCH_MAX)
                watch.push(id);
        }
        list.push({ cards, watch });
    }
    let sel = typeof o.sel === "number" && Number.isFinite(o.sel) ? Math.floor(o.sel) : 0;
    if (sel < 0 || sel >= DECK_SLOTS)
        sel = 0;
    return { sel, list };
}
// 주사위·확률 카드 (결과 팝업 + 운명의 수레바퀴 재굴림 대상)
export const RANDOM_CARDS = new Set([
    "ND3", "ND5", "GS5_0", "GS6_2", "GS7_0", "GS8_0", "GS8_3", "GS8_5",
    "TIMEWARP", "GAMBLE", "DICE8", "GUILD_CHEST", "LUCKY_CHEST", "FORBIDDEN", "GENESIS_SONG",
]);
// ============================================================
// BALANCE v17 — 함정 전면 리밸런스.
// (a) 구매 코스트 재정렬: 같은 대역에서 "공격 무효 < 공격 절반 < 공격 몬스터 파괴"
//     위계가 지켜지도록 — 무효/절반/반사-only 계열이 파괴 계열과 동가이거나 더
//     비싸던 왜곡을 해소.
// (b) 시전(세트) 코스트 전면 1 통일: 세트 시 소모 마나로 어떤 함정인지
//     역추적되는 정보 누출을 차단. 구매 코스트만 파워 지표로 남긴다.
// ============================================================
const TRAP_COST17 = {
    T1: 1, // 하프 가드(절반+1뎀): 2→1 — 절반은 무효(T9)보다 약함
    T9: 2, // 역류(무효+3회복): 3→2 — 파괴 시작가(3) 아래로
    T12: 3, // 절대 방벽(무효+전체방어+4): 4→3 — 파괴(T4/T6)와 동가였음
    T13: 4, // 천벌(파괴+4뎀): 5→4 — 동급 파괴+α(T4/T6)와 정렬
    GT9_2: 6, // 흑요석 반사막(반사만, 파괴 없음): 9→6
    GT10_2: 7, // 화염의 반사막 II(반사만): 10→7
    GT10_0: 8, // 심연의 방어 태세 II(절반+10뎀): 10→8
    GT10_1: 9, // 강철의 차단막 II(무효+9뎀): 10→9 — 파괴형(GT10_3)보다 싸게
    GT11_0: 9, // 용암의 방어 태세(절반+11뎀): 11→9
    GT11_1: 10, // 천공의 차단막(무효+10뎀): 11→10
    GT12_0: 10, // 여명의 방어 태세(절반+12뎀): 12→10
    GT12_1: 11, // 심판의 차단막(무효+11뎀): 12→11
};
for (const tid of Object.keys(TRAP_COST17)) {
    if (DB[tid])
        DB[tid].cost = TRAP_COST17[tid];
}
for (const tid of Object.keys(DB)) {
    const tc = DB[tid];
    if (tc.t !== "trap")
        continue;
    if (tc.cost > 1)
        tc.play = 1;
    tc.text = tc.text.replace(/\s*\(시전 \d+\)/, "");
    if (tc.textJa)
        tc.textJa = tc.textJa.replace(/\s*\(発動\d+\)/, "");
}
// ============================================================
// BALANCE v18 — 마법 조정 (전수 검토안 A 반영)
// ============================================================
const PATCH18 = {
    GS8_0: { val: 14, text: "상대 체력에 14 데미지 · 사용 시 50%로 상대 덱 맨 위 1장 제외", textJa: "相手の体力に14ダメージ · 使用時50%で相手のデッキトップ1枚を除外" }, // 8코 번 효율 최악(11뎀) → 14뎀
    GS10_3: { val: 6, val2: 3, text: "카드 6장 드로우 + 자신 최대 체력 +3 (시전 1)", textJa: "カード6枚ドロー + 自分の最大体力+3 (発動1)" }, // GS7_3 하위호환 해소
    S15: { cap: 8, text: "코스트 8 이하의 적 몬스터 1체를 파괴", textJa: "コスト8以下の敵モンスター1体を破壊" }, // 3코 만능 제거 → 대형(알·신수·킹급) 제외
    MEDITATE: { cost: 4, play: 4, text: "이번 턴에 다른 카드를 플레이하지 않았을 경우에만 발동 가능. 자신 최대 체력의 80%까지 자신 체력 회복", textJa: "このターンに他のカードをプレイしていない場合のみ発動可能。自分の最大体力の80%まで回復" }, // 구매2·시전3 → 4/4
    BLOOD_SHIELD: { cost: 3 }, // 자해 무효 스위치가 1코 → 3코
    S7: { text: "자신 몬스터 전체 공격력 +3(이번 턴)", textJa: "自分のモンスター全体の攻撃力+3(このターン)" }, // 오버로드: 최대 체력 +2 라이더 제거
    GS5_4: { cost: 4 }, GS6_4: { cost: 5 }, GS7_4: { cost: 6 }, // 예리함(단일 1턴 버프) 라인 일괄 -1코
};
for (const id18 of Object.keys(PATCH18)) {
    if (DB[id18])
        Object.assign(DB[id18], PATCH18[id18]);
}
// ============================================================
// BALANCE v19 — 셀프플레이 2,950판 승률 데이터 기반 조정
// 상위권 스탯볼 몬스터 일괄 너프 + 최하위 스타터(수레바퀴/유령) 버프
// ============================================================
const PATCH19 = {
    // ---- 버프 (스타터 최하위) ----
    FATE_WHEEL: { text: "영구: 시전 시 자신 최대 마나 -1 · 주사위 결과를 본 뒤 다시 굴릴 수 있다 (매턴 1회) · 공허",
        textJa: "永続: 発動時に自分の最大マナ-1 · ダイス・確率カードの結果を見てから振り直せる (毎ターン1回) · 虚無" }, // v24: 자해 삭제
    GHOST: { text: "암습 · 상대가 최대 마나/최대 체력을 늘릴 때마다 자신은 2 데미지를 입는다",
        textJa: "暗襲 · 相手が最大マナ/最大体力を増やすたび自分は2ダメージを受ける" }, // 3→2
    // ---- 너프 ----
    WORLD_CARE: { text: "영구: 자신의 턴 시작마다 자신 최대 체력 +9", textJa: "永続: 自分のターン開始時に自分の最大体力+9" }, // v19 +15→+12, v26 +12→+9
    RUST_SHROOM: { atk: 0 }, // 1/0 → 0/1
    FORESIGHT: { text: "영구: 자신 최대 마나 10 이상이면 최대 마나 +2 후 이 마법 파괴 · 필드에 '선견지명'이 없을 때만 발동 가능 · 공허",
        textJa: "永続: 自分の最大マナ10以上で最大マナ+2後この魔法を破壊 · 場に「先見の明」がない時のみ発動可能 · 虚無" }, // 발현 9→10
    ASSASSIN2: { atk: 8 }, // 9/0 → 8/0
    GM8_0: { atk: 16, def: 5 }, // 저주받은 광전사 18/6 → 16/5
    GM6_3: { def: 3, val: 4, text: "소환시: 상대 체력에 4 데미지", textJa: "召喚時: 相手の体力に4ダメージ" }, // 여명의 드레이크 9/4·5뎀 → 9/3·4뎀
    GM6_0: { atk: 10, def: 3 }, // 흑요석 광전사 11/4 → 10/3 (효과 유지)
    GM8_3: { val: 4, text: "소환시: 상대에 4 데미지 · 이후 상대는 매 턴 1 데미지(중첩 불가)", textJa: "召喚時: 相手に4ダメージ · 以降 相手は毎ターン1ダメージ(重複不可)" }, // 용암의 드레이크 6뎀→4뎀
    GM6_5: { def: 5 }, // 광휘의 사냥꾼 6/6 → 6/5
    GM8_1: { def: 12, val: 2, text: "매 턴 시작 시 자신 체력 +2 회복 · 도발", textJa: "毎ターン開始時 自分の体力+2回復 · 挑発" }, // 신성한 성벽 13→12, 회복 3→2
    GM5_2: { def: 4 }, // 강철의 전사 5/5 → 5/4
    GM7_7: { atk: 9 }, // 심판의 장군 10/7 → 9/7
    GM8_7: { atk: 13, def: 8 }, // 흑요석 장군 14/9 → 13/8
    MIMIC_KING: { atk: 4, def: 5 }, // 미믹 킹 6/6 → 4/5
};
for (const id19 of Object.keys(PATCH19)) {
    if (DB[id19])
        Object.assign(DB[id19], PATCH19[id19]);
}
// ============================================================
// BALANCE v20 — 고정 마켓 1~6코 확대(engine) + 신성한 성벽 재너프
// ============================================================
const PATCH20 = {
    GM8_1: { atk: 4, def: 11 }, // 신성한 성벽 6/12 → 4/11 (v19 너프에도 승률 1위 유지)
};
for (const id20 of Object.keys(PATCH20)) {
    if (DB[id20])
        Object.assign(DB[id20], PATCH20[id20]);
}
// English localization (names/texts) — applied last so it reflects final balance patches
// ============================================================
// DICE CONVERSION (v22) — 모든 확률 카드를 주사위 판정으로 통일.
// 근사표: 10%→2d6합11+(8.3) / 15·20%→⚅(16.7) / 30·33%→5+(33.3)
//        40%→2d6합8+(41.7) / 50%→4+(50) / 60%→2d6합7+(58.3) / 70%→2d6합6+(72.2)
// 가챠: 보물상자=1d6표, 행운/길드의 보물상자=2d6 합계표.
// (엔진 diceSpecFor와 반드시 일치할 것)
// ============================================================
const DICE_TEXTS = {
    GM8_2: { ko: "소환시: 주사위 4 이상이면 자신을 복제 소환 (소환 3)", ja: "召喚時: ダイス4以上で自身を複製召喚 (召喚3)" },
    GT5_2: { ko: "공격 몬스터 파괴 + 주사위 5 이상이면 그 몬스터의 최대 체력만큼 자신 체력 회복", ja: "攻撃モンスターを破壊 + ダイス5以上でそのモンスターの最大体力分、自分の体力を回復" },
    GT5_3: { ko: "공격 몬스터 파괴 + 주사위 2개 합계 7 이상이면 자신 필드에 소생(소유권 이동)", ja: "攻撃モンスターを破壊 + ダイス2個の合計7以上で自分の場に蘇生(所有権移動)" },
    T4: { ko: "공격 몬스터 파괴 + 주사위 5 이상이면 그 공격력만큼 상대에게 데미지", ja: "攻撃モンスターを破壊 + ダイス5以上でその攻撃力分を相手にダメージ" },
    AJIN: { ko: "최대 마나 +1, 주사위 4 이상이면 묘지에 어튠 1장 추가", ja: "最大マナ+1、ダイス4以上で捨て札にアチューンを1枚追加" },
    ND3: { ko: "카드 3장 드로우, 주사위 5 이상이면 2장 추가 (시전 1)", ja: "カード3枚ドロー、ダイス5以上で2枚追加 (発動1)" },
    ND5: { ko: "카드 5장 드로우, 주사위 6이면 최대 마나 +1 (시전 2)", ja: "カード5枚ドロー、ダイス6で最大マナ+1 (発動2)" },
    GS5_0: { ko: "상대 체력에 10 데미지, 주사위 2개 합계 11 이상이면 상대 최대 마나 -1", ja: "相手の体力に10ダメージ、ダイス2個の合計11以上で相手の最大マナ-1" },
    GS6_2: { ko: "자신 체력 13 회복, 주사위 6이면 자신 최대 체력 +5", ja: "自分の体力13回復、ダイス6で自分の最大体力+5" },
    GS7_0: { ko: "상대 체력에 16 데미지, 주사위 6이면 자신 최대 마나 -1", ja: "相手の体力に16ダメージ、ダイス6で自分の最大マナ-1" },
    GS8_0: { ko: "상대 체력에 14 데미지 · 주사위 4 이상이면 상대 덱 맨 위 1장 제외", ja: "相手の体力に14ダメージ · ダイス4以上で相手のデッキトップ1枚を除外" },
    GS8_3: { ko: "카드 5장 드로우 · 주사위 2개 합계 7 이상이면 상대 몬스터/함정/마법 1장 무작위 파괴 (시전 2)", ja: "カード5枚ドロー · ダイス2個の合計7以上で相手のモンスター/罠/魔法1枚をランダム破壊 (発動2)" },
    GS8_5: { ko: "아군 전체 공격력 +7(이번 턴) · 주사위 6이면 코스트 6 이하 몬스터 무작위 소환", ja: "味方全体の攻撃力+7(このターン) · ダイス6でコスト6以下のモンスターをランダム召喚" },
    TIMEWARP: { ko: "주사위 2개 합계 6 이상이면 다음 상대 턴을 스킵 (시전 12)", ja: "ダイス2個の合計6以上で次の相手のターンをスキップ (発動12)" },
    LIFE_CYCLE: { ko: "영구: 자신이 체력을 회복할 때마다 주사위 6이면 최대 마나 +1 (시전 2)", ja: "永続: 自分が体力を回復するたびダイス6で最大マナ+1 (発動2)" },
    WORLD_SEED: { ko: "영구: 자신의 턴 시작마다 주사위 5 이상이면 최대 마나 +1", ja: "永続: 自分のターン開始時にダイス5以上で最大マナ+1" },
    WORLD_BLESS: { ko: "영구: 양 플레이어는 자신의 턴마다 최대 마나 +1 · 시전자는 주사위 2개 합계 8 이상이면 추가로 최대 마나 +2 (시전 6)", ja: "永続: 両プレイヤーは自分のターンごとに最大マナ+1 · 使用者はダイス2個の合計8以上で追加で最大マナ+2 (発動6)" },
    LUCKY_CHEST: { ko: "주사위 2개 합계 — 2·3: 최대 마나+3·2장 드로우 / 4·5: 꽝(상대 필드에 마스터 미믹 10/3) / 6~8: 최대 마나+1 / 9~11: 자신 최대 체력+8 / 12: 자신 최대 체력+12",
        ja: "ダイス2個の合計 — 2·3: 最大マナ+3・2枚ドロー / 4·5: ハズレ(相手の場にマスターミミック10/3) / 6~8: 最大マナ+1 / 9~11: 自分の最大体力+8 / 12: 自分の最大体力+12" },
    GUILD_CHEST: { ko: "주사위 2개 합계 — 2·3: 최대 마나+3 / 4: 턴 시작 드로우+1(영구) / 5·6: 최대 마나+2 / 7: 최대 마나+1 / 8: 자신 최대 체력+10 / 9·10: 상대 필드에 초급·중급 암살자 소환 / 11·12: 초·중·상급 암살자 소환 + 자신에게 10 데미지 (시전 3)",
        ja: "ダイス2個の合計 — 2·3: 最大マナ+3 / 4: ターン開始ドロー+1(永続) / 5·6: 最大マナ+2 / 7: 最大マナ+1 / 8: 自分の最大体力+10 / 9·10: 相手の場に初級・中級アサシン召喚 / 11·12: 初・中・上級アサシン召喚 + 自分に10ダメージ (発動3)" },
};
for (const id of Object.keys(DICE_TEXTS)) {
    if (DB[id]) {
        DB[id].text = DICE_TEXTS[id].ko;
        DB[id].textJa = DICE_TEXTS[id].ja;
    }
}
// 운명의 수레바퀴: 이제 전 랜덤 카드가 주사위이므로 문구 단순화
if (DB.FATE_WHEEL) {
    DB.FATE_WHEEL.text = DB.FATE_WHEEL.text.replace("주사위·확률 카드", "주사위 카드");
    DB.FATE_WHEEL.textJa = (DB.FATE_WHEEL.textJa ?? DB.FATE_WHEEL.text).replace("ダイス・確率カード", "ダイスカード");
}
// 패시브: 도발 50%→주사위 4+, 회피 1~3 무효→4+ 무효 (동일 50%)
PASSIVES.taunt.ko.desc = "상대가 다른 아군 몬스터를 공격할 때 주사위 4 이상이면 이 몬스터가 대신 공격받는다.";
PASSIVES.taunt.ja.desc = "相手が他の味方モンスターを攻撃する時、ダイス4以上でこのモンスターが代わりに攻撃を受ける。";
PASSIVES.taunt.en.desc = "When the opponent attacks another allied monster, roll a die — on 4+, this monster is attacked instead.";
PASSIVES.evade.ko.desc = "이 몬스터가 공격받을 때 주사위 4 이상이면 그 공격을 무효화한다.";
PASSIVES.evade.ja.desc = "このモンスターが攻撃される時、ダイス4以上でその攻撃を無効化する。";
PASSIVES.evade.en.desc = "When this monster is attacked, roll a die — on 4+, the attack is negated.";
// 황금상자: 1d6 표
CHEST_ODDS.ko = { title: "황금상자 주사위", rows: ["5·6 — 최대 마나 +1", "3·4 — 자신 최대 체력 +7", "1·2 — 꽝: 상대 필드에 미믹(3/2)"] };
CHEST_ODDS.ja = { title: "宝箱のダイス", rows: ["5·6 — 最大マナ +1", "3·4 — 自分の最大体力 +7", "1·2 — ハズレ: 相手の場にミミック(3/2)"] };
CHEST_ODDS.en = { title: "Golden chest die", rows: ["5·6 — Max mana +1", "3·4 — Your max HP +7", "1·2 — Dud: Mimic (3/2) on enemy field"] };
// ============================================================
// BALANCE v29 — 표기 정합성 감사 반영 (텍스트↔엔진 드리프트 수정)
// 이 블록은 DICE_TEXTS 이후·applyEnglish 이전에 놓여야 한다 (주사위 텍스트를 덮어쓰므로).
// 어휘 원칙(docs/card-text-style.md):
//   · 몬스터 defMod 변동은 "체력 ±N(지속)" — 최대치와 현재치가 함께 움직이므로 굳이 "최대"를 붙이지 않는다.
//   · "최대 체력"은 엔진이 최대치(effDef)를 검사/치환할 때만 (골리앗 사냥·유리 병기 금지령·붕괴 진동).
//   · "무효화 가능한 코스트"는 구매가가 아니라 시전 코스트 기준 → 문구에 '시전 코스트' 명시.
// ============================================================
const PATCH29 = {
    // ---- 텍스트가 엔진과 달랐던 것 ----
    // 마켓 크래시: 제시가 v28에서 4장이 되었는데 문구는 3→2로 남아 있었음 · 구매=시전이라 (시전) 표기 삭제
    S5: { text: "다음 상대 제시를 4장 → 3장으로 축소", textJa: "次の相手の提示を4枚→3枚に縮小" },
    // 광휘검진: 지속 +2는 이번 턴부터 즉시 적용된다(=이번 턴 +15). "턴 종료 후" 문구 삭제
    GS8_4: { text: "아군 전체 공격력 +13(이번 턴) · 공격력 +2(지속)", textJa: "味方全体の攻撃力+13(このターン) · 攻撃力+2(持続)" },
    // 악마의 주사위 ③④: 상대 '최대' 마나 -1
    DICE8: { text: "주사위 1~6 — ①② 자신 최대마나-4 / ③④ 상대 최대마나-1·14 데미지 / ⑤ 폭풍의 전사(2회공격) 소환 / ⑥ 상대 마법·함정 전멸+폭풍의 전사 2체+최대마나+2+자신 체력+10",
        textJa: "ダイス1~6 — ①② 自分の最大マナ-4 / ③④ 相手の最大マナ-1・14ダメージ / ⑤ 嵐の戦士(2回攻撃)召喚 / ⑥ 相手の魔法・罠全滅+嵐の戦士2体+最大マナ+2+自分の体力+10" },
    // 명상 / 성역의 기도: 엔진에 있는 "체력이 최대치의 80% 미만" 게이트가 문구에 없었음
    MEDITATE: { text: "【조건】자신 체력 최대치의 80% 미만, 이번 턴 타 카드 미사용 · 자신 체력을 최대치의 80%까지 회복",
        textJa: "【条件】自分の体力が最大の80%未満、このターン他カード未使用 · 自分の体力を最大の80%まで回復" },
    PRAYER: { text: "【조건】자신 최대 마나 12 이하, 체력 최대치의 80% 미만, 이번 턴 타 카드 미사용 · 자신 체력 최대치의 80%로 회복 (시전 5)",
        textJa: "【条件】自分の最大マナ12以下、自分の体力が最大の80%未満、このターン他カード未使用 · 自分の体力を最大の80%まで回復 (発動5)" },
    // 붕괴 진동: 실제 동작은 "최대 체력을 1로 + 누적 데미지 초기화 + 알 제외"
    SHATTER: { text: "자신에게 5 데미지 · 양 필드 전 몬스터의 최대 체력이 1이 된다(지속, 누적 데미지 초기화, 알 제외) (시전 2)",
        textJa: "自分に5ダメージ · 両方の場の全モンスターの最大体力が1になる(持続、蓄積ダメージはリセット、卵を除く) (発動2)" },
    // 트릭룸: 스왑되는 값은 최대 체력이고 누적 데미지는 유지 → 스왑 즉시 파괴될 수 있다
    TRICKROOM: { text: "2턴 동안 양 필드 전 몬스터의 공격력과 최대 체력을 맞바꾼다(누적 데미지 유지, 최대 체력이 그 이하면 파괴) · 반전 중엔 체력 상승 효과가 공격력을, 공격력 상승 효과가 체력을 올린다 · 종료 시 오른 스탯은 계승",
        textJa: "2ターンの間、両場の全モンスターの攻撃力と最大体力を入れ替える(蓄積ダメージ維持、最大体力がそれ以下なら破壊) · 反転中は体力上昇効果が攻撃力を、攻撃上昇効果が体力を上げる · 終了時、上がった値は継承" },
    // 은빛 성벽: 자기 자신도 포함되고 여러 장이면 중첩된다
    GM6_1: { text: "상시: 자신 몬스터 전체(이 몬스터 포함) 체력 +3", textJa: "常時: 自分のモンスター全体(このモンスターを含む)の体力+3" },
    // 무효화 캡은 '시전 코스트' 기준 (구매 코스트가 10이어도 시전 1이면 걸린다)
    T2: { text: "시전 코스트 4 이하 마법 1장을 무효화", textJa: "発動コスト4以下の魔法1枚を無効化" },
    NT_NULL3: { text: "시전 코스트 2 이하 마법 1장을 무효화", textJa: "発動コスト2以下の魔法1枚を無効化" },
    NT_NULL4: { text: "시전 코스트 6 이하 마법 1장을 무효화", textJa: "発動コスト6以下の魔法1枚を無効化" },
    NT_SEAL3: { text: "이 카드가 필드에 있는 한 양 플레이어는 시전 코스트 5 이하 마법을 사용할 수 없다", textJa: "このカードが場にある限り、両プレイヤーは発動コスト5以下の魔法を使用できない" },
    // 길드의 보물상자: 11·12도 암살자는 '상대 필드'에 소환된다(9·10과 동일) + 4는 존이 가득 차면 실패
    GUILD_CHEST: { text: "주사위 2개 합계 — 2·3: 최대 마나+3 / 4: 턴 시작 드로우+1(영구, 마법·함정 존이 가득 차면 실패) / 5·6: 최대 마나+2 / 7: 최대 마나+1 / 8: 자신 최대 체력+10 / 9·10: 상대 필드에 초급·중급 암살자 소환 / 11·12: 상대 필드에 초·중·상급 암살자 소환 + 자신에게 10 데미지 (시전 3)",
        textJa: "ダイス2個の合計 — 2·3: 最大マナ+3 / 4: ターン開始ドロー+1(永続、魔法・罠ゾーンが満杯なら失敗) / 5·6: 最大マナ+2 / 7: 最大マナ+1 / 8: 自分の最大体力+10 / 9·10: 相手の場に初級・中級アサシン召喚 / 11·12: 相手の場に初・中・上級アサシン召喚 + 自分に10ダメージ (発動3)" },
    // ---- val(데이터)이 인쇄 수치와 달라 봇이 리썰을 못 보던 것들 (텍스트/엔진은 이미 아래 값) ----
    GS6_2: { val: 13 }, GS7_0: { val: 16 }, GS9_0: { val: 21 }, GS10_0: { val: 23 }, GS10_1: { val: 17 }, GS10_2: { val: 19 },
    // ---- PATCH12의 너프가 카드 재선언(NEW_CARDS6)으로 되돌려져 있었음 ----
    TRAPSMITH: { atk: 1 }, // 함정 기술자 2/4 → 1/4 (원래 v12 의도)
};
for (const id29 of Object.keys(PATCH29)) {
    if (DB[id29])
        Object.assign(DB[id29], PATCH29[id29]);
}
// ============================================================
// NEW CARDS 12 — 몬스터 체력 강화 사이클 5종 (v29)
// 이 게임에는 몬스터 회복이 없고 defMod(+N)만이 "최대치와 현재치를 동시에 +N" 하는
// 유일한 수단이다 → 체력 강화는 사실상 '치유 겸 보강'. 저코스트 단일 → 전체 → 부여형까지
// 코스트를 흩뿌려 벽/알/도발 아키타입의 생존 축을 열어준다.
// ============================================================
const NEW_CARDS12 = [
    { id: "HPS_SCALE", t: "spell", cost: 1, act: "buffPerm", val: 0, val2: 3, name: "강철 비늘", nameJa: "鋼の鱗",
        text: "자신 몬스터 1체의 체력 +3(지속)", textJa: "自分のモンスター1体の体力+3(持続)" },
    { id: "HPS_GRAFT", t: "spell", cost: 2, act: "buffPerm", val: -2, val2: 6, name: "생명 접목", nameJa: "生命の接ぎ木",
        text: "자신 몬스터 1체의 체력 +6(지속) · 그 몬스터의 공격력 -2(지속)", textJa: "自分のモンスター1体の体力+6(持続) · そのモンスターの攻撃力-2(持続)" },
    { id: "HPS_OATH", t: "spell", cost: 3, act: "buffAllDef", val: 2, name: "수호의 맹세", nameJa: "守護の誓い",
        text: "자신 몬스터 전체의 체력 +2(지속)", textJa: "自分のモンスター全体の体力+2(持続)" },
    { id: "HPS_SOIL", t: "spell", cost: 4, play: 3, ench: "soilHp", val: 99, val2: 2, name: "생명의 토양", nameJa: "生命の土壌",
        text: "영구: 자신이 몬스터를 소환할 때마다 그 몬스터의 체력 +2(지속) (시전 3)", textJa: "永続: 自分がモンスターを召喚するたび、そのモンスターの体力+2(持続) (発動3)" },
    { id: "HPS_BOULDER", t: "spell", cost: 5, play: 4, act: "buffPerm", val: 0, val2: 8, grantPassive: "taunt", name: "거암의 가호", nameJa: "巨岩の加護",
        text: "자신 몬스터 1체의 체력 +8(지속) · 그 몬스터에 '도발'을 부여 (시전 4)", textJa: "自分のモンスター1体の体力+8(持続) · そのモンスターに「挑発」を与える (発動4)" },
];
for (const c of NEW_CARDS12) {
    DB[c.id] = c;
}
// ============================================================
// BALANCE PATCH 24 — 유저 지정 조정
// ============================================================
const PATCH24 = {
    // 광폭한 검귀: 10/0·자해4 → 9/1·자해6
    NGA4: { atk: 9, def: 1, val: 6, text: "소환시: 자신에게 6 데미지", textJa: "召喚時: 自分に6ダメージ" },
    // 용암재판: 상대 13 데미지 삭제 → 주사위 5 이상이면 공격 몬스터를 파괴 후 게임에서 제외
    GT6_5: {
        react: "magmaTrial", val: 5,
        text: "【피격시】주사위를 굴려 5 이상이면 공격 몬스터를 파괴 후 게임에서 제외",
        textJa: "【攻撃された時】ダイスを振り5以上なら攻撃モンスターを破壊後ゲームから除外",
    },
};
for (const id of Object.keys(PATCH24)) {
    if (DB[id])
        Object.assign(DB[id], PATCH24[id]);
}
// ============================================================
// BALANCE PATCH 25 — 스타터 하위 버프 (유저 지정)
// ============================================================
const PATCH25 = {
    // 역산: '사용 후 제외' 삭제 → 묘지로 (압축 효과 제거)
    COUNTERCALC: {
        text: "상대 최대 마나 6 이하일 때만 사용 가능 · 상대 영구마법 1장 파괴",
        textJa: "相手の最大マナが6以下の時のみ使用可能 · 相手の永続魔法1枚を破壊",
    },
    // 운명의 수레바퀴: 최대 마나 -1 삭제 · cost 4→5
    FATE_WHEEL: {
        cost: 5,
        text: "영구: 주사위 결과를 본 뒤 다시 굴릴 수 있다 (매턴 1회) · 공허",
        textJa: "永続: ダイスカードの結果を見てから振り直せる (毎ターン1回) · 虚無",
    },
    // 시련의 영역: cost 5→3
    TRIAL_AREA: { cost: 3 },
    // 엘프의 쉼터: 제시 마켓에서 '세계수' 카드를 구매할 때마다 자신 최대 체력 +10
    ELF_HAVEN: {
        text: "영구: '세계수' 카드의 구매/시전 코스트 0 (턴당 3장) · 제시에서 '세계수' 구매 시 자신 최대 체력 +10",
        textJa: "永続: 「世界樹」カードの購入/発動コスト0 (購入はターン3枚) · 提示で「世界樹」購入時、自分の最大体力+10",
    },
    // 유령: 상대가 체력을 회복할 때마다 필드의 모든 유령 공격력 +1 (지속)
    GHOST: {
        text: "암습 · 상대가 최대 마나/최대 체력을 늘리면 자신에게 2 데미지 · 상대가 회복하면 '유령' 전체 공격력 +1(지속)",
        textJa: "暗襲 · 相手が最大マナ/最大体力を増やすと自分に2ダメージ · 相手が回復すると「幽霊」全体の攻撃力+1(持続)",
    },
    // 러스트 머쉬룸: 공격 0→1 · 부패로 상대 몬스터 파괴 시 최대 마나 +1
    RUST_SHROOM: {
        atk: 1,
        text: "부패 · 이 몬스터가 필드에 있을 때 부패로 적 몬스터가 파괴되면 자신 최대 마나 +1",
        textJa: "腐敗 · このモンスターが場にいる時、腐敗で敵モンスターが破壊されると自分の最大マナ+1",
    },
};
for (const id of Object.keys(PATCH25)) {
    if (DB[id])
        Object.assign(DB[id], PATCH25[id]);
}
// ============================================================
// BALANCE PATCH 30 (v30) — 함정 리워크 1차:
// 코피페 클론 함정을 신규 기믹 10종으로 교체 + 잔여 클론 5종 삭제.
// 신규 트리거: 구매 반응 / 직접공격 반응 / 카운트다운(자동 발동) /
// 함정 파괴 반응 / 2번째 마법 반응 / 다회용 함정(카운터).
// 함정 시전(세트) 코스트는 v17 원칙대로 전부 1 유지 (정보 누출 차단).
// ============================================================
const PATCH30 = {
    // ---- 유지 카드 수치 조정 ----
    T10: { val: 4, text: "공격 몬스터 파괴 + 체력 4 회복", textJa: "攻撃モンスターを破壊 + 体力4回復" }, // 회복 2 → 4 (너프 과다 복구)
    GT10_1: { cost: 5, val: 6, text: "공격 무효 + 공격측에 6 데미지", textJa: "攻撃無効 + 攻撃側に6ダメージ" }, // fullguard 대표: 9코 → 5코
    GT9_2: { cost: 5 }, // reflect 대표: 6코 → 5코
    // ---- 리워크 (유저 스펙 v25) ----
    GT9_3: { cost: 6, react: "soulSwap", val: undefined,
        text: "자신 필드에 몬스터가 있으면 발동 · 공격 몬스터를 빼앗고 자신의 최저 코스트 몬스터를 넘긴다(행동 불가)",
        textJa: "自分の場にモンスターがいれば発動 · 攻撃モンスターを奪い、自分の最低コストのモンスターを渡す(行動不可)" },
    GT10_0: { cost: 5, react: "counterOrder", val: undefined,
        text: "공격을 절반으로 줄이고 자신 필드 전원이 공격 몬스터에 공격력만큼 일제 반격(관통)",
        textJa: "攻撃を半減し、自分の場の全員が攻撃モンスターに攻撃力分の一斉反撃(貫通あり)" },
    GT12_0: { cost: 7, react: "lastBastion", val: undefined, exileOnDestroy: true,
        text: "치명타에만 발동 · 공격 무효 + 상대 턴 종료 · 자신 최대 체력 절반 회복(3회) + 다음 턴 드로우 +4",
        textJa: "致命打にのみ発動 · 攻撃無効 + 相手ターン終了 · 自分の最大体力の半分回復(3回まで) + 次のターンドロー+4" },
    GT5_4: { cost: 5, react: "devourGuard", val: undefined,
        text: "공격을 무효화하고 공격 몬스터를 파괴 · 주사위를 굴려 4 이상이면 게임에서 제외",
        textJa: "攻撃を無効化し攻撃モンスターを破壊 · ダイスを振り4以上ならゲームから除外" },
    GT8_5: { cost: 6, react: "brandMagic", val: undefined,
        text: "【마법 반응】상대에게 낙인 1개 부여 · 상대는 매 턴 시작시 낙인당 주사위 눈만큼 데미지",
        textJa: "【魔法に反応】相手に烙印を1個付与 · 相手は毎ターン開始時、烙印ごとにダイスの目のダメージ" },
    GT6_1: { cost: 3, react: "toll", val: undefined,
        text: "【구매 반응】주사위를 굴려 4 이상이면 구매한 카드를 제외하고 그 코스트만큼 상대에게 데미지 + 자신 최대 체력 증가",
        textJa: "【購入に反応】ダイスを振り4以上なら購入カードを除外し、そのコスト分のダメージ + 自分の最大体力増加" },
    GT11_1: { cost: 4, react: "gateClose", val: undefined,
        text: "【직접공격 반응】공격을 무효화한다 · 이번 턴 동안 상대는 직접 공격할 수 없다",
        textJa: "【直接攻撃に反応】攻撃を無効化する · このターン中、相手は直接攻撃できない" },
    GT12_1: { cost: 7, react: "doomsday", val: undefined,
        text: "【카운트다운 3】세트 3턴 후 턴 시작시 자동 발동 · 자신에게 5 데미지, 상대 최대 마나 +1, 필드의 모든 카드 파괴",
        textJa: "【カウントダウン3】セット3ターン後のターン開始時に自動発動 · 自分に5ダメージ、相手の最大マナ+1、場の全カードを破壊" },
    GT11_0: { cost: 5, react: "infoDealer", val: undefined,
        text: "공격 무효 + 자신에게 1 데미지 · 첫 발동시 주사위를 굴려 나온 수만큼 재사용 카운터를 얻고 필드에 남는다",
        textJa: "攻撃無効 + 自分に1ダメージ · 初回発動時のダイスの目だけ再使用カウンターを得て場に残る" },
    NT_NULL6: { cost: 5, react: "secondNull", val: undefined, val2: undefined, name: "마나 역류", nameJa: "マナ逆流",
        text: "【마법 반응】상대가 이번 턴 사용한 2번째 마법을 무효화하고 상대 최대 마나 -1",
        textJa: "【魔法に反応】相手がこのターン使用した2番目の魔法を無効化し、相手の最大マナ-1" },
};
for (const id of Object.keys(PATCH30)) {
    if (DB[id])
        Object.assign(DB[id], PATCH30[id]);
}
// 잔여 클론 함정 삭제 (개성 없는 수치 스케일 복제 — 아트는 ID 봉인으로 보존)
const DELETE_IDS30 = ["GT10_2", "GT10_3", "GT6_4", "NT_NULL5", "GT8_0"];
for (const id of DELETE_IDS30) {
    delete DB[id];
}
// 신규 함정: 함정 파괴 반응 (no art yet → ◆ placeholder)
const NEW_CARDS30 = [
    { id: "NT_SNARE", t: "trap", cost: 3, play: 1, react: "snare", name: "덫 속의 덫", nameJa: "罠の中の罠",
        text: "【함정 파괴 반응】자신의 세트 함정을 파괴하는 상대 효과를 무효화하고 상대에게 10 데미지 · 이 함정은 다시 세트된다",
        textJa: "【罠破壊に反応】自分のセットトラップを破壊する相手の効果を無効化し、相手に10ダメージ · このトラップは再びセットされる" },
];
for (const c of NEW_CARDS30) {
    DB[c.id] = c;
}
// ============================================================
// BALANCE PATCH 31 (v30) — 함정 리워크 2차: 밋밋한 베이직 6종을 기믹화.
// 부패 부여 / 바운스 / 코스트 스케일 처벌 / 전체 공격 봉쇄 / 마법 복제 강탈 / 드로우 부정.
// ============================================================
const PATCH31 = {
    T8: { react: "decaytrap", val: undefined,
        text: "공격 몬스터에게 부패 카운터 2개를 부여한다",
        textJa: "攻撃モンスターに腐敗カウンターを2個与える" },
    T9: { react: "undertow", val: undefined, val2: undefined,
        text: "공격을 무효화하고 공격 몬스터를 소유자의 패로 되돌린다",
        textJa: "攻撃を無効化し、攻撃モンスターを持ち主の手札に戻す" },
    T6: { react: "boltcost", val: undefined,
        text: "공격 몬스터를 파괴하고, 그 코스트만큼 상대에게 데미지",
        textJa: "攻撃モンスターを破壊し、そのコスト分のダメージを相手に与える" },
    GT5_1: { react: "gateLockAll", val: undefined,
        text: "공격을 무효화한다 · 이번 턴 동안 상대 필드의 모든 몬스터는 공격할 수 없다",
        textJa: "攻撃を無効化する · このターン中、相手の場の全モンスターは攻撃できない" },
    NT_NULL4: { react: "spellSteal", cap: 4,
        text: "【마법 반응】코스트 4 이하 마법 1장을 무효화하고, 그 카드의 복제를 자신의 패에 넣는다",
        textJa: "【魔法に反応】コスト4以下の魔法1枚を無効化し、そのカードの複製を自分の手札に加える" },
    GT6_2: { react: "omen", val: undefined,
        text: "공격 몬스터 파괴 + 상대는 다음 턴 드로우 -2",
        textJa: "攻撃モンスターを破壊 + 相手は次のターンのドロー-2" },
};
for (const id of Object.keys(PATCH31)) {
    if (DB[id])
        Object.assign(DB[id], PATCH31[id]);
}
// ============================================================
// NEW CARDS 13 (v31) — 마켓 카운터(상회) + 와인 아키타입
// 상회: 자신의 턴마다 카운터 적립, 20개마다 '암상인'(전 카드 풀 구매권) 지급.
// 양조: 패의 포도를 와인 카운터로 바꾸고, 6턴 뒤 카운터만큼 '와인' 토큰 지급.
// ============================================================
const NEW_STARTERS31 = [
    { id: "GUILD_CO", t: "spell", cost: 2, ench: "guild", val: 99, noShop: true, name: "상회", nameJa: "商会",
        text: "자신의 턴마다 마켓 카운터 +1 · 20개가 모이면 '암상인'을 패에 넣는다 · 중복 발동 불가",
        textJa: "自分のターンごとにマーケットカウンター+1 · 20個で「闇商人」を手札に加える · 重複発動不可" },
    { id: "SLUM", t: "spell", cost: 2, noShop: true, name: "슬럼가", nameJa: "スラム街",
        text: "주사위를 굴려 나온 수만큼 자신의 '상회'에 마켓 카운터 부여",
        textJa: "ダイスを振り、出た目だけ自分の「商会」にマーケットカウンターを付与" },
    { id: "GRAPE", t: "spell", cost: 1, act: "maxHpUp", val: 3, noShop: true, name: "포도", nameJa: "ぶどう",
        text: "자신 최대 체력 +3", textJa: "自分の最大体力+3" },
    { id: "BREWING", t: "spell", cost: 3, ench: "brewing", val: 6, noShop: true, name: "양조", nameJa: "醸造",
        text: "자신의 6턴 동안 턴 시작시 패의 포도류가 와인 카운터로(포도 1·고급 3) · 종료시 카운터만큼 '와인'을 패에 넣는다",
        textJa: "自分の6ターンの間 ターン開始時に手札のぶどうがワインカウンターに(ぶどう1·高級3) · 終了時カウンターの数だけ「ワイン」を手札に" },
];
const NEW_CARDS13 = [
    { id: "MERCH1", t: "mon", cost: 1, atk: 1, def: 2, onSummon: "guildCnt", val: 3, name: "견습 상인", nameJa: "見習い商人",
        text: "소환시: 자신의 '상회'에 마켓 카운터 3개 부여", textJa: "召喚時: 自分の「商会」にマーケットカウンターを3個付与" },
    { id: "MERCH2", t: "mon", cost: 3, atk: 1, def: 5, onSummon: "guildCnt", val: 8, name: "왕도의 상인", nameJa: "王都の商売人",
        text: "소환시: 자신의 '상회'에 마켓 카운터 8개 부여", textJa: "召喚時: 自分の「商会」にマーケットカウンターを8個付与" },
    { id: "GRAPE2", t: "spell", cost: 2, act: "maxHpUp", val: 8, name: "고급 포도", nameJa: "高品質ぶどう",
        text: "자신 최대 체력 +8", textJa: "自分の最大体力+8" },
    // ---- 토큰 (cost 0 · noShop — 마켓/덱풀 제외) ----
    { id: "WINE", t: "spell", cost: 0, act: "maxHpUp", val: 18, val2: 2, passive: ["void"], noShop: true, name: "와인", nameJa: "ワイン",
        text: "자신 최대 체력 +18 · 카드 2장 드로우", textJa: "自分の最大体力+18 · カード2枚ドロー" },
    { id: "DARK_MERCHANT", t: "spell", cost: 0, passive: ["void"], noShop: true, name: "암상인", nameJa: "闇商人",
        text: "카드 풀 전체에서 원하는 카드 1장을 마나를 지불해 구매", textJa: "カードプール全体から好きなカード1枚をマナを払って購入" },
];
for (const c of [...NEW_STARTERS31, ...NEW_CARDS13]) {
    DB[c.id] = c;
}
DECK_POOL.push(...NEW_STARTERS31.map((c) => c.id)); // 스타팅 덱 빌딩 풀에 추가
RANDOM_CARDS.add("SLUM"); // 주사위 카드 (결과 팝업 + 수레바퀴 재굴림 대상)
// ============================================================
// TRIBE REWORK (v32) — 고귀 삭제(귀족과 컨셉 중복) · 고독/포식/귀족을 1~4코
// 4인 구성 + 고유 효과로 리워크 · 신규 종족 '마족' 추가 · 종족 수호 함정 '담합'.
// 시너지: 고독/포식/귀족 = 4종 단일 티어 · 마족 = 2/3/4종 · 시초 = 기존 유지.
// ============================================================
const DELETE_IDS32 = ["TNO2", "TNO3", "TNO5"];
for (const id of DELETE_IDS32) {
    delete DB[id];
}
delete TRIBES["고귀"];
const NEW_TRIBES32 = [
    // ---- 포식 (1~4코) ----
    { id: "TPO1", t: "mon", cost: 1, atk: 0, def: 1, tribe: "포식", summonReq: "preyLow2", onSummon: "preyBounce", name: "굶주린 새끼짐승", nameJa: "飢えた仔獣",
        text: "소환시: 코스트 2 이하 상대 몬스터 1체를 패로 되돌린다 · 상대 필드에 코스트 2 이하 몬스터가 있어야 소환 가능",
        textJa: "召喚時: コスト2以下の相手モンスター1体を手札に戻す · 相手の場にコスト2以下のモンスターがいる時のみ召喚可能" },
    { id: "TPO2", t: "mon", cost: 2, atk: 2, def: 1, tribe: "포식", aura: "devourGrow", name: "굶주린 짐승", nameJa: "飢えた獣",
        text: "상시: 이 몬스터가 파괴한 몬스터의 코스트 1당 +1/+1",
        textJa: "常時: このモンスターが破壊したモンスターのコスト1につき+1/+1" },
    { id: "TPO3", t: "mon", cost: 3, atk: 3, def: 2, tribe: "포식", aura: "scavenger", name: "굶주린 추격자", nameJa: "飢えた追跡者",
        text: "상시: 상대 몬스터가 파괴될 때마다 주사위를 굴려 5 이상이면 그 복제를 자신 필드에 소환",
        textJa: "常時: 相手のモンスターが破壊されるたびダイスを振り5以上ならその複製を自分の場に召喚" },
    { id: "TPO5", t: "mon", cost: 4, atk: 5, def: 2, tribe: "포식", onSummon: "preyExec", name: "포식자", nameJa: "捕食者",
        text: "소환시: 상대의 코스트 3~4 몬스터 1체를 파괴 · 파괴에 성공하면 최대 마나 +1",
        textJa: "召喚時: 相手のコスト3~4のモンスター1体を破壊 · 破壊に成功すると最大マナ+1" },
    // ---- 고독 (1~4코) ----
    { id: "TSO1", t: "mon", cost: 1, atk: 2, def: 3, tribe: "고독", onSummon: "soloLock", name: "은둔자", nameJa: "隠遁者",
        text: "소환 후 자신의 3턴 동안 다른 몬스터를 소환할 수 없다",
        textJa: "召喚後、自分の3ターンの間 他のモンスターを召喚できない" },
    { id: "TSO2", t: "mon", cost: 2, atk: 1, def: 1, tribe: "고독", onSummon: "hermitBuff", name: "외로운 늑대", nameJa: "孤独な狼",
        text: "소환시: 이 몬스터 외 자신 필드의 카드(몬스터·마법·함정)가 1장 이하면 +3/+3",
        textJa: "召喚時: このモンスター以外の自分の場のカード(モンスター·魔法·罠)が1枚以下なら+3/+3" },
    { id: "TSO3", t: "mon", cost: 3, atk: 2, def: 2, tribe: "고독", onSummon: "gravePure", name: "고독한 사냥꾼", nameJa: "孤独な狩人",
        text: "소환시: 자신의 묘지에 몬스터 카드가 없으면 카드 4장 드로우",
        textJa: "召喚時: 自分の墓地にモンスターカードがなければカード4枚ドロー" },
    { id: "TSO5", t: "mon", cost: 4, atk: 5, def: 7, tribe: "고독", summonReq: "soloOnly", name: "고독한 방랑자", nameJa: "孤独な放浪者",
        text: "자신 필드에 고독 종족 외의 몬스터가 없을 때만 소환 가능",
        textJa: "自分の場に孤独種族以外のモンスターがいない時のみ召喚可能" },
    // ---- 귀족 (1~4코) ----
    { id: "TAR1", t: "mon", cost: 1, atk: 0, def: 1, tribe: "귀족", aura: "pageDraw", name: "귀족의 집사", nameJa: "貴族の執事",
        text: "상시: 자신의 턴 시작시 드로우 +1",
        textJa: "常時: 自分のターン開始時ドロー+1" },
    { id: "TAR2", t: "mon", cost: 2, atk: 1, def: 2, tribe: "귀족", aura: "lowAtkBan", name: "몰락 귀족", nameJa: "没落貴族",
        text: "상시: 상대의 코스트 2 이하 몬스터는 공격할 수 없다",
        textJa: "常時: 相手のコスト2以下のモンスターは攻撃できない" },
    { id: "TAR3", t: "mon", cost: 3, atk: 2, def: 3, tribe: "귀족", aura: "trapBan", name: "몰락한 기사", nameJa: "没落した騎士",
        text: "상시: 상대는 함정 카드를 세트할 수 없다",
        textJa: "常時: 相手は罠カードをセットできない" },
    { id: "TAR5", t: "mon", cost: 4, atk: 3, def: 4, tribe: "귀족", aura: "eliteGuard", name: "귀족 영주", nameJa: "貴族領主",
        text: "상시: 코스트 6 이하의 상대 몬스터는 이 몬스터를 공격할 수 없고, 이 몬스터가 있는 한 직접 공격도 불가",
        textJa: "常時: コスト6以下の相手モンスターはこのモンスターを攻撃できず、このモンスターがいる限り直接攻撃も不可" },
    // ---- 마족 (신규, 1~4코) — 강한 몸집 + 마나 대가 ----
    { id: "TDE1", t: "mon", cost: 1, atk: 3, def: 6, tribe: "마족", summonReq: "mm5", onSummon: "manaDebt5", name: "마족 척후", nameJa: "魔族の斥候",
        text: "자신의 5턴 동안 최대 마나 -1 · 최대 마나 5 이상일 때만 소환 가능",
        textJa: "自分の5ターンの間 最大マナ-1 · 最大マナ5以上の時のみ召喚可能" },
    { id: "TDE2", t: "mon", cost: 2, atk: 6, def: 9, tribe: "마족", aura: "demonTax2", name: "마족 전사", nameJa: "魔族の戦士",
        text: "상시: 자신의 최대 마나 -2(3 밑으로는 내려가지 않음)",
        textJa: "常時: 自分の最大マナ-2(3未満にはならない)" },
    { id: "TDE3", t: "mon", cost: 3, atk: 9, def: 12, tribe: "마족", turnFx: "demonRoll", name: "마족 광전사", nameJa: "魔族の狂戦士",
        text: "자신의 턴 시작시 주사위를 굴려 1~3이면 최대 마나 -1, 4~6이면 -2(3 밑 불가)",
        textJa: "自分のターン開始時 ダイスを振り1~3なら最大マナ-1、4~6なら-2(3未満不可)" },
    { id: "TDE4", t: "mon", cost: 4, atk: 14, def: 15, tribe: "마족", onSummon: "manaSet4", name: "마왕", nameJa: "魔王",
        text: "소환시: 자신의 최대 마나가 4가 된다",
        textJa: "召喚時: 自分の最大マナが4になる" },
    // ---- 종족 수호 함정 (스타터) ----
    { id: "COLLUSION", t: "trap", cost: 3, play: 1, react: "collusion", noShop: true, name: "담합", nameJa: "談合",
        text: "종족 몬스터가 받는 공격 무효 + 공격 몬스터 파괴 · 최대 마나 -1로 그 종족의 다른 카드 1장 획득",
        textJa: "種族モンスターへの攻撃を無効化 + 攻撃モンスターを破壊 · 最大マナ-1でその種族の別カード1枚を獲得" },
];
for (const c of NEW_TRIBES32) {
    DB[c.id] = c;
}
DECK_POOL.push("COLLUSION");
// ---- 종족 시너지 설명 갱신 (고독/포식/귀족 = 4종 단일 · 마족 = 2/3/4종) ----
TRIBES["고독"] = {
    ko: { name: "고독", note: "※ 서로 다른 종족 카드여야 발동 · 게임당 1회", bonuses: ["서로 다른 4종: 이 게임 동안 상대는 매 턴 시작시 주사위를 굴려 5 이상일 때만 자신의 턴을 진행할 수 있다"] },
    ja: { name: "孤独", note: "※ 異なる種族カードが必要 · ゲーム中1回", bonuses: ["異なる4種: このゲームの間、相手は毎ターン開始時にダイスを振り5以上の時のみ自分のターンをプレイできる"] },
    en: { name: "Solitary", note: "* Requires different cards of the tribe · once per game", bonuses: ["4 different: for the rest of the game the opponent rolls a die at turn start and only plays their turn on 5+"] },
};
TRIBES["포식"] = {
    ko: { name: "포식", note: "※ 서로 다른 종족 카드여야 발동 · 게임당 1회", bonuses: ["서로 다른 4종: 상대 필드의 모든 카드를 파괴하고 상대에게 30 데미지"] },
    ja: { name: "捕食", note: "※ 異なる種族カードが必要 · ゲーム中1回", bonuses: ["異なる4種: 相手の場の全カードを破壊し、相手に30ダメージ"] },
    en: { name: "Devour", note: "* Requires different cards of the tribe · once per game", bonuses: ["4 different: destroy every card on the enemy field and deal 30 damage"] },
};
TRIBES["귀족"] = {
    ko: { name: "귀족", note: "※ 서로 다른 종족 카드여야 발동 · 게임당 1회", bonuses: ["서로 다른 4종: 상대의 최대 마나가 5가 된다"] },
    ja: { name: "貴族", note: "※ 異なる種族カードが必要 · ゲーム中1回", bonuses: ["異なる4種: 相手の最大マナが5になる"] },
    en: { name: "Aristocrat", note: "* Requires different cards of the tribe · once per game", bonuses: ["4 different: the opponent's max mana becomes 5"] },
};
TRIBES["마족"] = {
    ko: { name: "마족", note: "※ 서로 다른 종족 카드여야 발동 · 각 단계 보상은 게임당 1회씩 따로 지급", bonuses: ["서로 다른 2종: 이 게임 동안 상대는 자신의 턴에 마법을 2장까지만 사용할 수 있다", "서로 다른 3종: 이 게임 동안 상대는 자신의 턴에 마법을 사용할 수 없다", "서로 다른 4종: 이 게임 동안 상대가 소모하는 모든 마나가 3배가 된다"] },
    ja: { name: "魔族", note: "※ 異なる種族カードが必要 · 各段階の報酬はゲーム中1回ずつ", bonuses: ["異なる2種: このゲームの間、相手は自分のターンに魔法を2枚までしか使えない", "異なる3種: このゲームの間、相手は自分のターンに魔法を使えない", "異なる4種: このゲームの間、相手が消費する全てのマナが3倍になる"] },
    en: { name: "Demonkin", note: "* Requires different cards of the tribe · each tier fires once, separately", bonuses: ["2 different: the opponent can cast at most 2 spells per turn", "3 different: the opponent cannot cast spells on their turn", "4 different: all mana the opponent spends is tripled"] },
};
// ============================================================
// NEW CARDS 14 (v33) — 던전 최하층(미믹 소환) + 미믹/제외 아키타입 지원 4종
// ============================================================
const NEW_CARDS14 = [
    { id: "DUNGEON_FLOOR", t: "spell", cost: 4, noShop: true, name: "던전 최하층", nameJa: "ダンジョン最下層",
        text: "최대 마나 -1(3 밑 불가) · 주사위 눈만큼 미믹을 자신 필드에 소환 · 상대 최대 마나 7 이상 필요",
        textJa: "最大マナ-1(3未満不可) · ダイスの目だけミミックを自分の場に召喚 · 相手の最大マナ7以上が必要" },
    { id: "GEM_RAIN", t: "spell", cost: 1, ench: "gemRain", val: 99, name: "보석의 비", nameJa: "宝石の雨",
        text: "영구: 필드 위 모든 '미믹' 계열 몬스터의 공격력 +3",
        textJa: "永続: 場の全ての「ミミック」系モンスターの攻撃力+3" },
    { id: "MIMIC_LAIR", t: "trap", cost: 2, play: 1, react: "mimicLair", name: "미믹의 은신처", nameJa: "ミミックの隠れ家",
        text: "【미믹 파괴 반응】제외된 자신의 미믹 계열 카드당 상대에게 2 데미지",
        textJa: "【ミミック破壊に反応】除外された自分のミミック系カードごとに相手に2ダメージ" },
    { id: "VOID_FRUIT", t: "spell", cost: 3, ench: "voidFruit", val: 99, name: "허무의 과실", nameJa: "虚無の果実",
        text: "영구: 자신의 턴 시작마다 제외된 자신의 카드 수만큼 최대 체력을 얻는다",
        textJa: "永続: 自分のターン開始時、除外された自分のカードの数だけ最大体力を得る" },
    { id: "VOID_APOSTLE", t: "mon", cost: 4, atk: 0, def: 1, onSummon: "voidApostle", turnFx: "voidRoll", name: "허무공간의 사도", nameJa: "虚無空間の使徒",
        text: "소환시: 자신에게 13 데미지, 제외 카드당 +1/+1 · 매턴 주사위 1이면 자신에게 10 데미지, 이 몬스터 파괴",
        textJa: "召喚時: 自分に13ダメージ、除外カードごとに+1/+1 · 自分のターンごとにダイス1なら自分に10ダメージ、このモンスターを破壊" },
];
for (const c of NEW_CARDS14) {
    DB[c.id] = c;
}
DECK_POOL.push("DUNGEON_FLOOR");
RANDOM_CARDS.add("DUNGEON_FLOOR");
// ============================================================
// BALANCE PATCH 34 (v34) — 마법 대개편: 버프/리워크 ~45종, 삭제 34종,
// 신규 스타터 '카지노'. 9코 이상 마법은 시공간 조작만 잔존.
// ============================================================
const DELETE_IDS34 = ["S11", "S9", "PRAYER", "DICE8", "SX6",
    "GS5_0", "GS5_1", "GS5_2", "GS6_0", "GS6_1", "GS6_2", "GS6_3", "GS6_5",
    "GS7_0", "GS7_1", "GS7_2", "GS7_3", "GS7_4", "GS7_5",
    "GS8_1", "GS8_2", "GS8_3", "GS8_4", "GS8_5",
    "GS9_0", "GS9_1", "GS9_2", "GS9_3", "GS10_0", "GS10_1", "GS10_2", "GS10_3", "GS11_0", "GS11_1"];
for (const id of DELETE_IDS34) {
    delete DB[id];
    RANDOM_CARDS.delete(id);
}
const PATCH34 = {
    // ---- 단순 코스트/수치 버프 ----
    AMA: { cost: 1 },
    KIN_CALL: { cost: 2 },
    FURNACE: { cost: 2 },
    CULL_FARM: { play: 1, text: "영구: 자신의 턴 시작마다 패에 컬 1장을 얻는다 (시전 1)", textJa: "永続: 自分のターン開始時に手札にカル1枚を得る (発動1)" },
    DISARM2: { play: 1, text: "영구마법 2장 파괴(양측) (시전 1)", textJa: "永続魔法2枚を破壊(両方の場) (発動1)" },
    DISARM3: { play: 1, text: "상대 영구마법 1장 파괴 후 게임에서 제외 (시전 1)", textJa: "相手の永続魔法1枚を破壊しゲームから除外 (発動1)" },
    HPS_SOIL: { play: 1, text: "영구: 자신이 몬스터를 소환할 때마다 그 몬스터의 체력 +2(지속) (시전 1)", textJa: "永続: 自分がモンスターを召喚するたび、そのモンスターの体力+2(持続) (発動1)" },
    INCUBATOR: { play: 1, text: "자신의 '알' 1개의 부화 카운터를 5턴 줄인다 (시전 1)", textJa: "自分の「卵」1つの孵化カウンターを5ターン減らす (発動1)" },
    EXILE_NUKE1: { play: 2, text: "게임에서 제외된 자신의 카드 1장당 상대에게 1 데미지 (시전 2)", textJa: "ゲームから除外された自分のカード1枚につき相手に1ダメージ (発動2)" },
    LEVY: { play: 2, text: "병사(2/2) 3체를 자신 필드에 소환 (시전 2)", textJa: "兵士(2/2)3体を自分の場に召喚 (発動2)" },
    SNIPE2: { play: 2, text: "체력 2 이하의 몬스터를 모두 파괴(양측) (시전 2)", textJa: "体力2以下のモンスターを全て破壊(両方の場) (発動2)" },
    WALLBREAK2: { play: 2, text: "공격력 2 이하의 몬스터를 모두 파괴(양측) (시전 2)", textJa: "攻撃力2以下のモンスターを全て破壊(両方の場) (発動2)" },
    S13: { val: 11, text: "상대에게 11 데미지", textJa: "相手に11ダメージ" },
    S4: { val: 4, text: "카드 4장 드로우 (시전 1) · 이번 턴 1회만", textJa: "カード4枚ドロー (発動1) · このターン1回のみ" },
    ND2: { val2: 3, text: "카드 2장 드로우 + 자신 체력 3 회복 (시전 1)", textJa: "カード2枚ドロー + 自分の体力3回復 (発動1)" },
    HPS_OATH: { val: 6, text: "자신 몬스터 전체의 체력 +6(지속)", textJa: "自分のモンスター全体の体力+6(持続)" },
    HPS_GRAFT: { play: 1, val: 0, text: "자신 몬스터 1체의 체력 +6(지속) (시전 1)", textJa: "自分のモンスター1体の体力+6(持続) (発動1)" },
    HPS_BOULDER: { val2: 12, text: "자신 몬스터 1체의 체력 +12(지속) · '도발' 부여 (시전 4)", textJa: "自分のモンスター1体の体力+12(持続) · 「挑発」を付与 (発動4)" },
    GENESIS_MAGIC: { text: "자신 필드의 '시초' 몬스터 모두 +5/+5 (시전 0)", textJa: "自分の場の「始原」モンスター全てに+5/+5 (発動0)" },
    E1: { val: 4, text: "4턴 동안 상대는 코스트 3 이하 몬스터를 소환할 수 없다", textJa: "4ターンの間 相手はコスト3以下のモンスターを召喚できない" },
    E3: { play: 3, text: "자신의 4턴 동안 턴 시작시 1장 추가 드로우 · 종료 다음 턴 최대 마나 +1", textJa: "自分の4ターンの間 ターン開始時に1枚追加ドロー · 終了の翌ターン最大マナ+1" },
    AJIN: { textJa: "最大マナ+1、ダイス4以上なら墓地にアチューンを1枚追加" },
    GREED_PRICE: { text: "자신 필드에 '미믹'(3/2) 2마리 소환 · 추가로 '미믹' 5장을 게임에서 제외", textJa: "自分の場に「ミミック」(3/2)2体を召喚 · さらに「ミミック」5枚をゲームから除外" },
    MIMIC2: { atk: 12, def: 6 },
    INFERNO: { play: 1, text: "영구: 자신의 턴마다 자신에게 5 데미지, 상대에게 7 데미지 (시전 1)", textJa: "永続: 自分のターンごとに自分に5ダメージ、相手に7ダメージ (発動1)" },
    AHEUK: { text: "상대 최대 마나 -1 · 자신 필드에 몬스터가 없으면 추가로 -2", textJa: "相手の最大マナ-1 · 自分の場にモンスターがいなければ追加で-2" },
    NWIPE: { val: 0, text: "자신 필드에 몬스터가 없을 때만 · 상대 함정·마법 전부 파괴", textJa: "自分の場にモンスターがいない時のみ · 相手の罠・魔法を全て破壊" },
    SLAY_ART: { text: "영구: 양 플레이어 중 누구든 데미지를 받을 때마다 추가 데미지 +3", textJa: "永続: どちらのプレイヤーがダメージを受けるたび追加ダメージ+3" },
    SNIPE1: { text: "체력 3 이하의 몬스터 1체 파괴(양측) (시전 1)", textJa: "体力3以下のモンスター1体を破壊(両方の場) (発動1)" },
    WALLBREAK1: { text: "공격력 2 이하의 몬스터 1체 파괴(양측) (시전 1)", textJa: "攻撃力2以下のモンスター1体を破壊(両方の場) (発動1)" },
    INQUISITION: { text: "상대의 덱·묘지·필드의 종족 몬스터 1장당 상대에게 6 데미지 (시전 2)", textJa: "相手のデッキ・墓地・場の種族モンスター1枚につき相手に6ダメージ (発動2)" },
    AMBUSH: { text: "상대 최대 마나가 4일 때만 사용 가능 · 상대에게 8 데미지, 자신에게 3 데미지 · 사용 후 게임에서 제외", textJa: "相手の最大マナが4の時のみ使用可能 · 相手に8ダメージ、自分に3ダメージ · 使用後ゲームから除外" },
    NEGOTIATE: { text: "상대의 최대 마나 +1 · 상대는 2턴 동안 함정을 세트할 수 없다", textJa: "相手の最大マナ+1 · 相手は2ターンの間 罠をセットできない" },
    HERMIT: { text: "자신 필드에 몬스터가 없을 때만 · 자신 체력 완전 회복 + 최대 체력 +15 · 게임당 5회 (시전 7)", textJa: "自分の場にモンスターがいない時のみ · 体力全回復 + 最大体力+15 · ゲーム中5回まで (発動7)" },
    GOLIATH_HUNT: { name: "자이언트 킬링", nameJa: "ジャイアントキリング", text: "최대 체력 10 이상의 몬스터 1체를 파괴(양측)", textJa: "最大体力10以上のモンスター1体を破壊(両方の場)" },
    GLASS_BAN: { name: "전략 변경", nameJa: "戦略変更", text: "영구: 공격력과 체력의 차가 4 이상인 몬스터는 공격할 수 없다 (시전 2)", textJa: "永続: 攻撃力と体力の差が4以上のモンスターは攻撃できない (発動2)" },
    SHATTER: { name: "지진", nameJa: "地震", text: "자신에게 5 데미지 · 양 필드 전 몬스터의 체력이 1이 된다(지속, 누적 데미지 초기화, 알 제외) (시전 2)", textJa: "自分に5ダメージ · 両方の場の全モンスターの体力が1になる(持続、蓄積ダメージはリセット、卵を除く) (発動2)" },
    DECAY_CRAFT: { name: "암기 제조", nameJa: "暗器製造", text: "자신 몬스터 2체에 '부패' 부여 · 상대 필드의 모든 몬스터에 부패 카운터 1개 부여", textJa: "自分のモンスター2体に「腐敗」を付与 · 相手の場の全モンスターに腐敗カウンターを1個付与" },
    PURGE_TOUCH: { text: "묘지에서 카드 1장을 골라 게임에서 제외 + 카드 1장 드로우 · 자신의 낙인 카운터를 모두 제거 (시전 1)", textJa: "墓地からカード1枚を選びゲームから除外 + カード1枚ドロー · 自分の烙印カウンターを全て取り除く (発動1)" },
    S3: { act: "buffPerm", val: 3, val2: 0, text: "종족이 아닌 자신 몬스터 1체의 공격력 +3(지속)", textJa: "種族ではない自分のモンスター1体の攻撃力+3(持続)" },
    S6: { play: 1, text: "덱에서 원하는 1장을 패로 (시전 1)", textJa: "デッキから好きな1枚を手札へ (発動1)" },
    LIFE_CYCLE: { text: "영구: 자신이 체력을 회복하거나 최대 체력을 얻으면 주사위를 굴려 4 이상이면 최대 마나 +1 (시전 2)", textJa: "永続: 自分が体力を回復するか最大体力を得るたびダイスを振り4以上なら最大マナ+1 (発動2)" },
    PAIN_HARVEST: { text: "영구: 상대가 데미지를 입을 때마다 제외된 컬 2장을 얻는다 (시전 2)", textJa: "永続: 相手がダメージを受けるたび除外されたカル2枚を得る (発動2)" },
    NHEAL: { text: "영구: 누구든 몬스터를 소환할 때마다 상대 최대 체력 +4, 자신 최대 체력 +8 (시전 2)", textJa: "永続: どちらかがモンスターを召喚するたび相手の最大体力+4、自分の最大体力+8 (発動2)" },
    MAJESTY_RITE: { passive: ["majesty"], text: "자신의 최대 마나 -1 · 자신 몬스터 1체에 '위엄'을 부여한다", textJa: "自分の最大マナ-1 · 自分のモンスター1体に「威厳」を与える" },
    MEDITATE: { text: "자신 최대 마나 11 이하일 때만 발동 · 자신의 체력을 모두 회복하고 자신에게 낙인 카운터 1개", textJa: "自分の最大マナ11以下の時のみ発動 · 自分の体力を全回復し自分に烙印カウンター1個" },
    MASSACRE: { text: "자신의 최대 마나 -1 · 상대 몬스터를 전부 파괴", textJa: "自分の最大マナ-1 · 相手のモンスターを全て破壊" },
    S12: { act: undefined, val: undefined, val2: undefined, text: "주사위를 굴려 5 이상이면 상대에게 낙인 카운터 1개 부여", textJa: "ダイスを振り5以上なら相手に烙印カウンター1個を付与" },
    S14: { act: undefined, val: undefined, val2: undefined, text: "필드의 모든 몬스터의 체력을 모두 회복 · 자신의 체력 5 회복", textJa: "場の全モンスターの体力を全回復 · 自分の体力5回復" },
    S1: { text: "주사위 1~6 — ①② 상대에게 3 데미지 / ③④ 상대의 다음 턴 마나 -1 / ⑤⑥ 상대는 다음 턴 코스트 3 이하 소환 불가",
        textJa: "ダイス1~6 — ①② 相手に3ダメージ / ③④ 相手の次のターンのマナ-1 / ⑤⑥ 相手は次のターン コスト3以下を召喚不可" },
    S5: { text: "다음 상대 턴의 제시를 최대 2장으로 하고 제시 갱신을 봉쇄 (시전 2)", textJa: "次の相手ターンの提示を最大2枚にし、提示更新を封じる (発動2)" },
    SX2: { text: "필드의 세트 함정 1장을 선택해 파괴 · 주사위를 굴려 5 이상이면 그 함정을 게임에서 제외", textJa: "場のセットトラップ1枚を選んで破壊 · ダイスを振り5以上ならその罠をゲームから除外" },
    HANDRESET: { play: 1, text: "패를 모두 버리고 카드 5장 드로우 (시전 1)", textJa: "手札を全て捨てカード5枚ドロー (発動1)" },
    FORBIDDEN: { text: "자신의 체력이 1이 된다 · 주사위를 굴려 5 이상이면 한 종족의 나머지를 모두 소환 · 시초 외 종족 필요",
        textJa: "自分の体力が1になる · ダイスを振り5以上なら自分の一種族の残りモンスターを全て召喚 · 始原以外の種族が必要" },
    GENESIS_SONG: { play: 1, text: "덱·묘지의 '시초' 몬스터 2체를 무작위 소환 (시전 1)", textJa: "デッキ・墓地の「始原」モンスター2体をランダム召喚 (発動1)" },
    MULTI_CULTURE: { ench: undefined, val: undefined, play: undefined, text: "자신 필드에 서로 다른 종족이 2종 이상일 때만 발동 · 자신의 모든 종족 몬스터 공격력 +6(지속)",
        textJa: "自分の場に異なる種族が2種以上いる時のみ発動 · 自分の全種族モンスターの攻撃力+6(持続)" },
    ND3: { cost: 4, play: undefined, text: "주사위 2개를 굴리고 상대가 눈 하나를 예측 · 예측이 두 눈과 모두 다르면 최대 마나 +4",
        textJa: "ダイスを2個振り、相手が目を1つ予測 · 予測が両方の目と違えば最大マナ+4" },
    ND5: { play: 4, act: undefined, val: undefined, val2: undefined, text: "자신 필드의 모든 몬스터에 '아우라'를 부여 (시전 4)", textJa: "自分の場の全モンスターに「オーラ」を付与 (発動4)" },
    GS5_3: { play: 2, act: undefined, val: undefined, text: "상대의 덱·묘지·필드의 '마족' 몬스터 1체당 상대에게 16 데미지 (시전 2)",
        textJa: "相手のデッキ・墓地・場の「魔族」モンスター1体につき相手に16ダメージ (発動2)" },
    GS6_4: { play: 3, act: undefined, val: undefined, text: "상대에게 낙인 카운터가 있으면 낙인 카운터 3개를 부여 (시전 3)",
        textJa: "相手に烙印カウンターがあれば烙印カウンターを3個付与 (発動3)" },
    RUNE2: { play: undefined, act: undefined, text: "자신 덱의 절반 이상이 마법일 때만 발동 · 최대 마나 +8", textJa: "自分のデッキの半分以上が魔法の時のみ発動 · 最大マナ+8" },
    RUNE3: { play: undefined, act: undefined, ench: "runeEcho", val: 99, text: "영구: 자신 덱의 절반 이상이 마법일 때만 발동 · 자신의 마법을 사용하면 마나 없이 1번 더 발동한다",
        textJa: "永続: 自分のデッキの半分以上が魔法の時のみ発動 · 自分の魔法を使うとマナなしでもう1回発動する" },
    WORLD_BLESS: { cost: 6, play: 4, text: "영구: 양 플레이어 턴 시작마다 최대 마나 +1 · 덱에 '엘프' 계열이 있으면 자신의 턴은 +4 (시전 4)",
        textJa: "永続: 両プレイヤーのターン開始時に最大マナ+1 · デッキに「エルフ」系がいれば自分のターンは+4 (発動4)" },
    GS8_0: { text: "상대 덱에서 원하는 카드 1장을 게임에서 제외", textJa: "相手のデッキから好きなカード1枚をゲームから除外" },
    TIMEWARP: { play: 10, text: "주사위를 굴려 4 이상이면 다음 상대 턴을 스킵 (시전 10)", textJa: "ダイスを振り4以上なら次の相手のターンをスキップ (発動10)" },
    GAMBLE: { play: 3, text: "주사위 10회 — ①② 자신 8뎀 / ③④ 상대 5뎀 / ⑤ 마나 골렘 소환 / ⑥ 유리 대포 3체 소환",
        textJa: "ダイス10回 — ①② 自分8 / ③④ 相手5 / ⑤ マナゴーレム召喚 / ⑥ ガラス大砲3体召喚" },
    LIFE_SANCTUM: { ench: "sanctumField", text: "영구: 자신의 턴마다 자신 필드의 모든 몬스터 체력 +2(지속) (시전 2)",
        textJa: "永続: 自分のターンごとに自分の場の全モンスターの体力+2(持続) (発動2)" },
    LUCKY_CHEST: { text: "주사위 2개 합계 — 2·3: 최대 마나+3·2장 드로우 / 4·5: 꽝(상대 필드에 마스터 미믹 12/6) / 6~8: 최대 마나+1 / 9~11: 최대 체력+8 / 12: 최대 체력+12",
        textJa: "ダイス2個の合計 — 2·3: 最大マナ+3・2枚ドロー / 4·5: ハズレ(相手の場にマスターミミック12/6) / 6~8: 最大マナ+1 / 9~11: 最大体力+8 / 12: 最大体力+12" },
};
for (const id of Object.keys(PATCH34)) {
    if (DB[id])
        Object.assign(DB[id], PATCH34[id]);
}
RANDOM_CARDS.add("S1");
RANDOM_CARDS.add("S12");
RANDOM_CARDS.add("SX2");
RANDOM_CARDS.add("GS6_4");
// ---- 신규 스타터: 카지노 (주사위 카운터 → 카지노 주사위) ----
const NEW_CARDS15B = [
    { id: "CASINO", t: "mon", cost: 3, atk: 0, def: 6, aura: "casino", noShop: true, name: "카지노", nameJa: "カジノ",
        text: "주사위를 굴릴 때마다 다이스 카운터 +1, 12개면 카지노 주사위 — ①② 자신 10뎀 / ③④ 상대 30뎀 / ⑤⑥ 상대 최대 마나 3",
        textJa: "ダイスを振るたびダイスカウンター+1、12個でカジノダイス — ①② 自分10 / ③④ 相手30 / ⑤⑥ 相手の最大マナ3" },
];
for (const c of NEW_CARDS15B) {
    DB[c.id] = c;
}
DECK_POOL.push("CASINO");
// ============================================================
// NEW CARDS 16 (v35) — 덱 압축 스타터 2종: 리프레시 / 선택과 집중
// ============================================================
const NEW_CARDS16 = [
    { id: "REFRESH_HAND", t: "spell", cost: 1, noShop: true, name: "리프레시", nameJa: "リフレッシュ",
        text: "카드 1장 드로우 · 패에서 카드 2장까지 골라 게임에서 제외",
        textJa: "カード1枚ドロー · 手札からカード2枚まで選んでゲームから除外" },
    { id: "FOCUS", t: "spell", cost: 2, noShop: true, name: "선택과 집중", nameJa: "選択と集中",
        text: "덱과 묘지에서 카드 3장까지 골라 게임에서 제외",
        textJa: "デッキと墓地からカード3枚まで選んでゲームから除外" },
];
for (const c of NEW_CARDS16) {
    DB[c.id] = c;
}
DECK_POOL.push("REFRESH_HAND", "FOCUS");
// ============================================================
// BALANCE PATCH 36 (v36) — 몬스터 대개편 (유저 스펙, 2026-09-04)
// 골램 아키타입(마나 골렘/가디언/자이언트/특공부대/리더/골램 킹) · 시초의 알 부화화 ·
// 병사/기사 군단(워로드/기수/정예/장군/고무왕/드래곤 융합) · 세계수 3종 · 암살자 본부 ·
// 선택받은 시리즈 리워크 · 카지노 표 변경 · 제네릭 고코스트 몬스터 36종 삭제.
// 텍스트는 docs/card-text-style.md (ko/ja 62 · en 96, 키워드는 칩 행) 기준으로 저작.
// ============================================================
const PATCH36 = {
    GOLEM1: { atk: 1 },
    TGE1: { play: 1, hatchTurns: 4, hatchDur: 2, hatchInto: ["TGE2", "TGE3", "TGE4", "TGE5", "TGE6", "TGE7"],
        text: "공격 불가 · 4턴 후 부화, 내구도 2(피격 -1) · 내구도가 남으면 알 외 7코 이하 시초 1체 소환",
        textJa: "攻撃不可 · 4ターン後に孵化、耐久2(被弾-1) · 耐久が残れば卵以外の7コスト以下の始原1体を召喚" },
    M4: { def: 2 },
    M6: { atk: 2, def: 2 },
    NMD2: { atk: 1, def: 3, val: 2, text: "소환시: 카드 2장 드로우", textJa: "召喚時: カード2枚ドロー" },
    TGE2: { atk: 2, def: 3, onSummon: "originEmber", text: "[시초] 소환시: 자신 필드의 다른 시초 몬스터 1체의 공격력 +2(지속)", textJa: "[始原] 召喚時: 自分の場の他の始原モンスター1体の攻撃力+2(持続)" },
    VAMP_BUTLER: { text: "상시: 이 몬스터가 공격할 때마다 카운터 +1 · 3개마다 '견습 흡혈귀' 1체를 소환 · '흡혈귀' 계열로 취급",
        textJa: "常時: このモンスターが攻撃するたびカウンター+1 · 3個ごとに「見習い吸血鬼」1体を召喚 · 「吸血鬼」系列として扱う" },
    VITAL2: { name: "세계수의 신도", nameJa: "世界樹の信徒", atk: 1, def: 4, val: 4, text: "소환시: 자신 최대 체력 +4", textJa: "召喚時: 自分の最大体力+4" },
    CASINO: { def: 4,
        text: "주사위를 굴릴 때마다 다이스 카운터 +1, 12개면 카지노 주사위 — ①② 자신 30뎀 / ③④ 상대 30뎀 / ⑤ 상대 40뎀 / ⑥ 상대 최대 마나 3",
        textJa: "ダイスを振るたびダイスカウンター+1、12個でカジノダイス — ①② 自分30 / ③④ 相手30 / ⑤ 相手40 / ⑥ 相手の最大マナ3" },
    EGG_HUNTER: { atk: 2, def: 3, val: 6, text: "상시: 이 몬스터가 '알'을 공격하면 내구도 카운터를 6 소모시킨다", textJa: "常時: このモンスターが「卵」を攻撃すると耐久カウンターを6消費させる" },
    EGG_MASTER: { atk: 0, def: 6, val: 5, text: "소환시: 자신 필드의 모든 '알'의 내구도 카운터 +5", textJa: "召喚時: 自分の場の全ての「卵」の耐久カウンター+5" },
    GOLEM2: { atk: 2, def: 6, aura: "leaderGolem", text: "상시: 자신 필드의 몬스터가 쓰러질 때마다 이 몬스터에 기합 카운터 1개", textJa: "常時: 自分の場のモンスターが倒れるたびこのモンスターに気合カウンター1個" },
    M10: { atk: 1, def: 4, aura: "manaGolem", passive: ["guts"], text: "상시: 자신 필드의 다른 '골램' 계열 몬스터 1체당 최대 마나 +1", textJa: "常時: 自分の場の他の「ゴーレム」系モンスター1体につき最大マナ+1" },
    M7: { onSummon: undefined, val: undefined, attackFx: "chainKill", text: "이 몬스터의 공격으로 상대 몬스터가 파괴되면 그 턴에 1번 더 공격할 수 있다(최대 7회)", textJa: "このモンスターの攻撃で相手モンスターが破壊されたら、そのターンにもう1度攻撃できる(最大7回)" },
    M8: { atk: 3, def: 5 },
    M9: { onSummon: "refreshToken", text: "소환시: 제시 카운터 1개 · 자신의 턴에 카운터를 소모해 마나 없이 제시를 갱신할 수 있다", textJa: "召喚時: 提示カウンター1個 · 自分のターンにカウンターを消費しマナなしで提示を更新できる" },
    NGA3: { name: "골램 특공부대", nameJa: "ゴーレム特攻部隊", atk: 4, def: 1, passive: ["guts"], onSummon: "golemSquad", val: undefined,
        text: "소환시: 자신 필드에 다른 '골램' 계열 몬스터가 있으면 이 몬스터에 기합 카운터 3개", textJa: "召喚時: 自分の場に他の「ゴーレム」系モンスターがいればこのモンスターに気合カウンター3個" },
    NHEX: { atk: 1, def: 3, onSummon: undefined, val: undefined, turnFx: "hexCurse",
        text: "매 턴 시작 시 덱 구성에 마법이 10장 이상이면 주사위를 굴려 5 이상일 때 상대 묘지에 '저주' 3장", textJa: "毎ターン開始時 デッキ構成に魔法が10枚以上ならダイスを振り5以上で相手の墓地に「呪い」3枚" },
    NT_SEAL3: { atk: 1, def: 4, val: 4, text: "상시: 양 플레이어는 시전 코스트 4 이하 마법을 사용할 수 없다", textJa: "常時: 両プレイヤーは発動コスト4以下の魔法を使用できない" },
    NWL3: { name: "가디언 골램", nameJa: "ガーディアンゴーレム", atk: 1, def: 9, aura: "gutsOnHit", text: "상시: 이 몬스터는 공격을 받을 때마다 기합 카운터 1개를 얻는다", textJa: "常時: このモンスターは攻撃を受けるたび気合カウンター1個を得る" },
    TGE3: { name: "시초의 수호자", nameJa: "始原の守護者", atk: 1, def: 11, onSummon: "selfBurn", val: 3, text: "[시초] 소환시: 자신에게 3 데미지", textJa: "[始原] 召喚時: 自分に3ダメージ" },
    RUST_SLUG: { atk: 1, def: 4, onSummon: "decayAll", text: "소환시: 상대 몬스터 전체에 부패 카운터 1개 · 부패로 상대 몬스터를 파괴하면 최대 마나 +1, 자신 최대 체력 +5",
        textJa: "召喚時: 相手モンスター全体に腐敗カウンター1個 · 腐敗で相手モンスターを破壊すると最大マナ+1、自分の最大体力+5" },
    TAR3: { passive: ["aura", "majesty"] },
    TAR2: { passive: ["aura"] },
    TSO3: { val: 6, text: "소환시: 자신의 묘지에 몬스터 카드가 없으면 카드 6장 드로우", textJa: "召喚時: 自分の墓地にモンスターカードがなければカード6枚ドロー" },
    VITAL3: { name: "세계수의 파수꾼", nameJa: "世界樹の守り人", atk: 2, def: 4, val: 6, aura: "treeKeeper",
        text: "소환시: 자신 최대 체력 +6 · 상시: '세계수'·'엘프' 계열 카드를 사용할 때마다 자신 최대 체력 +5", textJa: "召喚時: 自分の最大体力+6 · 常時: 「世界樹」「エルフ」系統のカードを使うたび自分の最大体力+5" },
    DARK_ELF: { atk: 18, def: 10 },
    ELF: { atk: 12, def: 12 },
    ELITE: { atk: 3, def: 5, onSummon: "eliteSoldiers", text: "소환시: 자신의 덱+묘지가 10장 이하면 병사(2/2) 2체를 소환", textJa: "召喚時: 自分のデッキ+墓地が10枚以下なら兵士(2/2)2体を召喚" },
    HORDE: { onSummon: "hordeRally", text: "소환시: 자신 필드의 모든 '병사'·'기사'의 공격력 +4(지속)", textJa: "召喚時: 自分の場の全ての「兵士」「騎士」の攻撃力+4(持続)" },
    M11: { atk: 5, def: 3, condAtk: undefined, val: undefined, onSummon: "warlordKnight", text: "소환시: 아군 몬스터 2체 이상이면 기사(4/4) 1체를 소환", textJa: "召喚時: 味方モンスター2体以上なら騎士(4/4)1体を召喚" },
    NGA4: { name: "검귀", nameJa: "剣鬼", atk: 10, def: 1, mult: 2, attackFx: "berserk",
        text: "소환시: 자신에게 6 데미지 · 공격 대상을 고를 수 없고 자신 필드의 몬스터도 대상에 포함", textJa: "召喚時: 自分に6ダメージ · 攻撃対象を選べず、自分の場のモンスターも対象に含まれる" },
    NMD4: { atk: 1, def: 4, onSummon: "chronicler", val: undefined, text: "소환시: 최근 5턴의 제시 마켓(갱신분 포함)에서 원하는 카드 1장을 마나를 내고 구매", textJa: "召喚時: 過去5ターンの提示マーケット(更新分含む)から好きなカード1枚をマナを払って購入" },
    TAR5: { atk: 2, def: 3, passive: ["aura", "majesty"] },
    TGE4: { name: "시초의 재판관", nameJa: "始原の裁判官", atk: 3, def: 4, onSummon: "originArbiter", val: undefined,
        text: "[시초] 소환시: 게임 중 1회, 덱 구성의 '시초' 카드 1장당 상대에게 낙인 카운터 1개", textJa: "[始原] 召喚時: ゲーム中1回、デッキ構成の「始原」カード1枚につき相手に烙印カウンター1個" },
    TRAPSMITH: { aura: "trapDiscount", text: "소환시: 덱·묘지·세트한 함정 1장당 +2/+2 · 상시: 함정 카드의 구매 코스트 -1", textJa: "召喚時: デッキ・墓地・セットした罠1枚につき+2/+2 · 常時: 罠カードの購入コスト-1" },
    TSO5: { atk: 6, def: 7 },
    VITAL4: { name: "고무왕", nameJa: "鼓舞王", atk: 2, def: 3, condAtk: undefined, aura: "rallyGuts", text: "상시: 자신 필드의 '병사'·'기사'에 '기합'을 부여", textJa: "常時: 自分の場の「兵士」「騎士」に「気合」を付与" },
    AWAKENED_MIMIC: { atk: 4, def: 4 },
    GM5_2: { atk: 5, def: 6, val: 2, text: "상시: 몬스터 소환 시 그 몬스터의 체력 +2", textJa: "常時: モンスター召喚時、そのモンスターの体力+2" },
    GOLEM3: { atk: 7, def: 10, onSummon: undefined, summonReq: "golemKin", text: "자신의 필드·덱·패·묘지에 다른 '골램' 계열 몬스터가 있을 때만 소환 가능",
        textJa: "自分の場・デッキ・手札・墓地に他の「ゴーレム」系モンスターがいる時のみ召喚可能" },
    MANA_GIANT: { name: "자이언트 골램", nameJa: "ジャイアントゴーレム", atk: 2, def: 13, aura: undefined, turnFx: "giantGolem",
        text: "매 턴 시작 시 덱 구성에 이 몬스터 외 골램 2종 이상이면 자신 최대 체력 +10", textJa: "毎ターン開始時 デッキ構成にこのモンスター以外のゴーレム2種以上なら自分の最大体力+10" },
    NT_SEAL5: { aura: "sealLow", val: 6, text: "상시: 양 플레이어는 시전 코스트 6 이하 마법을 사용할 수 없다", textJa: "常時: 両プレイヤーは発動コスト6以下の魔法を使用できない" },
    TGE5: { name: "시초의 정령", nameJa: "始原の精霊", onSummon: "originRite", text: "[시초] 소환시: '시초의 술식'을 자신 필드에 전개", textJa: "[始原] 召喚時: 「始原の術式」を自分の場に展開" },
    ASSASSIN3: { atk: 17, def: 4, summonReq: "assassinKin", text: "덱 구성에 이 몬스터 외 '암살자' 계열 카드가 있을 때만 소환 가능", textJa: "デッキ構成にこのモンスター以外の「アサシン」系カードがある時のみ召喚可能" },
    GM6_0: { name: "드래곤", nameJa: "ドラゴン", atk: 6, def: 3, attackFx: undefined, onSummon: "dragonFuse",
        text: "소환시: 병사 1체와 묘지로 가 '드래곤 라이더' 소환 · 병사가 없으면 기사와 함께 '앤티크 드래곤 나이트' 소환",
        textJa: "召喚時: 兵士1体と墓地へ行き「ドラゴンライダー」召喚 · 兵士がなければ騎士と共に「アンティークドラゴンナイト」召喚" },
    INFKNIGHT: { name: "기사", nameJa: "騎士" },
    GM6_1: { name: "차원 유폐자", nameJa: "次元幽閉者", atk: 1, def: 3, aura: undefined, val: undefined, onSummon: "jailer",
        text: "소환시: 상대의 제외된 카드 중 최대 8장을 자신의 제외존으로 옮긴다", textJa: "召喚時: 相手の除外カードから最大8枚を自分の除外ゾーンに移す" },
    GUILD_HALL: { name: "암살자 길드 지부", nameJa: "アサシンギルド支部" },
    GM6_7: { name: "장군", nameJa: "将軍", atk: 7, def: 9, onSummon: "generalKnight", aura: "general",
        text: "소환시: 기사(4/4) 1체를 소환 · 상시: 상대가 몬스터를 소환할 때마다 주사위를 굴려 4 이상이면 기사 1체를 소환",
        textJa: "召喚時: 騎士(4/4)1体を召喚 · 常時: 相手がモンスターを召喚するたびダイスを振り4以上なら騎士1体を召喚" },
    GM6_8: { atk: 14, def: 1, onSummon: "siegeBreak2", val: undefined,
        text: "소환시: 상대 함정 2장 파괴, 미달이면 자신 묘지 무작위 1장 제외 · 파괴되면 병사(2/2) 1체 소환",
        textJa: "召喚時: 相手の罠2枚破壊、未達なら自分の墓地のランダム1枚を除外 · 破壊されたら兵士(2/2)1体を召喚" },
    HIGH_ELF: { atk: 25, def: 25, passive: ["trapmaster", "aura", "majesty", "evade"] },
    NMD6: { atk: 8, def: 5, passive: ["trapmaster"], aura: "sageDiscount",
        text: "소환시: 카드 5장 드로우 · 상시: 덱 구성에 마법이 13장 이상이면 마법의 시전 코스트 -1", textJa: "召喚時: カード5枚ドロー · 常時: デッキ構成に魔法が13枚以上なら魔法の発動コスト-1" },
    TGE6: { atk: 3, def: 12, passive: ["aura"] },
    CHOSEN_ARCHER: { atk: 0, def: 5, directOnly: undefined, passive: ["aura", "evade"], attackFx: "giantSlayer",
        text: "상시: 제외된 자신의 '컬' 2장당 공격력 +2 · 체력 15 이상의 상대 몬스터를 공격하면 무조건 파괴",
        textJa: "常時: 除外された自分の「カル」2枚につき攻撃力+2 · 体力15以上の相手モンスターを攻撃すると無条件に破壊" },
    CHOSEN_KNIGHT: { atk: 0, def: 5, passive: ["guts"], attackFx: "cullExile2",
        text: "상시: 제외된 자신의 '컬' 2장당 +1/+1 · 이 몬스터가 공격할 때마다 '컬' 2장을 게임에서 제외",
        textJa: "常時: 除外された自分の「カル」2枚につき+1/+1 · このモンスターが攻撃するたび「カル」2枚をゲームから除外" },
    CHOSEN_ROGUE: { atk: 0, def: 4, condAtk: "cullAtk2", passive: ["evade", "trapmaster"], attackFx: "rogueTrap",
        text: "상시: 제외된 자신의 '컬' 2장당 공격력 +2 · 직접 공격 성공 시 덱·묘지의 함정 1장을 코스트 없이 세트",
        textJa: "常時: 除外された自分の「カル」2枚につき攻撃力+2 · 直接攻撃成功時、デッキ・墓地の罠1枚をコストなしでセット" },
    CHOSEN_MAGE: { atk: 0, def: 4, passive: ["aura"],
        text: "상시: 제외된 자신의 '컬' 2장당 +1/+1 · 매 턴 (선택) 제외된 '컬' 1장을 묘지로 되돌리고 상대에게 8 데미지",
        textJa: "常時: 除外された自分の「カル」2枚につき+1/+1 · 毎ターン (選択) 除外された「カル」1枚を墓地に戻し相手に8ダメージ" },
    ELDER_ELF_KING: { atk: 8, def: 16, passive: ["majesty", "aura"], onSummon: "elderWipe",
        text: "【조건】덱에 엘프·하이엘프·다크 엘프 중 하나, 자신 최대 체력 99 이상 · 【소환시】상대 필드의 카드 전부 파괴",
        textJa: "【条件】デッキにエルフ・ハイエルフ・ダークエルフのいずれか、自分の最大体力99以上 · 【召喚時】相手の場のカードを全て破壊" },
    LEGEND_GAMBLER: { atk: 3, def: 9, passive: ["trapmaster", "void", "aura"],
        text: "매 턴 시작 시 눈 예측 후 주사위 3개 · 맞히면 최대 마나 +4·최대 체력 +35·상대 카드 2장 파괴 택1(도박꾼:전부)",
        textJa: "毎ターン開始時 出目を予測しダイス3個 · 的中で最大マナ+4·最大体力+35·相手カード2枚破壊から1つ(ギャンブラー:全て)" },
    TGE7: { atk: 5, def: 13, val: 4, text: "[시초] 상시: 자신 필드의 모든 '시초' 몬스터 +4/+4", textJa: "[始原] 常時: 自分の場の全ての「始原」モンスター+4/+4" },
    ASSASSIN4: { atk: 23, def: 20, passive: ["majesty", "aura", "trapmaster"], summonReq: "assassinTrio", onSummon: "nightlord",
        text: "【조건】덱 구성에 이 몬스터 외 '암살자' 3종 이상 · 【소환시】상대에게 낙인 카운터 3개, 상대 세트 함정 전부 파괴",
        textJa: "【条件】デッキ構成にこのモンスター以外の「アサシン」3種以上 · 【召喚時】相手に烙印カウンター3個、相手のセット罠を全て破壊" },
    GAMBLE: { text: "주사위 10회 — ①② 자신 8뎀 / ③④ 상대 5뎀 / ⑤ 마나 골렘 소환 / ⑥ 골램 특공부대 3체 소환",
        textJa: "ダイス10回 — ①② 自分8 / ③④ 相手5 / ⑤ マナゴーレム召喚 / ⑥ ゴーレム特攻部隊3体召喚" },
};
for (const id of Object.keys(PATCH36)) {
    if (DB[id])
        Object.assign(DB[id], PATCH36[id]);
}
// 삭제: 제네릭 고코스트 몬스터 + 수정 정령/철벽 수문장/세계수의 수호자/컬의 화신/창조신/폭풍의 전사 (아트는 ID 봉인으로 보존)
const DELETE_IDS36 = [
    "NWL4", "NSPR", "GM5_1", "GM6_2", "GM6_3", "GM6_4", "GM6_5", "GM6_6",
    "GM7_0", "GM7_1", "GM7_2", "GM7_3", "GM7_4", "GM7_5", "GM7_6", "GM7_7",
    "GM8_0", "GM8_1", "GM8_2", "GM8_3", "GM8_4", "GM8_5", "GM8_7",
    "WORLD_GUARD", "CULL_TITAN", "GM9_0", "GM9_1", "GM9_2", "GM9_3", "GM9_4",
    "GM10_0", "GM10_1", "GM10_2", "GM10_3", "GM10_4", "GM11_0", "CREATOR",
];
for (const id of DELETE_IDS36) {
    delete DB[id];
}
const NEW_CARDS36 = [
    { id: "GUILD_HQ", t: "mon", cost: 6, atk: 0, def: 12, aura: "assassinHQ", turnFx: "nightMarket", name: "암살자 길드 본부", nameJa: "アサシンギルド本部",
        text: "【상시】'암살자'가 상대를 때릴 때마다 상대에게 낙인 카운터 1개 · 【매턴】'암살자' 카드를 파는 나이트 마켓 개장",
        textJa: "【常時】「アサシン」が相手を叩くたび相手に烙印カウンター1個 · 【毎ターン】「アサシン」カードを売るナイトマーケット開店" },
    { id: "WORLD_TREE", t: "mon", cost: 10, atk: 0, def: 25, passive: ["aura", "guts"], turnFx: "worldTree", name: "세계수", nameJa: "世界樹",
        text: "【상시】자신 최대 체력이 늘면 세계수 카운터 1개 · 【매턴】카운터 1개로 자신 몬스터 전체 전회복, 자신 체력을 80%로",
        textJa: "【常時】自分の最大体力が増えると世界樹カウンター1個 · 【毎ターン】カウンター1個で自分のモンスター全体を全回復、自分の体力を80%に" },
    // ---- 토큰 (구매 불가) ----
    { id: "CURSE", t: "spell", cost: 1, noShop: true, passive: ["void"], name: "저주", nameJa: "呪い",
        text: "자신에게 1 데미지", textJa: "自分に1ダメージ" },
    { id: "ORIGIN_RITE", t: "spell", cost: 0, noShop: true, ench: "originRite", val: 99, exileOnDestroy: true, name: "시초의 술식", nameJa: "始原の術式",
        text: "영구: 수호자 외 시초 몬스터 소환 시 상대 필드 카드 1장 파괴 · 없으면 상대에게 낙인 카운터 1개",
        textJa: "永続: 守護者以外の始原モンスター召喚時、相手の場のカード1枚を破壊 · なければ相手に烙印カウンター1個" },
    { id: "DRAGON_RIDER", t: "mon", cost: 0, atk: 14, def: 7, mult: 2, passive: ["evade", "void"], attackFx: "halfSecond", name: "드래곤 라이더", nameJa: "ドラゴンライダー",
        text: "2회째 공격은 공격력 절반(내림)", textJa: "2回目の攻撃は攻撃力半分(切り下げ)" },
    { id: "ANTIQUE_DK", t: "mon", cost: 0, atk: 18, def: 12, mult: 2, passive: ["evade", "aura", "majesty", "void"], name: "앤티크 드래곤 나이트", nameJa: "アンティークドラゴンナイト",
        text: "—", textJa: "—" },
];
for (const c of NEW_CARDS36) {
    DB[c.id] = c;
}
// ============================================================
// BALANCE PATCH 37 (v37) — 성(城) 아키타입 + 함정 전면 리워크 + 마법 조정 (유저 스펙, 2026-09-04)
// ============================================================
const PATCH37 = {
    // ---- v36 후속 조정 ----
    NMD6: { onSummon: undefined, val: undefined, text: "상시: 덱 구성에 마법이 13장 이상이면 마법의 시전 코스트 -1", textJa: "常時: デッキ構成に魔法が13枚以上なら魔法の発動コスト-1" },
    NGA4: { onSummon: undefined, val: undefined, text: "공격 대상을 고를 수 없고 자신 필드의 몬스터도 대상에 포함", textJa: "攻撃対象を選べず、自分の場のモンスターも対象に含まれる" },
    ELITE: { text: "소환시: 덱 구성이 10장 이하면 병사(2/2) 2체를 소환", textJa: "召喚時: デッキ構成が10枚以下なら兵士(2/2)2体を召喚" },
    GM6_0: { text: "소환시: 병사와 함께 묘지로 가면 '드래곤 라이더', 기사와 함께면 '앤티크 드래곤 나이트' 소환 · 둘 다 있으면 선택",
        textJa: "召喚時: 兵士と共に墓地へ行けば「ドラゴンライダー」、騎士と共になら「アンティークドラゴンナイト」召喚 · 両方いれば選択" },
    // ---- 마법 조정 ----
    GAMBLE: { text: "주사위를 10번 굴려 합계가 40 이상이면 최대 마나 +3", textJa: "ダイスを10回振り合計が40以上なら最大マナ+3" },
    LEVY: { name: "소집", nameJa: "召集", cost: 6, play: 1, text: "병사(2/2) 3체를 자신 필드에 소환", textJa: "兵士(2/2)3体を自分の場に召喚" },
    GRAPE2: { val: 6, text: "자신 최대 체력 +6", textJa: "自分の最大体力+6" },
    WINE: { val: 9, text: "자신 최대 체력 +9 · 카드 2장 드로우", textJa: "自分の最大体力+9 · カード2枚ドロー" },
    COUNTERCALC: { text: "상대 최대 마나 7 이하일 때만 사용 가능 · 상대 영구마법 1장 파괴", textJa: "相手の最大マナが7以下の時のみ使用可能 · 相手の永続魔法1枚を破壊" },
    TRIBE_PACT: { text: "영구: 종족 몬스터의 구매 코스트 -1(최소 1) · 45턴까지 종족 시너지를 발동하지 못하면 자신은 패배",
        textJa: "永続: 種族モンスターの購入コスト-1(最低1) · 45ターンまでに種族シナジーを発動できなければ自分は敗北" },
    // ---- 함정 리워크 ----
    T1: { react: "attuneJam", val: undefined, text: "【어튠 반응】주사위를 굴려 3 이상이면 상대의 '어튠'을 무효화, 상대 최대 체력 +5", textJa: "【アチューンに反応】ダイスを振り3以上なら相手の「アチューン」を無効化、相手の最大体力+5" },
    T8: { react: "caltrops", text: "공격 몬스터를 포함한 상대 몬스터 최대 3체에 부패 카운터 2개씩", textJa: "攻撃モンスターを含む相手モンスター最大3体に腐敗カウンター2個ずつ" },
    NT_NULL3: { name: "초급 마력 차단", nameJa: "初級魔力遮断" },
    T2: { text: "시전 코스트 4 이하 마법 1장 무효화(보물상자·어튠 제외) · 덱에 '초급 마력 차단'이 있으면 5 이하",
        textJa: "発動コスト4以下の魔法1枚を無効化(宝箱・アチューン除く) · デッキに「初級魔力遮断」があれば5以下" },
    T3: { val: 5, val2: 10, text: "상대가 소환한 코스트 5 이하, 체력 10 이하 몬스터를 파괴", textJa: "相手が召喚したコスト5以下、体力10以下のモンスターを破壊" },
    T9: { react: "spiky", text: "공격 무효 · 공격 몬스터에 3 데미지", textJa: "攻撃無効 · 攻撃モンスターに3ダメージ" },
    T10: { react: "preyGuard", val: undefined, text: "자신의 '포식' 종족이 공격받으면 발동 · 공격 무효 + 공격 몬스터 파괴, 코스트 5 이하면 게임에서 제외",
        textJa: "自分の「捕食」種族が攻撃されたら発動 · 攻撃無効 + 攻撃モンスターを破壊、コスト5以下ならゲームから除外" },
    T11: { react: "plunder", val: undefined, text: "공격 무효 · 상대 묘지의 코스트 2 이하 카드 1장을 자신의 묘지로", textJa: "攻撃無効 · 相手の墓地のコスト2以下のカード1枚を自分の墓地へ" },
    T12: { react: "rampart", val: undefined, text: "코스트 5 이하 몬스터의 공격에만 발동 · 공격 무효 + 그 몬스터를 패로 · 자신 '성'에 성 카운터 5개",
        textJa: "コスト5以下のモンスターの攻撃にのみ発動 · 攻撃無効 + そのモンスターを手札に戻す · 自分の「城」に城カウンター5個" },
    NT_NULL4: { name: "징병", nameJa: "徴兵", react: "conscript", cap: undefined, text: "공격 몬스터의 코스트만큼 병사(2/2)를 자신 필드에 소환", textJa: "攻撃モンスターのコスト分の兵士(2/2)を自分の場に召喚" },
    T4: { react: "magicCounter", val: undefined, val2: undefined, text: "공격 무효 · 상대에게 낙인 카운터 1개", textJa: "攻撃無効 · 相手に烙印カウンター1個" },
    T6: { react: "mindGame", text: "공격 무효 · 양측이 눈을 예상해 주사위 1개 · 상대 적중이면 자신 낙인 1개, 자신 적중이면 상대 낙인 3개",
        textJa: "攻撃無効 · 互いに出目を予想しダイス1個 · 相手が的中なら自分に烙印1個、自分が的中なら相手に烙印3個" },
    T13: { react: "lightning", val: undefined, text: "공격 무효 · 상대·상대 몬스터·자신 몬스터 중 무작위 3회 선출, 각 12 데미지(관통 없음)",
        textJa: "攻撃無効 · 相手・相手モンスター・自分のモンスターから無作為に3回選出、各12ダメージ(貫通なし)" },
    GT11_1: { react: "gateShut", text: "공격 무효 · 이번 턴 상대는 코스트 4 이상 몬스터로 더 이상 공격할 수 없다", textJa: "攻撃無効 · このターン相手はこれ以上コスト4以上のモンスターで攻撃できない" },
    GT5_0: { react: "decoy", text: "공격을 다른 상대 몬스터에게 돌린다(관통 적용)", textJa: "攻撃を別の相手モンスターに向ける(貫通あり)" },
    GT5_1: { react: "lavaPit", text: "공격 무효 + 공격 몬스터 파괴 · 그 공격력이 4 이상이면 상대에게 낙인 카운터 1개", textJa: "攻撃無効 + 攻撃モンスターを破壊 · その攻撃力が4以上なら相手に烙印カウンター1個" },
    GT5_4: { react: "gluttony", text: "공격 무효 · 자신 몬스터 1체의 체력 +12(지속)", textJa: "攻撃無効 · 自分のモンスター1体の体力+12(持続)" },
    GT9_2: { react: "vengeance", text: "공격받은 자신 몬스터를 파괴하고 상대 몬스터 2체를 파괴", textJa: "攻撃された自分のモンスターを破壊し、相手モンスター2体を破壊" },
    GT10_0: { react: "rallyKnights", text: "공격 무효 · 자신 필드에 '성'이 있으면 가능한 한 기사(4/4)를 소환", textJa: "攻撃無効 · 自分の場に「城」があれば可能な限り騎士(4/4)を召喚" },
    GT11_0: { react: "informant", text: "공격 무효 · '길드의 정보망' 1장을 자신 필드에 전개", textJa: "攻撃無効 · 「ギルドの情報網」1枚を自分の場に展開" },
    GT6_1: { text: "【구매 반응】주사위를 굴려 5 이상이면 구매한 카드를 게임에서 제외 · 자신 필드에 '성'이 있으면 3 이상", textJa: "【購入に反応】ダイスを振り5以上なら購入カードをゲームから除外 · 自分の場に「城」があれば3以上" },
};
for (const id of Object.keys(PATCH37)) {
    if (DB[id])
        Object.assign(DB[id], PATCH37[id]);
}
const DELETE_IDS37 = ["GT5_2", "GT5_3", "GT6_0", "GT6_2", "GT6_3", "GT6_5", "GT8_1", "GT8_2", "GT8_3", "GT8_5", "GT9_3", "GT10_1", "GT12_1", "NT_NULL8"];
for (const id of DELETE_IDS37) {
    delete DB[id];
    RANDOM_CARDS.delete(id);
}
const NEW_STARTERS37 = [
    { id: "CASTLE", t: "mon", cost: 2, atk: 0, def: 3, passive: ["taunt"], onSummon: "castleInit", aura: "castle", noShop: true, name: "성", nameJa: "城",
        text: "【소환시】성 카운터 3개 · 【상시】카운터 1개로 공격 무효 · 코스트 5 이상 소환 불가 · 병사·기사 소환 시 카운터 +1",
        textJa: "【召喚時】城カウンター3個 · 【常時】カウンター1個で攻撃を無効化 · コスト5以上は召喚不可 · 兵士・騎士召喚時にカウンター+1" },
    { id: "ACID_RAIN", t: "spell", cost: 2, ench: "acidRain", val: 99, noShop: true, name: "산성비", nameJa: "酸性雨",
        text: "영구: 상대 몬스터가 부패로 파괴될 때마다 상대에게 낙인 카운터 1개", textJa: "永続: 相手モンスターが腐敗で破壊されるたび相手に烙印カウンター1個" },
];
const NEW_CARDS37 = [
    { id: "BUDGET", t: "spell", cost: 2, name: "운영 예산", nameJa: "運営予算", text: "주사위를 굴려 2 이상이면 병사(2/2) 1체를 자신 필드에 소환", textJa: "ダイスを振り2以上なら兵士(2/2)1体を自分の場に召喚" },
    { id: "EXPANSION", t: "spell", cost: 3, name: "증축", nameJa: "増設", text: "자신 필드에 '성'이 있을 때만 · 자신의 '성'에 성 카운터 5개", textJa: "自分の場に「城」がある時のみ · 自分の「城」に城カウンター5個" },
    { id: "LAND_GRANT", t: "spell", cost: 2, name: "영토 하사", nameJa: "領土付与", text: "자신 필드에 '성'이 있을 때만 · 코스트 3 이하 '귀족' 종족 카드 1장을 자신 필드에 소환", textJa: "自分の場に「城」がある時のみ · コスト3以下の「貴族」種族カード1枚を自分の場に召喚" },
    { id: "TREASON", t: "spell", cost: 1, name: "반역죄", nameJa: "反逆罪", text: "상대 필드에 '성'이 있을 때만 · 상대 필드의 카드 전부 파괴, 상대에게 낙인 카운터 3개", textJa: "相手の場に「城」がある時のみ · 相手の場のカードを全て破壊、相手に烙印カウンター3個" },
    { id: "STRONG_ACID", t: "spell", cost: 4, ench: "strongAcid", val: 99, name: "강산성비", nameJa: "強酸性雨",
        text: "영구: 발동 시 상대 몬스터 전체에 부패 카운터 2개 · 상대 몬스터가 부패로 파괴되면 상대에게 7 데미지, 낙인 1개",
        textJa: "永続: 発動時に相手モンスター全体に腐敗カウンター2個 · 相手モンスターが腐敗で破壊されると相手に7ダメージ、烙印1個" },
    { id: "ROTTEN_GROUND", t: "spell", cost: 2, ench: "rottenGround", val: 99, name: "부패한 땅", nameJa: "腐敗した土地",
        text: "영구: 필드에 소환되는 모든 몬스터에 부패 카운터 2개", textJa: "永続: 場に召喚される全てのモンスターに腐敗カウンター2個" },
    { id: "UNBRAND", t: "spell", cost: 1, name: "제인", nameJa: "徐印", text: "상대와 자신의 낙인 카운터를 모두 제거", textJa: "相手と自分の烙印カウンターを全て取り除く" },
    { id: "WAR_DECL", t: "trap", cost: 4, play: 1, react: "warDecl", name: "선전포고", nameJa: "宣戦布告",
        text: "자신의 '성'이 공격받으면 발동 · 기사(4/4) 3체를 자신 필드에 소환", textJa: "自分の「城」が攻撃されたら発動 · 騎士(4/4)3体を自分の場に召喚" },
];
for (const c of [...NEW_STARTERS37, ...NEW_CARDS37]) {
    DB[c.id] = c;
}
DECK_POOL.push(...NEW_STARTERS37.map((c) => c.id));
RANDOM_CARDS.add("BUDGET");
// ============================================================
// BALANCE PATCH 38 (v38) — 종족 시너지 개정 + 마계/골램·암살자 지원 마법 + 살아있는 던전
// ============================================================
const PATCH38 = {
    NGA3: { name: "전사 골램", nameJa: "戦士ゴーレム" },
    NWL3: { passive: ["guts"] },
    ASSASSIN4: { passive: ["majesty", "aura", "trapmaster", "evade"] },
};
for (const id of Object.keys(PATCH38)) {
    if (DB[id])
        Object.assign(DB[id], PATCH38[id]);
}
const NEW_CARDS38 = [
    { id: "DEMON_REALM", t: "spell", cost: 3, ench: "demonRealm", val: 99, name: "마계", nameJa: "魔界",
        text: "영구: 자신이 소환하는 '마족' 몬스터의 효과를 모두 무효화", textJa: "永続: 自分が召喚する「魔族」モンスターの効果を全て無効化" },
    { id: "AEM", t: "spell", cost: 3, name: "앤티크 인핸스 매직", nameJa: "アンティークエンハンスマジック",
        text: "덱 구성에 서로 다른 '골램' 2장이 있을 때만 · 자신 필드의 '골램' 몬스터 2체의 공격력 +7(지속)", textJa: "デッキ構成に異なる「ゴーレム」2枚がある時のみ · 自分の場の「ゴーレム」モンスター2体の攻撃力+7(持続)" },
    { id: "KNIGHT_TEACH", t: "spell", cost: 3, name: "골램 킹의 가르침", nameJa: "ゴーレムキングの教え",
        text: "자신 필드의 모든 몬스터에 '기합' 부여 · 이미 기합이 있으면 기합 카운터 3개", textJa: "自分の場の全モンスターに「気合」を付与 · 既に気合があれば気合カウンター3個" },
    { id: "DUNGEON", t: "mon", cost: 2, atk: 0, def: 3, aura: "dungeon", name: "살아있는 던전", nameJa: "生きているダンジョン",
        text: "상시: '기합'·'회피'가 없는 몬스터는 공격 시 공격력이 1이 된다", textJa: "常時: 「気合」「回避」を持たないモンスターは攻撃時に攻撃力が1になる" },
    { id: "NL_SECRET", t: "spell", cost: 3, name: "나이트로드의 비기", nameJa: "ナイトロードの秘技",
        text: "자신 몬스터 1체에 트랩마스터·암습·회피 중 1개 부여 · 자신의 '암살자' 2체의 공격력 +3(지속)", textJa: "自分のモンスター1体にトラップマスター・暗襲・回避の1つを付与 · 自分の「アサシン」2体の攻撃力+3(持続)" },
];
for (const c of NEW_CARDS38) {
    DB[c.id] = c;
}
// ---- v38c 너프: 와인/포도/고급 포도/성 ----
Object.assign(DB.WINE, { val: 6, val2: 1, text: "카드 1장 드로우 · 자신 최대 체력 +6", textJa: "カード1枚ドロー · 自分の最大体力+6" });
Object.assign(DB.GRAPE, { val: 2, text: "자신 최대 체력 +2", textJa: "自分の最大体力+2" });
Object.assign(DB.GRAPE2, { val: 4, text: "자신 최대 체력 +4", textJa: "自分の最大体力+4" });
Object.assign(DB.CASTLE, { def: 2, val: 2, text: "【소환시】성 카운터 2개 · 【상시】카운터 1개로 공격 무효 · 코스트 5 이상 소환 불가 · 병사·기사 소환 시 카운터 +1",
    textJa: "【召喚時】城カウンター2個 · 【常時】カウンター1個で攻撃を無効化 · コスト5以上は召喚不可 · 兵士・騎士召喚時にカウンター+1" });
// ---- v39: 주술사 계열 — 꼬마 주술사 → 견습 주술사(2코) + 초급/중급/상급/특급 주술사 ----
Object.assign(DB.NHEX, { cost: 2, name: "견습 주술사", nameJa: "見習い呪術師" });
const NEW_CARDS39 = [
    { id: "HEXER1", t: "mon", cost: 3, atk: 2, def: 3, onSummon: "hexSummon", val: 8, val2: 3, name: "초급 주술사", nameJa: "初級呪術師",
        text: "소환시: 덱 구성에 마법이 8장 이상이면 주사위를 굴려 5 이상일 때 상대 묘지에 '저주' 3장",
        textJa: "召喚時: デッキ構成に魔法が8枚以上ならダイスを振り5以上で相手の墓地に「呪い」3枚" },
    { id: "HEXER2", t: "mon", cost: 4, atk: 3, def: 5, onSummon: "hexSummon", val: 10, val2: 4, name: "중급 주술사", nameJa: "中級呪術師",
        text: "소환시: 덱 구성에 마법이 10장 이상이면 주사위를 굴려 4 이상일 때 상대 묘지에 '저주' 4장",
        textJa: "召喚時: デッキ構成に魔法が10枚以上ならダイスを振り4以上で相手の墓地に「呪い」4枚" },
    { id: "HEXER3", t: "mon", cost: 5, atk: 3, def: 6, passive: ["aura"], onSummon: "hexSummon", val: 13, val2: 5, aura: "hexCurseOnSpell", name: "상급 주술사", nameJa: "上級呪術師",
        text: "소환시: 마법 13장 이상·주사위 3 이상 시 상대 묘지에 '저주' 5장 · 상시: 상대 마법마다 상대 묘지에 '저주' 1장",
        textJa: "召喚時: 魔法13枚以上·ダイス3以上なら相手の墓地に「呪い」5枚 · 常時: 相手の魔法ごとに相手の墓地に「呪い」1枚" },
    { id: "HEXER4", t: "mon", cost: 6, atk: 4, def: 10, passive: ["aura", "majesty", "evade"], summonReq: "hexBoss", aura: "hexBoss", val: 5, name: "특급 주술사 - 켈로이드", nameJa: "特級呪術師 - ケロイド",
        text: "상시: 상대 마법마다 주사위 3 이상이면 무효 · '주술사' 전체 공격력 +5 · 【조건】마법이 덱의 반·15장 이상",
        textJa: "常時: 相手の魔法ごとにダイス3以上なら無効 · 「呪術師」全体の攻撃力+5 · 【条件】魔法がデッキの半分以上·15枚以上" },
];
for (const c of NEW_CARDS39) {
    DB[c.id] = c;
}
// ---- 종족 시너지 설명 갱신 (v38) ----
TRIBES["고독"] = {
    ko: { name: "고독", note: "※ 서로 다른 종족 카드여야 발동 · 게임당 1회", bonuses: ["서로 다른 2종: 이 게임 동안 상대는 몬스터를 3체 이상 소환할 수 없다"] },
    ja: { name: "孤独", note: "※ 異なる種族カードが必要 · ゲーム中1回", bonuses: ["異なる2種: このゲームの間、相手はモンスターを3体以上召喚できない"] },
    en: { name: "Solitary", note: "* Requires different cards of the tribe · once per game", bonuses: ["2 different: for the rest of the game the opponent cannot summon a 3rd monster"] },
};
TRIBES["포식"] = {
    ko: { name: "포식", note: "※ 서로 다른 종족 카드여야 발동 · 게임당 1회", bonuses: ["서로 다른 2종: 상대에게 18 데미지"] },
    ja: { name: "捕食", note: "※ 異なる種族カードが必要 · ゲーム中1回", bonuses: ["異なる2種: 相手に18ダメージ"] },
    en: { name: "Devour", note: "* Requires different cards of the tribe · once per game", bonuses: ["2 different: 18 damage to the opponent"] },
};
TRIBES["귀족"] = {
    ko: { name: "귀족", note: "※ 서로 다른 종족 카드여야 발동 · 게임당 1회", bonuses: ["서로 다른 2종: 상대의 최대 마나 -2"] },
    ja: { name: "貴族", note: "※ 異なる種族カードが必要 · ゲーム中1回", bonuses: ["異なる2種: 相手の最大マナ-2"] },
    en: { name: "Aristocrat", note: "* Requires different cards of the tribe · once per game", bonuses: ["2 different: the opponent's max mana -2"] },
};
TRIBES["시초"] = {
    ko: { name: "시초", note: "※ 1~8코스트 각 1종(8코 '시초의 미믹' 포함) · 각 단계 보상은 게임당 1회씩 따로 지급", bonuses: ["서로 다른 2종: 최대 체력 +15", "서로 다른 3종: 최대 체력 +40", "서로 다른 4종: 최대 체력 +70", "서로 다른 6종: 이 게임에서 승리"] },
    ja: { name: "始原", note: "※ 1~8コスト各1種(8コスト「始原のミミック」を含む) · 各段階の報酬はゲーム中1回ずつ", bonuses: ["異なる2種: 最大体力+15", "異なる3種: 最大体力+40", "異なる4種: 最大体力+70", "異なる6種: このゲームに勝利"] },
    en: { name: "Origin", note: "* Collect different cards, one each of cost 1-8 (incl. cost-8 'Origin Mimic') · each tier fires once, separately", bonuses: ["2 different: max HP +15", "3 different: max HP +40", "4 different: max HP +70", "6 different: you win the game"] },
};
applyEnglish([DB, STARTERS]);
// 플레이버 카드명(ko/ja/en 3개 국어) 적용 — applyEnglish 이후, standardizeCardTexts 이전
applyFlavorCardNames([DB, STARTERS]);
// ============================================================
// v24+ terminology: card texts are AUTHORED in the final vocabulary —
// monster stat = 체력/体力/HP (max: 최대 체력/最大体力/max HP), and every
// HP mention names its owner (자신/상대/이 몬스터/적 몬스터…). No runtime
// renaming pass. Style rules: docs/card-text-style.md
// ============================================================
// 효과 텍스트 표준 표기(【태그】) 적용 — 규칙: docs/card-text-style.md (applyEnglish 이후 필수)
standardizeCardTexts([DB, STARTERS], 
// keyword names for rule R3 (they move to the chip row) — injected so cardText.ts
// never has to import back from this module (see the note there).
(c, lang) => cardPassives(c).map((k) => PASSIVES[k]?.[lang]?.name).filter((n) => !!n));
export const ALL_IDS = Object.keys(DB);
// markets never offer cost-0 tokens or noShop(스타팅 전용) cards
export const BUYABLE_POOL = ALL_IDS.filter((id) => DB[id].cost > 0 && !DB[id].noShop);
// ---- related cards (for the zoom panel): what a card summons / references ----
// Auto-derived by matching OTHER cards' names inside a card's text, plus a manual
// map for abbreviated references (e.g. "초급·중급 암살자") the name-scan can't catch.
const RELATED_MANUAL = {
    ASSASSIN3: ["ASSASSIN1", "ASSASSIN2", "ASSASSIN4", "GUILD_HALL", "GUILD_HQ"], // 상급(v36): 덱 구성에 다른 암살자 카드
    ASSASSIN4: ["ASSASSIN1", "ASSASSIN2", "ASSASSIN3", "GUILD_HALL", "GUILD_HQ"], // 특급(v36): 서로 다른 암살자 3종
    GUILD_CHEST: ["ASSASSIN1", "ASSASSIN2", "ASSASSIN3"], // 암살자 길드 보물상자
    GUILD_HQ: ["ASSASSIN1", "ASSASSIN2", "ASSASSIN3", "ASSASSIN4", "GUILD_HALL"],
    GOLEM3: ["GOLEM1", "GOLEM2", "M10", "NGA3", "NWL3", "MANA_GIANT"], // 골램 킹: '골램' 계열 체크
    M10: ["GOLEM1", "GOLEM2", "GOLEM3", "NGA3", "NWL3", "MANA_GIANT"],
    MANA_GIANT: ["GOLEM1", "GOLEM2", "GOLEM3", "M10", "NGA3", "NWL3"],
    NGA3: ["GOLEM1", "GOLEM2", "GOLEM3", "M10", "NWL3", "MANA_GIANT"],
    HORDE: ["SOLDIER2", "INFKNIGHT", "GOLEM1"],
    VITAL4: ["SOLDIER2", "INFKNIGHT", "GOLEM1"],
    NHEX: ["CURSE", "HEXER1", "HEXER2", "HEXER3", "HEXER4"],
    HEXER1: ["CURSE", "NHEX", "HEXER2", "HEXER3", "HEXER4"],
    HEXER2: ["CURSE", "NHEX", "HEXER1", "HEXER3", "HEXER4"],
    HEXER3: ["CURSE", "NHEX", "HEXER1", "HEXER2", "HEXER4"],
    HEXER4: ["NHEX", "HEXER1", "HEXER2", "HEXER3"],
    TGE1: ["TGE2", "TGE3", "TGE4", "TGE5", "TGE6", "TGE7"],
    CHOSEN_AREA: ["EXILE_NUKE1", "EXILE_NUKE2"], // 컬 제외 아키타입 페이오프
    CASTLE: ["EXPANSION", "LAND_GRANT", "WAR_DECL", "T12", "GT10_0", "GT6_1", "TREASON", "SOLDIER2", "INFKNIGHT"],
    LAND_GRANT: ["CASTLE", "TAR1", "TAR2", "TAR3"],
    T2: ["NT_NULL3"],
    T10: ["TPO1", "TPO2", "TPO3", "TPO5"],
    AEM: ["GOLEM1", "GOLEM2", "GOLEM3", "M10", "NGA3", "NWL3", "MANA_GIANT"],
    DEMON_REALM: ["TDE1", "TDE2", "TDE3", "TDE4"],
    NL_SECRET: ["ASSASSIN1", "ASSASSIN2", "ASSASSIN3", "ASSASSIN4"],
};
const _relatedCache = {};
export function relatedCardIds(id) {
    if (_relatedCache[id])
        return _relatedCache[id];
    const c = DB[id];
    if (!c)
        return (_relatedCache[id] = []);
    const out = new Set(RELATED_MANUAL[id] ?? []);
    const ko = c.text ?? "", ja = c.textJa ?? "";
    // a name only counts if some occurrence is NOT inside a longer card name at the
    // same spot (e.g. "마스터 미믹" in a text must not also match "미믹")
    const koNames = ALL_IDS.map((o) => DB[o].name).filter((n) => !!n);
    const jaNames = ALL_IDS.map((o) => DB[o].nameJa).filter((n) => !!n);
    const standalone = (text, name, names) => {
        if (!text.includes(name))
            return false;
        const longer = names.filter((n) => n.length > name.length && n.includes(name) && text.includes(n));
        for (let i = text.indexOf(name); i !== -1; i = text.indexOf(name, i + 1)) {
            const covered = longer.some((L) => {
                for (let j = text.indexOf(L); j !== -1; j = text.indexOf(L, j + 1))
                    if (j <= i && i + name.length <= j + L.length)
                        return true;
                return false;
            });
            if (!covered)
                return true;
        }
        return false;
    };
    for (const oid of ALL_IDS) {
        if (oid === id)
            continue;
        const o = DB[oid];
        // match another card's name in this card's text (either language); skip 1-char names
        if ((o.name && o.name.length >= 2 && standalone(ko, o.name, koNames)) ||
            (o.nameJa && o.nameJa.length >= 2 && standalone(ja, o.nameJa, jaNames)))
            out.add(oid);
    }
    // don't list a card's own tribe-mates here (the tribe panel already shows those)
    if (c.tribe)
        for (const oid of [...out])
            if (DB[oid].tribe === c.tribe)
                out.delete(oid);
    return (_relatedCache[id] = [...out]);
}
// ============================================================
// BALANCE VERSION — bump this string EVERY time a card's numbers/
// effects change. Matches are tagged with it, so the admin card
// stats accumulate fresh per version and old metas stay viewable.
// Format: "v<N>" (or a date). Only bump for gameplay-affecting
// card edits — not art, text, or localization tweaks.
// ============================================================
export const BALANCE_VERSION = "v39"; // v39: 주술사 계열 — 견습 주술사(구 꼬마, 2코) + 초급(3코 2/3 마법8장·5+·저주3)/중급(4코 3/5 마법10장·4+·저주4)/상급(5코 3/6 아우라 마법13장·3+·저주5 + 상대 마법마다 저주1)/특급 켈로이드(6코 4/10 아우라·위엄·회피 · 마법 반 이상&15장 · 상대 마법 3+ 무효 · 주술사 공격 +5)
// v38c(구): // v38c: 와인 1드로우·최대 체력+6, 포도 +2, 고급 포도 +4, 성 0/2·초기 카운터 2
// v38: // v38: 종족 시너지 개정(귀족 2종 마나-2 · 포식 2종 18뎀 · 고독 2종 소환 상한 2 · 시초 2/3/4/6종 +15/+40/+70/승리) + 마계 + 앤티크 인핸스 매직/기사의 가르침/나이트로드의 비기 + 살아있는 던전 + 전사 골램 개명/가디언 기합/나이트로드 회피
// v37(구): // v37: 성 아키타입(성/증축/영토 하사/반역죄/선전포고/운영 예산/소집) + 함정 전면 리워크(어튠 무효 장치·마름쇠·중급 차단·낙인계·낙뢰·폐문·대역·복수…) + 14종 삭제 + 산성비/강산성비/부패한 땅/제인 + 도박꾼 예측 선택 + 다종족 계약 리워크
// v36(구): // v36: 몬스터 대개편 — 골램 아키타입(마나 골렘 manaGolem/가디언 gutsOnHit/자이언트 giantGolem/특공부대 golemSquad/리더 leaderGolem/골램 킹 golemKin) · 시초의 알 부화(4턴/내구2→시초 1체) · 병사/기사 군단(워로드/기수/정예/장군/고무왕/드래곤 융합→라이더·앤티크) · 세계수 3종(신도/파수꾼/세계수) · 암살자 본부(나이트 마켓+낙인) · 선택받은 4종 리워크 · 엘프 상향 · 카지노 표 변경 · 제네릭 고코스트 몬스터 36종 삭제
// v35(구): // v35: 덱 압축 스타터 — 리프레시(1드로우 + 패 2장까지 제외) / 선택과 집중(덱·묘지 3장까지 제외)
// v34(구): // v34: 마법 대개편 — 버프/리워크 45종(아튠·마 1코, S1 주사위표, 마켓 크래시 제시봉쇄, 룬학문 리워크, 대지의 축복 전체회복, 명상/금단/대학살 리워크 등) + 34종 삭제(9코+ 마법 전멸, 시공간 조작 제외) + 스타터 카지노
// v33(구): // v33: 던전 최하층(스타터) + 보석의 비/미믹의 은신처/허무의 과실/허무공간의 사도 — 미믹·제외 아키타입 확장
// v32(구): // v32: 종족 리워크 — 고귀 삭제 · 고독/포식/귀족 1~4코 고유효과 구성 · 신규 종족 마족(2/3/4종 시너지) · 종족 수호 함정 담합
// v31(구): // v31: 마켓 카운터(상회/슬럼가/견습·왕도 상인/암상인) + 와인 아키타입(포도/고급 포도/양조/와인)
// v30(구): // v30: 함정 리워크 — 클론 함정 10종을 신규 기믹으로 교체(soulSwap/counterOrder/lastBastion/devourGuard/brandMagic/toll/gateClose/doomsday/infoDealer/secondNull) + 덫 속의 덫(snare) 추가 + 클론 5종 삭제(GT10_2/GT10_3/GT6_4/NT_NULL5/GT8_0) + 베이직 6종 기믹화(T8 부패·T9 바운스·T6 코스트뎀·GT5_1 전체봉쇄·NT_NULL4 복제강탈·GT6_2 드로우-2) + T10 회복4·GT10_1 5코·GT9_2 5코
// v29(구): v29: 표기 정합성 감사(텍스트↔엔진 드리프트) + 몬스터 체력 강화 마법 5종 + 함정 기술자 1/4 + 경제 위기 마켓 8장 고정 + 은둔의 안식 순서 수정
// v28: 고정 마켓 10→8장, 제시 마켓 3→4장 (크래시 축소 -1 유지)
// // v27: 인쇄 체력 0 폐지 — 전 몬스터 최저 체력 1 (엔진 effDef 플로어와 표기 일치; 실전 수치 변화 없음)
// v26: 붕괴 진동 재정의(전원 체력 1로·즉사 제거), 세계수의 보살핌 +12→+9
// v25: 벽 상향 — 수문장 3코 0/13, 바위거북 1/8, 마나거인 1/10, 수정정령 0/9
// v24: 전투 개편 — 방어력→체력(데미지 누적·하스스톤식, 반격 없음·관통 유지), 기합=체력1 생존, 저격=현재체력 기준, 최대체력 감소로 즉사 가능(만피 몬스터는 최소 1)
// v23(구): // v23: 전 확률 카드 주사위화 — 1d6/2d6 근사(10%→2d6합11+ · 20%→⚅ · 30%→5+ · 40%→2d6합8+ · 50%→4+ · 60%→2d6합7+ · 70%→2d6합6+), 가챠 3종 주사위표化, 회피 4+로 반전(동일 50%)
// v22: 철벽 수문장 0/13→0/10, 암살자 길드 카운트 명문화(본체 공격 포함)
// v21 이전: // v21: 60턴 체력 판정승(구 75턴 무승부), 바위 거북 1/9→1/5, 선택형 파괴가 자기 필드도 대상 가능
// v19: 데이터 기반 — 상위 몬스터 10종 스탯 너프 + 수레바퀴(자해5)/유령(2뎀) 버프 + 보살핌12/머쉬룸0공/선견지명10/중급암살자8공
// v18: 마법 조정 — GS8_0 14뎀, GS10_3 6드로+최대체력3, 룬파열 코스트8캡, 명상 4/4, 흡혈술식 3코, 오버로드 라이더 제거, 예리함 -1코
// v17: 함정 리밸런스 — 시전코스트 전면 1(정보 누출 차단) + 구매코스트 재정렬(무효<파괴 위계)
// v16: 엘프의 쉼터 코스트 1→3 너프
// v15: 러스트 머쉬룸 1/0 너프 + 도박꾼/전설의 도박꾼 + 엘프 아키타입(쉼터·하프/엘프/다크/하이/엘더 킹·세계수의 보살핌)
// v14: 피의 마법 리워크 — 블러드 드로우(자해15·6드로우), 블러드 샤워(자해15·상대 영구마법/함정 2장 선택 파괴)
// v13: 컬 아키타입 너프 — 선택받은 영역 20→25장, 선택받은 4종 코스트 7 + 스탯 컬 2장당(반내림)
// v12: 기습(AMBUSH) 코스트 1→2 너프
// v11: 패시브 키워드 10종 도입 + 골렘(기합)/부패/위엄/도발/회피 + 컬 아키타입(선택받은 시리즈) + 알 아우라·내구 버프 + 선견지명/혈귀술/공허포격 너프
export function idsOfCost(cost) {
    return BUYABLE_POOL.filter((id) => DB[id].cost === cost);
}
// initial deck: Cull x9 / Pry Chest x2 / Attune x1  (12 cards)
export const STARTER_DECK = [
    ...Array(9).fill("STARTER_TRASH"),
    "STARTER_CHEST", "STARTER_CHEST",
    "STARTER_MANA",
];
/** 보물상자 "계열" 전체 — 마스터 미믹(chestLock)이 봉인하는 대상.
 *  star:"chest"(스타터 보물상자) 외에 복권형 보물상자 스펠도 반드시 포함한다.
 *  (예전엔 star==="chest"만 봤기 때문에 행운/길드의 보물상자가 봉인을 통과했다.)
 *  어튠 - 마(AMA)는 "패의 보물상자를 버리는" 카드라 봉인 대상이 아니다 — 카드 텍스트 명시. */
export const CHEST_CARD_IDS = new Set(["STARTER_CHEST", "LUCKY_CHEST", "GUILD_CHEST"]);
export function isChestCard(c) {
    return c.star === "chest" || CHEST_CARD_IDS.has(c.id);
}
export function frameFor(t) {
    if (t === "mon")
        return "/frames/red.webp";
    if (t === "trap")
        return "/frames/green.webp";
    if (t === "starter")
        return "/frames/cyan.webp";
    return "/frames/blue.webp"; // spell
}
/** FIELD-ONLY square frames (field: true tiles). Web assets are center-transparent
    512px webp cut from the 1254×1254 originals kept in assets/field-frames/.
    The 462×748 vertical frames above are for hand/market/zoom ONLY — never
    crop them onto square field tiles. */
export function fieldFrameFor(t) {
    if (t === "mon")
        return "/frames/field/red.webp";
    if (t === "trap")
        return "/frames/field/green.webp";
    return "/frames/field/blue.webp"; // spell / starter / enchant
}
export const FRAME_BACK = "/frames/sleeve_default.webp";
export const SLEEVES = {
    default: { id: "default", url: FRAME_BACK, ko: "기본", ja: "デフォルト", en: "Default", price: 0 },
};
/** ordered list for shop/picker rendering (default first). */
export const SLEEVE_LIST = [SLEEVES.default];
export function sleeveUrl(_id) { return FRAME_BACK; }
