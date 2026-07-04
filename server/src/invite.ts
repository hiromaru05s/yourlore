// ============================================================
// LORE server — invite campaign.
// Each user gets a share code (?ref=CODE). A fresh signup with a
// valid ref is attributed (max 3 per inviter, no self-invite).
// When the invitee first reaches GOLD, the ledger row flips to
// 'earned' — both sides get 1,000 credits each once the credit
// system ships ('earned' → 'paid' at that point).
// ============================================================
import type { Env, SessionUser } from "./env";
import { corsHeaders } from "./auth";

export const INVITE_LIMIT = 3;

function json(env: Env, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...corsHeaders(env) } });
}

function genCode(): string {
  // 8-char base36 — collision retried by caller
  const b = crypto.getRandomValues(new Uint8Array(6));
  return [...b].map((x) => (x % 36).toString(36)).join("").slice(0, 8).toUpperCase();
}

/** Get (or lazily mint) this user's invite code. */
export async function getInviteCode(env: Env, userId: string): Promise<string> {
  const row = await env.DB.prepare(`SELECT invite_code FROM users WHERE id = ?`).bind(userId).first<{ invite_code: string | null }>();
  if (row?.invite_code) return row.invite_code;
  for (let i = 0; i < 5; i++) {
    const code = genCode();
    try {
      await env.DB.prepare(`UPDATE users SET invite_code = ? WHERE id = ? AND invite_code IS NULL`).bind(code, userId).run();
      const check = await env.DB.prepare(`SELECT invite_code FROM users WHERE id = ?`).bind(userId).first<{ invite_code: string | null }>();
      if (check?.invite_code) return check.invite_code;
    } catch { /* unique collision → retry */ }
  }
  return "";
}

/** Attribute a fresh signup to an inviter (best-effort, silent on any rule failure). */
export async function applyInviteAtSignup(env: Env, inviteeId: string, ref: string): Promise<void> {
  const code = (ref || "").trim().toUpperCase().slice(0, 16);
  if (!code) return;
  const inviter = await env.DB.prepare(`SELECT id FROM users WHERE invite_code = ?`).bind(code).first<{ id: string }>();
  if (!inviter || inviter.id === inviteeId) return;
  const cnt = await env.DB.prepare(`SELECT COUNT(*) AS n FROM invite_rewards WHERE inviter_id = ?`).bind(inviter.id).first<{ n: number }>();
  if ((cnt?.n ?? 0) >= INVITE_LIMIT) return;
  await env.DB.batch([
    env.DB.prepare(`UPDATE users SET invited_by = ? WHERE id = ? AND invited_by IS NULL`).bind(inviter.id, inviteeId),
    env.DB.prepare(`INSERT OR IGNORE INTO invite_rewards (invitee_id, inviter_id, status, created_at) VALUES (?,?,'pending',?)`)
      .bind(inviteeId, inviter.id, Date.now()),
  ]);
}

/** Called when a player's MMR crosses the Gold line — flips their pending invite to 'earned'. */
export async function markInviteEarned(env: Env, inviteeId: string): Promise<void> {
  await env.DB.prepare(`UPDATE invite_rewards SET status = 'earned', earned_at = ? WHERE invitee_id = ? AND status = 'pending'`)
    .bind(Date.now(), inviteeId).run();
}

// ---- REST: /api/invite/me ----
export async function handleInvite(env: Env, req: Request, path: string, user: SessionUser | null): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(env) });
  if (path === "/invite/me") {
    if (!user) return json(env, { error: "unauthorized" }, 401);
    const code = await getInviteCode(env, user.id);
    const rows = await env.DB.prepare(
      `SELECT r.status, r.created_at, u.display FROM invite_rewards r JOIN users u ON u.id = r.invitee_id
       WHERE r.inviter_id = ? ORDER BY r.created_at ASC`
    ).bind(user.id).all<{ status: string; created_at: number; display: string }>();
    return json(env, { code, limit: INVITE_LIMIT, invites: rows.results ?? [] });
  }
  return json(env, { error: "not found" }, 404);
}
