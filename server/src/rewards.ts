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
  // interactive tutorial — one per step, total 150
  "tut:1": 10, // 화면 살펴보기
  "tut:2": 20, // 카드 구매
  "tut:3": 25, // 몬스터 소환
  "tut:4": 25, // 공격
  "tut:5": 30, // 함정
  "tut:6": 40, // 승리
};

function json(env: Env, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(env) },
  });
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

  return json(env, { error: "not found" }, 404);
}
