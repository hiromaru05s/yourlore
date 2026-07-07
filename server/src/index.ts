// ============================================================
// LORE server — Worker entry. Routes auth (/api/*) and WebSocket
// traffic (/ws/queue, /ws/room/:id) to the Durable Objects,
// attaching the authenticated user's identity.
// ============================================================
import type { Env } from "./env";
import { corsHeaders, getUser, handleAuth } from "./auth";
import { sanitizeDeck } from "../../client/src/shared/cards";
import { getRating, handleRank } from "./rank";
import { handleGoogleOAuth } from "./oauth";
import { handleInvite } from "./invite";
import { handleAdmin } from "./admin";
import { handleRewards } from "./rewards";
import { handleSocial } from "./social";
import { Matchmaker } from "./matchmaker";
import { GameRoom } from "./gameRoom";

export { Matchmaker, GameRoom };

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;
    const onAdminHost = url.hostname.startsWith("admin."); // isolated admin origin

    // Admin API is ONLY reachable on the admin origin. On the game origin it
    // does not exist (404) — so a game-site XSS can't even call it, and the
    // admin session cookie (host-only to admin.*) is never sent to the game host.
    if (path.startsWith("/api/admin/") && !onAdminHost) {
      return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    }

    // ---- geo (for default language) ----
    if (path === "/api/geo") {
      const country = req.headers.get("CF-IPCountry") || "";
      return new Response(JSON.stringify({ country }), { headers: { "Content-Type": "application/json", ...corsHeaders(env) } });
    }
    // ---- Google OAuth ----
    if (path === "/api/auth/google" || path === "/api/auth/google/callback") {
      return handleGoogleOAuth(env, req, path.slice(4)); // strip "/api"
    }
    // ---- ranked ladder REST ----
    if (path.startsWith("/api/rank/")) {
      const user = await getUser(env, req);
      return handleRank(env, req, path.slice(4), user); // strip "/api"
    }
    // ---- credit rewards ----
    if (path.startsWith("/api/rewards/")) {
      return handleRewards(env, req, path.slice(4)); // strip "/api"
    }
    // ---- invite campaign ----
    if (path.startsWith("/api/invite/")) {
      const user = await getUser(env, req);
      return handleInvite(env, req, path.slice(4), user);
    }
    // ---- social: profile / friends / challenges ----
    if (path.startsWith("/api/social/")) {
      const user = await getUser(env, req);
      return handleSocial(env, req, path.slice(4), user);
    }
    // ---- admin dashboard ----
    if (path.startsWith("/api/admin/")) {
      return handleAdmin(env, req, path.slice(4));
    }
    // ---- bot-game result report (analytics only; client-authoritative) ----
    if (path === "/api/track/bot" && req.method === "POST") {
      const user = await getUser(env, req);
      if (!user) return new Response(JSON.stringify({ ok: false }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders(env) } });
      const body = (await req.json().catch(() => ({}))) as { won?: boolean; draw?: boolean };
      await env.DB.prepare(`INSERT INTO matches (id, player_a, player_b, winner, mode, created_at, ended_at) VALUES (?,?,?,?,?,?,?)`)
        .bind(crypto.randomUUID(), user.id, "bot", body.draw ? null : body.won ? user.id : "bot", "bot", Date.now(), Date.now()).run().catch(() => { /* best effort */ });
      return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", ...corsHeaders(env) } });
    }
    // ---- presence heartbeat (real-time online counts; covers bot games too) ----
    if (path === "/api/presence" && req.method === "POST") {
      const user = await getUser(env, req);
      if (!user) return new Response(JSON.stringify({ ok: false }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders(env) } });
      const body = (await req.json().catch(() => ({}))) as { state?: string };
      const state = ["menu", "queue", "online", "bot"].includes(body.state || "") ? body.state! : "menu";
      await env.DB.prepare(`INSERT INTO presence (user_id, state, ts) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET state=excluded.state, ts=excluded.ts`)
        .bind(user.id, state, Date.now()).run().catch(() => { /* best effort */ });
      return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", ...corsHeaders(env) } });
    }
    // ---- auth / REST ----
    // ---- 초기 덱 저장 (덱 빌더) ----
    if (path === "/api/deck" && req.method === "POST") {
      const user = await getUser(env, req);
      const hdrs = { "content-type": "application/json", ...corsHeaders(env) };
      if (!user) return new Response(JSON.stringify({ error: "로그인이 필요합니다" }), { status: 401, headers: hdrs });
      const body = (await req.json().catch(() => ({}))) as { deck?: unknown };
      const deck = sanitizeDeck(body.deck); // 풀 검증 + 장당 8장 제한 → 항상 유효한 8장
      await env.DB.prepare(`UPDATE users SET deck = ? WHERE id = ?`).bind(deck.join(","), user.id).run();
      return new Response(JSON.stringify({ ok: true, deck }), { headers: hdrs });
    }

    if (path.startsWith("/api/")) {
      return handleAuth(env, req, path.slice(4)); // strip "/api"
    }

    // ---- matchmaking socket ----
    if (path === "/ws/queue") {
      const user = await getUser(env, req);
      const fwd = new URL(req.url);
      if (user) { fwd.searchParams.set("uid", user.id); fwd.searchParams.set("name", user.display); fwd.searchParams.set("avatar", user.avatar ?? ""); fwd.searchParams.set("sleeve", user.sleeve ?? ""); fwd.searchParams.set("deck", (user.deck ?? []).join(",")); }
      // ranked queue: must be logged in; attach current MMR for band matching
      if (fwd.searchParams.get("mode") === "ranked") {
        if (!user) return new Response("unauthorized", { status: 401 });
        const r = await getRating(env, user.id).catch(() => null);
        fwd.searchParams.set("mmr", String(r?.mmr ?? 1000));
      }
      const stub = env.MATCHMAKER.get(env.MATCHMAKER.idFromName("global"));
      return stub.fetch(new Request(fwd.toString(), req));
    }

    // ---- game room socket ----
    if (path.startsWith("/ws/room/")) {
      const roomId = decodeURIComponent(path.slice("/ws/room/".length));
      const user = await getUser(env, req);
      if (!user) return new Response("unauthorized", { status: 401 });
      const fwd = new URL(req.url);
      fwd.searchParams.set("uid", user.id);
      fwd.searchParams.set("name", user.display);
      const stub = env.GAME_ROOM.get(env.GAME_ROOM.idFromName(roomId));
      return stub.fetch(new Request(fwd.toString(), req));
    }

    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(env) });

    // everything else → the static client (SPA fallback handled by [assets])
    return env.ASSETS.fetch(req);
  },
};
