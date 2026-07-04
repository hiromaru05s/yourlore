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
  // Google OAuth (optional — /api/auth/google returns 501 until both are set)
  GOOGLE_CLIENT_ID?: string;     // wrangler.toml [vars] or secret
  GOOGLE_CLIENT_SECRET?: string; // `wrangler secret put GOOGLE_CLIENT_SECRET`
  // Resend (optional — until set, register auto-verifies and no mail is sent)
  RESEND_API_KEY?: string;       // `wrangler secret put RESEND_API_KEY`
  // Admin allowlist — comma-separated emails that may open /admin (logged-in session).
  ADMIN_EMAILS?: string;         // wrangler.toml [vars]
}

export interface SessionUser {
  id: string;
  email: string;
  display: string;
  wins: number;
  losses: number;
}
