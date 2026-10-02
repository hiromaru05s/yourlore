/** Public presentation timing only. Never contains cards, seeds or random decisions. */
export const OPENING_VERSION = 2;
export const OPENING_DOCK_MS = 1360;
export const OPENING_TOSS_MS = 1460;
export const OPENING_REVEAL_MS = 3220;
export const OPENING_EXIT_MS = 5120;
export const OPENING_VISUAL_MS = 5580;
export const OPENING_DEAL_MS = OPENING_VISUAL_MS;
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
