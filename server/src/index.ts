// ============================================================
// LORE server — Worker entry. Routes auth (/api/*) and WebSocket
// traffic (/ws/queue, /ws/room/:id) to the Durable Objects,
// attaching the authenticated user's identity.
// ============================================================
import type { Env } from "./env";
import { corsHeaders, getUser, handleAuth } from "./auth";
import { Matchmaker } from "./matchmaker";
import { GameRoom } from "./gameRoom";

export { Matchmaker, GameRoom };

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    // ---- auth / REST ----
    if (path.startsWith("/api/")) {
      return handleAuth(env, req, path.slice(4)); // strip "/api"
    }

    // ---- matchmaking socket ----
    if (path === "/ws/queue") {
      const user = await getUser(env, req);
      const fwd = new URL(req.url);
      if (user) { fwd.searchParams.set("uid", user.id); fwd.searchParams.set("name", user.display); }
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
