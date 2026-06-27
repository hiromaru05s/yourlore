// ============================================================
// LORE — login / register screen. Email-only registration with
// a password (no username needed; display defaults to email).
// ============================================================
import type { App, Screen } from "../router";
import { api } from "../net/api";

export function mountLogin(app: App): Screen {
  let mode: "login" | "register" = "login";

  const wrap = document.createElement("div");
  wrap.className = "screen";
  wrap.innerHTML = `
    <div class="screen-brand"><div class="mark"></div><h1>LORE</h1></div>
    <div class="panel auth-card">
      <div class="auth-tabs">
        <button data-m="login" class="on">로그인</button>
        <button data-m="register">회원가입</button>
      </div>
      <div class="sub" id="authSub">이메일로 로그인하세요.</div>
      <div class="form-row"><label class="field-label">이메일</label><input class="input" id="email" type="email" placeholder="you@example.com" autocomplete="email"></div>
      <div class="form-row"><label class="field-label">비밀번호</label><input class="input" id="password" type="password" placeholder="••••••••" autocomplete="current-password"></div>
      <button class="btn btn-gold btn-block" id="submit">로그인</button>
      <div class="auth-error" id="err"></div>
    </div>`;
  app.root.appendChild(wrap);

  const $ = (id: string) => wrap.querySelector("#" + id) as HTMLElement;
  const email = $("email") as HTMLInputElement;
  const password = $("password") as HTMLInputElement;
  const err = $("err");
  const submit = $("submit") as HTMLButtonElement;

  const setMode = (m: "login" | "register") => {
    mode = m;
    wrap.querySelectorAll(".auth-tabs button").forEach((b) => b.classList.toggle("on", (b as HTMLElement).dataset.m === m));
    $("authSub").textContent = m === "login" ? "이메일로 로그인하세요." : "이메일과 비밀번호만으로 가입할 수 있습니다.";
    submit.textContent = m === "login" ? "로그인" : "회원가입";
    err.textContent = "";
  };
  wrap.querySelectorAll(".auth-tabs button").forEach((b) => {
    (b as HTMLElement).onclick = () => setMode((b as HTMLElement).dataset.m as "login" | "register");
  });

  async function go() {
    err.textContent = "";
    const e = email.value.trim();
    const p = password.value;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { err.textContent = "올바른 이메일을 입력하세요."; return; }
    if (p.length < 6) { err.textContent = "비밀번호는 6자 이상이어야 합니다."; return; }
    submit.disabled = true;
    submit.textContent = "처리 중…";
    try {
      app.user = mode === "login" ? await api.login(e, p) : await api.register(e, p);
      app.home();
    } catch (ex) {
      err.textContent = (ex as Error).message || "오류가 발생했습니다.";
      submit.disabled = false;
      setMode(mode);
    }
  }
  submit.onclick = go;
  password.onkeydown = (ev) => { if (ev.key === "Enter") go(); };

  return {};
}
