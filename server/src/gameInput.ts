import type { Action, GameState, ReduceResult } from '../../client/src/shared/types';
import type { GameClientMsg } from '../../client/src/shared/protocol';
import { effectChoices, reduce } from '../../client/src/shared/engine';

const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const index = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const uid = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 128;
function isAction(v: unknown): v is Action {
  if (!object(v)) return false;
  switch (v.type) {
    case 'play': return index(v.idx) && (v.sourceUid === undefined || uid(v.sourceUid)) && (v.targets === undefined || Array.isArray(v.targets) && v.targets.length <= 32 && v.targets.every(uid));
    case 'buyMarket': case 'buySupply': return index(v.i);
    case 'attack': return uid(v.uid);
    case 'pick': case 'chooseTarget': return v.uid === null || uid(v.uid);
    case 'reorder': return index(v.from) && index(v.to);
    case 'surrender': return v.player === 0 || v.player === 1;
    case 'refresh': case 'endTurn': return true;
    default: return false;
  }
}
export function isClientMessage(v: unknown): v is GameClientMsg {
  if (!object(v)) return false;
  switch (v.type) {
    case 'action': return isAction(v.action);
    case 'ready': return v.openingVersion === undefined || v.openingVersion === 1 || v.openingVersion === 2;
    case 'openingReady': case 'startReady': case 'ping': return true;
    default: return false;
  }
}

/** Deterministic timeout policy: decline optional effects, resolve mandatory
 * targets through the real reducer, and preserve endTurn's hand-cap fallback.
 * No bot strategy or hidden-information heuristic chooses for a timed-out player.
 */
export function resolveTurnTimeout(game: GameState): ReduceResult {
  let state = game;
  const events: ReduceResult['events'] = [];
  for (let step = 0; step < 64 && state.pending && !state.over; step++) {
    const pending = state.pending;
    if (pending.reason === 'handCap') break;
    const p = state.players[state.cur], o = state.players[1 - state.cur];
    let choices: (string | null)[];
    if (pending.kind === 'cardChoice') choices = effectChoices(state).map(c => c.uid);
    else {
      const pool = [...o.field, ...p.field, ...p.hand, ...p.deck, ...p.discard,
        ...(o.removed ?? []), ...p.enchants.map(e => e.card), ...o.enchants.map(e => e.card),
        ...p.traps.map(t => t.card), ...o.traps.map(t => t.card)];
      choices = [...(Array.isArray(pending.data?.ids) ? pending.data.ids as string[] : []), ...pool.map(c => c.uid)];
    }
    // null also keeps a fate-wheel outcome and declines optional resource spend.
    choices = [null, ...choices];
    let progressed = false;
    for (const target of choices) {
      const result = reduce(state, { type: 'pick', uid: target });
      if (JSON.stringify(result.state.pending) === JSON.stringify(pending)) continue;
      state = result.state; events.push(...result.events); progressed = true; break;
    }
    if (!progressed) break;
  }
  if (state.pending && state.pending.reason !== 'handCap' && !state.over) {
    // Empty/legacy invalid target sets must not freeze the opponent indefinitely.
    state = structuredClone(state); state.pending = null;
    events.push({type:'log',html:'시간 초과 — 미해결 선택 종료',htmlJa:'時間切れ — 未解決の選択を終了'});
  }
  if (!state.over) { const result = reduce(state, { type: 'endTurn' }); state = result.state; events.push(...result.events); }
  return {state, events};
}
