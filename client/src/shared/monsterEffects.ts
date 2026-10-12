import type { FieldMon, GameEvent, GameState, PlayerState } from './types';

/** A resolution boundary, not an action/turn-wide deduplication key. */
export function monsterActivation(g: GameState, events: GameEvent[], owner: PlayerState, source: FieldMon, at = events.length): void {
  // Counter damage can remove the attacker before its post-attack effect
  // resolves. Present that source while its old-board card still exists.
  const removedAt = owner.field.some(m => m.uid === source.uid) ? -1
    : events.findIndex(e => e.type === 'destroy' && e.uid === source.uid);
  const index = removedAt < 0 ? at : Math.min(at, removedAt);
  events.splice(index, 0, { type: 'monsterActivate', player: g.players[0] === owner ? 0 : 1, uid: source.uid });
}

/** Only resolved game consequences count. Logs, RNG bookkeeping and the
 * once-per-game attempt marker are deliberately not evidence of an effect.
 * Capture before resolution so the cause can precede its result in playback.
 * Used for summon/upkeep bodies with many direct state writes; individual
 * reaction hooks emit at their own successful branch instead.
 */
export function observeMonsterEffect(g: GameState, events: GameEvent[], owner: PlayerState, source: FieldMon, maxManaLimit: number): () => void {
  const at = events.length;
  const consequences = () => JSON.stringify({
    players: g.players.map(({ onceUsed: _attempts, ...p }) => ({ ...p, maxMana: Math.min(p.maxMana, maxManaLimit), removed: p.removed ?? [] })),
    pending: g.pending,
    choices: g.expansionChoices ?? [],
  });
  const before = consequences();
  return () => {
    const effects = events.slice(at);
    const attempted = effects.some(e => e.type === 'dice' || e.type === 'needTarget');
    if (!attempted && before === consequences()) return;
    // A self-reaction (e.g. Priest gaining its own Shield) shares the source.
    // Move that cue to the beginning instead of playing the same card twice.
    const existing = events.findIndex((e, i) => i >= at && e.type === 'monsterActivate' && e.uid === source.uid);
    if (existing >= 0) events.splice(existing, 1);
    monsterActivation(g, events, owner, source, at);
  };
}
