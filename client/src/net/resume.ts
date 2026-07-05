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

export interface ActiveGame { roomId: string; you: Side; ts: number; }

export function saveActiveGame(roomId: string, you: Side): void {
  try { localStorage.setItem(KEY, JSON.stringify({ roomId, you, ts: Date.now() })); } catch { /* private mode */ }
}

export function clearActiveGame(): void {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
}

/** The stored in-progress game if recent enough to rejoin, else null (stale ones are cleared). */
export function loadActiveGame(): ActiveGame | null {
  try {
    const s = localStorage.getItem(KEY);
    if (!s) return null;
    const g = JSON.parse(s) as ActiveGame;
    if (!g?.roomId || Date.now() - g.ts >= WINDOW_MS) { clearActiveGame(); return null; }
    return g;
  } catch { return null; }
}
