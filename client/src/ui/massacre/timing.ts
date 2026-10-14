export const COST = 520,
  IMPACT = 1790,
  END = 3100;
export const phase = (t: number, a: number, b: number) =>
  Math.max(0, Math.min(1, (t - a) / (b - a)));
export const ease = (t: number) => t * t * (3 - 2 * t);
