// ============================================================
// LORE — tier presentation (labels + colors) shared by home,
// leaderboard, and anywhere a tier badge is shown.
// ============================================================
import "../styles/rank.css";
import { rankEmblem } from "./rankEmblem";
import { TIERS } from "../shared/rank";
export { tierOf } from "../shared/rank";
import { getLang } from "../i18n";

export const TIER_META: Record<string, { ko: string; ja: string; en: string; color: string }> = {
  iron:     { ko: "아이언",       ja: "アイアン",       en: "Iron",        color: "#8a8f98" },
  bronze:   { ko: "브론즈",       ja: "ブロンズ",       en: "Bronze",      color: "#c08650" },
  silver:   { ko: "실버",         ja: "シルバー",       en: "Silver",      color: "#b9c6d8" },
  gold:     { ko: "골드",         ja: "ゴールド",       en: "Gold",        color: "#e8c25a" },
  platinum: { ko: "플래티넘",     ja: "プラチナ",       en: "Platinum",    color: "#7fd6c2" },
  diamond:  { ko: "다이아몬드",   ja: "ダイヤモンド",   en: "Diamond",     color: "#7fb8f0" },
  master:   { ko: "마스터",       ja: "マスター",       en: "Master",      color: "#c77ff0" },
  gm:       { ko: "그랜드마스터", ja: "グランドマスター", en: "Grandmaster", color: "#ff7a4d" },
};

export function tierLabel(tier: string): string {
  const m = TIER_META[tier] ?? TIER_META.iron;
  const lang = getLang();
  return lang === "ja" ? m.ja : lang === "en" ? m.en : m.ko;
}

/** Small colored tier chip element (used in home + leaderboard). */
export function tierChipHtml(tier: string, mmr?: number): string {
  tier = TIER_META[tier] ? tier : "iron";
  const m = TIER_META[tier];
  const label = tierLabel(tier);
  return `<span class="tier-chip tier-${tier}" style="--tc:${m.color};--rank-metal:${m.color}">${rankEmblem(tier)}${label}${mmr != null ? ` <b>${mmr}</b>` : ""}</span>`;
}

export function rankProgress(mmr: number) {
  const index = Math.max(0, TIERS.reduce((found, t, i) => mmr >= t.min ? i : found, 0));
  const current = TIERS[index], next = TIERS[index + 1];
  return { current, next, fraction: next ? Math.max(0, Math.min(1, (mmr-current.min)/(next.min-current.min))) : 1 };
}
