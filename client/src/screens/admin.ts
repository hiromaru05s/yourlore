// ============================================================
// LORE — admin dashboard (internal, Korean-only). Route: /admin
// Gated by the AUTH_SECRET admin key (stored in localStorage).
// All-in-one: 가입·게임·DAU·리텐션·카드 승률·유입 소스·초대 현황.
// ============================================================
import type { App, Screen } from "../router";
import { DB } from "../shared/cards";

interface Stats {
  totals: { users: number; matches: Record<string, number> };
  signupsByDay: { d: string; n: number }[];
  signupsBySource: { s: string; n: number }[];
  gamesByDay: { d: string; mode: string; n: number }[];
  dau: { d: string; n: number }[];
  retention: { cohort: string; n: number; d1: number; d7: number }[];
  invites: Record<string, number>;
  cards: { id: string; games: number; winrate: number }[];
  cardSample: number;
  revenue: { note: string; subscriptions: number; cancellations: number; sales: number; adRevenue: number };
}

interface AdminUser {
  id: string; email: string; display: string; created_at: number; verified: number;
  source: string | null; wins: number; losses: number; invited_by: string | null;
  mmr: number | null; last_day: string | null; is_google: number;
}

const KEY_LS = "lore_admin_key";

export function mountAdmin(app: App): Screen {
  const wrap = document.createElement("div");
  wrap.className = "screen adm-screen";
  wrap.innerHTML = `<div class="panel adm" id="admRoot"><div class="adm-head"><h2>LORE — 관리자 대시보드</h2><span class="adm-sub" id="admSub"></span></div><div id="admBody" class="adm-body"></div></div>`;
  app.root.appendChild(wrap);
  const body = wrap.querySelector("#admBody") as HTMLElement;
  const sub = wrap.querySelector("#admSub") as HTMLElement;

  const askKey = (msg = "") => {
    body.innerHTML = `
      ${msg ? `<div class="adm-err">${msg}</div>` : ""}
      <div class="form-row"><label class="field-label">관리자 키 (AUTH_SECRET)</label><input class="input" id="admKey" type="password"></div>
      <button class="btn btn-gold btn-block" id="admGo">열기</button>`;
    (body.querySelector("#admGo") as HTMLButtonElement).onclick = () => {
      localStorage.setItem(KEY_LS, (body.querySelector("#admKey") as HTMLInputElement).value.trim());
      void load();
    };
  };

  const bar = (v: number, max: number) => `<i class="adm-bar" style="width:${max > 0 ? Math.round(v / max * 100) : 0}%"></i>`;
  const pct = (a: number, b: number) => b > 0 ? `${Math.round(a / b * 100)}%` : "—";
  const cardName = (id: string) => DB[id]?.name ?? id;

  async function load(): Promise<void> {
    const key = localStorage.getItem(KEY_LS) || "";
    if (!key) { askKey(); return; }
    body.innerHTML = `<div class="adm-loading">불러오는 중…</div>`;
    const res = await fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${key}` } }).catch(() => null);
    if (!res || res.status === 401) { localStorage.removeItem(KEY_LS); askKey(res ? "키가 올바르지 않습니다." : "연결 오류"); return; }
    const s = (await res.json()) as Stats;
    sub.textContent = `총 유저 ${s.totals.users} · 매치 랭크 ${s.totals.matches.ranked ?? 0} / 노말 ${s.totals.matches.online ?? 0} / 봇 ${s.totals.matches.bot ?? 0}`;

    const maxSign = Math.max(1, ...s.signupsByDay.map((r) => r.n));
    const maxDau = Math.max(1, ...s.dau.map((r) => r.n));
    // games by day → pivot
    const gdays = [...new Set(s.gamesByDay.map((r) => r.d))].sort();
    const gAt = (d: string, m: string) => s.gamesByDay.find((r) => r.d === d && r.mode === m)?.n ?? 0;

    body.innerHTML = `
      <div class="adm-grid">
        <section><h3>신규 가입 (30일)</h3><table>${s.signupsByDay.map((r) => `<tr><td>${r.d.slice(5)}</td><td class="num">${r.n}</td><td class="barcell">${bar(r.n, maxSign)}</td></tr>`).join("") || "<tr><td>없음</td></tr>"}</table></section>
        <section><h3>DAU (30일)</h3><table>${s.dau.map((r) => `<tr><td>${r.d.slice(5)}</td><td class="num">${r.n}</td><td class="barcell">${bar(r.n, maxDau)}</td></tr>`).join("") || "<tr><td>없음</td></tr>"}</table></section>
        <section><h3>게임 수 (30일, 일별)</h3><table><tr class="hd"><td>일</td><td class="num">랭크</td><td class="num">노말</td><td class="num">봇</td></tr>${gdays.map((d) => `<tr><td>${d.slice(5)}</td><td class="num">${gAt(d, "ranked")}</td><td class="num">${gAt(d, "online")}</td><td class="num">${gAt(d, "bot")}</td></tr>`).join("") || "<tr><td>없음</td></tr>"}</table></section>
        <section><h3>리텐션 코호트 (14일)</h3><table><tr class="hd"><td>가입일</td><td class="num">가입</td><td class="num">D1</td><td class="num">D7</td></tr>${s.retention.map((r) => `<tr><td>${r.cohort.slice(5)}</td><td class="num">${r.n}</td><td class="num">${pct(r.d1, r.n)}</td><td class="num">${pct(r.d7, r.n)}</td></tr>`).join("") || "<tr><td>없음</td></tr>"}</table></section>
        <section><h3>유입 소스 (30일)</h3><table>${s.signupsBySource.map((r) => `<tr><td>${r.s}</td><td class="num">${r.n}</td></tr>`).join("") || "<tr><td>없음</td></tr>"}</table><p class="adm-note">광고 링크에 ?utm_source=…&utm_campaign=… 을 붙이면 여기 잡힙니다.</p></section>
        <section><h3>초대 캠페인</h3><table>
          <tr><td>골드 도전 중</td><td class="num">${s.invites.pending ?? 0}</td></tr>
          <tr><td>달성 (보상 대기)</td><td class="num">${s.invites.earned ?? 0}</td></tr>
          <tr><td>지급 완료</td><td class="num">${s.invites.paid ?? 0}</td></tr>
        </table></section>
        <section class="wide"><h3>카드 승률 — OP 탐지 (최근 PvP ${s.cardSample}판, 5판 이상 사용)</h3>
          <table><tr class="hd"><td>#</td><td>카드</td><td class="num">사용 게임</td><td class="num">승률</td></tr>
          ${s.cards.slice(0, 40).map((c, i) => `<tr class="${c.winrate >= 0.6 ? "hot" : ""}"><td>${i + 1}</td><td>${cardName(c.id)}</td><td class="num">${c.games}</td><td class="num">${(c.winrate * 100).toFixed(1)}%</td></tr>`).join("") || "<tr><td>데이터 없음 (카드 기록은 이번 배포 이후 매치부터 쌓입니다)</td></tr>"}</table>
        </section>
        <section class="wide"><h3>수익 (결제 연동 전)</h3><p class="adm-note">${s.revenue.note} — 구독 ${s.revenue.subscriptions} · 해지 ${s.revenue.cancellations} · 판매 ${s.revenue.sales} · 광고수익 $${s.revenue.adRevenue}</p></section>
        <section class="wide"><h3>유저 리스트 <input class="input adm-search" id="admUserQ" placeholder="이메일/닉네임 검색"></h3><div id="admUsers" class="adm-note">불러오는 중…</div></section>
      </div>
      <div style="text-align:center;margin-top:14px"><button class="btn btn-ghost" id="admReload">새로고침</button></div>`;
    (body.querySelector("#admReload") as HTMLButtonElement).onclick = () => void load();
    void loadUsers();
  }

  let allUsers: AdminUser[] = [];
  const esc = (x: string) => x.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string));

  function renderUsers(): void {
    const box = body.querySelector("#admUsers") as HTMLElement | null;
    if (!box) return;
    const q = ((body.querySelector("#admUserQ") as HTMLInputElement | null)?.value ?? "").toLowerCase();
    const list = allUsers.filter((u) => !q || u.email.toLowerCase().includes(q) || u.display.toLowerCase().includes(q));
    box.className = "";
    box.innerHTML = `<table>
      <tr class="hd"><td>가입일</td><td>닉네임</td><td>이메일</td><td>로그인</td><td class="num">전적</td><td class="num">MMR</td><td>최근 접속</td><td>소스</td><td>초대됨</td></tr>
      ${list.slice(0, 200).map((u) => `<tr>
        <td>${new Date(u.created_at).toISOString().slice(0, 10)}</td>
        <td>${esc(u.display)}</td>
        <td>${esc(u.email)}${u.verified ? "" : ` <span style="color:var(--vermil-hi)">미인증</span>`}</td>
        <td>${u.is_google ? "Google" : "이메일"}</td>
        <td class="num">${u.wins}승 ${u.losses}패</td>
        <td class="num">${u.mmr ?? "—"}</td>
        <td>${u.last_day ?? "—"}</td>
        <td>${esc(u.source ?? "direct")}</td>
        <td>${u.invited_by ? "✓" : ""}</td>
      </tr>`).join("")}
    </table><p class="adm-note">${list.length}명${list.length > 200 ? " (상위 200명 표시)" : ""}</p>`;
  }

  async function loadUsers(): Promise<void> {
    const key = localStorage.getItem(KEY_LS) || "";
    const res = await fetch("/api/admin/users", { headers: { Authorization: `Bearer ${key}` } }).catch(() => null);
    if (!res?.ok) return;
    allUsers = ((await res.json()) as { users: AdminUser[] }).users;
    renderUsers();
    (body.querySelector("#admUserQ") as HTMLInputElement | null)?.addEventListener("input", renderUsers);
  }

  void load();
  return {};
}
