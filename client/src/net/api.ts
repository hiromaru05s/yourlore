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
}

export interface ApiError extends Error { needVerify?: boolean }

async function call<T>(path: string, body?: unknown, method = "POST"): Promise<T> {
  const res = await fetch("/api" + path, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; needVerify?: boolean } & T;
  if (!res.ok) {
    const err = new Error(data?.error || `요청 실패 (${res.status})`) as ApiError;
    err.needVerify = !!data?.needVerify;
    throw err;
  }
  return data;
}

export interface RankInfo {
  season: string; mmr: number; wins: number; losses: number; peak_mmr: number;
  rank: number; tier: string; // iron..master | gm
}
export interface LbEntry { rank: number; display: string; mmr: number; wins: number; losses: number; tier: string; }

function acquisition(): { ref?: string; source?: string } {
  try {
    return { ref: localStorage.getItem("lore_ref") ?? undefined, source: localStorage.getItem("lore_src") ?? undefined };
  } catch { return {}; }
}

export const api = {
  // register: {user} (즉시 입장) 또는 {needVerify:true} (인증 메일 발송됨)
  register: (email: string, password: string) => call<{ user?: User; needVerify?: boolean }>("/auth/register", { email, password, ...acquisition() }),
  login: (email: string, password: string) => call<{ user: User }>("/auth/login", { email, password }).then((r) => r.user),
  logout: () => call<{ ok: true }>("/auth/logout", {}),
  resendVerify: (email: string) => call<{ ok: true }>("/auth/resend-verify", { email }),
  forgot: (email: string) => call<{ ok: true }>("/auth/forgot", { email }),
  resetPassword: (token: string, password: string) => call<{ ok: true }>("/auth/reset", { token, password }),
  me: () => call<{ user: User | null }>("/auth/me", undefined, "GET").then((r) => r.user).catch(() => null),
  rankMe: () => call<{ rating: RankInfo | null }>("/rank/me", undefined, "GET").then((r) => r.rating).catch(() => null),
  trackBot: (won: boolean) => call<{ ok: boolean }>("/track/bot", { won }).catch(() => null),
  inviteMe: () => call<{ code: string; limit: number; invites: { status: string; created_at: number; display: string }[] }>("/invite/me", undefined, "GET"),
  /** Google OAuth entry URL (carries invite ref + utm source, and an optional same-origin return path). */
  googleUrl: (returnTo?: string): string => {
    const a = acquisition();
    const q = new URLSearchParams();
    if (a.ref) q.set("ref", a.ref);
    if (a.source) q.set("source", a.source);
    if (returnTo && /^\/[^/]/.test(returnTo)) q.set("return", returnTo);
    const s = q.toString();
    return "/api/auth/google" + (s ? `?${s}` : "");
  },
  leaderboard: (season?: string) =>
    call<{ season: string; entries: LbEntry[] }>(`/rank/leaderboard${season ? `?season=${season}` : ""}`, undefined, "GET"),
  rankHistory: () => call<{ seasons: (RankInfo & { season: string })[] }>("/rank/history", undefined, "GET").then((r) => r.seasons).catch(() => []),
};
