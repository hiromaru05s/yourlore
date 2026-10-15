// ============================================================
// LORE — resume an in-progress online/ranked game after a crash,
// tab close, or re-entry. We remember the room + side locally; on
// next launch (or when re-entering a lobby) we reconnect to it.
// The GameRoom keeps state through a forfeit grace window, so a
// quick return resumes the live game; a later return just replays
// the final result and then clears itself.
// ============================================================
import type { Side } from "../shared/types";

const KEY = "lore_game";
const WINDOW_MS = 10 * 60 * 1000; // don't try to rejoin games older than this

export interface ActiveGame { roomId: string; you: Side; ts: number; ranked?: boolean; userId?: string; }

export function saveActiveGame(roomId: string, you: Side, ranked = false, userId?: string): void {
  try { localStorage.setItem(KEY, JSON.stringify({ roomId, you, ranked, userId, ts: Date.now() })); } catch { /* private mode */ }
}

export function clearActiveGame(): void {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
}

/** Refresh the record's timestamp while the game is LIVE. Without this, `ts`
 *  was stamped once at match start, so any game running past WINDOW_MS lost its
 *  crash/refresh rejoin — loadActiveGame would judge it stale and delete it. */
export function touchActiveGame(): void {
  try {
    const s = localStorage.getItem(KEY);
    if (!s) return;
    const g = JSON.parse(s) as ActiveGame;
    if (!g?.roomId) return;
    g.ts = Date.now();
    localStorage.setItem(KEY, JSON.stringify(g));
  } catch { /* private mode */ }
}

/** The stored in-progress game if recent enough to rejoin, else null (stale ones are cleared). */
export function loadActiveGame(userId?: string): ActiveGame | null {
  try {
    const s = localStorage.getItem(KEY);
    if (!s) return null;
    const g = JSON.parse(s) as ActiveGame;
    if (!g || typeof g.roomId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(g.roomId)
      || (g.you !== 0 && g.you !== 1) || !Number.isFinite(g.ts)
      || g.ts > Date.now() || Date.now() - g.ts >= WINDOW_MS
      || (g.ranked !== undefined && typeof g.ranked !== 'boolean')
      || (g.userId !== undefined && (typeof g.userId !== 'string' || (userId !== undefined && g.userId !== userId)))) {
      clearActiveGame(); return null;
    }
    return g;
  } catch { clearActiveGame(); return null; }
}
