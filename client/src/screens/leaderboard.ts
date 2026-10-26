import "../styles/rankedDecks.css";
import { homeIcon } from "../ui/homeIcons";
import { loungeText } from "../ui/loungeText";
// ============================================================
// LORE — season leaderboard. Top 100 by MMR; top 25 Masters are
// crowned GRANDMASTER. Footer shows the viewer's own standing.
// ============================================================
import type { App, Screen } from "../router";
import { api } from "../net/api";
import { t, onLangChange } from "../i18n";
import { TIERS } from "../shared/rank";
import { rankEmblem } from "../ui/rankEmblem";
import { TIER_META } from "../ui/tier";
import { tierChipHtml, tierLabel } from "../ui/tier";

export function mountLeaderboard(app: App): Screen {
  let destroyed=false;
  let deckRequest:AbortController|null=null;
  let opened:HTMLElement|null=null;
  let openedButton:HTMLButtonElement|null=null;
  const wrap = document.createElement("div");
  wrap.className = "screen lb-screen";
  wrap.innerHTML = `
    <div class="screen-brand"><div class="mark"></div><h1>LORE</h1></div>
    <div class="panel lb">
      <div class="lb-head">
        <button class="btn btn-ghost" id="lbBack">← ${t("common.back")}</button>
        <div><small class="menu-eyebrow">BIBLION / LEADERBOARD</small><h2>${t("home.nav.ranking")}</h2><p class="menu-subtitle">${loungeText("シーカーたちの、現在地。","Where Seekers stand.","시커들의 현재 위치.")}</p></div>
        <span class="lb-season" id="lbSeason"></span>
      </div>
      <div class="menu-records"><p class="ranked-deck-note">${loungeText("TOP 100の使用デッキを公開。名前から最近の3パターンを見られます。","Top 100 decks are public. Select a name to view up to 3 recent decks.","TOP 100의 사용 덱 공개. 이름을 누르면 최근 덱 3종을 볼 수 있습니다.")}</p><details class="lounge-rank-rules"><summary>${loungeText("MMRとシーズンについて", "MMR & seasons", "MMR과 시즌 안내")}</summary><p>${loungeText("初期MMRは1000。ランク対戦の結果と相手のMMRで増減します。同じMMR同士なら勝利 +18、敗北 −16、引き分け ±0。ノーマル・シングル・フレンド対戦では変動しません。毎月UTCの月初に、前月のMMRを1000へ半分戻して開始します。", "Start at 1000 MMR. Ranked results adjust your rating based on your opponent: equal ratings yield +18 for a win, −16 for a loss, 0 for a draw. Casual, Single and friend matches do not change MMR. Each UTC month resets the previous month's MMR halfway toward 1000.", "초기 MMR은 1000입니다. 상대 MMR과 랭크 결과에 따라 변동하며, 동일 MMR 기준 승리 +18, 패배 −16, 무승부 0입니다. 일반·싱글·친선전은 MMR에 영향을 주지 않습니다. 매월 UTC 기준 지난달 MMR을 1000 방향으로 절반 초기화합니다.")}</p><div class="rank-tier-guide">${[...TIERS,{key:"gm",min:1550}].map(tier=>`<div style="--rank-metal:${TIER_META[tier.key].color}">${rankEmblem(tier.key)}<b>${tierLabel(tier.key)}</b><span>${tier.min}+ MMR${tier.key==="gm"?" · TOP 25":""}</span></div>`).join("")}</div></details>
      <div class="lb-row lb-columns"><span>#</span><span>${loungeText("シーカー", "Seeker", "시커")}</span><span>${loungeText("ティア", "Tier", "티어")}</span><span>MMR</span><span>${t("home.record")}</span></div>
      <div class="lb-list" id="lbList"><div class="spinner"></div></div>
      </div><aside class="lb-me" id="lbMe" aria-live="polite"></aside>
    </div>`;
  app.root.appendChild(wrap);

  (wrap.querySelector("#lbBack") as HTMLElement).onclick = () => app.home();
  const list = wrap.querySelector("#lbList") as HTMLElement;
  const seasonEl = wrap.querySelector("#lbSeason") as HTMLElement;
  const meEl = wrap.querySelector("#lbMe") as HTMLElement;

  void (async () => {
    try {
      const { season, entries } = await api.leaderboard();
      if(destroyed)return;
      seasonEl.textContent = `${t("lb.season")} ${season}`;
      if (!entries.length) { list.innerHTML = `<div class="lb-empty">${t("lb.empty")}</div>`; }
      else {
        list.innerHTML = entries.map((e) => `
          <div class="lb-row ${e.tier === "gm" ? "is-gm" : ""}">
            <span class="lb-rank">${e.rank <= 3 ? `${homeIcon("trophy")}<b>${e.rank}</b>` : e.rank}</span>
            <span class="lb-name">${e.rank<=100?`<button type="button" class="lb-deck-trigger" data-user="${escapeHtml(e.userId)}" aria-expanded="false"><span>${escapeHtml(e.display)}</span><small>${loungeText("デッキを見る","View decks","덱 보기")}</small></button>`:escapeHtml(e.display)}</span>
            ${tierChipHtml(e.tier)}
            <span class="lb-mmr">${e.mmr}</span>
            <span class="lb-wl">${e.wins}${t("home.win")} ${e.losses}${t("home.loss")}</span>
          </div>`).join("");
      }
      list.querySelectorAll<HTMLButtonElement>('.lb-deck-trigger').forEach(button=>{
        button.onclick=()=>{void openDecks(button);};
      });
      const me = await api.rankMe();
      if(destroyed)return;
      if (me?.rank != null) {
        meEl.innerHTML = `${rankEmblem(me.tier)}<div><small>${t("lb.myrank")}</small><strong>#${me.rank}</strong><span>${tierLabel(me.tier)} · ${me.mmr} MMR</span><small>${me.wins}${t("home.win")} ${me.losses}${t("home.loss")}</small></div>`;
      }
    } catch {
      if(destroyed)return;
      list.innerHTML = `<div class="lb-empty">${t("lobby.connerr")}</div>`;
    }
  })();

  function closeDecks():void {
    deckRequest?.abort();deckRequest=null;opened?.remove();opened=null;
    openedButton?.setAttribute('aria-expanded','false');openedButton?.removeAttribute('aria-controls');openedButton=null;
  }
  async function openDecks(button:HTMLButtonElement):Promise<void> {
    const same=openedButton===button;closeDecks();if(same)return;
    openedButton=button;button.setAttribute('aria-expanded','true');
    const panel=document.createElement('section');panel.className='ranked-decks';
    panel.id='ranked-decks-detail';button.setAttribute('aria-controls',panel.id);opened=panel;
    const header=document.createElement('header'),title=document.createElement('h3');
    title.textContent=button.querySelector('span')!.textContent+' · '+loungeText('最近の使用デッキ','Recent decks','최근 사용 덱');
    const close=document.createElement('button');close.type='button';close.className='btn btn-ghost';close.textContent=loungeText('閉じる','Close','닫기');
    close.onclick=()=>{closeDecks();button.focus();};header.append(title,close);
    const body=document.createElement('div');body.setAttribute('aria-live','polite');body.textContent=loungeText('読み込み中…','Loading…','불러오는 중…');
    panel.append(header,body);button.closest('.lb-row')!.after(panel);
    const controller=new AbortController();deckRequest=controller;
    try {
      const data=await api.rankedDecks(button.dataset.user!,controller.signal);
      const {renderRankedDecks}=await import('../ui/rankedDecks');
      if(destroyed||controller.signal.aborted||opened!==panel)return;
      renderRankedDecks(body,data.decks);
    } catch {
      if(destroyed||controller.signal.aborted||opened!==panel)return;
      body.textContent=loungeText('デッキを読み込めませんでした。TOP 100から外れた可能性があります。','Could not load decks. This player may have left the top 100.','덱을 불러오지 못했습니다. TOP 100에서 벗어났을 수 있습니다.');
      const retry=document.createElement('button');retry.type='button';retry.className='btn btn-ghost';retry.textContent=loungeText('再試行','Retry','재시도');
      retry.onclick=()=>{closeDecks();void openDecks(button);};body.append(retry);
    }
  }
  const unsub = onLangChange(() => app.leaderboard());
  return { destroy: ()=>{destroyed=true;closeDecks();unsub();} };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
