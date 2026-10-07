import { BOT_DECKS, candidates, greedyDecide } from '../../client/src/shared/bot';
import { redactFor } from '../../client/src/shared/protocol';
import type { Action, GameState, Side } from '../../client/src/shared/types';
import type { Env } from './env';

/** Explicit environment opt-in. Public query parameters cannot enable test opponents. */
export const matchBotsEnabled = (env: Env): boolean => env.MATCH_TEST_BOTS === '1';
export const MATCH_BOT_WAIT_MS = 8000;
export const MATCH_BOT_ACTION_MS = 1200;
export const MATCH_BOTS = ['Ember','Willow','Slate','Clover','Lumen','Flint','Reed','Onyx','Hazel','Iris'].map((name, i) => ({
  id: `lore-test-bot-${String(i + 1).padStart(2, '0')}`,
  name: `BOT ${String(i + 1).padStart(2, '0')} · ${name}`,
  avatar: i % 2 ? 'SEEKER_BLUE' : 'SEEKER_RED',
  deck: BOT_DECKS[i % BOT_DECKS.length],
}));
export const matchBot = (id: string) => MATCH_BOTS.find(bot => bot.id === id);

/** Real identities let the existing exactly-once rank ledger handle both sides.
 * No passwords or sessions are issued to these server-controlled participants. */
export async function ensureMatchBots(env: Env): Promise<void> {
  if (!matchBotsEnabled(env)) throw new Error('Match test bots disabled');
  await env.DB.batch(MATCH_BOTS.map(bot => env.DB.prepare(
    'INSERT OR IGNORE INTO users (id,email,password,display,created_at,verified,source,avatar,deck) VALUES (?,?,?,?,?,0,?,?,?)',
  ).bind(bot.id, `${bot.id}@bots.invalid`, 'oauth:bot-disabled', bot.name, Date.now(), 'match-test-bot', bot.avatar, bot.deck.cards.join(','))));
}

/** Strategy only sees the same hidden-information boundary as an online player.
 * No lethal search: keep each alarm bounded and never simulate secret hands/RNG. */
export function matchBotActions(game: GameState, side: Side): Action[] {
  const view = redactFor(game, side);
  view.rng = crypto.getRandomValues(new Uint32Array(1))[0];
  const choices: Action[] = [];
  try { choices.push(greedyDecide(view, false)); } catch { /* use legal public candidates below */ }
  try { choices.push(...candidates(view)); } catch { /* optional targets can still be declined */ }
  choices.push({type:'pick',uid:null}, {type:'chooseTarget',uid:null});
  if (view.cur === side) choices.push({type:'endTurn'});
  const seen = new Set<string>();
  return choices.filter(action => { const key = JSON.stringify(action); if (seen.has(key)) return false; seen.add(key); return true; });
}
