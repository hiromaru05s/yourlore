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
  avatar?: string | null; // preset avatar (card id)
  badge?: string | null;  // equipped badge key
  sleeve?: string | null; // equipped card sleeve id ('default' when none)
}

export interface ClaimResult {
  granted: boolean; // false = already claimed before (no credits added)
  amount: number;
  credits: number; // fresh balance
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
  trackBot: (won: boolean | null) => call<{ ok: boolean }>("/track/bot", { won: won === true, draw: won === null }).catch(() => null),
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
  // credit rewards (server-authoritative amounts; key e.g. "tut:1")
  claimReward: (key: string) => call<ClaimResult>("/rewards/claim", { key }),
  claimedRewards: () => call<{ keys: string[]; credits: number }>("/rewards/claimed", undefined, "GET").catch(() => ({ keys: [] as string[], credits: 0 })),
  redeemCoupon: (code: string) => call<ClaimResult>("/rewards/coupon", { code }),
  // ---- social: profile / friends / challenges ----
  profile: (id?: string) => call<{ profile: Profile }>(`/social/profile${id ? `?id=${encodeURIComponent(id)}` : ""}`, undefined, "GET").then((r) => r.profile),
  updateMe: (patch: { display?: string; avatar?: string; badge?: string; stats_public?: boolean; sleeve?: string }) =>
    call<{ ok: true; display: string; avatar: string | null; badge: string | null; stats_public: boolean; sleeve: string }>("/social/me", patch),
  buySleeve: (id: string) => call<{ ok: true; credits: number; sleeves: string[] }>("/social/buy-sleeve", { id }),
  friends: () => call<FriendsData>("/social/friends", undefined, "GET"),
  friendRequest: (q: string) => call<{ ok: true; display: string }>("/social/friends/request", { q }),
  friendRespond: (user_id: string, accept: boolean) => call<{ ok: true }>("/social/friends/respond", { user_id, accept }),
  friendRemove: (user_id: string) => call<{ ok: true }>("/social/friends/remove", { user_id }),
  challenge: (user_id: string) => call<{ id: string }>("/social/challenge", { user_id }),
  challengeCancel: (id: string) => call<{ ok: true }>("/social/challenge/cancel", { id }).catch(() => null),
  challengeRespond: (id: string, accept: boolean) =>
    call<{ ok: true; roomId?: string; you?: 0 | 1; oppName?: string }>("/social/challenge/respond", { id, accept }),
  challengePoll: (id: string) =>
    call<{ status: string; roomId?: string; you?: 0 | 1; oppName?: string }>(`/social/challenge/poll?id=${encodeURIComponent(id)}`, undefined, "GET"),
};

export interface Profile {
  id: string; display: string; avatar: string | null; badge: string | null; created_at: number; self: boolean;
  private?: boolean;
  stats_public?: boolean;
  wins?: number; losses?: number;
  tier?: string | null; mmr?: number | null; rank?: number | null;
  recent?: { mode: string; result: "win" | "loss" | "draw"; opp: string; turns: number | null; at: number }[];
  badges?: string[]; // owned badge keys (self only)
  credits?: number;  // self only
  sleeve?: string;   // equipped sleeve id (self only)
  sleeves?: string[]; // owned sleeve ids incl. 'default' (self only)
  // per-mode W/L aggregates for the record filter (self only)
  byMode?: { ranked: { w: number; l: number }; online: { w: number; l: number }; bot: { w: number; l: number } };
  // head-to-head vs opponents faced 2+ times (self only), most-played first
  h2h?: { oppId: string; oppName: string; wins: number; losses: number; games: number }[];
}

export interface FriendEntry { id: string; display: string; avatar: string | null; badge: string | null; online: boolean; state: string | null; }
export interface FriendsData {
  friends: FriendEntry[];
  incoming: FriendEntry[];
  outgoing: FriendEntry[];
  challenges: { id: string; from: string; fromId: string; at: number }[];
}
