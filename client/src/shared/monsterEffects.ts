import type { FieldMon, GameEvent, GameState, PlayerState } from './types';

let presenting = true;
// When a Devil is present, remember explicit activations in simulations too.
// Nested summon/upkeep observations may describe the same source effect.
const activationCounts = new WeakMap<GameEvent[],Map<string,number>>();

/** Synchronous search only. Restore on nested calls and exceptions so the real
 * reducer keeps its complete presentation events after a bot decision. */
export function withoutMonsterPresentation<T>(work: () => T): T {
  const before = presenting;
  presenting = false;
  try { return work(); } finally { presenting = before; }
}

/** A resolution boundary, not an action/turn-wide deduplication key. */
export function monsterActivation(g: GameState, events: GameEvent[], owner: PlayerState, source: FieldMon, at = events.length, leavingField = false): void {
  if (leavingField || owner.field.includes(source) || events.some(e=>e.type==='destroy' && e.uid===source.uid)) {
    let reacted=false;
    for(const player of g.players) for(const devil of player.field) {
      if(devil.id!=='DEVIL_TOKEN' || devil.mutedEffects) continue;
      devil.atkMod=(devil.atkMod??0)+1;devil.defMod=(devil.defMod??0)+1;
      reacted=true;
    }
    if (reacted) {
      const counts=activationCounts.get(events)??new Map<string,number>();
      counts.set(source.uid,(counts.get(source.uid)??0)+1);
      activationCounts.set(events,counts);
    }
  }
  if (!presenting) return;
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
  if (!presenting && !g.players.some(p=>p.field.some(m=>m.id==='DEVIL_TOKEN'))) return () => {};
  const at = events.length;
  const consequences = () => JSON.stringify({
    players: g.players.map(({ onceUsed: _attempts, ...p }) => ({ ...p, maxMana: Math.min(p.maxMana, maxManaLimit), removed: p.removed ?? [] })),
    pending: g.pending,
    choices: g.expansionChoices ?? [],
  });
  const before = consequences();
  const priorCount=activationCounts.get(events)?.get(source.uid)??0;
  return () => {
    const effects = events.slice(at);
    const attempted = effects.some(e => e.type === 'dice' || e.type === 'needTarget');
    if (!attempted && before === consequences()) return;
    // A self-reaction (e.g. Priest gaining its own Shield) shares the source.
    // Move that cue to the beginning instead of playing the same card twice.
    const existing = events.findIndex((e, i) => i >= at && e.type === 'monsterActivate' && e.uid === source.uid);
    if (existing >= 0) {
      // Move the recorded activation without triggering reactive monsters twice.
      const [activation]=events.splice(existing,1);events.splice(at,0,activation);
    } else if ((activationCounts.get(events)?.get(source.uid)??0)===priorCount) monsterActivation(g, events, owner, source, at);
  };
}
