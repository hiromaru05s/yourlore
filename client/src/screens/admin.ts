// ============================================================
// LORE — all-in-one operator dashboard (tabbed). Lives on the
// ISOLATED admin origin (admin.yourlore.xyz). Auth: logged-in
// session email must be in ADMIN_EMAILS. PostHog handles deep dives.
// Tabs: 개요 · 유입·퍼널 · 리텐션 · 게임·밸런스 · 이코노미 · 유저.
// All calendar days are KST (the server groups them that way).
// ============================================================
import type { App, Screen } from "../router";
import { api } from "../net/api";
import { DB, SLEEVES } from "../shared/cards";
import { TIER_META, tierLabel } from "../ui/tier";

interface TrendRow { d: string; dau: number; games: number; signups: number }
interface RecentMatch { mode: string; turns: number | null; at: number; bver: string | null; durMs: number | null; a: string; b: string; winner: "a" | "b" | null }
interface Stats {
  overview: { users: number; dauToday: number; newToday: number; gamesToday: number; wau: number; mau: number; stickiness: number; matches: Record<string, number>; trend: TrendRow[]; recent: RecentMatch[] };
  acquisition: { signupsByDay: { d: string; n: number }[]; signupsBySource: { s: string; n: number }[]; verifiedRate: number; loginSplit: { google: number; email: number }; invitedSignups: number; invites: Record<string, number>; funnel: { signup: number; verified: number; tutorial: number; firstGame: number; sixPlus: number; ranked: number } };
  retention: { cohorts: { cohort: string; n: number; d1: number; d7: number }[]; wau: number; mau: number; stickiness: number; depth: { d0: number; d1: number; d2_5: number; d6p: number }; active7: number; activePrev7: number; rankedParticipation: number };
  gameplay: { gamesByDay: { d: string; mode: string; n: number }[]; tierDist: Record<string, number>; cards: CardStat[]; cardSample: number; starters: StarterStat[]; deckUsers: number; defaultDeckUsers: number; firstTurnWinRate: number | null; firstTurnSample: number; avgTurns: number | null; turnsSample: number; avgDurMs: number | null; durSample: number; drawRate: number | null; drawSample: number; bot: { n: number; w: number; l: number; d: number }; currentVersion: string; selectedVersion: string; versions: { v: string; n: number }[] };
  monetization: { note: string; subscriptions: number; cancellations: number; sales: number; adRevenue: number; credits: EconStats };
}
interface EconStats {
  circulating: number; issuedTotal: number; spent: number; holders: number; avgHold: number;
  issuedRewards: { k: string; amt: number; n: number }[];
  couponIssued: number; couponClaims: number;
  coupons: { code: string; amount: number; max_uses: number | null; uses: number; expires_at: number | null }[];
  buckets: Record<string, number>;
  sleeves: { id: string; n: number }[]; sleeveOwners: number;
}
interface CardStat { id: string; buys: number; plays: number; games: number; winrate: number | null }
interface StarterStat { id: string; decks: number; plays: number; games: number; winrate: number | null }
interface InquiryRow {
  id: string; title: string; body: string; created_at: number;
  user_id: string | null; display: string | null; email: string | null;
}
interface AdminUser {
  id: string; email: string; display: string; created_at: number; verified: number;
  source: string | null; wins: number; losses: number; invited_by: string | null; credits: number;
  mmr: number | null; last_day: string | null; is_google: number;
}

const TIER_ORDER = ["iron", "bronze", "silver", "gold", "platinum", "diamond", "master"];
const TABS = [["overview", "개요"], ["acquisition", "유입·퍼널"], ["retention", "리텐션"], ["gameplay", "게임·밸런스"], ["economy", "이코노미·수익"], ["users", "유저"], ["inquiries", "문의"]] as const;
type TabKey = typeof TABS[number][0];

const esc = (s: string) => (s || "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string));
const pctS = (x: number) => `${(x * 100).toFixed(1)}%`;
const num = (x: number) => x.toLocaleString("en-US");
const cardName = (id: string) => DB[id]?.name ?? id;
const sleeveName = (id: string) => SLEEVES[id]?.ko ?? id;
const bar = (v: number, max: number, color = "linear-gradient(90deg,var(--brass-dim),var(--brass))") => `<i class="adm-bar" style="width:${max > 0 ? Math.round(v / max * 100) : 0}%;background:${color}"></i>`;
const pctRow = (a: number, b: number) => b > 0 ? `${Math.round(a / b * 100)}%` : "—";
const durS = (ms: number | null) => ms == null ? "—" : ms >= 60_000 ? `${Math.floor(ms / 60_000)}분 ${Math.round(ms % 60_000 / 1000)}초` : `${Math.round(ms / 1000)}초`;
const ago = (t: number) => { const s = Math.max(0, (Date.now() - t) / 1000); return s < 60 ? "방금" : s < 3600 ? `${Math.floor(s / 60)}분 전` : s < 86400 ? `${Math.floor(s / 3600)}시간 전` : `${Math.floor(s / 86400)}일 전`; };
const MODE_KO: Record<string, string> = { ranked: "랭크", online: "노말", bot: "봇" };

/** Compact single-series SVG trend chart (30d). One measure per chart — small
 *  multiples instead of a dual axis. Native <title> tooltips per point. */
function spark(rows: TrendRow[], key: "dau" | "games" | "signups", color: string): string {
  const W = 300, H = 76, PAD = 6, LBL = 30; // right gutter for the last-value label
  if (!rows.length) return `<div class="adm-note">데이터 없음</div>`;
  const vals = rows.map((r) => r[key]);
  const max = Math.max(1, ...vals);
  const x = (i: number) => PAD + i * (W - PAD * 2 - LBL) / Math.max(1, rows.length - 1);
  const y = (v: number) => H - PAD - v / max * (H - PAD * 2);
  const pts = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const last = vals[vals.length - 1];
  const line = rows.length > 1 ? `<polyline points="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>` : "";
  const area = rows.length > 1 ? `<polygon points="${PAD},${H - PAD} ${pts.join(" ")} ${x(rows.length - 1).toFixed(1)},${H - PAD}" fill="${color}" opacity="0.12"/>` : "";
  const dots = rows.map((r, i) => `<circle class="sp-dot" cx="${x(i).toFixed(1)}" cy="${y(r[key]).toFixed(1)}" r="7" fill="transparent"><title>${r.d.slice(5)} — ${num(r[key])}</title></circle>`).join("");
  const lastDot = `<circle cx="${x(rows.length - 1).toFixed(1)}" cy="${y(last).toFixed(1)}" r="3" fill="${color}"/>`;
  return `<svg class="adm-spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img">
    <line x1="${PAD}" y1="${H - PAD}" x2="${W - PAD}" y2="${H - PAD}" stroke="#ffffff14" stroke-width="1"/>
    ${area}${line}${lastDot}
    <text x="${x(rows.length - 1) + 6}" y="${Math.min(H - 8, Math.max(12, y(last) + 4))}" fill="${color}" font-size="12" font-family="var(--mono)">${num(last)}</text>
    ${dots}</svg>
    <div class="sp-range">${rows[0].d.slice(5)} ~ ${rows[rows.length - 1].d.slice(5)}</div>`;
}

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
  let inquiries: InquiryRow[] | null = null;
  let tab: TabKey = "overview";
  let cardSort: { key: keyof CardStat | "name"; dir: 1 | -1 } = { key: "winrate", dir: -1 };
  let starterSort: { key: keyof StarterStat | "name"; dir: 1 | -1 } = { key: "decks", dir: -1 };
  let selVer = "";
  let presenceTimer: ReturnType<typeof setInterval> | null = null;

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

  async function pollPresence(): Promise<void> {
    if (tab !== "overview") return;
    const r = await fetch("/api/admin/presence", { credentials: "include" }).catch(() => null);
    if (!r?.ok) return;
    const p = await r.json() as { online: number; bot: number; queue: number; menu: number; total: number };
    const set = (id: string, v: number) => { const el = body.querySelector(id); if (el) el.textContent = String(v); };
    set("#lvTotal", p.total); set("#lvOnline", p.online); set("#lvBot", p.bot); set("#lvQueue", p.queue); set("#lvMenu", p.menu);
  }

  const kpi = (label: string, value: string, hint = "") => `<div class="adm-kpi"><div class="k-v">${value}</div><div class="k-l">${label}</div>${hint ? `<div class="k-h">${hint}</div>` : ""}</div>`;

  function renderTab(): void {
    if (!stats) return;
    const s = stats;
    if (tab === "overview") {
      const o = s.overview;
      body.innerHTML = `
        <div class="adm-live" id="admLive">
          <span class="live-dot"></span><b>실시간 접속</b>
          <span class="live-stat">전체 <b id="lvTotal">…</b></span>
          <span class="live-stat hot">대전 중 <b id="lvOnline">…</b></span>
          <span class="live-stat hot">봇전 중 <b id="lvBot">…</b></span>
          <span class="live-stat">매칭 대기 <b id="lvQueue">…</b></span>
          <span class="live-stat">로비/메뉴 <b id="lvMenu">…</b></span>
        </div>
        <div class="adm-kpis">
          ${kpi("총 유저", num(o.users))}
          ${kpi("오늘 신규", num(o.newToday), "KST 자정 기준")}
          ${kpi("오늘 DAU", num(o.dauToday), "KST 자정 기준")}
          ${kpi("오늘 게임", num(o.gamesToday))}
          ${kpi("WAU / MAU", `${num(o.wau)} / ${num(o.mau)}`)}
          ${kpi("고착도 (DAU/MAU)", pctS(o.stickiness), "20%+ 면 매우 건강")}
        </div>
        <div class="adm-grid">
          <section><h3>DAU — 30일</h3>${spark(o.trend, "dau", "var(--brass)")}</section>
          <section><h3>게임 수 — 30일</h3>${spark(o.trend, "games", "#5aa7d6")}</section>
          <section><h3>신규 가입 — 30일</h3>${spark(o.trend, "signups", "#6fbf73")}</section>
        </div>
        <div class="adm-grid" style="margin-top:18px">
          <section><h3>누적 매치</h3><table>
            <tr><td>랭크</td><td class="num">${num(o.matches.ranked ?? 0)}</td></tr>
            <tr><td>노말</td><td class="num">${num(o.matches.online ?? 0)}</td></tr>
            <tr><td>봇</td><td class="num">${num(o.matches.bot ?? 0)}</td></tr>
          </table></section>
          <section class="wide2"><h3>최근 게임 20건</h3><table>
            <tr class="hd"><td>시각</td><td>모드</td><td>매치</td><td class="num">턴</td><td class="num">시간</td><td>버전</td></tr>
            ${o.recent.map((m) => {
              const an = m.winner === "a" ? `<b class="win">${esc(m.a)}</b>` : esc(m.a);
              const bn = m.winner === "b" ? `<b class="win">${esc(m.b)}</b>` : esc(m.b);
              return `<tr><td>${ago(m.at)}</td><td>${MODE_KO[m.mode] ?? m.mode}</td><td>${an} <span class="vs">vs</span> ${bn}${m.winner == null && m.mode !== "bot" ? ` <span class="adm-tag">무</span>` : ""}</td><td class="num">${m.turns ?? "—"}</td><td class="num">${durS(m.durMs)}</td><td>${m.bver ?? "—"}</td></tr>`;
            }).join("") || "<tr><td>없음</td></tr>"}
          </table><p class="adm-note">굵은 글씨 = 승자. 봇전은 결과만 기록(카드 통계 제외).</p></section>
        </div>
        <p class="adm-note">퍼널·세션 리플레이·정밀 코호트는 <a href="https://us.posthog.com" target="_blank" rel="noopener" style="color:var(--brass)">PostHog ↗</a>. 여기선 일일 핵심 숫자를 봅니다. 모든 날짜는 KST 기준.</p>`;
      void pollPresence(); // fill the live numbers now that #lv* exist
    } else if (tab === "acquisition") {
      const a = s.acquisition;
      const f = a.funnel;
      const maxSign = Math.max(1, ...a.signupsByDay.map((r) => r.n));
      const steps: { label: string; v: number; hint?: string }[] = [
        { label: "가입", v: f.signup },
        { label: "이메일 인증", v: f.verified },
        { label: "첫 게임", v: f.firstGame, hint: "봇전 포함" },
        { label: "랭크 진입", v: f.ranked, hint: "시즌 무관 전체" },
        { label: "6판 이상 (진성)", v: f.sixPlus },
      ];
      body.innerHTML = `
        <div class="adm-kpis">
          ${kpi("이메일 인증율", pctS(a.verifiedRate), "가입→인증 완료 비율")}
          ${kpi("Google 로그인", `${num(a.loginSplit.google)}`, `이메일 ${num(a.loginSplit.email)}`)}
          ${kpi("초대 유입", num(a.invitedSignups), "친구 초대로 가입")}
          ${kpi("튜토리얼 완주", num(f.tutorial), `가입의 ${pctRow(f.tutorial, f.signup)} · 10단계 클리어`)}
        </div>
        <div class="adm-grid">
          <section class="wide"><h3>퍼널 — 가입부터 랭크까지 (전체 기간)</h3><table>
            ${steps.map((st, i) => {
              const prev = i > 0 ? steps[i - 1].v : st.v;
              const conv = i > 0 ? (prev > 0 ? `<span class="conv">↓ ${Math.min(100, Math.round(st.v / prev * 100))}%</span>` : "") : "";
              return `<tr><td style="width:160px">${st.label}${st.hint ? `<div class="adm-note" style="margin:0">${st.hint}</div>` : ""}</td>
                <td class="num" style="width:70px">${num(st.v)}</td>
                <td class="num" style="width:60px">${pctRow(st.v, f.signup)}</td>
                <td class="barcell">${bar(st.v, Math.max(1, f.signup))}</td>
                <td style="width:64px">${conv}</td></tr>`;
            }).join("")}
          </table><p class="adm-note">각 단계 % = 전체 가입 대비. ↓ = 직전 단계 대비 전환율. 가장 크게 꺾이는 구간이 개선 1순위입니다.</p></section>
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
          ${kpi("주간 활성(WAU)", num(r.wau), growth == null ? "" : `전주 대비 ${growth >= 0 ? "+" : ""}${Math.round(growth * 100)}%`)}
          ${kpi("랭크 참여율", pctS(r.rankedParticipation), "전체 중 이번 시즌 랭크 플레이")}
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
      const botWr = (g.bot.w + g.bot.l) > 0 ? g.bot.w / (g.bot.w + g.bot.l) : null;
      body.innerHTML = `
        <div class="adm-kpis">
          ${kpi("선공 승률", g.firstTurnWinRate == null ? "—" : pctS(g.firstTurnWinRate), `${g.firstTurnSample}판 · 50%에서 멀면 밸런스 편향`)}
          ${kpi("평균 게임 길이", g.avgTurns == null ? "—" : `${g.avgTurns.toFixed(1)}턴`, `${g.turnsSample}판 표본`)}
          ${kpi("평균 게임 시간", durS(g.avgDurMs), g.durSample > 0 ? `${g.durSample}판 · 매칭 성립~종료` : "새로 기록되는 판부터 집계")}
          ${kpi("무승부율 (PvP)", g.drawRate == null ? "—" : pctS(g.drawRate), `${g.drawSample}판 · 60턴 체력 동률`)}
          ${kpi("봇전 유저 승률", botWr == null ? "—" : pctS(botWr), `${num(g.bot.n)}판 (승 ${num(g.bot.w)}/패 ${num(g.bot.l)}/무 ${num(g.bot.d)})`)}
        </div>
        <div class="adm-grid">
          <section><h3>게임 수 (30일)</h3><table><tr class="hd"><td>일</td><td class="num">랭크</td><td class="num">노말</td><td class="num">봇</td></tr>${gdays.map((d) => `<tr><td>${d.slice(5)}</td><td class="num">${gAt(d, "ranked")}</td><td class="num">${gAt(d, "online")}</td><td class="num">${gAt(d, "bot")}</td></tr>`).join("") || "<tr><td>없음</td></tr>"}</table></section>
          <section><h3>티어 분포 (이번 시즌)</h3><table>${TIER_ORDER.map((tk) => `<tr><td style="color:${TIER_META[tk].color}">${tierLabel(tk)}</td><td class="num">${g.tierDist[tk] ?? 0}</td><td class="barcell">${bar(g.tierDist[tk] ?? 0, maxTier, TIER_META[tk].color)}</td></tr>`).join("")}</table></section>
          <section class="wide"><h3>마켓 카드 통계 — 전체 ${g.cards.length}장 · 구매/사용/승률
            <select class="input adm-ver" id="verSel">${g.versions.map((v) => `<option value="${v.v}" ${v.v === g.selectedVersion ? "selected" : ""}>${v.v === g.currentVersion ? `${v.v} (현재)` : v.v} · ${v.n}판</option>`).join("")}</select>
            <span class="adm-note" style="margin-left:6px">이 버전 ${g.cardSample}판</span></h3>
            <div id="cardTable"></div>
            <p class="adm-note">밸런스 버전별로 데이터가 분리 집계됩니다. 카드 수정 시 새 버전으로 다시 쌓이고, 옛 버전은 위 풀다운에서 다시 볼 수 있어요. 헤더 클릭 = 정렬. 빨강 = 승률 60%↑(OP), 파랑 = 40%↓(약체).</p></section>
          <section class="wide"><h3>스타팅 카드 — 덱 채용률 · 사용 · 승률 <span class="adm-note" style="margin-left:6px">커스텀 덱 ${num(g.deckUsers)}명 · 기본덱 ${num(g.defaultDeckUsers)}명</span></h3>
            <div id="starterTable"></div>
            <p class="adm-note">채용 = 현재 활성 덱에 넣은 유저 수 (기본덱 유저 제외). 승률은 선택된 밸런스 버전의 실제 사용 판 기준. 채용률 0%대 카드는 리워크 후보.</p></section>
        </div>`;
      (body.querySelector("#verSel") as HTMLSelectElement).onchange = (e) => { selVer = (e.target as HTMLSelectElement).value; void load(); };
      renderCardTable();
      renderStarterTable();
    } else if (tab === "economy") {
      const m = s.monetization;
      const c = m.credits;
      const rewardKo: Record<string, string> = { tutorial: "인터랙티브 튜토리얼", tutorial_legacy: "구 튜토리얼 (레거시)" };
      const bucketRows: [string, number][] = [["0 (무소지)", c.buckets.b0], ["1~499", c.buckets.b1], ["500~999", c.buckets.b2], ["1,000~1,999", c.buckets.b3], ["2,000+", c.buckets.b4]];
      const maxB = Math.max(1, ...bucketRows.map(([, n]) => n));
      body.innerHTML = `
        <div class="adm-kpis">
          ${kpi("발행 크레딧 (누적)", num(c.issuedTotal), "튜토리얼+쿠폰 등 전체 지급")}
          ${kpi("유통 크레딧 (보유)", num(c.circulating), `유저당 평균 ${Math.round(c.avgHold)}`)}
          ${kpi("소진 크레딧", num(c.spent), c.issuedTotal > 0 ? `싱크율 ${pctS(c.spent / c.issuedTotal)} — 살 게 있어야 오릅니다` : "")}
          ${kpi("슬리브 구매 유저", num(c.sleeveOwners), "유료 스킨 보유 (기본 제외)")}
        </div>
        <div class="adm-grid">
          <section><h3>크레딧 발행 경로</h3><table>
            ${c.issuedRewards.map((r) => `<tr><td>${esc(rewardKo[r.k] ?? r.k)}</td><td class="num">${num(r.amt)}</td><td class="num">${num(r.n)}건</td></tr>`).join("")}
            <tr><td>쿠폰</td><td class="num">${num(c.couponIssued)}</td><td class="num">${num(c.couponClaims)}건</td></tr>
          </table><p class="adm-note">초대 캠페인 보상(1,000×양측)은 'earned' 상태로 대기 중 — 지급 로직 연결 시 여기 잡힙니다.</p></section>
          <section><h3>크레딧 보유 분포</h3><table>
            ${bucketRows.map(([l, n]) => `<tr><td>${l}</td><td class="num">${num(n)}</td><td class="barcell">${bar(n, maxB)}</td></tr>`).join("")}
          </table><p class="adm-note">첫 스킨(1,000) 도달 유저가 늘어야 이코노미가 도는 겁니다.</p></section>
          <section><h3>슬리브 판매 현황</h3><table>
            ${c.sleeves.length ? c.sleeves.map((r) => `<tr><td>${esc(sleeveName(r.id))}</td><td class="num">${num(r.n)}명</td></tr>`).join("") : `<tr><td>아직 판매 없음</td></tr>`}
          </table></section>
          <section><h3>쿠폰</h3><table>
            ${c.coupons.length ? `<tr class="hd"><td>코드</td><td class="num">금액</td><td class="num">사용</td><td>만료</td></tr>` + c.coupons.map((r) => `<tr><td>${esc(r.code)}</td><td class="num">${num(r.amount)}</td><td class="num">${r.uses}${r.max_uses != null ? `/${r.max_uses}` : ""}</td><td>${r.expires_at ? new Date(r.expires_at).toISOString().slice(0, 10) : "무기한"}</td></tr>`).join("") : `<tr><td>등록된 쿠폰 없음</td></tr>`}
          </table><p class="adm-note">쿠폰 등록은 D1 콘솔/쿼리로: INSERT INTO coupons(code,amount,max_uses,expires_at) …</p></section>
        </div>
        <div class="adm-kpis" style="margin-top:18px">
          ${kpi("구독", num(m.subscriptions))}
          ${kpi("해지", num(m.cancellations))}
          ${kpi("크레딧 판매", num(m.sales))}
          ${kpi("광고 수익", `$${m.adRevenue}`)}
        </div>
        <p class="adm-note">${m.note}. 확정 수익구조는 docs/monetization.md ($7 단일 구독 · 파워 판매 금지).</p>`;
    } else if (tab === "inquiries") {
      body.innerHTML = `<div class="adm-sticky"><h3 style="font-family:var(--mono);font-size:12px;letter-spacing:.1em;color:var(--brass);margin:0">문의 리스트 <span class="adm-note" style="margin-left:6px">홈 '문의' 모달로 접수된 요청사항·버그</span> <button class="btn btn-mini btn-ghost" id="admInqReload">↻ 새로고침</button></h3></div><div id="admInq" class="adm-note">불러오는 중…</div>`;
      (body.querySelector("#admInqReload") as HTMLButtonElement | null)?.addEventListener("click", () => { inquiries = null; void loadInquiries(); });
      if (inquiries) renderInquiries(); else void loadInquiries();
    } else if (tab === "users") {
      body.innerHTML = `<div class="adm-sticky"><h3 style="font-family:var(--mono);font-size:12px;letter-spacing:.1em;color:var(--brass);margin:0">유저 리스트 <input class="input adm-search" id="admUserQ" placeholder="이메일/닉네임 검색"> <button class="btn btn-mini btn-ghost" id="admCsv">CSV ↓</button></h3></div><div id="admUsers" class="adm-note">불러오는 중…</div>`;
      if (users.length) renderUsers(); else void loadUsers();
      (body.querySelector("#admUserQ") as HTMLInputElement | null)?.addEventListener("input", renderUsers);
      (body.querySelector("#admCsv") as HTMLButtonElement | null)?.addEventListener("click", exportCsv);
    }
  }

  /** Generic sortable table: shared by market-card and starter-card stats. */
  function sortableTable<T extends { id: string; winrate: number | null }>(
    boxSel: string, rows: T[], cols: { key: string; label: string; num?: boolean }[],
    sort: { key: string; dir: 1 | -1 }, setSort: (s: { key: string; dir: 1 | -1 }) => void,
    val: (r: T, k: string) => number | string, extraCell?: (r: T, k: string) => string | null,
  ): void {
    const box = body.querySelector(boxSel) as HTMLElement | null;
    if (!box) return;
    const sorted = [...rows].sort((a, b) => {
      const va = val(a, sort.key), vb = val(b, sort.key);
      if (typeof va === "string" || typeof vb === "string") return String(va).localeCompare(String(vb)) * sort.dir;
      return (va - vb) * sort.dir;
    });
    const arrow = (k: string) => sort.key === k ? (sort.dir === -1 ? " ▼" : " ▲") : "";
    box.innerHTML = `<table class="adm-sort"><tr class="hd">
      ${cols.map((cc) => `<td class="${cc.num ? "num" : ""} th" data-k="${cc.key}">${cc.label}${arrow(cc.key)}</td>`).join("")}
    </tr>${sorted.map((r) => `<tr class="${r.winrate != null && r.winrate >= 0.6 ? "hot" : r.winrate != null && r.winrate <= 0.4 ? "cold" : ""}">
      ${cols.map((cc) => {
        const extra = extraCell?.(r, cc.key);
        if (extra != null) return extra;
        const v = val(r, cc.key);
        return `<td class="${cc.num ? "num" : ""}">${cc.key === "name" ? esc(String(v)) : cc.key === "winrate" ? (r.winrate == null ? "—" : pctS(r.winrate)) : num(v as number)}</td>`;
      }).join("")}
    </tr>`).join("")}</table>`;
    box.querySelectorAll(".th").forEach((th) => (th as HTMLElement).onclick = () => {
      const k = (th as HTMLElement).dataset.k!;
      setSort(sort.key === k ? { key: k, dir: (sort.dir === -1 ? 1 : -1) } : { key: k, dir: k === "name" ? 1 : -1 });
    });
  }

  function renderCardTable(): void {
    if (!stats) return;
    sortableTable<CardStat>("#cardTable", stats.gameplay.cards,
      [{ key: "name", label: "카드" }, { key: "buys", label: "구매", num: true }, { key: "plays", label: "사용", num: true }, { key: "games", label: "게임", num: true }, { key: "winrate", label: "승률", num: true }],
      cardSort, (ns) => { cardSort = ns as typeof cardSort; renderCardTable(); },
      (c, k) => k === "name" ? cardName(c.id) : k === "winrate" ? (c.winrate ?? -1) : (c[k as keyof CardStat] as number));
  }

  function renderStarterTable(): void {
    if (!stats) return;
    const dk = Math.max(1, stats.gameplay.deckUsers);
    sortableTable<StarterStat>("#starterTable", stats.gameplay.starters,
      [{ key: "name", label: "카드" }, { key: "decks", label: "덱 채용", num: true }, { key: "plays", label: "사용", num: true }, { key: "games", label: "게임", num: true }, { key: "winrate", label: "승률", num: true }],
      starterSort, (ns) => { starterSort = ns as typeof starterSort; renderStarterTable(); },
      (c, k) => k === "name" ? cardName(c.id) : k === "winrate" ? (c.winrate ?? -1) : (c[k as keyof StarterStat] as number),
      (c, k) => k === "decks" ? `<td class="num">${num(c.decks)} <span class="adm-note" style="margin:0">(${Math.round(c.decks / dk * 100)}%)</span></td>` : null);
  }

  function renderUsers(): void {
    const box = body.querySelector("#admUsers") as HTMLElement | null;
    if (!box) return;
    const q = ((body.querySelector("#admUserQ") as HTMLInputElement | null)?.value ?? "").toLowerCase();
    const list = users.filter((u) => !q || u.email.toLowerCase().includes(q) || u.display.toLowerCase().includes(q));
    box.className = "";
    box.innerHTML = `<table>
      <tr class="hd"><td>가입일</td><td>닉네임</td><td>이메일</td><td>로그인</td><td class="num">전적</td><td class="num">MMR</td><td class="num">크레딧</td><td>최근접속</td><td>소스</td><td>초대</td></tr>
      ${list.slice(0, 200).map((u) => `<tr>
        <td>${new Date(u.created_at).toISOString().slice(0, 10)}</td><td>${esc(u.display)}</td>
        <td>${esc(u.email)}${u.verified ? "" : ` <span style="color:var(--vermil-hi)">미인증</span>`}</td>
        <td>${u.is_google ? "Google" : "이메일"}</td><td class="num">${u.wins}승 ${u.losses}패</td>
        <td class="num">${u.mmr ?? "—"}</td><td class="num">${num(u.credits ?? 0)}</td><td>${u.last_day ?? "—"}</td><td>${esc(u.source ?? "direct")}</td><td>${u.invited_by ? "✓" : ""}</td>
      </tr>`).join("")}
    </table><p class="adm-note">${list.length}명${list.length > 200 ? " (상위 200명 표시 — 전체는 CSV로)" : ""}</p>`;
  }

  function exportCsv(): void {
    const head = ["created", "display", "email", "login", "verified", "wins", "losses", "mmr", "credits", "last_day", "source", "invited"];
    const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const lines = [head.join(",")].concat(users.map((u) => [
      new Date(u.created_at).toISOString().slice(0, 10), q(u.display), u.email, u.is_google ? "google" : "email",
      u.verified ? 1 : 0, u.wins, u.losses, u.mmr ?? "", u.credits ?? 0, u.last_day ?? "", q(u.source ?? "direct"), u.invited_by ? 1 : 0,
    ].join(",")));
    const url = URL.createObjectURL(new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `lore-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** 문의 탭: 접수일·유저·제목 리스트, 행 클릭으로 본문 펼치기. */
  function renderInquiries(): void {
    const box = body.querySelector("#admInq") as HTMLElement | null;
    if (!box) return;
    const list = inquiries ?? [];
    const kst = (t: number) => new Date(t + 32400_000).toISOString().slice(0, 16).replace("T", " ");
    box.className = "";
    box.innerHTML = `<table class="adm-inq">
      <tr class="hd"><td style="width:150px">접수 (KST)</td><td style="width:200px">유저</td><td>제목</td></tr>
      ${list.map((r, i) => `
        <tr class="inq-row" data-i="${i}" style="cursor:pointer">
          <td>${kst(r.created_at)}<div class="adm-note" style="margin:0">${ago(r.created_at)}</div></td>
          <td>${r.display != null ? `${esc(r.display)}<div class="adm-note" style="margin:0">${esc(r.email ?? "")}</div>` : `<span style="color:var(--paper-faint)">게스트/비로그인</span>`}</td>
          <td>${esc(r.title)} <span class="adm-note" style="margin:0">▾</span></td>
        </tr>
        <tr data-b="${i}" style="display:none"><td colspan="3" style="white-space:pre-wrap;line-height:1.6;color:var(--paper-dim);padding:10px 14px;background:#00000033">${esc(r.body)}</td></tr>`).join("") || `<tr><td colspan="3">아직 접수된 문의가 없습니다</td></tr>`}
    </table><p class="adm-note">${list.length}건 · 최신순 (최대 300건 표시). 행 클릭 = 본문 펼치기/접기.</p>`;
    box.querySelectorAll(".inq-row").forEach((tr) => (tr as HTMLElement).onclick = () => {
      const b = box.querySelector(`[data-b="${(tr as HTMLElement).dataset.i}"]`) as HTMLElement | null;
      if (b) b.style.display = b.style.display === "none" ? "" : "none";
    });
  }

  async function loadInquiries(): Promise<void> {
    const box = body.querySelector("#admInq") as HTMLElement | null;
    if (box) { box.className = "adm-note"; box.textContent = "불러오는 중…"; }
    const res = await fetch("/api/admin/inquiries", { credentials: "include" }).catch(() => null);
    if (!res?.ok) { if (box) box.textContent = "불러오기에 실패했습니다"; return; }
    inquiries = ((await res.json()) as { inquiries: InquiryRow[] }).inquiries;
    renderInquiries();
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
    if (!presenceTimer) presenceTimer = setInterval(() => void pollPresence(), 8000); // live refresh every 8s
  }

  void load();
  return { destroy: () => { if (presenceTimer) clearInterval(presenceTimer); } };
}
