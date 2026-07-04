// ============================================================
// LORE — all-in-one operator dashboard (tabbed). Lives on the
// ISOLATED admin origin (admin.yourlore.xyz). Auth: logged-in
// session email must be in ADMIN_EMAILS. PostHog handles deep dives.
// Tabs: 개요 · 유입 · 리텐션 · 게임/밸런스 · 수익 · 유저.
// ============================================================
import type { App, Screen } from "../router";
import { api } from "../net/api";
import { DB } from "../shared/cards";
import { TIER_META, tierLabel } from "../ui/tier";

interface Stats {
  overview: { users: number; dauToday: number; newToday: number; gamesToday: number; wau: number; mau: number; stickiness: number; matches: Record<string, number> };
  acquisition: { signupsByDay: { d: string; n: number }[]; signupsBySource: { s: string; n: number }[]; verifiedRate: number; loginSplit: { google: number; email: number }; invitedSignups: number; invites: Record<string, number> };
  retention: { cohorts: { cohort: string; n: number; d1: number; d7: number }[]; wau: number; mau: number; stickiness: number; depth: { d0: number; d1: number; d2_5: number; d6p: number }; active7: number; activePrev7: number; rankedParticipation: number };
  gameplay: { gamesByDay: { d: string; mode: string; n: number }[]; tierDist: Record<string, number>; cards: CardStat[]; cardSample: number; firstTurnWinRate: number | null; firstTurnSample: number; avgTurns: number | null; turnsSample: number; currentVersion: string; selectedVersion: string; versions: { v: string; n: number }[] };
  monetization: { note: string; subscriptions: number; cancellations: number; sales: number; adRevenue: number };
}
interface CardStat { id: string; buys: number; plays: number; games: number; winrate: number | null }
interface AdminUser {
  id: string; email: string; display: string; created_at: number; verified: number;
  source: string | null; wins: number; losses: number; invited_by: string | null;
  mmr: number | null; last_day: string | null; is_google: number;
}

const TIER_ORDER = ["iron", "bronze", "silver", "gold", "platinum", "diamond", "master"];
const TABS = [["overview", "개요"], ["acquisition", "유입"], ["retention", "리텐션"], ["gameplay", "게임·밸런스"], ["monetization", "수익"], ["users", "유저"]] as const;
type TabKey = typeof TABS[number][0];

const esc = (s: string) => (s || "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string));
const pctS = (x: number) => `${(x * 100).toFixed(1)}%`;
const cardName = (id: string) => DB[id]?.name ?? id;
const bar = (v: number, max: number, color = "linear-gradient(90deg,var(--brass-dim),var(--brass))") => `<i class="adm-bar" style="width:${max > 0 ? Math.round(v / max * 100) : 0}%;background:${color}"></i>`;
const pctRow = (a: number, b: number) => b > 0 ? `${Math.round(a / b * 100)}%` : "—";

export function mountAdmin(app: App): Screen {
  const wrap = document.createElement("div");
  wrap.className = "screen adm-screen";
  wrap.innerHTML = `<div class="panel adm">
    <div class="adm-head"><h2>LORE — 운영 대시보드</h2><span class="adm-sub" id="admSub"></span></div>
    <div class="adm-tabs" id="admTabs"></div>
    <div id="admBody" class="adm-body"></div></div>`;
  app.root.appendChild(wrap);
  const body = wrap.querySelector("#admBody") as HTMLElement;
  const sub = wrap.querySelector("#admSub") as HTMLElement;
  const tabsEl = wrap.querySelector("#admTabs") as HTMLElement;

  let stats: Stats | null = null;
  let users: AdminUser[] = [];
  let tab: TabKey = "overview";
  let cardSort: { key: keyof CardStat | "name"; dir: 1 | -1 } = { key: "winrate", dir: -1 };
  let selVer = "";

  const gate = (loggedIn: boolean) => {
    tabsEl.style.display = "none";
    body.innerHTML = `<div class="adm-gate"><p>${loggedIn ? "이 계정에는 관리자 권한이 없습니다." : "관리자 계정(Google)으로 로그인해야 합니다."}</p>
      ${loggedIn ? `<button class="btn btn-ghost" id="admLogout">다른 계정으로 로그인</button>` : `<button class="btn btn-gold" id="admLogin">관리자 로그인</button>`}</div>`;
    (body.querySelector("#admLogin") as HTMLButtonElement | null)?.addEventListener("click", () => { location.href = api.googleUrl("/"); });
    (body.querySelector("#admLogout") as HTMLButtonElement | null)?.addEventListener("click", () => void app.logout());
  };

  const renderTabs = () => {
    tabsEl.style.display = "flex";
    tabsEl.innerHTML = TABS.map(([k, label]) => `<button class="adm-tab ${k === tab ? "on" : ""}" data-k="${k}">${label}</button>`).join("");
    tabsEl.querySelectorAll(".adm-tab").forEach((b) => (b as HTMLElement).onclick = () => { tab = (b as HTMLElement).dataset.k as TabKey; renderTabs(); renderTab(); });
  };

  const kpi = (label: string, value: string, hint = "") => `<div class="adm-kpi"><div class="k-v">${value}</div><div class="k-l">${label}</div>${hint ? `<div class="k-h">${hint}</div>` : ""}</div>`;

  function renderTab(): void {
    if (!stats) return;
    const s = stats;
    if (tab === "overview") {
      const o = s.overview;
      body.innerHTML = `
        <div class="adm-kpis">
          ${kpi("총 유저", String(o.users))}
          ${kpi("오늘 신규", String(o.newToday))}
          ${kpi("오늘 DAU", String(o.dauToday))}
          ${kpi("오늘 게임", String(o.gamesToday))}
          ${kpi("WAU / MAU", `${o.wau} / ${o.mau}`)}
          ${kpi("고착도 (DAU/MAU)", pctS(o.stickiness), "20%+ 면 매우 건강")}
        </div>
        <div class="adm-grid">
          <section><h3>누적 매치</h3><table>
            <tr><td>랭크</td><td class="num">${o.matches.ranked ?? 0}</td></tr>
            <tr><td>노말</td><td class="num">${o.matches.online ?? 0}</td></tr>
            <tr><td>봇</td><td class="num">${o.matches.bot ?? 0}</td></tr>
          </table></section>
        </div>
        <p class="adm-note">퍼널·세션 리플레이·정밀 코호트는 <a href="https://us.posthog.com" target="_blank" rel="noopener" style="color:var(--brass)">PostHog ↗</a>. 여기선 일일 핵심 숫자를 봅니다.</p>`;
    } else if (tab === "acquisition") {
      const a = s.acquisition;
      const maxSign = Math.max(1, ...a.signupsByDay.map((r) => r.n));
      body.innerHTML = `
        <div class="adm-kpis">
          ${kpi("이메일 인증율", pctS(a.verifiedRate), "가입→인증 완료 비율")}
          ${kpi("Google 로그인", `${a.loginSplit.google}`, `이메일 ${a.loginSplit.email}`)}
          ${kpi("초대 유입", String(a.invitedSignups), "친구 초대로 가입")}
        </div>
        <div class="adm-grid">
          <section><h3>신규 가입 (30일)</h3><table>${a.signupsByDay.map((r) => `<tr><td>${r.d.slice(5)}</td><td class="num">${r.n}</td><td class="barcell">${bar(r.n, maxSign)}</td></tr>`).join("") || "<tr><td>없음</td></tr>"}</table></section>
          <section><h3>유입 소스 (30일)</h3><table>${a.signupsBySource.map((r) => `<tr><td>${esc(r.s)}</td><td class="num">${r.n}</td></tr>`).join("") || "<tr><td>없음</td></tr>"}</table><p class="adm-note">광고 링크에 ?utm_source=…&utm_campaign=… 붙이면 소스별로 잡힙니다.</p></section>
          <section><h3>초대 캠페인</h3><table>
            <tr><td>골드 도전 중</td><td class="num">${a.invites.pending ?? 0}</td></tr>
            <tr><td>달성 (보상 대기)</td><td class="num">${a.invites.earned ?? 0}</td></tr>
            <tr><td>지급 완료</td><td class="num">${a.invites.paid ?? 0}</td></tr>
          </table></section>
        </div>`;
    } else if (tab === "retention") {
      const r = s.retention;
      const growth = r.activePrev7 > 0 ? (r.active7 - r.activePrev7) / r.activePrev7 : null;
      const maxD = Math.max(1, r.depth.d0, r.depth.d1, r.depth.d2_5, r.depth.d6p);
      body.innerHTML = `
        <div class="adm-kpis">
          ${kpi("고착도 (DAU/MAU)", pctS(r.stickiness), "20%+ 면 매우 건강")}
          ${kpi("주간 활성(WAU)", String(r.wau), growth == null ? "" : `전주 대비 ${growth >= 0 ? "+" : ""}${Math.round(growth * 100)}%`)}
          ${kpi("랭크 참여율", pctS(r.rankedParticipation), "전체 중 랭크 플레이")}
        </div>
        <div class="adm-grid">
          <section><h3>리텐션 코호트 (14일)</h3><table><tr class="hd"><td>가입일</td><td class="num">가입</td><td class="num">D1</td><td class="num">D7</td></tr>${r.cohorts.map((c) => `<tr><td>${c.cohort.slice(5)}</td><td class="num">${c.n}</td><td class="num">${pctRow(c.d1, c.n)}</td><td class="num">${pctRow(c.d7, c.n)}</td></tr>`).join("") || "<tr><td>없음</td></tr>"}</table><p class="adm-note">D1 40%+/D7 20%+ 면 좋은 편.</p></section>
          <section><h3>인게이지먼트 심도 (누적 플레이 수)</h3><table>
            <tr><td>0판 (가입만)</td><td class="num">${r.depth.d0}</td><td class="barcell">${bar(r.depth.d0, maxD, "linear-gradient(90deg,#555,#888)")}</td></tr>
            <tr><td>1판</td><td class="num">${r.depth.d1}</td><td class="barcell">${bar(r.depth.d1, maxD)}</td></tr>
            <tr><td>2~5판</td><td class="num">${r.depth.d2_5}</td><td class="barcell">${bar(r.depth.d2_5, maxD)}</td></tr>
            <tr><td>6판+</td><td class="num">${r.depth.d6p}</td><td class="barcell">${bar(r.depth.d6p, maxD, "linear-gradient(90deg,#3a6ea8,var(--cyan))")}</td></tr>
          </table><p class="adm-note">0판이 많으면 온보딩/첫경험에 문제. 6판+ = 진성 유저.</p></section>
        </div>`;
    } else if (tab === "gameplay") {
      const g = s.gameplay;
      const gdays = [...new Set(g.gamesByDay.map((x) => x.d))].sort();
      const gAt = (d: string, m: string) => g.gamesByDay.find((x) => x.d === d && x.mode === m)?.n ?? 0;
      const maxTier = Math.max(1, ...Object.values(g.tierDist));
      body.innerHTML = `
        <div class="adm-kpis">
          ${kpi("선공 승률", g.firstTurnWinRate == null ? "—" : pctS(g.firstTurnWinRate), `${g.firstTurnSample}판 · 50%에서 멀면 밸런스 편향`)}
          ${kpi("평균 게임 길이", g.avgTurns == null ? "—" : `${g.avgTurns.toFixed(1)}턴`, `${g.turnsSample}판 표본`)}
        </div>
        <div class="adm-grid">
          <section><h3>게임 수 (30일)</h3><table><tr class="hd"><td>일</td><td class="num">랭크</td><td class="num">노말</td><td class="num">봇</td></tr>${gdays.map((d) => `<tr><td>${d.slice(5)}</td><td class="num">${gAt(d, "ranked")}</td><td class="num">${gAt(d, "online")}</td><td class="num">${gAt(d, "bot")}</td></tr>`).join("") || "<tr><td>없음</td></tr>"}</table></section>
          <section><h3>티어 분포 (이번 시즌)</h3><table>${TIER_ORDER.map((tk) => `<tr><td style="color:${TIER_META[tk].color}">${tierLabel(tk)}</td><td class="num">${g.tierDist[tk] ?? 0}</td><td class="barcell">${bar(g.tierDist[tk] ?? 0, maxTier, TIER_META[tk].color)}</td></tr>`).join("")}</table></section>
          <section class="wide"><h3>카드 통계 — 전체 ${g.cards.length}장 · 구매/사용/승률
            <select class="input adm-ver" id="verSel">${g.versions.map((v) => `<option value="${v.v}" ${v.v === g.selectedVersion ? "selected" : ""}>${v.v === g.currentVersion ? `${v.v} (현재)` : v.v} · ${v.n}판</option>`).join("")}</select>
            <span class="adm-note" style="margin-left:6px">이 버전 ${g.cardSample}판</span></h3>
            <div id="cardTable"></div>
            <p class="adm-note">밸런스 버전별로 데이터가 분리 집계됩니다. 카드 수정 시 새 버전으로 다시 쌓이고, 옛 버전은 위 풀다운에서 다시 볼 수 있어요. 헤더 클릭 = 정렬. 빨강 = 승률 60%↑(OP), 파랑 = 40%↓(약체).</p></section>
        </div>`;
      (body.querySelector("#verSel") as HTMLSelectElement).onchange = (e) => { selVer = (e.target as HTMLSelectElement).value; void load(); };
      renderCardTable();
    } else if (tab === "monetization") {
      const m = s.monetization;
      body.innerHTML = `
        <div class="adm-kpis">
          ${kpi("구독", String(m.subscriptions))}
          ${kpi("해지", String(m.cancellations))}
          ${kpi("크레딧 판매", String(m.sales))}
          ${kpi("광고 수익", `$${m.adRevenue}`)}
        </div>
        <p class="adm-note">${m.note}. 결제(Paddle) 붙이면 여기가 실데이터로 채워집니다.</p>`;
    } else if (tab === "users") {
      body.innerHTML = `<div class="adm-sticky"><h3 style="font-family:var(--mono);font-size:12px;letter-spacing:.1em;color:var(--brass);margin:0">유저 리스트 <input class="input adm-search" id="admUserQ" placeholder="이메일/닉네임 검색"></h3></div><div id="admUsers" class="adm-note">불러오는 중…</div>`;
      if (users.length) renderUsers(); else void loadUsers();
      (body.querySelector("#admUserQ") as HTMLInputElement | null)?.addEventListener("input", renderUsers);
    }
  }

  function renderCardTable(): void {
    if (!stats) return;
    const box = body.querySelector("#cardTable") as HTMLElement | null;
    if (!box) return;
    const cols: { key: keyof CardStat | "name"; label: string; num?: boolean }[] = [
      { key: "name", label: "카드" },
      { key: "buys", label: "구매", num: true },
      { key: "plays", label: "사용", num: true },
      { key: "games", label: "게임", num: true },
      { key: "winrate", label: "승률", num: true },
    ];
    const val = (c: CardStat, k: keyof CardStat | "name"): number | string =>
      k === "name" ? cardName(c.id) : k === "winrate" ? (c.winrate ?? -1) : (c[k] as number);
    const sorted = [...stats.gameplay.cards].sort((a, b) => {
      const va = val(a, cardSort.key), vb = val(b, cardSort.key);
      if (typeof va === "string" || typeof vb === "string") return String(va).localeCompare(String(vb)) * cardSort.dir;
      return (va - vb) * cardSort.dir;
    });
    const arrow = (k: string) => cardSort.key === k ? (cardSort.dir === -1 ? " ▼" : " ▲") : "";
    box.innerHTML = `<table class="adm-sort"><tr class="hd">
      ${cols.map((c) => `<td class="${c.num ? "num" : ""} th" data-k="${c.key}">${c.label}${arrow(c.key)}</td>`).join("")}
    </tr>${sorted.map((c) => `<tr class="${c.winrate != null && c.winrate >= 0.6 ? "hot" : c.winrate != null && c.winrate <= 0.4 ? "cold" : ""}">
      <td>${cardName(c.id)}</td><td class="num">${c.buys}</td><td class="num">${c.plays}</td><td class="num">${c.games}</td><td class="num">${c.winrate == null ? "—" : pctS(c.winrate)}</td>
    </tr>`).join("")}</table>`;
    box.querySelectorAll(".th").forEach((th) => (th as HTMLElement).onclick = () => {
      const k = (th as HTMLElement).dataset.k as keyof CardStat | "name";
      cardSort = cardSort.key === k ? { key: k, dir: (cardSort.dir === -1 ? 1 : -1) } : { key: k, dir: k === "name" ? 1 : -1 };
      renderCardTable();
    });
  }

  function renderUsers(): void {
    const box = body.querySelector("#admUsers") as HTMLElement | null;
    if (!box) return;
    const q = ((body.querySelector("#admUserQ") as HTMLInputElement | null)?.value ?? "").toLowerCase();
    const list = users.filter((u) => !q || u.email.toLowerCase().includes(q) || u.display.toLowerCase().includes(q));
    box.className = "";
    box.innerHTML = `<table>
      <tr class="hd"><td>가입일</td><td>닉네임</td><td>이메일</td><td>로그인</td><td class="num">전적</td><td class="num">MMR</td><td>최근접속</td><td>소스</td><td>초대</td></tr>
      ${list.slice(0, 200).map((u) => `<tr>
        <td>${new Date(u.created_at).toISOString().slice(0, 10)}</td><td>${esc(u.display)}</td>
        <td>${esc(u.email)}${u.verified ? "" : ` <span style="color:var(--vermil-hi)">미인증</span>`}</td>
        <td>${u.is_google ? "Google" : "이메일"}</td><td class="num">${u.wins}승 ${u.losses}패</td>
        <td class="num">${u.mmr ?? "—"}</td><td>${u.last_day ?? "—"}</td><td>${esc(u.source ?? "direct")}</td><td>${u.invited_by ? "✓" : ""}</td>
      </tr>`).join("")}
    </table><p class="adm-note">${list.length}명${list.length > 200 ? " (상위 200명 표시)" : ""}</p>`;
  }

  async function loadUsers(): Promise<void> {
    const res = await fetch("/api/admin/users", { credentials: "include" }).catch(() => null);
    if (!res?.ok) return;
    users = ((await res.json()) as { users: AdminUser[] }).users;
    renderUsers();
  }

  async function load(): Promise<void> {
    tabsEl.style.display = "none";
    body.innerHTML = `<div class="adm-loading">불러오는 중…</div>`;
    const res = await fetch(`/api/admin/stats${selVer ? `?bver=${encodeURIComponent(selVer)}` : ""}`, { credentials: "include" }).catch(() => null);
    if (!res || res.status === 401) { gate(res ? (await res.json().catch(() => ({}))).loggedIn === true : false); return; }
    stats = (await res.json()) as Stats;
    const o = stats.overview;
    sub.innerHTML = `총 ${o.users}명 · DAU ${o.dauToday} · 오늘 신규 ${o.newToday} &nbsp;<a id="admReload" style="cursor:pointer;color:var(--brass)">↻</a>`;
    (sub.querySelector("#admReload") as HTMLElement).onclick = () => void load();
    renderTabs();
    renderTab();
  }

  void load();
  return {};
}
