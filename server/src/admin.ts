// ============================================================
// LORE server — internal GAME-HEALTH metrics only.
//   Acquisition / retention / funnel / source now live in PostHog
//   (product analytics), which computes them far better than SQL
//   and scales without maintenance. This endpoint keeps ONLY what
//   no external tool can compute: card win-rates (balance), tier
//   distribution, invite ledger, and a support email lookup.
//
// Auth: Cloudflare Access (edge SSO) is the primary gate — when a
//   request carries Cf-Access-Authenticated-User-Email it is trusted.
//   Until Access is set up, a Bearer <AUTH_SECRET> fallback applies.
// ============================================================
import type { Env } from "./env";
import { corsHeaders } from "./auth";
import { seasonKey, tierOf } from "./rank";

function json(env: Env, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...corsHeaders(env) } });
}

/** True when the request is an authenticated admin (Access SSO or the secret fallback). */
function isAdmin(env: Env, req: Request): boolean {
  if (req.headers.get("Cf-Access-Authenticated-User-Email")) return true; // vetted at the edge by Access
  return (req.headers.get("Authorization") || "") === `Bearer ${env.AUTH_SECRET}`;
}

export async function handleAdmin(env: Env, req: Request, path: string): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(env) });
  if (!isAdmin(env, req)) return json(env, { error: "unauthorized" }, 401);

  if (path === "/admin/stats") {
    const [totalUsers, totalMatches, inviteAgg, tierRows] = await Promise.all([
      env.DB.prepare(`SELECT COUNT(*) AS n FROM users`).first<{ n: number }>(),
      env.DB.prepare(`SELECT mode, COUNT(*) AS n FROM matches GROUP BY mode`).all<{ mode: string; n: number }>(),
      env.DB.prepare(`SELECT status, COUNT(*) AS n FROM invite_rewards GROUP BY status`).all<{ status: string; n: number }>(),
      env.DB.prepare(`SELECT mmr FROM ratings WHERE season = ?`).bind(seasonKey()).all<{ mmr: number }>(),
    ]);

    // tier distribution (this season) — a healthy ladder isn't all bunched at the floor
    const tierDist: Record<string, number> = {};
    for (const r of tierRows.results ?? []) { const t = tierOf(r.mmr); tierDist[t] = (tierDist[t] ?? 0) + 1; }

    // card win-rates from the last 1,000 recorded PvP matches (balance / OP detection)
    const recent = await env.DB.prepare(
      `SELECT player_a, player_b, winner, cards_a, cards_b FROM matches
       WHERE mode != 'bot' AND cards_a IS NOT NULL ORDER BY created_at DESC LIMIT 1000`
    ).all<{ player_a: string; player_b: string; winner: string | null; cards_a: string; cards_b: string }>();
    const agg: Record<string, { win: number; lose: number }> = {};
    for (const m of recent.results ?? []) {
      for (const [who, blob] of [[m.player_a, m.cards_a], [m.player_b, m.cards_b]] as [string, string][]) {
        let uses: Record<string, number>;
        try { uses = JSON.parse(blob || "{}"); } catch { continue; }
        const won = m.winner === who;
        for (const id of Object.keys(uses)) {
          agg[id] ??= { win: 0, lose: 0 };
          if (won) agg[id].win++; else agg[id].lose++;
        }
      }
    }
    const cards = Object.entries(agg)
      .map(([id, a]) => ({ id, games: a.win + a.lose, winrate: a.win / (a.win + a.lose) }))
      .filter((c) => c.games >= 5)
      .sort((a, b) => b.winrate - a.winrate);

    return json(env, {
      totals: { users: totalUsers?.n ?? 0, matches: Object.fromEntries((totalMatches.results ?? []).map((r) => [r.mode, r.n])) },
      tierDist,
      invites: Object.fromEntries((inviteAgg.results ?? []).map((r) => [r.status, r.n])),
      cards,
      cardSample: recent.results?.length ?? 0,
      revenue: { note: "결제(Paddle) 연동 후 표시", subscriptions: 0, cancellations: 0, sales: 0, adRevenue: 0 },
    });
  }

  // 지원용 단건 조회 — 정확한 이메일로 1명만 (문의 대응). 전체 목록은 노출하지 않음.
  if (path === "/admin/lookup") {
    const email = (new URL(req.url).searchParams.get("email") || "").trim().toLowerCase();
    if (!email) return json(env, { user: null });
    const u = await env.DB.prepare(
      `SELECT u.id, u.email, u.display, u.created_at, u.verified, u.wins, u.losses, u.invited_by,
              (SELECT r.mmr FROM ratings r WHERE r.user_id = u.id AND r.season = ?) AS mmr,
              (SELECT MAX(ud.day) FROM user_days ud WHERE ud.user_id = u.id) AS last_day,
              (u.password = 'oauth:google') AS is_google
       FROM users u WHERE u.email = ?`
    ).bind(seasonKey(), email).first();
    return json(env, { user: u ?? null });
  }

  return json(env, { error: "not found" }, 404);
}
