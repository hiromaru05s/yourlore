// ============================================================
// LORE — login / register screen. Email-only registration with
// a password. Language dropdown (KO/JA) in the top-right.
// ============================================================
import type { App, Screen } from "../router";
import { api } from "../net/api";
import { t, onLangChange } from "../i18n";
import { langSelectEl } from "../ui/langSelect";

export function mountLogin(app: App): Screen {
  let mode: "login" | "register" = "login";

  const wrap = document.createElement("div");
  wrap.className = "screen";
  wrap.innerHTML = `
    <div class="topright-lang"></div>
    <div class="screen-brand"><div class="mark"></div><h1>LORE</h1></div>
    <div class="panel auth-card">
      <div class="auth-tabs">
        <button data-m="login" class="on">${t("login.tab.login")}</button>
        <button data-m="register">${t("login.tab.register")}</button>
      </div>
      <div class="sub" id="authSub">${t("login.sub.login")}</div>
      <div class="form-row"><label class="field-label">${t("login.email")}</label><input class="input" id="email" type="email" placeholder="you@example.com" autocomplete="email"></div>
      <div class="form-row"><label class="field-label">${t("login.password")}</label><input class="input" id="password" type="password" placeholder="••••••••" autocomplete="current-password"></div>
      <button class="btn btn-gold btn-block" id="submit">${t("login.tab.login")}</button>
      <div class="auth-or"><span>${t("login.or")}</span></div>
      <button class="btn btn-ghost btn-block google-btn" id="googleBtn"><span class="g-logo">G</span>${t("login.google")}</button>
      <div class="auth-error" id="err"></div>
    </div>`;
  app.root.appendChild(wrap);
  wrap.querySelector(".topright-lang")!.appendChild(langSelectEl());

  const $ = (id: string) => wrap.querySelector("#" + id) as HTMLElement;
  const email = $("email") as HTMLInputElement;
  const password = $("password") as HTMLInputElement;
  const err = $("err");
  const submit = $("submit") as HTMLButtonElement;

  const setMode = (m: "login" | "register") => {
    mode = m;
    wrap.querySelectorAll(".auth-tabs button").forEach((b) => b.classList.toggle("on", (b as HTMLElement).dataset.m === m));
    $("authSub").textContent = m === "login" ? t("login.sub.login") : t("login.sub.register");
    submit.textContent = m === "login" ? t("login.tab.login") : t("login.tab.register");
    err.textContent = "";
  };
  wrap.querySelectorAll(".auth-tabs button").forEach((b) => {
    (b as HTMLElement).onclick = () => setMode((b as HTMLElement).dataset.m as "login" | "register");
  });

  async function go() {
    err.textContent = "";
    const e = email.value.trim();
    const p = password.value;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { err.textContent = t("login.err.email"); return; }
    if (p.length < 6) { err.textContent = t("login.err.pw"); return; }
    submit.disabled = true;
    submit.textContent = t("login.processing");
    try {
      app.user = mode === "login" ? await api.login(e, p) : await api.register(e, p);
      app.home();
    } catch (ex) {
      err.textContent = (ex as Error).message || t("login.err.generic");
      submit.disabled = false;
      setMode(mode);
    }
  }
  submit.onclick = go;
  password.onkeydown = (ev) => { if (ev.key === "Enter") go(); };
  ($("googleBtn") as HTMLButtonElement).onclick = () => { location.href = "/api/auth/google"; };

  const unsub = onLangChange(() => app.login());
  return { destroy: unsub };
}
