/** Public presentation timing only. Never contains cards, seeds or random decisions. */
export const OPENING_TOSS_MS = 7000;
export const OPENING_DOCK_MS = OPENING_TOSS_MS - 700;
export const OPENING_REVEAL_MS = OPENING_TOSS_MS + 1500;
export const OPENING_DEAL_MS = OPENING_REVEAL_MS + 600;
export const DUEL_OPENING_MS = OPENING_DEAL_MS + 1350;
export const OPENING_PREPARE_MS = 8000;
export const OPENING_LEAD_MS = 350;
export type OpeningPhase = 'prepare' | 'faceoff' | 'dock' | 'toss' | 'reveal' | 'deal' | 'ready';
export function openingPhase(ms: number): OpeningPhase {
  if (ms < 0) return 'prepare';
  if (ms < OPENING_DOCK_MS) return 'faceoff';
  if (ms < OPENING_TOSS_MS) return 'dock';
  if (ms < OPENING_REVEAL_MS) return 'toss';
  if (ms < OPENING_DEAL_MS) return 'reveal';
  if (ms < DUEL_OPENING_MS) return 'deal';
  return 'ready';
}
