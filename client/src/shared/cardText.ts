// Card effects are authored and reviewed in all three languages, never shortened at runtime.
// See docs/card-text-style.md. Do not infer targets, timing or costs from prose.
import type { CardDef } from "./types";
import { CARD_EFFECT_TEXT } from "./cardEffectText";
export { CARD_EFFECT_TEXT } from "./cardEffectText";
export { CARD_EFFECT_HEADINGS } from "./cardEffectHeadings";
export type KeywordNamesOf = (c: CardDef, lang: "ko" | "ja" | "en") => string[];

// The board uses global-turn limits for these two enchantments.
export const ENCH_TURN_LIMITS: Record<string, number> = { spellHeal: 14, ancientCiv: 9 };

/** Only explicit authored paragraph boundaries create sections. */
export function effectSections(text: string): { heading: string; body: string }[] {
  return text.split(/\n\n/).filter(Boolean).map(block => {
    const match = block.match(/^【([^】]+)】([\s\S]*)$/);
    return match ? { heading: match[1], body: match[2].trim() } : { heading: '', body: block.trim() };
  });
}

/** Shared by the renderer and checker; spaces around / distinguish rows from stat pairs. */
export function parseDiceTable(txt: string): { head: string; rows: [string, string][] } | null {
  // " / " (양옆 공백)만 구분자 — 몬스터 스탯의 "10/3"은 구분자가 아니다
  const parts = txt.split(/\s+\/\s+/);
  if (parts.length < 3) return null;
  // "2·3: 효과" / "6~8: 효과" / "①② 효과"(원문자는 콜론 없이도 인정)
  const ROW = /^\s*([0-9\uff10-\uff19]+(?:\s*[\u00b7\u30fb,\u3001~\uff5e-]\s*[0-9\uff10-\uff19]+)*)\s*[:\uff1a]\s*(.+?)\s*$/;
  const ROW_CIRCLE = /^\s*([\u2460-\u2473]+)\s*[:\uff1a]?\s*(.+?)\s*$/;
  let head = "";
  const rows: [string, string][] = [];
  for (let i = 0; i < parts.length; i++) {
    let seg = parts[i];
    if (i === 0) {
      // 첫 조각엔 리드인이 붙을 수 있다: "주사위 2개 합계 — 2·3: …"
      const dash = seg.search(/[\u2014\u2013]/);
      if (dash >= 0) { head = seg.slice(0, dash).trim(); seg = seg.slice(dash + 1).trim(); }
    }
    const r = seg.match(ROW) ?? seg.match(ROW_CIRCLE);
    if (!r) return null;                       // 행이 아닌 조각이 하나라도 있으면 표가 아니다
    rows.push([r[1].replace(/\s+/g, ""), r[2]]);
  }
  return rows.length >= 3 ? { head, rows } : null;
}


/** Applied after legacy localization and balance patches. Missing translations fail loudly. */
export function standardizeCardTexts(pools: Array<Record<string, CardDef>>, _keywordNames?: KeywordNamesOf): void {
  for (const pool of pools) for (const card of Object.values(pool)) {
    const text = CARD_EFFECT_TEXT[card.id];
    if (!text) throw new Error(`Missing reviewed effect text: ${card.id}`);
    card.text = text.ko;
    card.textJa = text.ja;
    card.textEn = text.en;
  }
}
