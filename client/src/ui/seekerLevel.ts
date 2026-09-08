/** Initial progression: five recorded online W/L results per level. No rewards
 * or card access are tied to this cosmetic level. Server W/L is authoritative. */
export function seekerLevel(wins: number, losses: number): { level: number; progress: number; required: number; matches: number } {
  const safe = (n: number) => Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  const matches = safe(wins) + safe(losses);
  return { level: 1 + Math.floor(matches / 5), progress: matches % 5, required: 5, matches };
}
