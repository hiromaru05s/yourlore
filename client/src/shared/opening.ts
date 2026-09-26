/** Public presentation timing only. Never contains cards, seeds or random decisions. */
export const DUEL_OPENING_MS = 5800;
export const OPENING_PREPARE_MS = 8000;
export const OPENING_LEAD_MS = 350;
export type OpeningPhase = 'prepare' | 'faceoff' | 'dock' | 'toss' | 'reveal' | 'deal' | 'ready';
export function openingPhase(ms: number): OpeningPhase {
  if (ms < 0) return 'prepare';
  if (ms < 1650) return 'faceoff';
  if (ms < 2350) return 'dock';
  if (ms < 3850) return 'toss';
  if (ms < 4450) return 'reveal';
  if (ms < DUEL_OPENING_MS) return 'deal';
  return 'ready';
}
