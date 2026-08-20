// ============================================================
// LORE server — one-shot credit rewards (tutorial steps, …).
// The client only ever sends a reward KEY; amounts live here
// (server-authoritative) and the rewards table's PK guarantees
// each (user, key) is paid at most once.
// ============================================================
import type { Env } from "./env";
import { corsHeaders, getUser } from "./auth";

/** Reward table — the single source of truth for amounts. */
export const REWARDS: Record<string, number> = {
  // legacy 6-step tutorial (kept so old grads' claims stay valid) — total 150
  "tut:1": 10, "tut:2": 20, "tut:3": 25, "tut:4": 25, "tut:5": 30, "tut:6": 40,
  // interactive tutorial v2 — 10 hands-on steps, total 1000
  "tuto:1": 50,   // 화면 이해
  "tuto:2": 70,   // 카드 구매
  "tuto:3": 80,   // 제시 리롤
  "tuto:4": 90,   // 몬스터 소환
  "tuto:5": 100,  // 마법 시전
  "tuto:6": 90,   // 공격
  "tuto:7": 110,  // 함정
  "tuto:8": 130,  // 종족 시너지
  "tuto:9": 80,   // 어튠
  "tuto:10": 200, // 승리
};

function json(env: Env, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(env) },
  });
}

// ============================================================
// Daily missions — progress is COMPUTED from the matches table
// (no extra tracking; the client can't fake it). Claims reuse the
// rewards table with a per-day key: "d:<YYYYMMDD>:<mission id>".
// Day boundary = KST (UTC+9), the main player base's midnight.
// ============================================================
interface MissionDef { id: string; goal: number; amount: number; }
const DAILY_MISSIONS: MissionDef[] = [
  { id: "play3", goal: 3, amount: 30 },   // 오늘 3판 플레이 (모드 무관)
  { id: "win1", goal: 1, amount: 40 },    // 오늘 1승
  { id: "ranked1", goal: 1, amount: 50 }, // 오늘 랭크전 1판
];
const KST_OFFSET_MS = 9 * 3600_000;
function kstDayKey(now = Date.now()): string {
  const d = new Date(now + KST_OFFSET_MS);
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
}
/** [start, end) of the current KST day in epoch ms. */
function kstDayRange(now = Date.now()): [number, number] {
  const start = Math.floor((now + KST_OFFSET_MS) / 86400_000) * 86400_000 - KST_OFFSET_MS;
  return [start, start + 86400_000];
}

async function missionProgress(env: Env, userId: string): Promise<Record<string, number>> {
  const [from, to] = kstDayRange();
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS plays,
            SUM(winner = ?1) AS wins,
            SUM(mode = 'ranked') AS ranked
     FROM matches
     WHERE (player_a = ?1 OR player_b = ?1) AND created_at >= ?2 AND created_at < ?3`
  ).bind(userId, from, to).first<{ plays: number; wins: number | null; ranked: number | null }>();
  return { play3: row?.plays ?? 0, win1: row?.wins ?? 0, ranked1: row?.ranked ?? 0 };
}

export async function handleRewards(env: Env, req: Request, path: string): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(env) });
  const user = await getUser(env, req);
  if (!user) return json(env, { error: "로그인이 필요합니다." }, 401);

  // GET /rewards/claimed → keys already paid to this user (+ current balance)
  if (path === "/rewards/claimed" && req.method === "GET") {
    const rows = await env.DB.prepare(`SELECT key FROM rewards WHERE user_id = ?`)
      .bind(user.id).all<{ key: string }>();
    return json(env, { keys: (rows.results ?? []).map((r) => r.key), credits: user.credits });
  }

  // POST /rewards/claim { key } → grant once; always returns the fresh balance
  if (path === "/rewards/claim" && req.method === "POST") {
    const body = (await req.json().catch(() => ({}))) as { key?: string };
    const key = body.key || "";
    const amount = REWARDS[key];
    if (!amount) return json(env, { error: "unknown reward" }, 400);

    const ins = await env.DB.prepare(
      `INSERT OR IGNORE INTO rewards (user_id, key, amount, created_at) VALUES (?,?,?,?)`
    ).bind(user.id, key, amount, Date.now()).run();
    const granted = (ins.meta?.changes ?? 0) > 0;
    if (granted) {
      await env.DB.prepare(`UPDATE users SET credits = credits + ? WHERE id = ?`)
        .bind(amount, user.id).run();
    }
    const row = await env.DB.prepare(`SELECT credits FROM users WHERE id = ?`)
      .bind(user.id).first<{ credits: number }>();
    return json(env, { granted, amount: granted ? amount : 0, credits: row?.credits ?? 0 });
  }

  // GET /rewards/daily → today's missions with live progress + claim state
  if (path === "/rewards/daily" && req.method === "GET") {
    const day = kstDayKey();
    const [progress, claimed] = await Promise.all([
      missionProgress(env, user.id),
      env.DB.prepare(`SELECT key FROM rewards WHERE user_id = ? AND key LIKE ?`)
        .bind(user.id, `d:${day}:%`).all<{ key: string }>(),
    ]);
    const claimedSet = new Set((claimed.results ?? []).map((r) => r.key));
    const missions = DAILY_MISSIONS.map((m) => ({
      id: m.id, goal: m.goal, amount: m.amount,
      progress: Math.min(m.goal, progress[m.id] ?? 0),
      claimed: claimedSet.has(`d:${day}:${m.id}`),
    }));
    return json(env, { day, missions, credits: user.credits });
  }

  // POST /rewards/daily/claim { id } → verify progress server-side, pay once per day
  if (path === "/rewards/daily/claim" && req.method === "POST") {
    const body = (await req.json().catch(() => ({}))) as { id?: string };
    const m = DAILY_MISSIONS.find((x) => x.id === body.id);
    if (!m) return json(env, { error: "unknown mission" }, 400);
    const progress = await missionProgress(env, user.id);
    if ((progress[m.id] ?? 0) < m.goal) return json(env, { error: "아직 달성하지 못한 임무입니다." }, 400);
    const key = `d:${kstDayKey()}:${m.id}`;
    const ins = await env.DB.prepare(
      `INSERT OR IGNORE INTO rewards (user_id, key, amount, created_at) VALUES (?,?,?,?)`
    ).bind(user.id, key, m.amount, Date.now()).run();
    const granted = (ins.meta?.changes ?? 0) > 0;
    if (granted) {
      await env.DB.prepare(`UPDATE users SET credits = credits + ? WHERE id = ?`)
        .bind(m.amount, user.id).run();
    }
    const row = await env.DB.prepare(`SELECT credits FROM users WHERE id = ?`)
      .bind(user.id).first<{ credits: number }>();
    return json(env, { granted, amount: granted ? m.amount : 0, credits: row?.credits ?? 0 });
  }

  // POST /rewards/coupon { code } → redeem a coupon code (once per user; server-side caps)
  if (path === "/rewards/coupon" && req.method === "POST") {
    const body = (await req.json().catch(() => ({}))) as { code?: string };
    const code = (body.code || "").trim().toUpperCase().slice(0, 32);
    if (!code) return json(env, { error: "쿠폰 코드를 입력하세요." }, 400);
    const c = await env.DB.prepare(`SELECT code, amount, max_uses, uses, expires_at FROM coupons WHERE code = ?`)
      .bind(code).first<{ code: string; amount: number; max_uses: number | null; uses: number; expires_at: number | null }>();
    if (!c) return json(env, { error: "존재하지 않는 쿠폰입니다." }, 404);
    if (c.expires_at != null && c.expires_at < Date.now()) return json(env, { error: "만료된 쿠폰입니다." }, 410);
    if (c.max_uses != null && c.uses >= c.max_uses) return json(env, { error: "소진된 쿠폰입니다." }, 410);
    const ins = await env.DB.prepare(`INSERT OR IGNORE INTO coupon_claims (code, user_id, created_at) VALUES (?,?,?)`)
      .bind(code, user.id, Date.now()).run();
    if ((ins.meta?.changes ?? 0) === 0) return json(env, { error: "이미 사용한 쿠폰입니다." }, 409);
    await env.DB.batch([
      env.DB.prepare(`UPDATE coupons SET uses = uses + 1 WHERE code = ?`).bind(code),
      env.DB.prepare(`UPDATE users SET credits = credits + ? WHERE id = ?`).bind(c.amount, user.id),
    ]);
    const row = await env.DB.prepare(`SELECT credits FROM users WHERE id = ?`).bind(user.id).first<{ credits: number }>();
    return json(env, { granted: true, amount: c.amount, credits: row?.credits ?? 0 });
  }

  return json(env, { error: "not found" }, 404);
}
