// ============================================================
// LORE — presence heartbeat. Posts the player's current state
// (menu / queue / online / bot) every ~20s so the admin dashboard
// can count live players in real time. Bot games have no server
// connection at all, so this client heartbeat is the only way to
// see "in a bot game" — same path covers online games and lobby.
// ============================================================
export type PresenceState = "menu" | "queue" | "online" | "bot";

let current: PresenceState = "menu";
let timer: ReturnType<typeof setInterval> | null = null;

async function beat(): Promise<void> {
  try {
    await fetch("/api/presence", {
      method: "POST", credentials: "include", keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: current }),
    });
  } catch { /* offline / logged out — ignore */ }
}

/** Update the state and beat immediately (called on every screen change). */
export function setPresence(state: PresenceState): void {
  current = state;
  void beat();
  if (!timer) timer = setInterval(() => void beat(), 20_000);
}

export function stopPresence(): void {
  if (timer) { clearInterval(timer); timer = null; }
}
