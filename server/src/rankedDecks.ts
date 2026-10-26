import type { Env } from './env';
import { DEFAULT_DECK_8, sanitizeDeck } from '../../client/src/shared/cards';

/** PlayerRef.deck is a frozen queue snapshot, never the user's current editor. */
export async function recordRankedDecks(env: Env, players: {id:string;deck?:string|null}[], endedAt:number, matchId?:string): Promise<void> {
  const statements = players.flatMap(player => {
    // Canonical multiset: ordering is irrelevant, duplicate card counts are preserved.
    const cards = JSON.stringify(sanitizeDeck(player.deck ? player.deck.split(',') : DEFAULT_DECK_8).sort());
    return [
      ...(matchId ? [env.DB.prepare(`INSERT OR IGNORE INTO ranked_match_decks(match_id,user_id,cards) VALUES (?,?,?)`).bind(matchId,player.id,cards)] : []),
      env.DB.prepare(`INSERT INTO ranked_recent_decks(user_id,cards,last_used_at) VALUES (?,?,?)
        ON CONFLICT(user_id,cards) DO UPDATE SET last_used_at=MAX(last_used_at,excluded.last_used_at)`)
        .bind(player.id,cards,endedAt),
      env.DB.prepare(`DELETE FROM ranked_recent_decks WHERE user_id=? AND cards NOT IN (
        SELECT cards FROM ranked_recent_decks WHERE user_id=? ORDER BY last_used_at DESC,cards ASC LIMIT 3)`)
        .bind(player.id,player.id),
    ];
  });
  await env.DB.batch(statements);
}
