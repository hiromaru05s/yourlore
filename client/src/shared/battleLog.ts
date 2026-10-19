import type { GameEvent } from './types';

export type BattleLogEvent = Extract<GameEvent, { type: 'log' | 'turnHeader' }>;
/** Only public, committed text belongs in review history. Never persist dice
 * checkpoints, pending choices, private rejection hints or hidden card state. */
export function battleLogEvents(events: GameEvent[]): BattleLogEvent[] {
  return events.filter((e): e is BattleLogEvent => e.type === 'turnHeader' || e.type === 'log' && !e.rejected);
}
