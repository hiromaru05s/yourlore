// ============================================================
// LORE server — email+password auth on D1.
// Passwords: PBKDF2-SHA256 (salt:hash hex). Sessions: opaque
// random token in an HttpOnly cookie, stored in D1.
// ============================================================
import type { Env, SessionUser } from "./env";

const COOKIE = "lore_session";
const SESSION_DAYS = 30;
const enc = new TextEncoder();

// ---- hashing ----
function toHex(b: Uint8Array): string {
  return [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
}
function fromHex(s: string): Uint8Array {
  const a = new Uint8Array(s.length / 2);
  for (let i = 0; i < a.length; i++) a[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  return a;
}
async function pbkdf2(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" }, key, 256);
  return new Uint8Array(bits);
}
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt);
  return `${toHex(salt)}:${toHex(hash)}`;
}
async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const hash = await pbkdf2(password, fromHex(saltHex));
  return toHex(hash) === hashHex; // constant-ish compare ok for hex of fixed length
}

// ---- responses / cookies ----
export function corsHeaders(env: Env): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": env.APP_ORIGIN,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
function json(env: Env, body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(env), ...extra },
  });
}
export function sessionCookie(token: string): string {
  // Same-origin (single Worker serves client + API), so Lax is correct.
  const maxAge = SESSION_DAYS * 86400;
  return `${COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax; Secure`;
}
function clearCookie(): string {
  return `${COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax; Secure`;
}
function readCookie(req: Request): string | null {
  const raw = req.headers.get("Cookie") || "";
  const m = raw.match(new RegExp(`${COOKIE}=([^;]+)`));
  return m ? m[1] : null;
}

// ---- session lookup ----
export async function getUser(env: Env, req: Request): Promise<SessionUser | null> {
  const token = readCookie(req);
  if (!token) return null;
  const row = await env.DB.prepare(
    `SELECT u.id, u.email, u.display, u.wins, u.losses, u.credits, s.expires_at
     FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`
  ).bind(token).first<{ id: string; email: string; display: string; wins: number; losses: number; credits: number; expires_at: number }>();
  if (!row || row.expires_at < Date.now()) return null;
  return { id: row.id, email: row.email, display: row.display, wins: row.wins, losses: row.losses, credits: row.credits };
}

export async function createSession(env: Env, userId: string): Promise<string> {
  const token = toHex(crypto.getRandomValues(new Uint8Array(24)));
  const now = Date.now();
  await env.DB.prepare(`INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?,?,?,?)`)
    .bind(token, userId, now, now + SESSION_DAYS * 86400_000).run();
  return token;
}

// ---- route handler ----
export async function handleAuth(env: Env, req: Request, path: string): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(env) });

  if (path === "/auth/me") {
    const user = await getUser(env, req);
    return json(env, { user });
  }

  if (path === "/auth/logout") {
    const token = readCookie(req);
    if (token) await env.DB.prepare(`DELETE FROM sessions WHERE token = ?`).bind(token).run();
    return json(env, { ok: true }, 200, { "Set-Cookie": clearCookie() });
  }

  if (path === "/auth/register" || path === "/auth/login") {
    const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(env, { error: "올바른 이메일이 아닙니다." }, 400);
    if (password.length < 6) return json(env, { error: "비밀번호는 6자 이상이어야 합니다." }, 400);

    if (path === "/auth/register") {
      const exists = await env.DB.prepare(`SELECT id FROM users WHERE email = ?`).bind(email).first();
      if (exists) return json(env, { error: "이미 가입된 이메일입니다." }, 409);
      const id = crypto.randomUUID();
      const display = email.split("@")[0];
      await env.DB.prepare(`INSERT INTO users (id, email, password, display, created_at) VALUES (?,?,?,?,?)`)
        .bind(id, email, await hashPassword(password), display, Date.now()).run();
      const token = await createSession(env, id);
      return json(env, { user: { id, email, display, wins: 0, losses: 0, credits: 0 } }, 200, { "Set-Cookie": sessionCookie(token) });
    }

    // login
    const row = await env.DB.prepare(`SELECT id, email, password, display, wins, losses, credits FROM users WHERE email = ?`)
      .bind(email).first<{ id: string; email: string; password: string; display: string; wins: number; losses: number; credits: number }>();
    if (!row || !(await verifyPassword(password, row.password))) return json(env, { error: "이메일 또는 비밀번호가 올바르지 않습니다." }, 401);
    const token = await createSession(env, row.id);
    return json(env, { user: { id: row.id, email: row.email, display: row.display, wins: row.wins, losses: row.losses, credits: row.credits } }, 200, { "Set-Cookie": sessionCookie(token) });
  }

  return json(env, { error: "not found" }, 404);
}
