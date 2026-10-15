// ============================================================
// LORE server — invite campaign.
// Each user gets a share code (?ref=CODE). A fresh signup with a
// valid ref is attributed (max 3 per inviter, no self-invite).
// Reaching GOLD pays both players 1,000 Shards in the ranked settlement
// transaction. Reward keys and the invite status prevent duplicate payouts.
// ============================================================
import type { Env, SessionUser } from "./env";
import { corsHeaders } from "./auth";

export const INVITE_LIMIT = 3;
export const INVITE_SHARDS = 1000;

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
  // Eligibility and attribution commit together; concurrent signups cannot all
  // consume the same last slot, or disagree with the user's existing inviter.
  await env.DB.batch([
    env.DB.prepare(`INSERT OR IGNORE INTO invite_rewards (invitee_id, inviter_id, status, created_at)
      SELECT ?1,?2,'pending',?3 WHERE
      (SELECT COUNT(*) FROM invite_rewards WHERE inviter_id=?2) < ?4
      AND EXISTS (SELECT 1 FROM users WHERE id=?1 AND invited_by IS NULL)`)
      .bind(inviteeId, inviter.id, Date.now(), INVITE_LIMIT),
    env.DB.prepare(`UPDATE users SET invited_by=? WHERE id=? AND changes()=1`).bind(inviter.id, inviteeId),
  ]);
}

/** Append before ranked_results.applied flips to 1, in the same D1 batch.
 * Gold eligibility comes from the authoritative settlement, never the client.
 * Per-player receipt keys keep retries and later seasons from paying twice. */
export function inviteRewardStatements(env: Env, inviteeId: string, matchId: string, at: number): D1PreparedStatement[] {
  const eligible = `SELECT inviter_id, invitee_id FROM invite_rewards WHERE invitee_id=?
    AND status IN ('pending','earned') AND EXISTS (
      SELECT 1 FROM ranked_results WHERE match_id=? AND applied=0
      AND ((a_id=invitee_id AND a_after>=1150) OR (b_id=invitee_id AND b_after>=1150)))`;
  const key = `invite:gold:${inviteeId}`;
  const statements: D1PreparedStatement[] = [];
  for (const side of ['inviter_id', 'invitee_id']) {
    statements.push(
      env.DB.prepare(`INSERT OR IGNORE INTO rewards (user_id,key,amount,created_at)
        SELECT ${side},?,?,? FROM (${eligible}) WHERE EXISTS (SELECT 1 FROM users WHERE id=${side})`)
        .bind(key,INVITE_SHARDS,at,inviteeId,matchId),
      env.DB.prepare(`UPDATE users SET credits=credits+? WHERE id=(SELECT ${side} FROM invite_rewards WHERE invitee_id=?) AND changes()=1`)
        .bind(INVITE_SHARDS,inviteeId),
    );
  }
  statements.push(env.DB.prepare(`UPDATE invite_rewards SET status='paid',earned_at=COALESCE(earned_at,?) WHERE invitee_id=?
    AND EXISTS (SELECT 1 FROM rewards WHERE user_id=inviter_id AND key=?)
    AND EXISTS (SELECT 1 FROM rewards WHERE user_id=invitee_id AND key=?)`).bind(at,inviteeId,key,key));
  return statements;
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
