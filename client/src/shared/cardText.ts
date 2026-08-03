// ============================================================
// LORE — 카드 효과 텍스트 표기 표준화 (v21).
// 규칙 문서: docs/card-text-style.md
//
// 모든 언어(ko/ja/en)의 효과 텍스트를 "발동 조건 태그" 표기로
// 기계적으로 통일한다. 태그는 【…】로 감싸며, cardView가 칩으로
// 강조 렌더링한다 (.fx-tag). 태그가 없는 마법 효과 = 시전 즉시 발동.
//
//   【소환시】/【召喚時】/【On Summon】       onSummon
//   【피격시】/【攻撃された時】/【When Attacked】 함정(공격 반응)
//   【마법 반응】/【魔法に反応】/【On Enemy Spell】 함정(상대 마법 반응)
//   【소환 반응】/【召喚に反応】/【On Enemy Summon】함정(상대 소환 반응)
//   【상시】/【常時】/【Passive】            필드에 있는 동안 지속(aura/condAtk)
//   【매턴】/【毎ターン】/【Each Turn】       자신 턴 시작마다(turnFx)
//   【영구】/【永続】/【Permanent】          영구마법(기한 없음 — 필드 턴 배지도 없음)
//   【지속 N턴】/【持続Nターン】/【Lasts N Turns】 기한부 영구마법(필드에 큰 턴 배지)
//   【조건】/【条件】/【Requires】           소환 조건(summonReq)
//
// 파괴 "선택" 효과(destroyMon/destroyTrap/destroyEnch/신수/블러드 샤워/
// breaktrap)는 v21부터 양쪽 필드가 대상 → 텍스트에서 '적/상대' 한정을
// 제거하고 끝에 (양측)/(両方の場)/(either side) 마커를 붙인다.
//
// ★ 신규 카드를 추가할 때 별도 표기를 신경쓸 필요 없음 — 이 패스가
//   기존 관용 표기(소환시:/영구:/공격을 받으면 …)를 태그로 변환한다.
//   단, 새 "트리거 문구"를 발명하지 말고 관용 표기를 그대로 쓸 것.
// ============================================================
import type { CardDef } from "./types";

// 카드별 완전 수동 오버라이드 (자동 규칙이 어색한 소수 카드)
const OVERRIDE: Record<string, { ko?: string; ja?: string; en?: string }> = {
  MIMIC_PARTY: {
    ko: "【보물상자 반응】상대 필드에 미믹 1마리, 자신 필드에 미믹 2마리 소환",
    ja: "【宝箱に反応】相手の場にミミック1体、自分の場にミミック2体召喚",
    en: "【On Enemy Chest】Summon 1 Mimic to their field and 2 Mimics to yours",
  },
};

// 발동 후 N턴이 지나면 사라지는 "기한부" 영구마법 (turns=99지만 bornTurn 기준 만료)
// boardView가 남은 턴 배지 표시에도 사용한다.
export const ENCH_TURN_LIMITS: Record<string, number> = { spellHeal: 14, ancientCiv: 13 };

// 태그는 문장 어디에 있어도 "이미 태그가 붙은 것"으로 본다
// ([시초] 처럼 종족 접두가 먼저 오는 카드에서 태그가 두 번 붙던 버그 방지)
const hasTag = (s: string): boolean => s.includes("【");

/** act:"destroyMon" 이지만 엔진이 '적 필드에서 자동 선정'하는 카드 — (양측) 마커 대상 아님 */
const AUTO_PICK_DESTROY = new Set(["SNIPE1", "SNIPE2", "WALLBREAK1", "WALLBREAK2", "RUNE1"]);
const twoSidedDestroy = (c: CardDef): boolean => c.act === "destroyMon" && !AUTO_PICK_DESTROY.has(c.id);

/** 마커를 문미(단, 뒤따르는 "(시전 N)"류 앞)에 붙인다 */
function mark(s: string, marker: string): string {
  const m = s.match(/^(.*?)(\s*\((?:시전|発動|Cast|소환|召喚|Summon)\s*\d+\))$/);
  if (m) return m[1] + marker + m[2];
  return s + marker;
}

function stdKo(c: CardDef, s0: string): string {
  let s = s0;
  // ---- 라벨 → 태그 (전역) ----
  s = s.replace(/영구마법[:：]\s*/g, "【영구】")
    .replace(/영구[:：]\s*/g, "【영구】")
    .replace(/상시[:：]\s*/g, "【상시】")
    .replace(/소환시[:：]\s*/g, "【소환시】")
    .replace(/(^|\s|·)소환시\s*(?=[-\d])/g, "$1【소환시】"); // "소환시 30%로 …" / "소환시 -4/-4"
  // ---- 파괴 선택 = 양쪽 필드 ----
  if (twoSidedDestroy(c)) s = mark(s.replace(/적 몬스터/g, "몬스터"), "(양측)");
  if ((c.act === "destroyTrap" && (c.val ?? 1) < 99) || c.onSummon === "breaktrap")
    s = mark(s.replace(/상대의 세트 함정/g, "세트 함정"), "(양측)");
  if (c.act === "destroyEnch") s = mark(s.replace(/상대(의)? 영구마법/g, "영구마법"), "(양측)");
  if (c.id === "DIVINE") s = s.replace("상대 필드의 카드 3장 선택 파괴(몬스터·세트 함정·영구마법)", "카드 3장 선택 파괴(양측 · 몬스터·세트 함정·영구마법)");
  if (c.id === "BLOOD2") s = s.replace("상대의 영구마법 또는 세트 함정 2장을 선택해 파괴", "영구마법·세트 함정 2장을 선택해 파괴(양측)");
  // ---- 함정 트리거 ----
  if (c.t === "trap" && c.react) {
    if (c.react === "nullspell") s = "【마법 반응】" + s;
    else if (c.react === "pitfall") s = "【소환 반응】" + s;
    else if (!hasTag(s)) s = "【피격시】" + s.replace(/^공격을 받으면\s*/, "").replace(/^공격을 받았을 때\s*/, "");
  }
  // ---- 영구마법 ----
  if (c.ench) {
    s = s.replace(/^(\d+)턴 동안\s*/, "【지속 $1턴】")
      .replace(/^자신의 (\d+)턴 동안\s*/, "【지속 $1턴】");
    const lim = ENCH_TURN_LIMITS[c.ench];
    if (lim) s = s.replace(/^【영구】/, `【지속 ${lim}턴】`);
    if (!hasTag(s)) s = "【영구】" + s;
  }
  // ---- 매턴 (turnFx) ----
  if (c.turnFx && !hasTag(s)) {
    s = s.replace(/^매 턴 시작 시\s*/, "").replace(/^자신의 턴 시작시[:：]?\s*/, "").replace(/^매 턴\s+/, "");
    s = "【매턴】" + s;
  }
  // ---- 상시 (aura/condAtk — 소환시 등 태그가 이미 앞에 있으면 그대로) ----
  if ((c.aura || c.condAtk) && !hasTag(s)  && !c.hatchTurns) {
    s = s.replace(/^필드에 있는 동안\s*/, "")
      .replace(/^이 카드가 필드에 있는 한\s*/, "")
      .replace(/^이 카드가 필드에 있는 동안\s*/, "")
      .replace(/^이 카드가 필드에 존재하는 동안\s*/, "");
    s = "【상시】" + s;
  }
  // ---- 소환 조건: 해당 절 앞에 【조건】 ----
  s = s.replace(/】[:：]\s*/g, "】");
  if (c.summonReq) s = s.split(" · ").map((seg) => (seg.includes("소환 가능") && !seg.startsWith("【") ? "【조건】" + seg : seg)).join(" · ");
  return s;
}

function stdJa(c: CardDef, s0: string): string {
  let s = s0;
  s = s.replace(/永続魔法[:：]\s*/g, "【永続】")
    .replace(/永続[:：]\s*/g, "【永続】")
    .replace(/常時[:：]\s*/g, "【常時】")
    .replace(/召喚時[:：]\s*/g, "【召喚時】")
    .replace(/召喚時(?=[-\d])/g, "【召喚時】");
  if (twoSidedDestroy(c)) s = mark(s.replace(/敵モンスター/g, "モンスター"), "(両方の場)");
  if ((c.act === "destroyTrap" && (c.val ?? 1) < 99) || c.onSummon === "breaktrap")
    s = mark(s.replace(/相手のセット(トラップ|罠)/g, "セット$1"), "(両方の場)");
  if (c.act === "destroyEnch") s = mark(s.replace(/相手の永続魔法/g, "永続魔法"), "(両方の場)");
  if (c.id === "DIVINE") s = s.replace("相手の場のカード3枚を選んで破壊(モンスター・セットトラップ・永続魔法)", "カード3枚を選んで破壊(両方の場 · モンスター・セットトラップ・永続魔法)");
  if (c.id === "BLOOD2") s = s.replace("相手の永続魔法またはセットトラップを2枚選んで破壊", "永続魔法・セットトラップを2枚選んで破壊(両方の場)");
  if (c.t === "trap" && c.react) {
    if (c.react === "nullspell") s = "【魔法に反応】" + s;
    else if (c.react === "pitfall") s = "【召喚に反応】" + s;
    else if (!hasTag(s)) s = "【攻撃された時】" + s.replace(/^攻撃を受けると\s*/, "").replace(/^攻撃を受けたら\s*/, "");
  }
  if (c.ench) {
    s = s.replace(/^(\d+)ターンの間\s*/, "【持続$1ターン】")
      .replace(/^自分の(\d+)ターンの間\s*/, "【持続$1ターン】");
    const lim = ENCH_TURN_LIMITS[c.ench];
    if (lim) s = s.replace(/^【永続】/, `【持続${lim}ターン】`);
    if (!hasTag(s)) s = "【永続】" + s;
  }
  if (c.turnFx && !hasTag(s)) {
    s = s.replace(/^毎ターン開始時\s*/, "").replace(/^自分のターン開始時[:：]?\s*/, "").replace(/^毎ターン\s+/, "");
    s = "【毎ターン】" + s;
  }
  if ((c.aura || c.condAtk) && !hasTag(s)  && !c.hatchTurns) {
    s = s.replace(/^場にいる間、?\s*/, "")
      .replace(/^このカードが場に(ある|いる)限り、?\s*/, "")
      .replace(/^このカードが場に存在する間、?\s*/, "");
    s = "【常時】" + s;
  }
  s = s.replace(/】[:：]\s*/g, "】");
  if (c.summonReq) s = s.split(" · ").map((seg) => (/召喚可能/.test(seg) && !seg.startsWith("【") ? "【条件】" + seg : seg)).join(" · ");
  return s;
}

function stdEn(c: CardDef, s0: string): string {
  let s = s0;
  // v17: 함정 시전(세트) 코스트는 전부 1로 통일 → ko/ja처럼 EN에서도 (Cast N) 표기를 제거
  if (c.t === "trap") s = s.replace(/\s*\(Cast \d+\)/, "");
  s = s.replace(/On summon[:：]\s*/gi, "【On Summon】")
    .replace(/Enchantment[:：]\s*/g, "【Permanent】")
    .replace(/Permanent[:：]\s*/g, "【Permanent】")
    .replace(/Aura[:：]\s*/g, "【Passive】")
    .replace(/Passive[:：]\s*/g, "【Passive】");
  if (twoSidedDestroy(c)) s = mark(s.replace(/enemy (monsters?)/g, "$1"), " (either side)");
  if ((c.act === "destroyTrap" && (c.val ?? 1) < 99) || c.onSummon === "breaktrap")
    s = mark(s.replace(/enemy (set traps?)/g, "$1"), " (either side)");
  if (c.act === "destroyEnch") s = mark(s.replace(/enemy (enchantments?)/g, "$1"), " (either side)");
  if (c.id === "DIVINE") s = s.replace("Choose and destroy 3 of the opponent's cards (monsters, set traps, enchantments)", "Choose and destroy 3 cards (either side; monsters, set traps, enchantments)");
  if (c.id === "BLOOD2") s = s.replace("Choose and destroy 2 of your opponent's enchantments or set traps", "Choose and destroy 2 enchantments/set traps (either side)");
  if (c.t === "trap" && c.react) {
    if (c.react === "nullspell") s = "【On Enemy Spell】" + s;
    else if (c.react === "pitfall") s = "【On Enemy Summon】" + s;
    else if (!hasTag(s)) s = "【When Attacked】" + s.replace(/^When attacked[:,]?\s*/i, "");
  }
  if (c.ench) {
    s = s.replace(/^For (\d+) turns?,?\s*/i, "【Lasts $1 Turns】")
      .replace(/^For your next (\d+) turns?,?\s*/i, "【Lasts $1 Turns】");
    const lim = ENCH_TURN_LIMITS[c.ench];
    if (lim) s = s.replace(/^【Permanent】/, `【Lasts ${lim} Turns】`);
    if (!hasTag(s)) s = "【Permanent】" + s;
  }
  if (c.turnFx && !hasTag(s)) {
    s = s.replace(/^At the start of (each|your) turn[:,]?\s*/i, "").replace(/^Each turn,?\s*/i, "");
    s = "【Each Turn】" + s;
  }
  if ((c.aura || c.condAtk) && !hasTag(s)  && !c.hatchTurns) {
    s = s.replace(/^While (on the field|this card is on the field)[:,]?\s*/i, "")
      .replace(/^While this card is on the field,?\s*/i, "");
    s = "【Passive】" + s;
  }
  s = s.replace(/】[:：]\s*/g, "】");
  if (c.summonReq) s = s.split(" · ").map((seg) => (/Summonable|to summon\b|Requires/.test(seg) && !seg.startsWith("【") ? "【Requires】" + seg.replace(/^Requires\s+/, "") : seg)).join(" · ");
  return s;
}

/** 전 카드의 text/textJa/textEn을 표준 표기로 변환 (applyEnglish 이후 1회 실행) */
export function standardizeCardTexts(pools: Array<Record<string, CardDef>>): void {
  for (const pool of pools) {
    for (const id of Object.keys(pool)) {
      const c = pool[id];
      const ov = OVERRIDE[id];
      const ko0 = c.text; // EN 폴백(=한국어 원문) 감지용
      if (c.text && c.text !== "—") c.text = ov?.ko ?? stdKo(c, c.text);
      if (c.textJa && c.textJa !== "—") c.textJa = ov?.ja ?? stdJa(c, c.textJa);
      if (c.textEn && c.textEn !== "—") c.textEn = c.textEn === ko0 ? c.text : ov?.en ?? stdEn(c, c.textEn);
    }
  }
}
