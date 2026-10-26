// One heartbeat per 20 seconds; state changes are sent as soon as the active
// request finishes. Menu-to-menu navigation does not create extra DB writes.
export type PresenceState = "menu" | "queue" | "online" | "bot";
let current: PresenceState = "menu";
let timer: ReturnType<typeof setInterval> | null = null;
let flight: AbortController | null = null;

async function beat(): Promise<void> {
  if (flight || !timer) return;
  const state = current, controller = new AbortController();
  flight = controller;
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    await fetch("/api/presence", {
      method: "POST", credentials: "include", signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state }),
    });
  } catch { /* Next heartbeat retries transient failures. */ }
  finally {
    clearTimeout(timeout);
    if (flight === controller) {
      flight = null;
      if (timer && state !== current) void beat();
    }
  }
}

export function setPresence(state: PresenceState): void {
  const changed = current !== state;
  current = state;
  if (!timer) {
    timer = setInterval(() => void beat(), 20000);
    void beat();
  } else if (changed) void beat();
}

export function stopPresence(): void {
  if (timer) clearInterval(timer);
  timer = null;
  const pending = flight;
  flight = null;
  pending?.abort();
}
