// ============================================================
// LORE server — social: profiles, friends, friendly challenges.
//   · Profile: display rename / preset avatar / equipped badge /
//     stats visibility + recent-match history.
//   · Badges are COMPUTED from real records (server-authoritative):
//     the client only picks which owned badge to equip.
//   · Challenges are polling-based (no new sockets): challenger
//     creates one, target accepts → a GameRoom is provisioned and
//     both sides join it exactly like a matchmade online game.
// ============================================================
import type { Env, SessionUser } from "./env";
import { corsHeaders, sanitizeDisplay } from "./auth";
import { getRating, tierOf, TIERS } from "./rank";

const CHALLENGE_TTL_MS = 90_000;
const PRESENCE_ONLINE_MS = 70_000; // presence heartbeat is 30s — 70s covers 2 missed beats
const MAX_FRIENDS = 100;

// ---- card sleeves (server = authority on price/ownership; client cards.ts mirrors ids) ----
// 'default' is always owned & free. Buyable sleeves cost 1 credit each.
const SLEEVE_PRICE = 1;
const BUYABLE_SLEEVES = new Set(["prism", "abyss", "verdant", "ivory"]);
const ALL_SLEEVES = new Set(["default", ...BUYABLE_SLEEVES]);
/** owned buyable ids from the csv column (default is implicit, never stored). */
function parseSleeves(csv: string | null): string[] {
  return (csv ?? "").split(",").map((s) => s.trim()).filter((s) => BUYABLE_SLEEVES.has(s));
}

function json(env: Env, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...corsHeaders(env) } });
}

// ---- badges (computed; ids are stable keys the client renders) ----
const WIN_BADGES: [number, string][] = [[200, "wins:200"], [50, "wins:50"], [10, "wins:10"]];

export async function ownedBadges(env: Env, userId: string): Promise<string[]> {
  const out: string[] = [];
  const u = await env.DB.prepare(`SELECT wins, created_at FROM users WHERE id = ?`).bind(userId).first<{ wins: number; created_at: number }>();
  if (!u) return out;
  for (const [n, key] of WIN_BADGES) if (u.wins >= n) out.push(key);
  // 최고 도달 티어 (전 시즌 peak + 확정 final_tier 포함) → 그 티어까지 전부 소유
  const r = await env.DB.prepare(
    `SELECT MAX(peak_mmr) AS peak, MAX(CASE WHEN final_tier = 'gm' THEN 1 ELSE 0 END) AS gm FROM ratings WHERE user_id = ?`
  ).bind(userId).first<{ peak: number | null; gm: number }>();
  if (r?.peak != null) {
    const best = tierOf(r.peak);
    const idx = TIERS.findIndex((t) => t.key === best);
    for (let i = 1; i <= idx; i++) out.push(`tier:${TIERS[i].key}`); // iron 제외(기본값이라 뱃지 없음)
    if (r.gm) out.push("tier:gm");
  }
  const tut = await env.DB.prepare(`SELECT 1 AS x FROM rewards WHERE user_id = ? AND key = 'tut:6'`).bind(userId).first();
  if (tut) out.push("tutorial");
  const inv = await env.DB.prepare(`SELECT 1 AS x FROM invite_rewards WHERE inviter_id = ? AND status IN ('earned','paid') LIMIT 1`).bind(userId).first();
  if (inv) out.push("invite");
  return out;
}

interface ProfileRow { id: string; display: string; avatar: string | null; badge: string | null; stats_public: number; wins: number; losses: number; created_at: number; credits: number; sleeve: string | null; sleeves: string | null; }

async function profileOf(env: Env, targetId: string, viewer: SessionUser | null): Promise<Response | Record<string, unknown> | null> {
  const u = await env.DB.prepare(`SELECT id, display, avatar, badge, stats_public, wins, losses, created_at, credits, sleeve, sleeves FROM users WHERE id = ?`)
    .bind(targetId).first<ProfileRow>();
  if (!u) return null;
  const self = viewer?.id === u.id;
  const base = { id: u.id, display: u.display, avatar: u.avatar, badge: u.badge, created_at: u.created_at, self };
  if (!self && !u.stats_public) return { ...base, private: true };

  const rating = await getRating(env, u.id).catch(() => null);
  const above = rating
    ? await env.DB.prepare(`SELECT COUNT(*) AS n FROM ratings WHERE season = ? AND mmr > ?`).bind(rating.season, rating.mmr).first<{ n: number }>()
    : null;
  const matches = await env.DB.prepare(
    `SELECT m.player_a, m.player_b, m.winner, m.mode, m.turns, m.created_at,
            ua.display AS da, ub.display AS db
     FROM matches m LEFT JOIN users ua ON ua.id = m.player_a LEFT JOIN users ub ON ub.id = m.player_b
     WHERE (m.player_a = ?1 OR m.player_b = ?1) AND m.ended_at IS NOT NULL
     ORDER BY m.created_at DESC LIMIT 40`
  ).bind(u.id).all<{ player_a: string; player_b: string; winner: string | null; mode: string; turns: number | null; created_at: number; da: string | null; db: string | null }>();
  const recent = (matches.results ?? []).map((m) => ({
    mode: m.mode,
    result: m.winner == null ? "draw" : m.winner === u.id ? "win" : "loss",
    opp: m.player_a === u.id ? (m.player_b === "bot" ? "BOT" : m.db ?? "?") : (m.player_a === "bot" ? "BOT" : m.da ?? "?"),
    turns: m.turns,
    at: m.created_at,
  }));
  return {
    ...base,
    stats_public: !!u.stats_public,
    wins: u.wins, losses: u.losses,
    tier: rating ? tierOf(rating.mmr) : null,
    mmr: rating?.mmr ?? null,
    rank: above ? (above.n ?? 0) + 1 : null,
    recent,
    ...(self ? {
      badges: await ownedBadges(env, u.id),
      credits: u.credits,
      sleeve: u.sleeve || "default",
      sleeves: ["default", ...parseSleeves(u.sleeves)],
      byMode: await byModeOf(env, u.id),
      h2h: await h2hOf(env, u.id),
    } : {}),
  };
}

/** Per-mode W/L aggregates (self only) for the profile record filter. */
async function byModeOf(env: Env, uid: string): Promise<Record<"ranked" | "online" | "bot", { w: number; l: number }>> {
  const out = { ranked: { w: 0, l: 0 }, online: { w: 0, l: 0 }, bot: { w: 0, l: 0 } };
  try {
    const rows = await env.DB.prepare(
      `SELECT mode,
              SUM(CASE WHEN winner = ?1 THEN 1 ELSE 0 END) AS w,
              SUM(CASE WHEN winner IS NOT NULL AND winner != ?1 THEN 1 ELSE 0 END) AS l
       FROM matches
       WHERE (player_a = ?1 OR player_b = ?1) AND ended_at IS NOT NULL
       GROUP BY mode`
    ).bind(uid).all<{ mode: string; w: number; l: number }>();
    for (const r of rows.results ?? []) {
      const k = r.mode === "ranked" ? "ranked" : r.mode === "bot" ? "bot" : "online";
      out[k] = { w: r.w ?? 0, l: r.l ?? 0 };
    }
  } catch { /* best effort */ }
  return out;
}

/** Head-to-head vs opponents faced 2+ times (self only; PvP modes only, bot excluded). */
async function h2hOf(env: Env, uid: string): Promise<{ oppId: string; oppName: string; wins: number; losses: number; games: number }[]> {
  try {
    const rows = await env.DB.prepare(
      `SELECT t.opp AS oppId, u.display AS oppName,
              SUM(t.win) AS wins, SUM(t.loss) AS losses, COUNT(*) AS games
       FROM (
         SELECT CASE WHEN m.player_a = ?1 THEN m.player_b ELSE m.player_a END AS opp,
                CASE WHEN m.winner = ?1 THEN 1 ELSE 0 END AS win,
                CASE WHEN m.winner IS NOT NULL AND m.winner != ?1 THEN 1 ELSE 0 END AS loss
         FROM matches m
         WHERE (m.player_a = ?1 OR m.player_b = ?1) AND m.ended_at IS NOT NULL AND m.mode IN ('online','ranked')
       ) t
       LEFT JOIN users u ON u.id = t.opp
       GROUP BY t.opp
       HAVING COUNT(*) >= 2
       ORDER BY games DESC, wins DESC LIMIT 40`
    ).bind(uid).all<{ oppId: string; oppName: string | null; wins: number; losses: number; games: number }>();
    return (rows.results ?? []).map((r) => ({ oppId: r.oppId, oppName: r.oppName ?? "?", wins: r.wins ?? 0, losses: r.losses ?? 0, games: r.games ?? 0 }));
  } catch { return []; }
}

// ---- route handler: /social/* ----
export async function handleSocial(env: Env, req: Request, path: string, user: SessionUser | null): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(env) });
  if (!user) return json(env, { error: "로그인이 필요합니다." }, 401);
  const now = Date.now();

  // ---- profile ----
  if (path === "/social/profile" && req.method === "GET") {
    const id = new URL(req.url).searchParams.get("id") || user.id;
    const p = await profileOf(env, id, user);
    if (!p) return json(env, { error: "not found" }, 404);
    return json(env, { profile: p });
  }

  if (path === "/social/me" && req.method === "POST") {
    const body = (await req.json().catch(() => ({}))) as { display?: string; avatar?: string; badge?: string; stats_public?: boolean; sleeve?: string };
    const sets: string[] = [];
    const args: unknown[] = [];
    if (typeof body.display === "string") {
      const d = sanitizeDisplay(body.display);
      sets.push("display = ?"); args.push(d);
    }
    if (typeof body.avatar === "string") {
      if (!/^[A-Za-z0-9_]{0,32}$/.test(body.avatar)) return json(env, { error: "잘못된 아바타" }, 400);
      sets.push("avatar = ?"); args.push(body.avatar || null);
    }
    if (typeof body.badge === "string") {
      if (body.badge) {
        const owned = await ownedBadges(env, user.id);
        if (!owned.includes(body.badge)) return json(env, { error: "보유하지 않은 뱃지입니다." }, 400);
      }
      sets.push("badge = ?"); args.push(body.badge || null);
    }
    if (typeof body.stats_public === "boolean") { sets.push("stats_public = ?"); args.push(body.stats_public ? 1 : 0); }
    if (typeof body.sleeve === "string") {
      const id = body.sleeve || "default";
      if (!ALL_SLEEVES.has(id)) return json(env, { error: "잘못된 슬리브" }, 400);
      if (id !== "default") {
        const row = await env.DB.prepare(`SELECT sleeves FROM users WHERE id = ?`).bind(user.id).first<{ sleeves: string | null }>();
        if (!parseSleeves(row?.sleeves ?? null).includes(id)) return json(env, { error: "보유하지 않은 슬리브입니다." }, 400);
      }
      sets.push("sleeve = ?"); args.push(id === "default" ? null : id);
    }
    if (!sets.length) return json(env, { error: "no changes" }, 400);
    await env.DB.prepare(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`).bind(...args, user.id).run();
    const u = await env.DB.prepare(`SELECT display, avatar, badge, stats_public, sleeve FROM users WHERE id = ?`).bind(user.id)
      .first<{ display: string; avatar: string | null; badge: string | null; stats_public: number; sleeve: string | null }>();
    return json(env, { ok: true, display: u?.display, avatar: u?.avatar, badge: u?.badge, stats_public: !!u?.stats_public, sleeve: u?.sleeve || "default" });
  }

  // ---- shop: buy a card sleeve (1 credit, server-authoritative price) ----
  if (path === "/social/buy-sleeve" && req.method === "POST") {
    const body = (await req.json().catch(() => ({}))) as { id?: string };
    const id = String(body.id ?? "");
    if (!BUYABLE_SLEEVES.has(id)) return json(env, { error: "잘못된 상품입니다." }, 400);
    const row = await env.DB.prepare(`SELECT credits, sleeves FROM users WHERE id = ?`).bind(user.id)
      .first<{ credits: number; sleeves: string | null }>();
    if (!row) return json(env, { error: "사용자를 찾을 수 없습니다." }, 404);
    const owned = parseSleeves(row.sleeves);
    if (owned.includes(id)) return json(env, { error: "이미 보유한 슬리브입니다." }, 400);
    if ((row.credits ?? 0) < SLEEVE_PRICE) return json(env, { error: "크레딧이 부족합니다." }, 400);
    const nextSleeves = [...owned, id].join(",");
    const nextCredits = row.credits - SLEEVE_PRICE;
    // guarded update: credits check in WHERE prevents a double-spend race
    const res = await env.DB.prepare(`UPDATE users SET credits = ?, sleeves = ? WHERE id = ? AND credits >= ?`)
      .bind(nextCredits, nextSleeves, user.id, SLEEVE_PRICE).run();
    if (!res.meta.changes) return json(env, { error: "크레딧이 부족합니다." }, 400);
    return json(env, { ok: true, credits: nextCredits, sleeves: ["default", ...owned, id] });
  }

  // ---- friends ----
  if (path === "/social/friends" && req.method === "GET") {
    const fr = await env.DB.prepare(
      `SELECT f.user_a, f.user_b, f.status, u.id AS fid, u.display, u.avatar, u.badge,
              p.state AS pstate, p.ts AS pts
       FROM friends f
       JOIN users u ON u.id = CASE WHEN f.user_a = ?1 THEN f.user_b ELSE f.user_a END
       LEFT JOIN presence p ON p.user_id = u.id
       WHERE f.user_a = ?1 OR f.user_b = ?1`
    ).bind(user.id).all<{ user_a: string; user_b: string; status: string; fid: string; display: string; avatar: string | null; badge: string | null; pstate: string | null; pts: number | null }>();
    const friends: unknown[] = [], incoming: unknown[] = [], outgoing: unknown[] = [];
    for (const r of fr.results ?? []) {
      const item = {
        id: r.fid, display: r.display, avatar: r.avatar, badge: r.badge,
        online: r.pts != null && now - r.pts < PRESENCE_ONLINE_MS,
        state: r.pts != null && now - r.pts < PRESENCE_ONLINE_MS ? r.pstate : null,
      };
      if (r.status === "accepted") friends.push(item);
      else if (r.user_b === user.id) incoming.push(item);
      else outgoing.push(item);
    }
    // 나에게 온 대전 신청 (유효 시간 내)
    const ch = await env.DB.prepare(
      `SELECT c.id, c.challenger, c.created_at, u.display FROM challenges c JOIN users u ON u.id = c.challenger
       WHERE c.target = ? AND c.status = 'pending' AND c.created_at > ?`
    ).bind(user.id, now - CHALLENGE_TTL_MS).all<{ id: string; challenger: string; created_at: number; display: string }>();
    return json(env, { friends, incoming, outgoing, challenges: (ch.results ?? []).map((c) => ({ id: c.id, from: c.display, fromId: c.challenger, at: c.created_at })) });
  }

  if (path === "/social/friends/request" && req.method === "POST") {
    const body = (await req.json().catch(() => ({}))) as { q?: string };
    const q = (body.q || "").trim();
    if (!q) return json(env, { error: "이름 또는 이메일을 입력하세요." }, 400);
    const rows = await env.DB.prepare(`SELECT id, display FROM users WHERE display = ?1 OR email = LOWER(?1) LIMIT 2`)
      .bind(q).all<{ id: string; display: string }>();
    const list = (rows.results ?? []).filter((r) => r.id !== user.id);
    if (!list.length) return json(env, { error: "해당 유저를 찾을 수 없습니다." }, 404);
    if (list.length > 1) return json(env, { error: "동명 유저가 여럿입니다 — 이메일로 시도해주세요." }, 409);
    const target = list[0];
    const exist = await env.DB.prepare(
      `SELECT status FROM friends WHERE (user_a = ?1 AND user_b = ?2) OR (user_a = ?2 AND user_b = ?1)`
    ).bind(user.id, target.id).first<{ status: string }>();
    if (exist) return json(env, { error: exist.status === "accepted" ? "이미 친구입니다." : "이미 요청이 진행 중입니다." }, 409);
    const cnt = await env.DB.prepare(`SELECT COUNT(*) AS n FROM friends WHERE (user_a = ?1 OR user_b = ?1) AND status = 'accepted'`)
      .bind(user.id).first<{ n: number }>();
    if ((cnt?.n ?? 0) >= MAX_FRIENDS) return json(env, { error: "친구는 최대 100명까지입니다." }, 400);
    await env.DB.prepare(`INSERT INTO friends (user_a, user_b, status, created_at) VALUES (?,?,?,?)`)
      .bind(user.id, target.id, "pending", now).run();
    return json(env, { ok: true, display: target.display });
  }

  if (path === "/social/friends/respond" && req.method === "POST") {
    const body = (await req.json().catch(() => ({}))) as { user_id?: string; accept?: boolean };
    if (!body.user_id) return json(env, { error: "bad request" }, 400);
    if (body.accept) {
      await env.DB.prepare(`UPDATE friends SET status = 'accepted' WHERE user_a = ? AND user_b = ? AND status = 'pending'`)
        .bind(body.user_id, user.id).run();
    } else {
      await env.DB.prepare(`DELETE FROM friends WHERE user_a = ? AND user_b = ? AND status = 'pending'`)
        .bind(body.user_id, user.id).run();
    }
    return json(env, { ok: true });
  }

  if (path === "/social/friends/remove" && req.method === "POST") {
    const body = (await req.json().catch(() => ({}))) as { user_id?: string };
    if (!body.user_id) return json(env, { error: "bad request" }, 400);
    await env.DB.prepare(`DELETE FROM friends WHERE (user_a = ?1 AND user_b = ?2) OR (user_a = ?2 AND user_b = ?1)`)
      .bind(user.id, body.user_id).run();
    return json(env, { ok: true });
  }

  // ---- friendly challenges ----
  if (path === "/social/challenge" && req.method === "POST") {
    const body = (await req.json().catch(() => ({}))) as { user_id?: string };
    if (!body.user_id) return json(env, { error: "bad request" }, 400);
    const isFriend = await env.DB.prepare(
      `SELECT 1 AS x FROM friends WHERE ((user_a = ?1 AND user_b = ?2) OR (user_a = ?2 AND user_b = ?1)) AND status = 'accepted'`
    ).bind(user.id, body.user_id).first();
    if (!isFriend) return json(env, { error: "친구에게만 대전을 신청할 수 있습니다." }, 403);
    // 이전 pending 신청은 자동 취소
    await env.DB.prepare(`UPDATE challenges SET status = 'cancelled' WHERE challenger = ? AND status = 'pending'`).bind(user.id).run();
    const id = crypto.randomUUID();
    await env.DB.prepare(`INSERT INTO challenges (id, challenger, target, status, created_at) VALUES (?,?,?,?,?)`)
      .bind(id, user.id, body.user_id, "pending", now).run();
    return json(env, { id });
  }

  if (path === "/social/challenge/cancel" && req.method === "POST") {
    const body = (await req.json().catch(() => ({}))) as { id?: string };
    await env.DB.prepare(`UPDATE challenges SET status = 'cancelled' WHERE id = ? AND challenger = ? AND status = 'pending'`)
      .bind(body.id || "", user.id).run();
    return json(env, { ok: true });
  }

  if (path === "/social/challenge/respond" && req.method === "POST") {
    const body = (await req.json().catch(() => ({}))) as { id?: string; accept?: boolean };
    const ch = await env.DB.prepare(`SELECT id, challenger, target, status, created_at FROM challenges WHERE id = ?`)
      .bind(body.id || "").first<{ id: string; challenger: string; target: string; status: string; created_at: number }>();
    if (!ch || ch.target !== user.id) return json(env, { error: "not found" }, 404);
    if (ch.status !== "pending" || now - ch.created_at > CHALLENGE_TTL_MS) return json(env, { error: "이미 만료된 신청입니다." }, 410);
    if (!body.accept) {
      await env.DB.prepare(`UPDATE challenges SET status = 'declined' WHERE id = ?`).bind(ch.id).run();
      return json(env, { ok: true });
    }
    const challenger = await env.DB.prepare(`SELECT id, display FROM users WHERE id = ?`).bind(ch.challenger).first<{ id: string; display: string }>();
    if (!challenger) return json(env, { error: "not found" }, 404);
    // provision a GameRoom exactly like the matchmaker does (친선전 → ranked=false)
    const roomId = crypto.randomUUID();
    const seed = crypto.getRandomValues(new Uint32Array(1))[0] >>> 0;
    const stub = env.GAME_ROOM.get(env.GAME_ROOM.idFromName(roomId));
    await stub.fetch("https://do/setup", {
      method: "POST",
      body: JSON.stringify({ players: [{ id: challenger.id, name: challenger.display }, { id: user.id, name: user.display }], seed, ranked: false }),
    });
    await env.DB.prepare(`UPDATE challenges SET status = 'accepted', room_id = ? WHERE id = ?`).bind(roomId, ch.id).run();
    return json(env, { ok: true, roomId, you: 1, oppName: challenger.display });
  }

  // challenger polls until the target answers (or the TTL runs out)
  if (path === "/social/challenge/poll" && req.method === "GET") {
    const id = new URL(req.url).searchParams.get("id") || "";
    const ch = await env.DB.prepare(`SELECT id, challenger, target, room_id, status, created_at FROM challenges WHERE id = ?`)
      .bind(id).first<{ id: string; challenger: string; target: string; room_id: string | null; status: string; created_at: number }>();
    if (!ch || ch.challenger !== user.id) return json(env, { error: "not found" }, 404);
    const expired = ch.status === "pending" && now - ch.created_at > CHALLENGE_TTL_MS;
    if (ch.status === "accepted" && ch.room_id) {
      const opp = await env.DB.prepare(`SELECT display FROM users WHERE id = ?`).bind(ch.target).first<{ display: string }>();
      return json(env, { status: "accepted", roomId: ch.room_id, you: 0, oppName: opp?.display ?? "?" });
    }
    return json(env, { status: expired ? "expired" : ch.status });
  }

  return json(env, { error: "not found" }, 404);
}
