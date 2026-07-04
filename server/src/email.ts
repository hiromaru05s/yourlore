// ============================================================
// LORE server — transactional email via Resend + the verify/reset
// token machinery shared by auth.ts.
// If RESEND_API_KEY is unset, sendEmail() reports "not configured"
// and callers fall back gracefully (register auto-verifies), so the
// game keeps working before the key/domain are provisioned.
// ============================================================
import type { Env } from "./env";

const FROM = "LORE <no-reply@yourlore.xyz>";
const TOKEN_TTL_MS = 24 * 3600_000;   // verify/reset links live 24h
const RESEND_GAP_MS = 60_000;         // min gap between mails per user+kind

export function emailConfigured(env: Env): boolean {
  return !!env.RESEND_API_KEY;
}

export async function sendEmail(env: Env, to: string, subject: string, html: string): Promise<boolean> {
  if (!env.RESEND_API_KEY) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  }).catch(() => null);
  return !!res && res.ok;
}

// ---- tokens (verify / reset) ----
export type TokenKind = "verify" | "reset";

/** Create (or refresh) the single active token for a user+kind. Returns null if rate-limited. */
export async function issueToken(env: Env, userId: string, kind: TokenKind): Promise<string | null> {
  const recent = await env.DB.prepare(
    `SELECT created_at FROM email_tokens WHERE user_id = ? AND kind = ? ORDER BY created_at DESC LIMIT 1`
  ).bind(userId, kind).first<{ created_at: number }>();
  if (recent && Date.now() - recent.created_at < RESEND_GAP_MS) return null;
  const token = [...crypto.getRandomValues(new Uint8Array(24))].map((x) => x.toString(16).padStart(2, "0")).join("");
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM email_tokens WHERE user_id = ? AND kind = ?`).bind(userId, kind),
    env.DB.prepare(`INSERT INTO email_tokens (token, user_id, kind, created_at, expires_at) VALUES (?,?,?,?,?)`)
      .bind(token, userId, kind, now, now + TOKEN_TTL_MS),
  ]);
  return token;
}

/** Look up + consume-check a token. Does NOT delete it (caller deletes on success). */
export async function readToken(env: Env, token: string, kind: TokenKind): Promise<string | null> {
  const row = await env.DB.prepare(
    `SELECT user_id, expires_at FROM email_tokens WHERE token = ? AND kind = ?`
  ).bind(token, kind).first<{ user_id: string; expires_at: number }>();
  if (!row || row.expires_at < Date.now()) return null;
  return row.user_id;
}

export async function deleteToken(env: Env, token: string): Promise<void> {
  await env.DB.prepare(`DELETE FROM email_tokens WHERE token = ?`).bind(token).run();
}

// ---- templates (dark, on-brand, bilingual-lite) ----
function shell(title: string, body: string, cta: { href: string; label: string }): string {
  return `<!doctype html><body style="margin:0;background:#0c121d;padding:32px 16px;font-family:sans-serif">
  <div style="max-width:460px;margin:0 auto;background:#121a28;border:1px solid #2c3a55;border-radius:12px;padding:32px 28px;color:#e9e3d4">
    <div style="font-family:monospace;font-size:20px;letter-spacing:.4em;color:#c79a4b;text-align:center;margin-bottom:22px">LORE</div>
    <h2 style="font-size:17px;margin:0 0 12px">${title}</h2>
    <p style="font-size:14px;line-height:1.7;color:#98a3b5;margin:0 0 24px">${body}</p>
    <div style="text-align:center;margin-bottom:24px">
      <a href="${cta.href}" style="display:inline-block;background:#c79a4b;color:#2a1d08;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none">${cta.label}</a>
    </div>
    <p style="font-size:11px;color:#5d6a82;line-height:1.6;margin:0">이 링크는 24시간 동안 유효합니다. 본인이 요청하지 않았다면 이 메일을 무시하세요.<br>This link expires in 24 hours. If you didn't request this, you can ignore this email.</p>
  </div></body>`;
}

export function verifyEmailHtml(origin: string, token: string): string {
  return shell(
    "이메일 인증 / Verify your email",
    "LORE 계정 가입을 완료하려면 아래 버튼을 눌러 이메일 주소를 인증해 주세요.<br>Click the button below to verify your email address and finish creating your LORE account.",
    { href: `${origin}/api/auth/verify?token=${token}`, label: "이메일 인증하기 · Verify Email" },
  );
}

export function resetEmailHtml(origin: string, token: string): string {
  return shell(
    "비밀번호 재설정 / Reset your password",
    "아래 버튼을 눌러 새 비밀번호를 설정하세요.<br>Click the button below to set a new password.",
    { href: `${origin}/?reset=${token}`, label: "비밀번호 재설정 · Reset Password" },
  );
}
