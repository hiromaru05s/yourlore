// ============================================================
// LORE — internal GAME-HEALTH dashboard. Route: /admin
// Acquisition/retention/funnel live in PostHog; this view keeps
// only what PostHog can't compute: card win-rates (balance),
// tier distribution, invite ledger, and a support email lookup.
// Auth: Cloudflare Access (edge SSO) once set up; a manual admin
// key (AUTH_SECRET) is the fallback until then.
// ============================================================
import type { App, Screen } from "../router";
import { DB } from "../shared/cards";
import { TIER_META, tierLabel } from "../ui/tier";

interface Stats {
  totals: { users: number; matches: Record<string, number> };
  tierDist: Record<string, number>;
  invites: Record<string, number>;
  cards: { id: string; games: number; winrate: number }[];
  cardSample: number;
  revenue: { note: string; subscriptions: number; cancellations: number; sales: number; adRevenue: number };
}
interface LookupUser {
  email: string; display: string; created_at: number; verified: number;
  wins: number; losses: number; invited_by: string | null; mmr: number | null;
  last_day: string | null; is_google: number;
}

const KEY_LS = "lore_admin_key";
const TIER_ORDER = ["iron", "bronze", "silver", "gold", "platinum", "diamond", "master"];

export function mountAdmin(app: App): Screen {
  const wrap = document.createElement("div");
  wrap.className = "screen adm-screen";
  wrap.innerHTML = `<div class="panel adm"><div class="adm-head"><h2>LORE — 게임 지표</h2><span class="adm-sub" id="admSub"></span></div><div id="admBody" class="adm-body"></div></div>`;
  app.root.appendChild(wrap);
  const body = wrap.querySelector("#admBody") as HTMLElement;
  const sub = wrap.querySelector("#admSub") as HTMLElement;

  const authHeaders = (): Record<string, string> => {
    const key = localStorage.getItem(KEY_LS) || "";
    return key ? { Authorization: `Bearer ${key}` } : {};
  };

  const askKey = (msg = "") => {
    body.innerHTML = `
      ${msg ? `<div class="adm-err">${msg}</div>` : ""}
      <p class="adm-note" style="text-align:center;max-width:420px;margin:0 auto 6px">Cloudflare Access가 설정되면 이 입력은 필요 없어집니다. 그 전까지 임시 관리자 키로 접근합니다.</p>
      <div class="form-row"><label class="field-label">관리자 키 (AUTH_SECRET)</label><input class="input" id="admKey" type="password"></div>
      <button class="btn btn-gold btn-block" id="admGo">열기</button>`;
    (body.querySelector("#admGo") as HTMLButtonElement).onclick = () => {
      localStorage.setItem(KEY_LS, (body.querySelector("#admKey") as HTMLInputElement).value.trim());
      void load();
    };
  };

  const cardName = (id: string) => DB[id]?.name ?? id;

  async function load(): Promise<void> {
    body.innerHTML = `<div class="adm-loading">불러오는 중…</div>`;
    const res = await fetch("/api/admin/stats", { headers: authHeaders() }).catch(() => null);
    if (!res || res.status === 401) {
      // Access가 없고 키도 틀린 경우 → 키 입력. (Access가 있으면 이 401은 안 옴)
      if (localStorage.getItem(KEY_LS)) localStorage.removeItem(KEY_LS);
      askKey(res ? "인증 실패 — 키가 올바르지 않습니다." : "연결 오류");
      return;
    }
    const s = (await res.json()) as Stats;
    sub.textContent = `총 유저 ${s.totals.users} · 매치 랭크 ${s.totals.matches.ranked ?? 0} / 노말 ${s.totals.matches.online ?? 0} / 봇 ${s.totals.matches.bot ?? 0}`;

    const maxTier = Math.max(1, ...Object.values(s.tierDist));
    const bar = (v: number, max: number, color: string) => `<i class="adm-bar" style="width:${max > 0 ? Math.round(v / max * 100) : 0}%;background:${color}"></i>`;
    const rankedCards = s.cards; // already sorted desc by winrate

    body.innerHTML = `
      <p class="adm-note" style="margin:0 0 14px">유입·리텐션·퍼널·광고 소스는 <b>PostHog</b>에서 봅니다. 이 화면은 외부 도구가 계산할 수 없는 <b>게임 내부 지표</b>만 담습니다.</p>
      <div class="adm-grid">
        <section><h3>티어 분포 (이번 시즌)</h3><table>
          ${TIER_ORDER.map((tk) => `<tr><td style="color:${TIER_META[tk].color}">${tierLabel(tk)}</td><td class="num">${s.tierDist[tk] ?? 0}</td><td class="barcell">${bar(s.tierDist[tk] ?? 0, maxTier, TIER_META[tk].color)}</td></tr>`).join("")}
        </table><p class="adm-note">바닥(아이언)에 쏠리면 매칭·보상 조정 신호.</p></section>

        <section><h3>초대 캠페인</h3><table>
          <tr><td>골드 도전 중</td><td class="num">${s.invites.pending ?? 0}</td></tr>
          <tr><td>달성 (보상 대기)</td><td class="num">${s.invites.earned ?? 0}</td></tr>
          <tr><td>지급 완료</td><td class="num">${s.invites.paid ?? 0}</td></tr>
        </table></section>

        <section><h3>수익 (결제 연동 전)</h3><p class="adm-note">${s.revenue.note}<br>구독 ${s.revenue.subscriptions} · 해지 ${s.revenue.cancellations} · 판매 ${s.revenue.sales} · 광고수익 $${s.revenue.adRevenue}</p></section>

        <section class="wide"><h3>카드 승률 — OP/약체 탐지 (최근 PvP ${s.cardSample}판, 5판 이상)</h3>
          <table><tr class="hd"><td>#</td><td>카드</td><td class="num">사용 게임</td><td class="num">승률</td></tr>
          ${rankedCards.length === 0 ? `<tr><td colspan="4">데이터 없음 — 카드 기록은 이번 배포 이후 매치부터 쌓입니다.</td></tr>`
            : rankedCards.slice(0, 60).map((c, i) => `<tr class="${c.winrate >= 0.6 ? "hot" : c.winrate <= 0.4 ? "cold" : ""}"><td>${i + 1}</td><td>${cardName(c.id)}</td><td class="num">${c.games}</td><td class="num">${(c.winrate * 100).toFixed(1)}%</td></tr>`).join("")}
          </table><p class="adm-note">빨강 = 승률 60%↑ (OP 후보), 파랑 = 40%↓ (약체 후보). 표본이 작을 땐 노이즈 주의.</p>
        </section>

        <section class="wide"><h3>유저 조회 (문의 대응)</h3>
          <div class="invite-link-row"><input class="input" id="lkEmail" placeholder="정확한 이메일 입력"><button class="btn btn-gold" id="lkGo">조회</button></div>
          <div id="lkResult" class="adm-note">개인정보 보호를 위해 전체 목록 대신 정확한 이메일 1건만 조회합니다.</div>
        </section>
      </div>
      <div style="text-align:center;margin-top:14px"><button class="btn btn-ghost" id="admReload">새로고침</button></div>`;

    (body.querySelector("#admReload") as HTMLButtonElement).onclick = () => void load();
    const lkGo = body.querySelector("#lkGo") as HTMLButtonElement;
    const lkEmail = body.querySelector("#lkEmail") as HTMLInputElement;
    const doLookup = async () => {
      const email = lkEmail.value.trim();
      const box = body.querySelector("#lkResult") as HTMLElement;
      if (!email) return;
      box.textContent = "조회 중…";
      const r = await fetch(`/api/admin/lookup?email=${encodeURIComponent(email)}`, { headers: authHeaders() }).catch(() => null);
      const u = r && r.ok ? ((await r.json()) as { user: LookupUser | null }).user : null;
      if (!u) { box.textContent = "해당 이메일의 유저가 없습니다."; return; }
      box.innerHTML = `<table style="margin-top:6px">
        <tr><td>닉네임</td><td class="num">${u.display.replace(/[<>&]/g, "")}</td></tr>
        <tr><td>가입일</td><td class="num">${new Date(u.created_at).toISOString().slice(0, 10)}</td></tr>
        <tr><td>로그인</td><td class="num">${u.is_google ? "Google" : "이메일"}${u.verified ? "" : " · 미인증"}</td></tr>
        <tr><td>전적</td><td class="num">${u.wins}승 ${u.losses}패</td></tr>
        <tr><td>현시즌 MMR</td><td class="num">${u.mmr ?? "—"}</td></tr>
        <tr><td>최근 접속</td><td class="num">${u.last_day ?? "—"}</td></tr>
        <tr><td>초대 유입</td><td class="num">${u.invited_by ? "예" : "아니오"}</td></tr>
      </table>`;
    };
    lkGo.onclick = () => void doLookup();
    lkEmail.onkeydown = (e) => { if (e.key === "Enter") void doLookup(); };
  }

  void load();
  return {};
}
