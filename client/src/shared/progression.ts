/** Shared progression rules. Awards are settled by the server. */
export const MAX_LEVEL = 50;
export const EXP_PER_LEVEL = 100;
export const MAX_EXP = (MAX_LEVEL - 1) * EXP_PER_LEVEL;
export const BOT_FIRST_CLEAR_EXP = { easy: 20, normal: 35, hard: 60, hell: 120 } as const;
export type ClearDifficulty = keyof typeof BOT_FIRST_CLEAR_EXP;
export const ONLINE_WIN_EXP = 20;
export const ONLINE_LOSS_EXP = 5;
export const LEVEL_MILESTONES: Record<number, number> = {10:300,20:500,30:700,40:1000,50:3000};
export function levelReward(level: number): number {
  return Number.isInteger(level) && level >= 2 && level <= MAX_LEVEL ? LEVEL_MILESTONES[level] ?? 100 : 0;
}
export function seekerLevel(exp = 0) {
  const total = Math.min(MAX_EXP, Math.max(0, Number.isFinite(exp) ? Math.floor(exp) : 0));
  const level = 1 + Math.floor(total / EXP_PER_LEVEL);
  return {level, total, progress: level === MAX_LEVEL ? 0 : total % EXP_PER_LEVEL, required: EXP_PER_LEVEL, max: level === MAX_LEVEL};
}
export interface ExperienceReceipt {
  key: string;
  before: number;
  after: number;
  shards: number;
}
