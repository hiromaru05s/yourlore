// ============================================================
// LORE server — ranked ladder.
//   · Monthly seasons keyed "YYYY-MM" (UTC). Rollover is LAZY:
//     the first ranked activity of a new month seeds the row from
//     last season's MMR, soft-reset toward 1000 ((mmr+1000)/2).
//     Past-season rows are therefore immutable snapshots (history).
//   · Elo: start 1000, K=32, symmetric. Bands tuned so ~11-12
//     straight wins from a fresh account reach Gold (1150).
//   · Tiers: Iron → Master by MMR band; GRANDMASTER = top 25 by MMR
//     among Masters (mmr ≥ 1550), recomputed live from the ladder.
// ============================================================
import type { Env, SessionUser } from "./env";
import { corsHeaders } from "./auth";
import { markInviteEarned } from "./invite";

export const TIERS = [
  { key: "iron", min: 0 },
  { key: "bronze", min: 1030 },
  { key: "silver", min: 1090 },
  { key: "gold", min: 1150 },
  { key: "platinum", min: 1250 },
  { key: "diamond", min: 1400 },
  { key: "master", min: 1550 },
] as const;
export type TierKey = (typeof TIERS)[number]["key"] | "gm";

const START_MMR = 1000;
const K = 32;
const GM_TOP = 25;        // top N Masters = Grandmaster
const MASTER_MIN = 1550;
const LB_LIMIT = 100;

export function seasonKey(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
function prevSeasonKey(d = new Date()): string {
  return seasonKey(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1)));
}
export function tierOf(mmr: number): TierKey {
  let t: TierKey = "iron";
  for (const x of TIERS) if (mmr >= x.min) t = x.key;
  return t;
}
/** Final tier incl. GM: rank is the player's position on that season's ladder (1-based). */
function tierWithGm(mmr: number, rank: number): TierKey {
  const base = tierOf(mmr);
  return base === "master" && rank <= GM_TOP && mmr >= MASTER_MIN ? "gm" : base;
}

export interface RatingRow { user_id: string; season: string; mmr: number; wins: number; losses: number; peak_mmr: number; }

/** Get (or lazily create with soft reset) this season's rating row. */
export async function getRating(env: Env, userId: string): Promise<RatingRow> {
  const season = seasonKey();
  const row = await env.DB.prepare(`SELECT user_id, season, mmr, wins, losses, peak_mmr FROM ratings WHERE user_id = ? AND season = ?`)
    .bind(userId, season).first<RatingRow>();
  if (row) return row;
  const prev = await env.DB.prepare(`SELECT mmr FROM ratings WHERE user_id = ? AND season = ?`)
    .bind(userId, prevSeasonKey()).first<{ mmr: number }>();
  const mmr = prev ? Math.round((prev.mmr + START_MMR) / 2) : START_MMR;
  await env.DB.prepare(`INSERT OR IGNORE INTO ratings (user_id, season, mmr, wins, losses, peak_mmr, updated_at) VALUES (?,?,?,0,0,?,?)`)
    .bind(userId, season, mmr, mmr, Date.now()).run();
  return { user_id: userId, season, mmr, wins: 0, losses: 0, peak_mmr: mmr };
}

/** before/after MMR for one player — surfaced to the client so the result screen can show ±delta. */
export interface RankChange { before: number; after: number; }
export type RankOutcome = Record<string, RankChange>; // keyed by user id

/** Apply a ranked result (Elo). Returns each player's before/after MMR. Best-effort. */
export async function applyRanked(env: Env, winnerId: string, loserId: string): Promise<RankOutcome> {
  const [w, l] = await Promise.all([getRating(env, winnerId), getRating(env, loserId)]);
  const expW = 1 / (1 + Math.pow(10, (l.mmr - w.mmr) / 400));
  const d = Math.max(1, Math.round(K * (1 - expW)));
  // Slight inflation so ranked isn't strictly zero-sum: the winner gains a small flat
  // bonus on top of the Elo exchange (the loser drops by the plain Elo delta). Keeps the
  // ladder from bleeding points over a season; the monthly soft-reset contains drift.
  const WIN_BONUS = 2;
  const wNew = w.mmr + d + WIN_BONUS;
  const lNew = Math.max(0, l.mmr - d);
  const now = Date.now();
  const season = seasonKey();
  await env.DB.batch([
    env.DB.prepare(`UPDATE ratings SET mmr = ?, wins = wins + 1, peak_mmr = MAX(peak_mmr, ?), updated_at = ? WHERE user_id = ? AND season = ?`)
      .bind(wNew, wNew, now, winnerId, season),
    env.DB.prepare(`UPDATE ratings SET mmr = ?, losses = losses + 1, updated_at = ? WHERE user_id = ? AND season = ?`)
      .bind(lNew, now, loserId, season),
  ]);
  // 초대 캠페인: 골드 도달 시 보상 장부를 'earned'로
  const goldMin = TIERS.find((t) => t.key === "gold")!.min;
  if (wNew >= goldMin && w.mmr < goldMin) await markInviteEarned(env, winnerId).catch(() => { /* best effort */ });
  return { [winnerId]: { before: w.mmr, after: wNew }, [loserId]: { before: l.mmr, after: lNew } };
}

/** Apply a ranked DRAW (75-turn limit): Elo with S=0.5 — equal players move 0, unequal slightly. */
export async function applyRankedDraw(env: Env, aId: string, bId: string): Promise<RankOutcome> {
  const [a, b] = await Promise.all([getRating(env, aId), getRating(env, bId)]);
  const expA = 1 / (1 + Math.pow(10, (b.mmr - a.mmr) / 400));
  const d = Math.round(K * (0.5 - expA)); // positive → a gains, b loses
  const aNew = Math.max(0, a.mmr + d);
  const bNew = Math.max(0, b.mmr - d);
  const now = Date.now();
  const season = seasonKey();
  await env.DB.batch([
    env.DB.prepare(`UPDATE ratings SET mmr = ?, peak_mmr = MAX(peak_mmr, ?), updated_at = ? WHERE user_id = ? AND season = ?`)
      .bind(aNew, aNew, now, aId, season),
    env.DB.prepare(`UPDATE ratings SET mmr = ?, peak_mmr = MAX(peak_mmr, ?), updated_at = ? WHERE user_id = ? AND season = ?`)
      .bind(bNew, bNew, now, bId, season),
  ]);
  return { [aId]: { before: a.mmr, after: aNew }, [bId]: { before: b.mmr, after: bNew } };
}

// ---- REST: /api/rank/* ----
function json(env: Env, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...corsHeaders(env) } });
}

export async function handleRank(env: Env, req: Request, path: string, user: SessionUser | null): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(env) });

  // 시즌 리더보드 (기본: 현재 시즌; 과거 시즌은 최종 스냅샷)
  if (path === "/rank/leaderboard") {
    const url = new URL(req.url);
    const season = (url.searchParams.get("season") || seasonKey()).slice(0, 7);
    const rows = await env.DB.prepare(
      `SELECT r.mmr, r.wins, r.losses, u.display FROM ratings r JOIN users u ON u.id = r.user_id
       WHERE r.season = ? ORDER BY r.mmr DESC, r.updated_at ASC LIMIT ?`
    ).bind(season, LB_LIMIT).all<{ mmr: number; wins: number; losses: number; display: string }>();
    const entries = (rows.results ?? []).map((r, i) => ({
      rank: i + 1, display: r.display, mmr: r.mmr, wins: r.wins, losses: r.losses,
      tier: tierWithGm(r.mmr, i + 1),
    }));
    return json(env, { season, entries });
  }

  // 내 현재 시즌 레이팅 + 순위
  if (path === "/rank/me") {
    if (!user) return json(env, { rating: null });
    const r = await getRating(env, user.id);
    const above = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ratings WHERE season = ? AND mmr > ?`)
      .bind(r.season, r.mmr).first<{ n: number }>();
    const rank = (above?.n ?? 0) + 1;
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
        const above = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ratings WHERE season = ? AND mmr > ?`)
          .bind(r.season, r.mmr).first<{ n: number }>();
        rank = (above?.n ?? 0) + 1;
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
    if (auth !== `Bearer ${env.AUTH_SECRET}`) return json(env, { error: "unauthorized" }, 401);
    const url = new URL(req.url);
    const season = (url.searchParams.get("season") || prevSeasonKey()).slice(0, 7);
    if (season >= seasonKey()) return json(env, { error: "진행 중인 시즌은 확정할 수 없습니다." }, 400);
    const rows = await env.DB.prepare(
      `SELECT user_id, mmr FROM ratings WHERE season = ? ORDER BY mmr DESC, updated_at ASC`
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
