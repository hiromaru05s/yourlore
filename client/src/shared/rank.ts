// Single source of truth for ladder rules and wire result.
export const TIERS = [
  { key: "iron", min: 0 },
  { key: "bronze", min: 1030 },
  { key: "silver", min: 1090 },
  { key: "gold", min: 1150 },
  { key: "platinum", min: 1250 },
  { key: "diamond", min: 1400 },
  { key: "master", min: 1550 },
] as const;
export type TierKey = (typeof TIERS)[number]["key"] | "gm";

export const START_MMR = 1000;
const K = 32;
export const GM_TOP = 25;        // top N Masters = Grandmaster
const MASTER_MIN = 1550;

export function tierOf(mmr: number): TierKey {
  let t: TierKey = "iron";
  for (const x of TIERS) if (mmr >= x.min) t = x.key;
  return t;
}
/** Final tier incl. GM: rank is the player's position on that season's ladder (1-based). */
export function tierWithGm(mmr: number, rank: number): TierKey {
  const base = tierOf(mmr);
  return base === "master" && rank <= GM_TOP && mmr >= MASTER_MIN ? "gm" : base;
}


/** Pure provisional rules: preserve the existing ladder thresholds and monthly reset. */
export function calculateRating(a: number, b: number, score: 0 | 0.5 | 1): [number, number] {
  const expected = 1 / (1 + Math.pow(10, (b - a) / 400));
  const delta = score === 0.5 ? Math.round(K * (score - expected)) : score === 1 ? Math.max(1, Math.round(K * (1 - expected))) : -Math.max(1, Math.round(K * expected));
  return [Math.max(0, a + delta + (score === 1 ? 2 : 0)), Math.max(0, b - delta + (score === 0 ? 2 : 0))];
}

export interface RankChange {
  before: number;
  after: number;
  matchId?: string;
  season?: string;
  tierBefore?: TierKey;
  tierAfter?: TierKey;
  rankBefore?: number;
  rankAfter?: number;
}
