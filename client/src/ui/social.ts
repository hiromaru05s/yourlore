// ============================================================
// LORE — social presentation helpers: preset avatars (card art)
// and badge metadata. Badge OWNERSHIP is computed server-side;
// this file only knows how to draw them.
// ============================================================
import { DB } from "../shared/cards";
import { cardArtSrc } from "./cardView";
import { TIER_META, tierLabel } from "./tier";
import { getLang } from "../i18n";

// ---- avatars: preset = a card id, art served from the w128 variant ----
// 아바타는 22~74px로만 그려진다. 원본(832x1216, ~165KB)을 쓰면 프로필의 아바타
// 선택기(몬스터 전량)만으로 ~33MB를 받게 된다 — w128(~3KB)이면 ~1MB.
// 축소본이 없을 때만 원본으로 한 번 폴백한다. (cardArtSrc와 규칙을 맞춘다)
export function avatarHtml(avatar: string | null | undefined, display: string, size = 40): string {
  const initial = (display || "?").trim().charAt(0).toUpperCase();
  const img = avatar && /^[A-Za-z0-9_]+$/.test(avatar)
    ? `<img src="${cardArtSrc(avatar, "avatar")}" alt="" loading="lazy" decoding="async"`
      + ` onerror="if(this.dataset.fellBack){this.remove()}else{this.dataset.fellBack='1';this.src='${cardArtSrc(avatar, "full")}'}">`
    : "";
  return `<span class="avatar" style="--avs:${size}px">${img}<span class="avatar-fb">${initial}</span></span>`;
}

/** All monster cards double as avatar presets (they all have art). */
export function avatarPresets(): string[] {
  return Object.values(DB).filter((c) => c.t === "mon").map((c) => c.id);
}

// ---- badges ----
export interface BadgeMeta { icon: string; ko: string; ja: string; en: string; color: string; }

const B = (icon: string, ko: string, ja: string, en: string, color: string): BadgeMeta => ({ icon, ko, ja, en, color });

export const BADGE_META: Record<string, BadgeMeta> = {
  "wins:10":  B("⚔️", "10승 달성", "10勝達成", "10 Wins", "#9aa7b8"),
  "wins:50":  B("🗡️", "50승 달성", "50勝達成", "50 Wins", "#c08650"),
  "wins:200": B("🏵️", "200승 달성", "200勝達成", "200 Wins", "#e8c25a"),
  "tutorial": B("🎓", "튜토리얼 완주", "チュートリアル完走", "Tutorial Graduate", "#7fd6c2"),
  "invite":   B("🎁", "친구 초대 성공", "友達招待成功", "Recruiter", "#f0a87f"),
};
// tier badges reuse the ladder colors (bronze..gm; iron has no badge)
for (const key of ["bronze", "silver", "gold", "platinum", "diamond", "master", "gm"]) {
  const m = TIER_META[key];
  BADGE_META[`tier:${key}`] = B("🏆", `${m.ko} 도달`, `${m.ja}到達`, `${m.en} Reached`, m.color);
}

export function badgeLabel(key: string): string {
  const m = BADGE_META[key];
  if (!m) return key;
  const lang = getLang();
  return lang === "ja" ? m.ja : lang === "en" ? m.en : m.ko;
}

export function badgeChipHtml(key: string | null | undefined, small = false): string {
  if (!key) return "";
  const m = BADGE_META[key];
  if (!m) return "";
  return `<span class="badge-chip${small ? " badge-sm" : ""}" style="--bc:${m.color}">${m.icon} ${badgeLabel(key)}</span>`;
}

export { tierLabel };
