// ============================================================
// LORE server — all-in-one operator dashboard backend.
// Served ONLY on the isolated admin origin (admin.yourlore.xyz);
// index.ts 404s these paths on the game origin. Auth: the logged-in
// session's email must be in ADMIN_EMAILS.
// Response is grouped by dashboard tab so the client can render
// tabs without reshaping. PostHog runs in parallel for deep dives.
// All calendar-day groupings are KST (UTC+9) — the operator's day.
// ============================================================
import type { Env, SessionUser } from "./env";
import { corsHeaders, getUser } from "./auth";
import { seasonKey, tierOf } from "./rank";
import { BUYABLE_POOL, DECK_POOL, BALANCE_VERSION } from "../../client/src/shared/cards";

const BUYABLE_IDS = BUYABLE_POOL;

// KST (UTC+9) day helpers — user_days rows are written as KST days (auth.ts),
// and ms-timestamp columns are shifted by +32400s before date() bucketing.
const KST_SHIFT = 32400; // seconds
/** SQL expr: ms-epoch column → 'YYYY-MM-DD' in KST (optional date() modifier appended). */
const kday = (col: string, mod = ""): string => `date((${col}/1000)+${KST_SHIFT},'unixepoch'${mod})`;
const kstToday = (): string => new Date(Date.now() + KST_SHIFT * 1000).toISOString().slice(0, 10);

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
    const today = kstToday();
    const cut30 = Date.now() - 30 * 86400_000;
    const cut14 = Date.now() - 14 * 86400_000;
    // balance-version filter (card stats + balance metrics). Default = current version.
    const verParam = new URL(req.url).searchParams.get("bver");
    const selVer = verParam || BALANCE_VERSION;
    const verClause = selVer === "legacy" ? "bver IS NULL" : "bver = ?";
    const verBind = selVer === "legacy" ? [] : [selVer];

    const [
      totalUsers, matchesByMode, dauToday, newToday, gamesToday, wau, mau,
      signupsByDay, signupsBySource, verifiedAgg, loginAgg, invitedCount, inviteAgg,
      cohorts, depthRows, activePrev7, activeLast7,
      gamesByDay, tierRows, firstTurn, turnsAgg, rankedPlayers,
      // --- added: trend / funnel / economy / game-health / live feed ---
      dauByDay, tutorialDone, rankedEver,
      creditAgg, rewardIssued, couponClaimed, couponRows, creditBuckets, sleeveRows, deckRows,
      durAgg, drawAgg, botAgg, recentMatches,
    ] = await Promise.all([
      one(DB.prepare(`SELECT COUNT(*) AS n FROM users`).first<{ n: number }>()),
      DB.prepare(`SELECT mode, COUNT(*) AS n FROM matches GROUP BY mode`).all<{ mode: string; n: number }>(),
      one(DB.prepare(`SELECT COUNT(*) AS n FROM user_days WHERE day = ?`).bind(today).first<{ n: number }>()),
      one(DB.prepare(`SELECT COUNT(*) AS n FROM users WHERE ${kday("created_at")} = ?`).bind(today).first<{ n: number }>()),
      one(DB.prepare(`SELECT COUNT(*) AS n FROM matches WHERE ${kday("created_at")} = ?`).bind(today).first<{ n: number }>()),
      one(DB.prepare(`SELECT COUNT(DISTINCT user_id) AS n FROM user_days WHERE day >= date('now','+9 hours','-7 days')`).first<{ n: number }>()),
      one(DB.prepare(`SELECT COUNT(DISTINCT user_id) AS n FROM user_days WHERE day >= date('now','+9 hours','-30 days')`).first<{ n: number }>()),
      DB.prepare(`SELECT ${kday("created_at")} AS d, COUNT(*) AS n FROM users WHERE created_at > ? GROUP BY d ORDER BY d`).bind(cut30).all<{ d: string; n: number }>(),
      DB.prepare(`SELECT COALESCE(NULLIF(source,''),'direct') AS s, COUNT(*) AS n FROM users WHERE created_at > ? GROUP BY s ORDER BY n DESC`).bind(cut30).all<{ s: string; n: number }>(),
      one(DB.prepare(`SELECT SUM(verified) AS v, COUNT(*) AS n FROM users`).first<{ v: number; n: number }>()),
      one(DB.prepare(`SELECT SUM(password='oauth:google') AS g, COUNT(*) AS n FROM users`).first<{ g: number; n: number }>()),
      one(DB.prepare(`SELECT COUNT(*) AS n FROM users WHERE invited_by IS NOT NULL`).first<{ n: number }>()),
      DB.prepare(`SELECT status, COUNT(*) AS n FROM invite_rewards GROUP BY status`).all<{ status: string; n: number }>(),
      DB.prepare(
        `SELECT ${kday("u.created_at")} AS cohort, COUNT(*) AS n,
           SUM(EXISTS(SELECT 1 FROM user_days ud WHERE ud.user_id=u.id AND ud.day=${kday("u.created_at", ",'+1 day'")})) AS d1,
           SUM(EXISTS(SELECT 1 FROM user_days ud WHERE ud.user_id=u.id AND ud.day=${kday("u.created_at", ",'+7 day'")})) AS d7
         FROM users u WHERE u.created_at > ? GROUP BY cohort ORDER BY cohort DESC LIMIT 14`
      ).bind(cut14).all<{ cohort: string; n: number; d1: number; d7: number }>(),
      // games-per-user (all modes; player_b='bot' won't match a real uid)
      DB.prepare(`SELECT u, COUNT(*) AS c FROM (SELECT player_a AS u FROM matches UNION ALL SELECT player_b FROM matches WHERE player_b!='bot') GROUP BY u`).all<{ u: string; c: number }>(),
      one(DB.prepare(`SELECT COUNT(DISTINCT user_id) AS n FROM user_days WHERE day >= date('now','+9 hours','-14 days') AND day < date('now','+9 hours','-7 days')`).first<{ n: number }>()),
      one(DB.prepare(`SELECT COUNT(DISTINCT user_id) AS n FROM user_days WHERE day >= date('now','+9 hours','-7 days')`).first<{ n: number }>()),
      DB.prepare(`SELECT ${kday("created_at")} AS d, mode, COUNT(*) AS n FROM matches WHERE created_at > ? GROUP BY d, mode ORDER BY d`).bind(cut30).all<{ d: string; mode: string; n: number }>(),
      DB.prepare(`SELECT mmr FROM ratings WHERE season = ?`).bind(seasonKey()).all<{ mmr: number }>(),
      one(DB.prepare(`SELECT SUM(winner=player_a) AS w, COUNT(*) AS n FROM matches WHERE mode!='bot' AND winner IS NOT NULL AND ${verClause}`).bind(...verBind).first<{ w: number; n: number }>()),
      one(DB.prepare(`SELECT AVG(turns) AS avg, COUNT(turns) AS n FROM matches WHERE turns IS NOT NULL AND ${verClause}`).bind(...verBind).first<{ avg: number; n: number }>()),
      one(DB.prepare(`SELECT COUNT(*) AS n FROM ratings WHERE season = ?`).bind(seasonKey()).first<{ n: number }>()),
      // ---- trend: DAU by day (30d; user_days holds KST day strings going forward) ----
      DB.prepare(`SELECT day AS d, COUNT(*) AS n FROM user_days WHERE day >= date('now','+9 hours','-30 days') GROUP BY day ORDER BY day`).all<{ d: string; n: number }>(),
      // ---- funnel steps ----
      one(DB.prepare(`SELECT COUNT(DISTINCT user_id) AS n FROM rewards WHERE key = 'tuto:10'`).first<{ n: number }>()),
      one(DB.prepare(`SELECT COUNT(DISTINCT user_id) AS n FROM ratings`).first<{ n: number }>()),
      // ---- credit economy ----
      one(DB.prepare(`SELECT SUM(credits) AS s, COUNT(*) AS n FROM users`).first<{ s: number; n: number }>()),
      DB.prepare(`SELECT CASE WHEN key LIKE 'tuto:%' THEN 'tutorial' WHEN key LIKE 'tut:%' THEN 'tutorial_legacy' ELSE key END AS k, SUM(amount) AS amt, COUNT(*) AS n FROM rewards GROUP BY k ORDER BY amt DESC`).all<{ k: string; amt: number; n: number }>(),
      one(DB.prepare(`SELECT SUM(co.amount) AS amt, COUNT(*) AS n FROM coupon_claims cc JOIN coupons co ON co.code = cc.code`).first<{ amt: number; n: number }>()),
      DB.prepare(`SELECT code, amount, max_uses, uses, expires_at FROM coupons ORDER BY code`).all<{ code: string; amount: number; max_uses: number | null; uses: number; expires_at: number | null }>(),
      DB.prepare(`SELECT CASE WHEN credits=0 THEN 'b0' WHEN credits<500 THEN 'b1' WHEN credits<1000 THEN 'b2' WHEN credits<2000 THEN 'b3' ELSE 'b4' END AS b, COUNT(*) AS n FROM users GROUP BY b`).all<{ b: string; n: number }>(),
      DB.prepare(`SELECT sleeves FROM users WHERE sleeves IS NOT NULL AND sleeves != ''`).all<{ sleeves: string }>(),
      // ---- deck adoption (active deck of each user; NULL = default deck) ----
      DB.prepare(`SELECT deck FROM users WHERE deck IS NOT NULL AND deck != ''`).all<{ deck: string }>(),
      // ---- game health (selected balance version, PvP) ----
      one(DB.prepare(`SELECT AVG(ended_at-created_at) AS avg, COUNT(*) AS n FROM matches WHERE mode!='bot' AND ended_at IS NOT NULL AND ended_at > created_at AND ${verClause}`).bind(...verBind).first<{ avg: number; n: number }>()),
      one(DB.prepare(`SELECT SUM(winner IS NULL) AS d, COUNT(*) AS n FROM matches WHERE mode!='bot' AND ${verClause}`).bind(...verBind).first<{ d: number; n: number }>()),
      one(DB.prepare(`SELECT SUM(winner=player_a) AS w, SUM(winner='bot') AS l, SUM(winner IS NULL) AS d, COUNT(*) AS n FROM matches WHERE mode='bot'`).first<{ w: number; l: number; d: number; n: number }>()),
      // ---- live feed: latest matches with display names ----
      DB.prepare(
        `SELECT m.mode, m.winner, m.turns, m.created_at, m.ended_at, m.player_a, m.player_b, m.bver,
                ua.display AS na, ub.display AS nb
         FROM matches m LEFT JOIN users ua ON ua.id = m.player_a LEFT JOIN users ub ON ub.id = m.player_b
         ORDER BY m.created_at DESC LIMIT 20`
      ).all<{ mode: string; winner: string | null; turns: number | null; created_at: number; ended_at: number | null; player_a: string; player_b: string; bver: string | null; na: string | null; nb: string | null }>(),
    ]);

    // distinct balance versions present (for the dropdown); include current even if empty
    const verRows = await DB.prepare(`SELECT COALESCE(bver,'legacy') AS v, COUNT(*) AS n FROM matches WHERE mode!='bot' GROUP BY v ORDER BY v DESC`).all<{ v: string; n: number }>();
    const versions = verRows.results ?? [];
    if (!versions.some((r) => r.v === BALANCE_VERSION)) versions.unshift({ v: BALANCE_VERSION, n: 0 });

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

    // 30-day trend, merged over the union of days (DAU / games / signups)
    const trendMap = new Map<string, { d: string; dau: number; games: number; signups: number }>();
    const trendAt = (d: string) => { let t = trendMap.get(d); if (!t) { t = { d, dau: 0, games: 0, signups: 0 }; trendMap.set(d, t); } return t; };
    for (const r of dauByDay.results ?? []) trendAt(r.d).dau = r.n;
    for (const r of gamesByDay.results ?? []) trendAt(r.d).games += r.n;
    for (const r of signupsByDay.results ?? []) trendAt(r.d).signups = r.n;
    const trend = [...trendMap.values()].sort((a, b) => a.d.localeCompare(b.d));

    // per-card stats for the SELECTED balance version: buys, plays, games-used, win-rate.
    const recent = await DB.prepare(
      `SELECT player_a, player_b, winner, cards_a, cards_b, buys_a, buys_b FROM matches WHERE mode!='bot' AND cards_a IS NOT NULL AND ${verClause} ORDER BY created_at DESC LIMIT 4000`
    ).bind(...verBind).all<{ player_a: string; player_b: string; winner: string | null; cards_a: string; cards_b: string; buys_a: string | null; buys_b: string | null }>();
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

    // starter cards: deck adoption (active decks) + in-match plays/win-rate from the same agg
    const deckCount: Record<string, number> = {};
    for (const r of deckRows.results ?? []) for (const id of r.deck.split(",")) if (id) deckCount[id] = (deckCount[id] ?? 0) + 1;
    const deckUsers = (deckRows.results ?? []).length; // users with a custom active deck
    const starters = DECK_POOL.map((id) => {
      const a = agg[id] ?? { buys: 0, plays: 0, win: 0, lose: 0 };
      const games = a.win + a.lose;
      return { id, decks: deckCount[id] ?? 0, plays: a.plays, games, winrate: games > 0 ? a.win / games : null };
    });

    // sleeve ownership (economy sink)
    const sleeveCount: Record<string, number> = {};
    let sleeveOwners = 0;
    for (const r of sleeveRows.results ?? []) {
      const ids = r.sleeves.split(",").map((s) => s.trim()).filter((s) => s && s !== "default");
      if (ids.length) sleeveOwners++;
      for (const id of ids) sleeveCount[id] = (sleeveCount[id] ?? 0) + 1;
    }

    const issuedRewards = (rewardIssued.results ?? []).map((r) => ({ k: r.k, amt: r.amt ?? 0, n: r.n }));
    const issuedTotal = issuedRewards.reduce((s, r) => s + r.amt, 0) + (couponClaimed?.amt ?? 0);
    const circulating = creditAgg?.s ?? 0;
    const buckets: Record<string, number> = { b0: 0, b1: 0, b2: 0, b3: 0, b4: 0 };
    for (const r of creditBuckets.results ?? []) buckets[r.b] = r.n;

    return json(env, {
      overview: {
        users, dauToday: dauToday?.n ?? 0, newToday: newToday?.n ?? 0, gamesToday: gamesToday?.n ?? 0,
        wau: wau?.n ?? 0, mau: mau?.n ?? 0,
        stickiness: (mau?.n ?? 0) > 0 ? (dauToday?.n ?? 0) / (mau!.n) : 0, // DAU/MAU
        matches,
        trend, // [{d, dau, games, signups}] — 30d, KST days
        recent: (recentMatches.results ?? []).map((m) => ({
          mode: m.mode, turns: m.turns, at: m.created_at, bver: m.bver,
          durMs: m.ended_at != null && m.ended_at > m.created_at ? m.ended_at - m.created_at : null,
          a: m.na ?? m.player_a.slice(0, 8), b: m.player_b === "bot" ? "BOT" : (m.nb ?? m.player_b.slice(0, 8)),
          winner: m.winner == null ? null : m.winner === m.player_a ? "a" : "b",
        })),
      },
      acquisition: {
        signupsByDay: signupsByDay.results ?? [],
        signupsBySource: signupsBySource.results ?? [],
        verifiedRate: (verifiedAgg?.n ?? 0) > 0 ? (verifiedAgg!.v ?? 0) / verifiedAgg!.n : 0,
        loginSplit: { google: loginAgg?.g ?? 0, email: (loginAgg?.n ?? 0) - (loginAgg?.g ?? 0) },
        invitedSignups: invitedCount?.n ?? 0,
        invites: Object.fromEntries((inviteAgg.results ?? []).map((r) => [r.status, r.n])),
        // funnel: signup → verified → tutorial cleared → first game → 6+ games → ranked (all-time)
        funnel: {
          signup: users,
          verified: verifiedAgg?.v ?? 0,
          tutorial: tutorialDone?.n ?? 0,
          firstGame: playedIds.size,
          sixPlus: depth.d6p,
          ranked: rankedEver?.n ?? 0,
        },
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
        starters, deckUsers, defaultDeckUsers: Math.max(0, users - deckUsers),
        firstTurnWinRate: (firstTurn?.n ?? 0) > 0 ? (firstTurn!.w ?? 0) / firstTurn!.n : null,
        firstTurnSample: firstTurn?.n ?? 0,
        avgTurns: turnsAgg?.avg ?? null, turnsSample: turnsAgg?.n ?? 0,
        // avg PvP duration — only rows recorded after gameRoom.startedAt landed (ended_at > created_at)
        avgDurMs: durAgg?.avg ?? null, durSample: durAgg?.n ?? 0,
        drawRate: (drawAgg?.n ?? 0) > 0 ? (drawAgg!.d ?? 0) / drawAgg!.n : null, drawSample: drawAgg?.n ?? 0,
        bot: { n: botAgg?.n ?? 0, w: botAgg?.w ?? 0, l: botAgg?.l ?? 0, d: botAgg?.d ?? 0 },
        currentVersion: BALANCE_VERSION, selectedVersion: selVer, versions,
      },
      monetization: {
        note: "결제(Paddle) 연동 후 구독/판매가 실데이터로 채워집니다",
        subscriptions: 0, cancellations: 0, sales: 0, adRevenue: 0,
        credits: {
          circulating, issuedTotal, spent: Math.max(0, issuedTotal - circulating),
          holders: creditAgg?.n ?? 0,
          avgHold: (creditAgg?.n ?? 0) > 0 ? circulating / creditAgg!.n : 0,
          issuedRewards,
          couponIssued: couponClaimed?.amt ?? 0, couponClaims: couponClaimed?.n ?? 0,
          coupons: couponRows.results ?? [],
          buckets,
          sleeves: Object.entries(sleeveCount).map(([id, n]) => ({ id, n })).sort((a, b) => b.n - a.n),
          sleeveOwners,
        },
      },
    });
  }

  // 실시간 접속 현황 (가벼운 폴링용) — 최근 45초 내 하트비트만 유효
  if (path === "/admin/presence") {
    const win = Date.now() - 45_000;
    const rows = await env.DB.prepare(`SELECT state, COUNT(*) AS n FROM presence WHERE ts > ? GROUP BY state`).bind(win).all<{ state: string; n: number }>();
    const by = Object.fromEntries((rows.results ?? []).map((r) => [r.state, r.n]));
    const online = by.online ?? 0, bot = by.bot ?? 0, queue = by.queue ?? 0, menu = by.menu ?? 0;
    // 오래된 행 청소 (1시간+) — 가벼운 유지보수
    void env.DB.prepare(`DELETE FROM presence WHERE ts < ?`).bind(Date.now() - 3600_000).run().catch(() => { /* best effort */ });
    return json(env, { online, bot, queue, menu, playing: online + bot, total: online + bot + queue + menu, ts: Date.now() });
  }

  if (path === "/admin/users") {
    const rows = await env.DB.prepare(
      `SELECT u.id, u.email, u.display, u.created_at, u.verified, u.source, u.wins, u.losses, u.invited_by, u.credits,
              (SELECT r.mmr FROM ratings r WHERE r.user_id = u.id AND r.season = ?) AS mmr,
              (SELECT MAX(ud.day) FROM user_days ud WHERE ud.user_id = u.id) AS last_day,
              (u.password = 'oauth:google') AS is_google
       FROM users u ORDER BY u.created_at DESC LIMIT 500`
    ).bind(seasonKey()).all();
    return json(env, { users: rows.results ?? [] });
  }

  return json(env, { error: "not found" }, 404);
}
