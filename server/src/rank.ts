// ============================================================
// LORE server — ranked ladder.
//   · Monthly seasons keyed "YYYY-MM" (UTC). Rollover is LAZY:
//     the first ranked activity of a new month seeds the row from
//     last season's MMR, soft-reset toward 1000 ((mmr+1000)/2).
//     Past-season rows are therefore immutable snapshots (history).
//   · Elo: start 1000, K=32, winner bonus +2. Bands tuned so ~11-12
//     straight wins from a fresh account reach Gold (1150).
//   · Tiers: Iron → Master by MMR band; GRANDMASTER = top 25 by MMR
//     among Masters (mmr ≥ 1550), recomputed live from the ladder.
// ============================================================
import type { Env, SessionUser } from "./env";
import { corsHeaders } from "./auth";
import { markInviteEarned } from "./invite";

import { TIERS, START_MMR, tierOf, tierWithGm, calculateRating, type RankChange } from "../../client/src/shared/rank";
export { TIERS, tierOf, tierWithGm, calculateRating } from "../../client/src/shared/rank";
export type { TierKey, RankChange } from "../../client/src/shared/rank";
const LB_DEFAULT_LIMIT = 100;
const LB_MAX_LIMIT = 100;
export function seasonKey(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
function prevSeasonKey(d = new Date()): string {
  return seasonKey(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1)));
}
export interface RatingRow { user_id: string; season: string; mmr: number; wins: number; losses: number; peak_mmr: number; updated_at: number; }

/** Get (or lazily create with soft reset) this season's rating row. */
export async function getRating(env: Env, userId: string, season = seasonKey()): Promise<RatingRow> {
  const row = await env.DB.prepare(`SELECT user_id, season, mmr, wins, losses, peak_mmr, updated_at FROM ratings WHERE user_id = ? AND season = ?`)
    .bind(userId, season).first<RatingRow>();
  if (row) return row;
  const prev = await env.DB.prepare(`SELECT mmr FROM ratings WHERE user_id = ? AND season = ?`)
    .bind(userId, prevSeasonKey(new Date(season + "-01T00:00:00Z"))).first<{ mmr: number }>();
  const mmr = prev ? Math.round((prev.mmr + START_MMR) / 2) : START_MMR;
  await env.DB.prepare(`INSERT OR IGNORE INTO ratings (user_id, season, mmr, wins, losses, peak_mmr, updated_at) VALUES (?,?,?,0,0,?,?)`)
    .bind(userId, season, mmr, mmr, Date.now()).run();
  return (await env.DB.prepare(`SELECT user_id, season, mmr, wins, losses, peak_mmr, updated_at FROM ratings WHERE user_id = ? AND season = ?`).bind(userId, season).first<RatingRow>())!;
}

export type RankOutcome = Record<string, RankChange>;
interface Settlement {
  match_id: string; season: string;
  a_id: string; b_id: string; a_before: number; b_before: number; a_after: number; b_after: number;
  a_rank_before: number | null; b_rank_before: number | null;
  a_rank_after: number | null; b_rank_after: number | null;
}
function outcomeOf(r: Settlement): RankOutcome {
  const change = (side: "a" | "b"): RankChange => {
    const before = r[`${side}_before`], after = r[`${side}_after`];
    const rankBefore = r[`${side}_rank_before`] ?? undefined, rankAfter = r[`${side}_rank_after`] ?? undefined;
    return { matchId: r.match_id, season: r.season, before, after, rankBefore, rankAfter,
      tierBefore: rankBefore ? tierWithGm(before, rankBefore) : tierOf(before),
      tierAfter: rankAfter ? tierWithGm(after, rankAfter) : tierOf(after) };
  };
  return { [r.a_id]: change("a"), [r.b_id]: change("b") };
}
// Run inside the settlement transaction, before/after BOTH players are updated.
const standingSql = `(SELECT position FROM (SELECT user_id, ROW_NUMBER() OVER (ORDER BY mmr DESC, updated_at ASC, user_id ASC) AS position FROM ratings WHERE season=?) WHERE user_id=?)`;

/** Ledger + both rating updates commit together. CAS retries resolve concurrent rooms. */
export async function settleRanked(env: Env, matchId: string, aId: string, bId: string, winner: string | null, endedAt: number): Promise<RankOutcome> {
  if (aId === bId || (winner !== null && winner !== aId && winner !== bId)) throw new Error("Invalid ranked participants");
  const season = seasonKey(new Date(endedAt));
  for (let attempt = 0; attempt < 8; attempt++) {
    const existing = await env.DB.prepare(`SELECT * FROM ranked_results WHERE match_id = ? AND applied = 1`).bind(matchId).first<Settlement>();
    if (existing) return outcomeOf(existing);
    const [a,b] = await Promise.all([getRating(env,aId,season), getRating(env,bId,season)]);
    const [an,bn] = calculateRating(a.mmr,b.mmr,winner === null ? 0.5 : winner === aId ? 1 : 0);
    const stamp = Math.max(Date.now(), a.updated_at + 1, b.updated_at + 1);
    const gate = `EXISTS (SELECT 1 FROM ranked_results WHERE match_id = ? AND applied = 0)`;
    await env.DB.batch([
      env.DB.prepare(`INSERT OR IGNORE INTO ranked_results (match_id,season,a_id,b_id,winner,a_before,b_before,a_after,b_after,created_at)
        SELECT ?,?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM ratings WHERE user_id=? AND season=? AND updated_at=?)
        AND EXISTS (SELECT 1 FROM ratings WHERE user_id=? AND season=? AND updated_at=?)`)
        .bind(matchId,season,aId,bId,winner,a.mmr,b.mmr,an,bn,endedAt,aId,season,a.updated_at,bId,season,b.updated_at),
      env.DB.prepare(`UPDATE ranked_results SET a_rank_before=${standingSql}, b_rank_before=${standingSql} WHERE match_id=? AND applied=0`)
        .bind(season,aId,season,bId,matchId),
      env.DB.prepare(`UPDATE ratings SET mmr=?, wins=wins+?, losses=losses+?, peak_mmr=MAX(peak_mmr,?), updated_at=? WHERE user_id=? AND season=? AND ${gate}`)
        .bind(an,winner===aId?1:0,winner===bId?1:0,an,stamp,aId,season,matchId),
      env.DB.prepare(`UPDATE ratings SET mmr=?, wins=wins+?, losses=losses+?, peak_mmr=MAX(peak_mmr,?), updated_at=? WHERE user_id=? AND season=? AND ${gate}`)
        .bind(bn,winner===bId?1:0,winner===aId?1:0,bn,stamp,bId,season,matchId),
      env.DB.prepare(`UPDATE ranked_results SET a_rank_after=${standingSql}, b_rank_after=${standingSql}, applied=1 WHERE match_id=? AND applied=0`).bind(season,aId,season,bId,matchId),
    ]);
    const result = await env.DB.prepare(`SELECT * FROM ranked_results WHERE match_id = ? AND applied = 1`).bind(matchId).first<Settlement>();
    if (!result) continue;
    for (const [uid,change] of Object.entries(outcomeOf(result))) {
      if (change.after >= 1150 && change.before < 1150) await markInviteEarned(env,uid).catch(() => {});
    }
    return outcomeOf(result);
  }
  throw new Error("Concurrent ranked settlement; retry required");
}

/** Stable tie break, shared by personal standing and the leaderboard. */
export async function rankPosition(env: Env, userId: string, season: string): Promise<number> {
  const r = await env.DB.prepare(`SELECT position FROM (SELECT user_id, ROW_NUMBER() OVER (ORDER BY mmr DESC, updated_at ASC, user_id ASC) AS position FROM ratings WHERE season = ?) WHERE user_id = ?`).bind(season,userId).first<{position:number}>();
  return r?.position ?? 1;
}

// ---- REST: /api/rank/* ----
function json(env: Env, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...corsHeaders(env) } });
}

export async function handleRank(env: Env, req: Request, path: string, user: SessionUser | null): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(env) });

  // Exact match recovery; never infer a match delta from the current /rank/me value.
  if (path === "/rank/result" && req.method === "GET") {
    if (!user) return json(env, { error: "unauthorized" }, 401);
    const matchId = new URL(req.url).searchParams.get("matchId");
    if (!matchId || matchId.length > 128) return json(env, { error: "invalid match" }, 400);
    // Queue/friendly URLs carry the public room name; settlement uses the DO's
    // stable storage identity. Also accept the ledger ID received over the socket.
    const durableId = env.GAME_ROOM.idFromName(matchId).toString();
    const row = await env.DB.prepare(`SELECT * FROM ranked_results WHERE match_id IN (?,?) AND applied=1 AND (a_id=? OR b_id=?)`)
      .bind(matchId,durableId,user.id,user.id).first<Settlement>();
    return json(env, { result: row ? outcomeOf(row)[user.id] : null });
  }

  // 시즌 리더보드 (기본: 현재 시즌; 과거 시즌은 최종 스냅샷)
  if (path === "/rank/leaderboard") {
    const url = new URL(req.url);
    const season = (url.searchParams.get("season") || seasonKey()).slice(0, 7);
    const rawLimit = Number.parseInt(url.searchParams.get("limit") || "", 10);
    const rawOffset = Number.parseInt(url.searchParams.get("offset") || "", 10);
    const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : LB_DEFAULT_LIMIT, 1), LB_MAX_LIMIT);
    const offset = Math.max(Number.isFinite(rawOffset) ? rawOffset : 0, 0);
    const rows = await env.DB.prepare(
      `SELECT r.mmr, r.wins, r.losses, u.display FROM ratings r JOIN users u ON u.id = r.user_id
       WHERE r.season = ? ORDER BY r.mmr DESC, r.updated_at ASC, r.user_id ASC LIMIT ? OFFSET ?`
    ).bind(season, limit, offset).all<{ mmr: number; wins: number; losses: number; display: string }>();
    const totalRow = await env.DB.prepare(`SELECT COUNT(*) AS total FROM ratings WHERE season = ?`)
      .bind(season).first<{ total: number }>();
    const entries = (rows.results ?? []).map((r, i) => ({
      rank: offset + i + 1, display: r.display, mmr: r.mmr, wins: r.wins, losses: r.losses,
      tier: tierWithGm(r.mmr, offset + i + 1),
    }));
    return json(env, { season, total: totalRow?.total ?? 0, entries });
  }

  // 내 현재 시즌 레이팅 + 순위
  if (path === "/rank/me") {
    if (!user) return json(env, { rating: null });
    const r = await getRating(env, user.id);
    const rank = await rankPosition(env, user.id, r.season);
    return json(env, { rating: { season: r.season, mmr: r.mmr, wins: r.wins, losses: r.losses, peak_mmr: r.peak_mmr, rank, tier: tierWithGm(r.mmr, rank) } });
  }

  // 내 과거 시즌 이력 (확정 스냅샷 우선, 미확정이면 즉석 계산)
  if (path === "/rank/history") {
    if (!user) return json(env, { seasons: [] });
    const cur = seasonKey();
    const rows = await env.DB.prepare(
      `SELECT season, mmr, wins, losses, peak_mmr, final_rank, final_tier FROM ratings WHERE user_id = ? AND season != ? ORDER BY season DESC LIMIT 24`
    ).bind(user.id, cur).all<{ season: string; mmr: number; wins: number; losses: number; peak_mmr: number; final_rank: number | null; final_tier: string | null }>();
    const seasons = [];
    for (const r of rows.results ?? []) {
      let rank = r.final_rank, tier = r.final_tier;
      if (rank == null || tier == null) {
        rank = await rankPosition(env, user.id, r.season);
        tier = tierWithGm(r.mmr, rank);
      }
      seasons.push({ season: r.season, mmr: r.mmr, wins: r.wins, losses: r.losses, peak_mmr: r.peak_mmr, rank, tier });
    }
    return json(env, { seasons });
  }

  // 시즌 확정 (수동 트리거, 관리자 전용) — 지난 시즌의 final_rank/final_tier를 박제.
  // 사용: POST /api/rank/finalize[?season=YYYY-MM]  헤더 Authorization: Bearer <AUTH_SECRET>
  if (path === "/rank/finalize" && req.method === "POST") {
    const auth = req.headers.get("Authorization") || "";
    if (!env.AUTH_SECRET || auth !== `Bearer ${env.AUTH_SECRET}`) return json(env, { error: "unauthorized" }, 401);
    const url = new URL(req.url);
    const season = (url.searchParams.get("season") || prevSeasonKey()).slice(0, 7);
    if (season >= seasonKey()) return json(env, { error: "진행 중인 시즌은 확정할 수 없습니다." }, 400);
    const rows = await env.DB.prepare(
      `SELECT user_id, mmr FROM ratings WHERE season = ? ORDER BY mmr DESC, updated_at ASC, user_id ASC`
    ).bind(season).all<{ user_id: string; mmr: number }>();
    const list = rows.results ?? [];
    if (!list.length) return json(env, { season, finalized: 0 });
    const stmts = list.map((r, i) =>
      env.DB.prepare(`UPDATE ratings SET final_rank = ?, final_tier = ? WHERE user_id = ? AND season = ?`)
        .bind(i + 1, tierWithGm(r.mmr, i + 1), r.user_id, season));
    // D1 batch limit — chunk defensively
    for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
    return json(env, { season, finalized: list.length });
  }

  return json(env, { error: "not found" }, 404);
}
