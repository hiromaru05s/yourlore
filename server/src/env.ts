// ============================================================
// LORE server — environment bindings (see wrangler.toml)
// ============================================================
export interface Env {
  DB: D1Database;
  MATCHMAKER: DurableObjectNamespace;
  GAME_ROOM: DurableObjectNamespace;
  ASSETS: Fetcher; // Workers Static Assets — serves the built client (SPA)
  AUTH_SECRET: string;
  APP_ORIGIN: string;
}

export interface SessionUser {
  id: string;
  email: string;
  display: string;
  wins: number;
  losses: number;
}
