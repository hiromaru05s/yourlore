// ============================================================
// LORE server — admin stats (all-in-one dashboard backend).
// GET /api/admin/stats  ·  Authorization: Bearer <AUTH_SECRET>
// Covers: signups (by day/source), games by mode, DAU, D1/D7
// retention cohorts, card win-rates (OP detection), invites.
// Revenue/ads are placeholders until Paddle + ad SDK land.
// ============================================================
import type { Env } from "./env";
import { corsHeaders } from "./auth";
import { seasonKey } from "./rank";

function json(env: Env, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...corsHeaders(env) } });
}

export async function handleAdmin(env: Env, req: Request, path: string): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(env) });
  const auth = req.headers.get("Authorization") || "";
  if (auth !== `Bearer ${env.AUTH_SECRET}`) return json(env, { error: "unauthorized" }, 401);

  if (path === "/admin/stats") {
    const cutoff30 = Date.now() - 30 * 86400_000;

    const [totalUsers, totalMatches, signupsByDay, signupsBySource, gamesByDay, dau, cohorts, inviteAgg] = await Promise.all([
      env.DB.prepare(`SELECT COUNT(*) AS n FROM users`).first<{ n: number }>(),
      env.DB.prepare(`SELECT mode, COUNT(*) AS n FROM matches GROUP BY mode`).all<{ mode: string; n: number }>(),
      env.DB.prepare(`SELECT date(created_at/1000,'unixepoch') AS d, COUNT(*) AS n FROM users WHERE created_at > ? GROUP BY d ORDER BY d`)
        .bind(cutoff30).all<{ d: string; n: number }>(),
      env.DB.prepare(`SELECT COALESCE(NULLIF(source,''),'direct') AS s, COUNT(*) AS n FROM users WHERE created_at > ? GROUP BY s ORDER BY n DESC`)
        .bind(cutoff30).all<{ s: string; n: number }>(),
      env.DB.prepare(`SELECT date(created_at/1000,'unixepoch') AS d, mode, COUNT(*) AS n FROM matches WHERE created_at > ? GROUP BY d, mode ORDER BY d`)
        .bind(cutoff30).all<{ d: string; mode: string; n: number }>(),
      env.DB.prepare(`SELECT day AS d, COUNT(*) AS n FROM user_days WHERE day >= date('now','-30 days') GROUP BY day ORDER BY day`)
        .all<{ d: string; n: number }>(),
      env.DB.prepare(
        `SELECT date(u.created_at/1000,'unixepoch') AS cohort, COUNT(*) AS n,
           SUM(EXISTS(SELECT 1 FROM user_days ud WHERE ud.user_id = u.id AND ud.day = date(u.created_at/1000,'unixepoch','+1 day'))) AS d1,
           SUM(EXISTS(SELECT 1 FROM user_days ud WHERE ud.user_id = u.id AND ud.day = date(u.created_at/1000,'unixepoch','+7 day'))) AS d7
         FROM users u WHERE u.created_at > ? GROUP BY cohort ORDER BY cohort DESC LIMIT 14`
      ).bind(Date.now() - 14 * 86400_000).all<{ cohort: string; n: number; d1: number; d7: number }>(),
      env.DB.prepare(`SELECT status, COUNT(*) AS n FROM invite_rewards GROUP BY status`).all<{ status: string; n: number }>(),
    ]);

    // card win-rates from the last 1,000 recorded PvP matches
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
      signupsByDay: signupsByDay.results ?? [],
      signupsBySource: signupsBySource.results ?? [],
      gamesByDay: gamesByDay.results ?? [],
      dau: dau.results ?? [],
      retention: cohorts.results ?? [],
      invites: Object.fromEntries((inviteAgg.results ?? []).map((r) => [r.status, r.n])),
      cards,
      cardSample: recent.results?.length ?? 0,
      revenue: { note: "결제(Paddle) 연동 후 표시", subscriptions: 0, cancellations: 0, sales: 0, adRevenue: 0 },
    });
  }

  // 유저 리스트 (최신 500명) — 이메일·인증·소스·전적·현시즌 MMR·마지막 접속일
  if (path === "/admin/users") {
    const rows = await env.DB.prepare(
      `SELECT u.id, u.email, u.display, u.created_at, u.verified, u.source, u.wins, u.losses, u.invited_by,
              (SELECT r.mmr FROM ratings r WHERE r.user_id = u.id AND r.season = ?) AS mmr,
              (SELECT MAX(ud.day) FROM user_days ud WHERE ud.user_id = u.id) AS last_day,
              (u.password = 'oauth:google') AS is_google
       FROM users u ORDER BY u.created_at DESC LIMIT 500`
    ).bind(seasonKey()).all();
    return json(env, { users: rows.results ?? [] });
  }

  return json(env, { error: "not found" }, 404);
}
