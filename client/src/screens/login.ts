// ============================================================
// LORE — login / register / forgot / reset screen.
// Email+password with verification, Google OAuth, password reset.
// URL params handled on mount: ?verified=1 (mail link success),
// ?reset=<token> (opens the new-password form).
// ============================================================
import type { App, Screen } from "../router";
import { api, type ApiError } from "../net/api";
import { t, onLangChange } from "../i18n";
import { langSelectEl } from "../ui/langSelect";

type Mode = "login" | "register" | "forgot" | "reset";

const GOOGLE_SVG = `<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`;

export function mountLogin(app: App): Screen {
  const params = new URLSearchParams(location.search);
  const resetToken = params.get("reset") || "";
  const justVerified = params.get("verified") === "1";
  if (resetToken || justVerified) history.replaceState(null, "", "/");

  let mode: Mode = resetToken ? "reset" : "login";
  let notice: { html: string; ok: boolean } | null = justVerified ? { html: t("login.verified"), ok: true } : null;
  let lastEmail = "";

  const wrap = document.createElement("div");
  wrap.className = "screen";
  wrap.innerHTML = `
    <div class="topright-lang"></div>
    <div class="screen-brand"><div class="mark"></div><h1>LORE</h1></div>
    <div class="panel auth-card" id="card"></div>`;
  app.root.appendChild(wrap);
  wrap.querySelector(".topright-lang")!.appendChild(langSelectEl());
  const card = wrap.querySelector("#card") as HTMLElement;

  const sub = () => mode === "forgot" ? t("login.forgot.sub") : mode === "reset" ? t("login.reset.sub")
    : mode === "login" ? t("login.sub.login") : t("login.sub.register");
  const submitLabel = () => mode === "forgot" ? t("login.forgot.submit") : mode === "reset" ? t("login.reset.submit")
    : mode === "login" ? t("login.tab.login") : t("login.tab.register");

  const render = () => {
    const tabs = mode === "login" || mode === "register";
    card.innerHTML = `
      ${tabs ? `<div class="auth-tabs">
        <button data-m="login" class="${mode === "login" ? "on" : ""}">${t("login.tab.login")}</button>
        <button data-m="register" class="${mode === "register" ? "on" : ""}">${t("login.tab.register")}</button>
      </div>` : ""}
      <div class="sub">${sub()}</div>
      ${mode !== "reset" ? `<div class="form-row"><label class="field-label">${t("login.email")}</label><input class="input" id="email" type="email" placeholder="you@example.com" autocomplete="email"></div>` : ""}
      ${mode !== "forgot" ? `<div class="form-row"><label class="field-label">${mode === "reset" ? t("login.reset.newpw") : t("login.password")}</label><input class="input" id="password" type="password" placeholder="••••••••" autocomplete="${mode === "login" ? "current-password" : "new-password"}"></div>` : ""}
      <button class="btn btn-gold btn-block" id="submit">${submitLabel()}</button>
      ${mode === "login" ? `<div class="auth-links"><a id="forgotLink">${t("login.forgot")}</a></div>` : ""}
      ${mode === "forgot" || mode === "reset" ? `<div class="auth-links"><a id="backLink">← ${t("login.back")}</a></div>` : ""}
      ${tabs ? `<div class="auth-or"><span>${t("login.or")}</span></div>
      <button class="btn btn-ghost btn-block google-btn" id="googleBtn">${GOOGLE_SVG}${t("login.google")}</button>` : ""}
      <div class="auth-error" id="msg"></div>`;
    const em = card.querySelector("#email") as HTMLInputElement | null;
    if (em) em.value = lastEmail;
    bind();
    paintNotice();
  };

  const paintNotice = () => {
    const el = card.querySelector("#msg") as HTMLElement | null;
    if (!el) return;
    el.className = "auth-error" + (notice?.ok ? " ok" : "");
    el.innerHTML = notice?.html ?? "";
    const rs = el.querySelector("#resendLink") as HTMLElement | null;
    if (rs) rs.onclick = () => {
      void api.resendVerify(lastEmail).catch(() => { /* silent */ });
      notice = { html: t("login.verify.resent"), ok: true };
      paintNotice();
    };
  };

  const swap = (m: Mode) => { mode = m; notice = null; render(); };

  const bind = () => {
    card.querySelectorAll(".auth-tabs button").forEach((b) => {
      (b as HTMLElement).onclick = () => swap((b as HTMLElement).dataset.m as Mode);
    });
    (card.querySelector("#forgotLink") as HTMLElement | null)?.addEventListener("click", () => swap("forgot"));
    (card.querySelector("#backLink") as HTMLElement | null)?.addEventListener("click", () => swap("login"));
    const g = card.querySelector("#googleBtn") as HTMLButtonElement | null;
    if (g) g.onclick = () => { location.href = "/api/auth/google"; };
    const em = card.querySelector("#email") as HTMLInputElement | null;
    if (em) {
      em.oninput = () => { lastEmail = em.value; };
      em.onkeydown = (ev) => { if (ev.key === "Enter" && mode === "forgot") void go(); };
    }
    const pw = card.querySelector("#password") as HTMLInputElement | null;
    if (pw) pw.onkeydown = (ev) => { if (ev.key === "Enter") void go(); };
    (card.querySelector("#submit") as HTMLButtonElement).onclick = () => void go();
  };

  async function go(): Promise<void> {
    const submit = card.querySelector("#submit") as HTMLButtonElement;
    const email = ((card.querySelector("#email") as HTMLInputElement | null)?.value ?? "").trim();
    const password = (card.querySelector("#password") as HTMLInputElement | null)?.value ?? "";
    notice = null; paintNotice();
    if (mode !== "reset" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { notice = { html: t("login.err.email"), ok: false }; paintNotice(); return; }
    if (mode !== "forgot" && password.length < 6) { notice = { html: t("login.err.pw"), ok: false }; paintNotice(); return; }
    submit.disabled = true;
    submit.textContent = t("login.processing");
    try {
      if (mode === "login") {
        app.user = await api.login(email, password);
        app.home();
        return;
      }
      if (mode === "register") {
        const r = await api.register(email, password);
        if (r.user) { app.user = r.user; app.home(); return; }
        mode = "login";
        notice = { html: t("login.verify.sent"), ok: true };
        render();
        return;
      }
      if (mode === "forgot") {
        await api.forgot(email);
        notice = { html: t("login.forgot.sent"), ok: true };
        render();
        return;
      }
      // reset
      await api.resetPassword(resetToken, password);
      mode = "login";
      notice = { html: t("login.reset.done"), ok: true };
      render();
    } catch (ex) {
      const e = ex as ApiError;
      notice = e.needVerify
        ? { html: `${t("login.verify.needed")} <a id="resendLink" style="cursor:pointer;text-decoration:underline">${t("login.verify.resend")}</a>`, ok: false }
        : { html: e.message || t("login.err.generic"), ok: false };
      render();
    }
  }

  render();
  const unsub = onLangChange(() => app.login());
  return { destroy: unsub };
}
