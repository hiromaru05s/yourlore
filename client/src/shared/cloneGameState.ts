import type { GameState } from './types';

/** Game states are plain data. Copy objects/arrays while reusing immutable primitives
 * (notably the multilingual card text) instead of serializing them on every search node.
 * Preserve aliases/cycles like structuredClone; never share mutable nested card fields.
 */
export function cloneGameState(state: GameState): GameState {
  const seen = new Map<object, unknown>();
  const copy = (value: unknown): unknown => {
    if (value === null || typeof value !== 'object') return value;
    if (seen.has(value)) return seen.get(value);
    const proto = Object.getPrototypeOf(value);
    if (!Array.isArray(value) && proto !== Object.prototype && proto !== null) return structuredClone(value);
    const out: Record<string, unknown> | unknown[] = Array.isArray(value) ? value.slice() : { ...value };
    seen.set(value, out);
    for (const key of Object.keys(value)) {
      const child = (value as Record<string, unknown>)[key];
      if (child !== null && typeof child === 'object') (out as Record<string, unknown>)[key] = copy(child);
    }
    return out;
  };
  return copy(state) as GameState;
}
