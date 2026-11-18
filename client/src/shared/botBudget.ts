import type { Action, GameState, ReduceResult } from './types';
import { reduce } from './engine';

// Count hypothetical transitions, not wall time: a slower device should reach
// the same completed comparison. The browser still has its final time guard.
export const THINKING_NODES = { easy: 1800, normal: 10000, hard: 18000, hell: 18000 };
const exhausted = Symbol('bot-thinking-budget');
let remaining: number | undefined;
export function withThinkingBudget<T>(nodes: number, work: () => T, completed: () => T): T {
  const previous = remaining;
  remaining = nodes;
  try { return work(); }
  catch (error) { if (error === exhausted) return completed(); throw error; }
  finally { remaining = previous; }
}
export function searchReduce(state: GameState, action: Action): ReduceResult {
  if (remaining !== undefined && remaining-- <= 0) throw exhausted;
  return reduce(state, action);
}
