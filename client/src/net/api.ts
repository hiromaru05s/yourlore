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

export const api = {
  register: (email: string, password: string) => call<{ user: User }>("/auth/register", { email, password }).then((r) => r.user),
  login: (email: string, password: string) => call<{ user: User }>("/auth/login", { email, password }).then((r) => r.user),
  logout: () => call<{ ok: true }>("/auth/logout", {}),
  me: () => call<{ user: User | null }>("/auth/me", undefined, "GET").then((r) => r.user).catch(() => null),
};
