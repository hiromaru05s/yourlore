// ============================================================
// LORE server — email+password auth on D1.
// Passwords: PBKDF2-SHA256 (salt:hash hex). Sessions: opaque
// random token in an HttpOnly cookie, stored in D1.
// Email verification: register creates an UNVERIFIED account and
// mails a verify link; login is blocked until verified. If Resend
// isn't configured yet, register auto-verifies (legacy behavior).
// ============================================================
import type { Env, SessionUser } from "./env";
import { deleteToken, emailConfigured, issueToken, readToken, resetEmailHtml, sendEmail, verifyEmailHtml } from "./email";
import { applyInviteAtSignup } from "./invite";

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

/** Display names are rendered into innerHTML across the game UI (board, battle log),
 *  so they MUST be sanitized at the only chokepoint: account creation. Allowlist only. */
export function sanitizeDisplay(raw: string): string {
  const clean = (raw || "").replace(/[^0-9A-Za-z가-힣ㄱ-ㅎぁ-んァ-ヶ一-龯ー\s._-]/g, "").replace(/\s+/g, " ").trim().slice(0, 24);
  return clean || "Player" + Math.floor(Math.random() * 9000 + 1000);
}

// ---- session lookup ----
export async function getUser(env: Env, req: Request): Promise<SessionUser | null> {
  const token = readCookie(req);
  if (!token) return null;
  const row = await env.DB.prepare(
    `SELECT u.id, u.email, u.display, u.wins, u.losses, u.credits, u.avatar, u.badge, s.expires_at
     FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`
  ).bind(token).first<{ id: string; email: string; display: string; wins: number; losses: number; credits: number; avatar: string | null; badge: string | null; expires_at: number }>();
  if (!row || row.expires_at < Date.now()) return null;
  return { id: row.id, email: row.email, display: row.display, wins: row.wins, losses: row.losses, credits: row.credits, avatar: row.avatar, badge: row.badge };
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
    // daily activity mark (retention analytics) — one row per user per day
    if (user) {
      const day = new Date().toISOString().slice(0, 10);
      await env.DB.prepare(`INSERT OR IGNORE INTO user_days (user_id, day) VALUES (?,?)`).bind(user.id, day).run().catch(() => { /* best effort */ });
    }
    return json(env, { user });
  }

  if (path === "/auth/logout") {
    const token = readCookie(req);
    if (token) await env.DB.prepare(`DELETE FROM sessions WHERE token = ?`).bind(token).run();
    return json(env, { ok: true }, 200, { "Set-Cookie": clearCookie() });
  }

  if (path === "/auth/register" || path === "/auth/login") {
    const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string; ref?: string; source?: string };
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(env, { error: "올바른 이메일이 아닙니다." }, 400);
    if (password.length < 6) return json(env, { error: "비밀번호는 6자 이상이어야 합니다." }, 400);

    if (path === "/auth/register") {
      const exists = await env.DB.prepare(`SELECT id FROM users WHERE email = ?`).bind(email).first();
      if (exists) return json(env, { error: "이미 가입된 이메일입니다." }, 409);
      const id = crypto.randomUUID();
      const display = sanitizeDisplay(email.split("@")[0]);
      const mailOn = emailConfigured(env);
      const source = (body.source || "").slice(0, 120) || null;
      await env.DB.prepare(`INSERT INTO users (id, email, password, display, created_at, verified, source) VALUES (?,?,?,?,?,?,?)`)
        .bind(id, email, await hashPassword(password), display, Date.now(), mailOn ? 0 : 1, source).run();
      if (body.ref) await applyInviteAtSignup(env, id, body.ref).catch(() => { /* best effort */ });
      if (mailOn) {
        const vt = await issueToken(env, id, "verify");
        if (vt) await sendEmail(env, email, "LORE — 이메일 인증 / Verify your email", verifyEmailHtml(new URL(req.url).origin, vt));
        return json(env, { needVerify: true });
      }
      const token = await createSession(env, id);
      return json(env, { user: { id, email, display, wins: 0, losses: 0, credits: 0 } }, 200, { "Set-Cookie": sessionCookie(token) });
    }

    // login
    const row = await env.DB.prepare(`SELECT id, email, password, display, wins, losses, verified, credits FROM users WHERE email = ?`)
      .bind(email).first<{ id: string; email: string; password: string; display: string; wins: number; losses: number; verified: number; credits: number }>();
    if (!row || !(await verifyPassword(password, row.password))) return json(env, { error: "이메일 또는 비밀번호가 올바르지 않습니다." }, 401);
    if (!row.verified && emailConfigured(env)) return json(env, { error: "이메일 인증이 필요합니다. 받은편지함을 확인하세요.", needVerify: true }, 403);
    const token = await createSession(env, row.id);
    return json(env, { user: { id: row.id, email: row.email, display: row.display, wins: row.wins, losses: row.losses, credits: row.credits } }, 200, { "Set-Cookie": sessionCookie(token) });
  }

  // 인증 링크 (메일에서 클릭) — 성공 시 홈으로 리디렉트
  if (path === "/auth/verify") {
    const token = new URL(req.url).searchParams.get("token") || "";
    const userId = await readToken(env, token, "verify");
    if (!userId) return new Response(`<!doctype html><meta charset="utf-8"><body style="font-family:sans-serif;background:#0c121d;color:#e9e3d4;display:grid;place-items:center;height:100vh"><div style="text-align:center"><p>링크가 만료되었거나 잘못되었습니다.<br>This link is invalid or expired.</p><a href="/" style="color:#c79a4b">← LORE</a></div>`, { status: 400, headers: { "Content-Type": "text/html;charset=utf-8" } });
    await env.DB.prepare(`UPDATE users SET verified = 1 WHERE id = ?`).bind(userId).run();
    await deleteToken(env, token);
    return new Response(null, { status: 302, headers: { Location: "/?verified=1" } });
  }

  // 인증 메일 재발송
  if (path === "/auth/resend-verify") {
    const body = (await req.json().catch(() => ({}))) as { email?: string };
    const email = (body.email || "").trim().toLowerCase();
    const row = await env.DB.prepare(`SELECT id, verified FROM users WHERE email = ?`).bind(email).first<{ id: string; verified: number }>();
    // 계정 존재 여부를 노출하지 않음 — 항상 ok
    if (row && !row.verified && emailConfigured(env)) {
      const vt = await issueToken(env, row.id, "verify");
      if (vt) await sendEmail(env, email, "LORE — 이메일 인증 / Verify your email", verifyEmailHtml(new URL(req.url).origin, vt));
    }
    return json(env, { ok: true });
  }

  // 비밀번호 재설정 요청 (메일 발송)
  if (path === "/auth/forgot") {
    const body = (await req.json().catch(() => ({}))) as { email?: string };
    const email = (body.email || "").trim().toLowerCase();
    const row = await env.DB.prepare(`SELECT id FROM users WHERE email = ?`).bind(email).first<{ id: string }>();
    if (row && emailConfigured(env)) {
      const rt = await issueToken(env, row.id, "reset");
      if (rt) await sendEmail(env, email, "LORE — 비밀번호 재설정 / Reset your password", resetEmailHtml(new URL(req.url).origin, rt));
    }
    return json(env, { ok: true }); // 계정 존재 여부 비노출
  }

  // 비밀번호 재설정 실행 (재설정 = 이메일 소유 증명이므로 인증도 함께 처리)
  if (path === "/auth/reset") {
    const body = (await req.json().catch(() => ({}))) as { token?: string; password?: string };
    const password = body.password || "";
    if (password.length < 6) return json(env, { error: "비밀번호는 6자 이상이어야 합니다." }, 400);
    const userId = await readToken(env, body.token || "", "reset");
    if (!userId) return json(env, { error: "링크가 만료되었거나 잘못되었습니다." }, 400);
    await env.DB.prepare(`UPDATE users SET password = ?, verified = 1 WHERE id = ?`).bind(await hashPassword(password), userId).run();
    await deleteToken(env, body.token || "");
    await env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(userId).run(); // 기존 세션 전부 무효화
    return json(env, { ok: true });
  }

  return json(env, { error: "not found" }, 404);
}
