// ============================================================
// LORE server — Google OAuth (Authorization Code flow, no vendor).
//   /auth/google           → redirect to Google's consent screen
//   /auth/google/callback  → exchange code, upsert user, set session
// The id_token is fetched directly from Google's token endpoint over
// TLS, so its payload is trusted without local signature verification.
// OAuth accounts store the marker "oauth:google" in users.password —
// it can never match a PBKDF2 hash, so password login safely fails.
// ============================================================
import type { Env } from "./env";
import { createSession, sessionCookie } from "./auth";

const STATE_COOKIE = "lore_oauth_state";

function htmlError(msg: string): Response {
  return new Response(
    `<!doctype html><meta charset="utf-8"><body style="font-family:sans-serif;background:#0c121d;color:#e9e3d4;display:grid;place-items:center;height:100vh"><div style="text-align:center"><p>${msg}</p><a href="/" style="color:#c79a4b">← LORE로 돌아가기</a></div>`,
    { status: 400, headers: { "Content-Type": "text/html;charset=utf-8" } },
  );
}

export async function handleGoogleOAuth(env: Env, req: Request, path: string): Promise<Response> {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return htmlError("Google 로그인이 아직 설정되지 않았습니다. (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)");
  }
  const url = new URL(req.url);
  const redirectUri = `${url.origin}/api/auth/google/callback`;

  // step 1: send the user to Google's consent screen
  if (path === "/auth/google") {
    const state = crypto.randomUUID();
    const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    auth.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
    auth.searchParams.set("redirect_uri", redirectUri);
    auth.searchParams.set("response_type", "code");
    auth.searchParams.set("scope", "openid email profile");
    auth.searchParams.set("state", state);
    auth.searchParams.set("prompt", "select_account");
    return new Response(null, {
      status: 302,
      headers: {
        Location: auth.toString(),
        "Set-Cookie": `${STATE_COOKIE}=${state}; HttpOnly; Path=/; Max-Age=600; SameSite=Lax; Secure`,
      },
    });
  }

  // step 2: Google redirects back with ?code&state
  if (path === "/auth/google/callback") {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const cookieState = (req.headers.get("Cookie") || "").match(new RegExp(`${STATE_COOKIE}=([^;]+)`))?.[1];
    if (!code || !state || state !== cookieState) return htmlError("OAuth 상태 검증에 실패했습니다. 다시 시도해 주세요.");

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const tok = (await tokenRes.json().catch(() => ({}))) as { id_token?: string };
    if (!tokenRes.ok || !tok.id_token) return htmlError("구글 인증에 실패했습니다.");

    // decode the JWT payload (base64url)
    let payload: { email?: string; email_verified?: boolean; name?: string };
    try {
      payload = JSON.parse(atob(tok.id_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    } catch { return htmlError("구글 응답을 해석할 수 없습니다."); }
    if (!payload.email || payload.email_verified === false) return htmlError("이메일이 확인되지 않은 구글 계정입니다.");
    const email = payload.email.trim().toLowerCase();

    // upsert: existing email (password or oauth) logs straight in; new email creates an account
    let row = await env.DB.prepare(`SELECT id FROM users WHERE email = ?`).bind(email).first<{ id: string }>();
    let id = row?.id;
    if (!id) {
      id = crypto.randomUUID();
      const display = (payload.name || email.split("@")[0]).slice(0, 24);
      await env.DB.prepare(`INSERT INTO users (id, email, password, display, created_at) VALUES (?,?,?,?,?)`)
        .bind(id, email, "oauth:google", display, Date.now()).run();
    }
    const token = await createSession(env, id);
    const headers = new Headers({ Location: "/" });
    headers.append("Set-Cookie", sessionCookie(token));
    headers.append("Set-Cookie", `${STATE_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax; Secure`);
    return new Response(null, { status: 302, headers });
  }

  return htmlError("not found");
}
