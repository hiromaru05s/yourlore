// ============================================================
// LORE — auth/API client. Talks to the Worker over /api/*.
// Sessions are cookie-based (credentials: include).
// ============================================================
export interface User {
  id: string;
  email: string;
  display: string;
  wins: number;
  losses: number;
  credits: number;
}

export interface ClaimResult {
  granted: boolean; // false = already claimed before (no credits added)
  amount: number;
  credits: number; // fresh balance
}

async function call<T>(path: string, body?: unknown, method = "POST"): Promise<T> {
  const res = await fetch("/api" + path, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) throw new Error(data?.error || `요청 실패 (${res.status})`);
  return data;
}

export interface RankInfo {
  season: string; mmr: number; wins: number; losses: number; peak_mmr: number;
  rank: number; tier: string; // iron..master | gm
}
export interface LbEntry { rank: number; display: string; mmr: number; wins: number; losses: number; tier: string; }

export const api = {
  register: (email: string, password: string) => call<{ user: User }>("/auth/register", { email, password }).then((r) => r.user),
  login: (email: string, password: string) => call<{ user: User }>("/auth/login", { email, password }).then((r) => r.user),
  logout: () => call<{ ok: true }>("/auth/logout", {}),
  me: () => call<{ user: User | null }>("/auth/me", undefined, "GET").then((r) => r.user).catch(() => null),
  rankMe: () => call<{ rating: RankInfo | null }>("/rank/me", undefined, "GET").then((r) => r.rating).catch(() => null),
  leaderboard: (season?: string) =>
    call<{ season: string; entries: LbEntry[] }>(`/rank/leaderboard${season ? `?season=${season}` : ""}`, undefined, "GET"),
  rankHistory: () => call<{ seasons: (RankInfo & { season: string })[] }>("/rank/history", undefined, "GET").then((r) => r.seasons).catch(() => []),
  // credit rewards (server-authoritative amounts; key e.g. "tut:1")
  claimReward: (key: string) => call<ClaimResult>("/rewards/claim", { key }),
  claimedRewards: () => call<{ keys: string[]; credits: number }>("/rewards/claimed", undefined, "GET").catch(() => ({ keys: [] as string[], credits: 0 })),
};
