// ============================================================
// LORE server — all-in-one operator dashboard backend.
// Served ONLY on the isolated admin origin (admin.yourlore.xyz);
// index.ts 404s these paths on the game origin. Auth: the logged-in
// session's email must be in ADMIN_EMAILS.
// Response is grouped by dashboard tab so the client can render
// tabs without reshaping. PostHog runs in parallel for deep dives.
// ============================================================
import type { Env, SessionUser } from "./env";
import { corsHeaders, getUser } from "./auth";
import { seasonKey, tierOf } from "./rank";
import { BUYABLE_POOL } from "../../client/src/shared/cards";

const BUYABLE_IDS = BUYABLE_POOL;

function json(env: Env, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...corsHeaders(env) } });
}

export function isAdminUser(env: Env, user: SessionUser | null): boolean {
  if (!user) return false;
  const allow = (env.ADMIN_EMAILS || "").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
  return allow.includes(user.email.toLowerCase());
}

const one = <T>(p: Promise<T | null>) => p.then((r) => r).catch(() => null);

export async function handleAdmin(env: Env, req: Request, path: string): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(env) });
  const user = await getUser(env, req);
  if (!isAdminUser(env, user)) return json(env, { error: "unauthorized", loggedIn: !!user }, 401);

  if (path === "/admin/stats") {
    const DB = env.DB;
    const today = new Date().toISOString().slice(0, 10);
    const cut30 = Date.now() - 30 * 86400_000;
    const cut14 = Date.now() - 14 * 86400_000;

    const [
      totalUsers, matchesByMode, dauToday, newToday, gamesToday, wau, mau,
      signupsByDay, signupsBySource, verifiedAgg, loginAgg, invitedCount, inviteAgg,
      cohorts, depthRows, activePrev7, activeLast7,
      gamesByDay, tierRows, firstTurn, turnsAgg, rankedPlayers,
    ] = await Promise.all([
      one(DB.prepare(`SELECT COUNT(*) AS n FROM users`).first<{ n: number }>()),
      DB.prepare(`SELECT mode, COUNT(*) AS n FROM matches GROUP BY mode`).all<{ mode: string; n: number }>(),
      one(DB.prepare(`SELECT COUNT(*) AS n FROM user_days WHERE day = ?`).bind(today).first<{ n: number }>()),
      one(DB.prepare(`SELECT COUNT(*) AS n FROM users WHERE date(created_at/1000,'unixepoch') = ?`).bind(today).first<{ n: number }>()),
      one(DB.prepare(`SELECT COUNT(*) AS n FROM matches WHERE date(created_at/1000,'unixepoch') = ?`).bind(today).first<{ n: number }>()),
      one(DB.prepare(`SELECT COUNT(DISTINCT user_id) AS n FROM user_days WHERE day >= date('now','-7 days')`).first<{ n: number }>()),
      one(DB.prepare(`SELECT COUNT(DISTINCT user_id) AS n FROM user_days WHERE day >= date('now','-30 days')`).first<{ n: number }>()),
      DB.prepare(`SELECT date(created_at/1000,'unixepoch') AS d, COUNT(*) AS n FROM users WHERE created_at > ? GROUP BY d ORDER BY d`).bind(cut30).all<{ d: string; n: number }>(),
      DB.prepare(`SELECT COALESCE(NULLIF(source,''),'direct') AS s, COUNT(*) AS n FROM users WHERE created_at > ? GROUP BY s ORDER BY n DESC`).bind(cut30).all<{ s: string; n: number }>(),
      one(DB.prepare(`SELECT SUM(verified) AS v, COUNT(*) AS n FROM users`).first<{ v: number; n: number }>()),
      one(DB.prepare(`SELECT SUM(password='oauth:google') AS g, COUNT(*) AS n FROM users`).first<{ g: number; n: number }>()),
      one(DB.prepare(`SELECT COUNT(*) AS n FROM users WHERE invited_by IS NOT NULL`).first<{ n: number }>()),
      DB.prepare(`SELECT status, COUNT(*) AS n FROM invite_rewards GROUP BY status`).all<{ status: string; n: number }>(),
      DB.prepare(
        `SELECT date(u.created_at/1000,'unixepoch') AS cohort, COUNT(*) AS n,
           SUM(EXISTS(SELECT 1 FROM user_days ud WHERE ud.user_id=u.id AND ud.day=date(u.created_at/1000,'unixepoch','+1 day'))) AS d1,
           SUM(EXISTS(SELECT 1 FROM user_days ud WHERE ud.user_id=u.id AND ud.day=date(u.created_at/1000,'unixepoch','+7 day'))) AS d7
         FROM users u WHERE u.created_at > ? GROUP BY cohort ORDER BY cohort DESC LIMIT 14`
      ).bind(cut14).all<{ cohort: string; n: number; d1: number; d7: number }>(),
      // games-per-user (all modes; player_b='bot' won't match a real uid)
      DB.prepare(`SELECT u, COUNT(*) AS c FROM (SELECT player_a AS u FROM matches UNION ALL SELECT player_b FROM matches WHERE player_b!='bot') GROUP BY u`).all<{ u: string; c: number }>(),
      one(DB.prepare(`SELECT COUNT(DISTINCT user_id) AS n FROM user_days WHERE day >= date('now','-14 days') AND day < date('now','-7 days')`).first<{ n: number }>()),
      one(DB.prepare(`SELECT COUNT(DISTINCT user_id) AS n FROM user_days WHERE day >= date('now','-7 days')`).first<{ n: number }>()),
      DB.prepare(`SELECT date(created_at/1000,'unixepoch') AS d, mode, COUNT(*) AS n FROM matches WHERE created_at > ? GROUP BY d, mode ORDER BY d`).bind(cut30).all<{ d: string; mode: string; n: number }>(),
      DB.prepare(`SELECT mmr FROM ratings WHERE season = ?`).bind(seasonKey()).all<{ mmr: number }>(),
      one(DB.prepare(`SELECT SUM(winner=player_a) AS w, COUNT(*) AS n FROM matches WHERE mode!='bot' AND winner IS NOT NULL`).first<{ w: number; n: number }>()),
      one(DB.prepare(`SELECT AVG(turns) AS avg, COUNT(turns) AS n FROM matches WHERE turns IS NOT NULL`).first<{ avg: number; n: number }>()),
      one(DB.prepare(`SELECT COUNT(*) AS n FROM ratings WHERE season = ?`).bind(seasonKey()).first<{ n: number }>()),
    ]);

    const users = totalUsers?.n ?? 0;
    const matches = Object.fromEntries((matchesByMode.results ?? []).map((r) => [r.mode, r.n]));

    // engagement depth buckets (games played per user, all-time)
    const depth = { d0: 0, d1: 0, d2_5: 0, d6p: 0 };
    const playedIds = new Set<string>();
    for (const r of depthRows.results ?? []) {
      playedIds.add(r.u);
      if (r.c === 1) depth.d1++; else if (r.c <= 5) depth.d2_5++; else depth.d6p++;
    }
    depth.d0 = Math.max(0, users - playedIds.size); // registered but never played

    // tier distribution
    const tierDist: Record<string, number> = {};
    for (const r of tierRows.results ?? []) { const t = tierOf(r.mmr); tierDist[t] = (tierDist[t] ?? 0) + 1; }

    // per-card stats over the last 2000 PvP matches: buys, plays, games-used, win-rate.
    const recent = await DB.prepare(
      `SELECT player_a, player_b, winner, cards_a, cards_b, buys_a, buys_b FROM matches WHERE mode!='bot' AND cards_a IS NOT NULL ORDER BY created_at DESC LIMIT 2000`
    ).all<{ player_a: string; player_b: string; winner: string | null; cards_a: string; cards_b: string; buys_a: string | null; buys_b: string | null }>();
    const agg: Record<string, { buys: number; plays: number; win: number; lose: number }> = {};
    const bump = (id: string): typeof agg[string] => (agg[id] ??= { buys: 0, plays: 0, win: 0, lose: 0 });
    const parse = (s: string | null): Record<string, number> => { try { return JSON.parse(s || "{}"); } catch { return {}; } };
    for (const m of recent.results ?? []) {
      for (const [who, useBlob, buyBlob] of [[m.player_a, m.cards_a, m.buys_a], [m.player_b, m.cards_b, m.buys_b]] as [string, string, string | null][]) {
        const uses = parse(useBlob), buys = parse(buyBlob);
        const won = m.winner === who;
        for (const id of Object.keys(buys)) bump(id).buys += buys[id];
        for (const id of Object.keys(uses)) { const a = bump(id); a.plays += uses[id]; if (won) a.win++; else a.lose++; }
      }
    }
    // every buyable card, even with zero data (so the balance table is complete)
    const cards = BUYABLE_IDS.map((id) => {
      const a = agg[id] ?? { buys: 0, plays: 0, win: 0, lose: 0 };
      const games = a.win + a.lose;
      return { id, buys: a.buys, plays: a.plays, games, winrate: games > 0 ? a.win / games : null };
    });

    return json(env, {
      overview: {
        users, dauToday: dauToday?.n ?? 0, newToday: newToday?.n ?? 0, gamesToday: gamesToday?.n ?? 0,
        wau: wau?.n ?? 0, mau: mau?.n ?? 0,
        stickiness: (mau?.n ?? 0) > 0 ? (dauToday?.n ?? 0) / (mau!.n) : 0, // DAU/MAU
        matches,
      },
      acquisition: {
        signupsByDay: signupsByDay.results ?? [],
        signupsBySource: signupsBySource.results ?? [],
        verifiedRate: (verifiedAgg?.n ?? 0) > 0 ? (verifiedAgg!.v ?? 0) / verifiedAgg!.n : 0,
        loginSplit: { google: loginAgg?.g ?? 0, email: (loginAgg?.n ?? 0) - (loginAgg?.g ?? 0) },
        invitedSignups: invitedCount?.n ?? 0,
        invites: Object.fromEntries((inviteAgg.results ?? []).map((r) => [r.status, r.n])),
      },
      retention: {
        cohorts: cohorts.results ?? [],
        wau: wau?.n ?? 0, mau: mau?.n ?? 0,
        stickiness: (mau?.n ?? 0) > 0 ? (dauToday?.n ?? 0) / mau!.n : 0,
        depth,
        // 7일 활성 유저 전주 대비 (성장/이탈 신호)
        active7: activeLast7?.n ?? 0, activePrev7: activePrev7?.n ?? 0,
        rankedParticipation: users > 0 ? (rankedPlayers?.n ?? 0) / users : 0,
      },
      gameplay: {
        gamesByDay: gamesByDay.results ?? [],
        tierDist,
        cards, cardSample: recent.results?.length ?? 0,
        firstTurnWinRate: (firstTurn?.n ?? 0) > 0 ? (firstTurn!.w ?? 0) / firstTurn!.n : null,
        firstTurnSample: firstTurn?.n ?? 0,
        avgTurns: turnsAgg?.avg ?? null, turnsSample: turnsAgg?.n ?? 0,
      },
      monetization: { note: "결제(Paddle) 연동 후 표시", subscriptions: 0, cancellations: 0, sales: 0, adRevenue: 0 },
    });
  }

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
