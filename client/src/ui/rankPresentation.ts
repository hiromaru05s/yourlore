import type { RankInfo } from '../net/api';
import type { RankChange } from '../shared/rank';
import { tierOf, TIERS } from '../shared/rank';
import { TIER_META, tierLabel, rankProgress } from './tier';
import { rankEmblem } from './rankEmblem';
import { applyEmblemPose, assembledPose, arrivingPose, departingPose, RANK_REVEAL_START, RANK_PROMOTION_END } from './rankEmblemMotion';
import { loungeText as tr } from './loungeText';
import { esc } from '../i18n';

export function progressLabel(mmr: number, tier: string): string {
  const p = rankProgress(mmr);
  if (tier === 'gm') return tr('グランドマスター · TOP 25', 'Grandmaster · TOP 25', '그랜드마스터 · TOP 25');
  if (!p.next) return tr('GM条件：1550 MMR以上・上位25位', 'GM: 1550+ MMR & top 25', 'GM 조건: 1550 MMR 이상 · 상위 25위');
  return tr(`${tierLabel(p.next.key)}まであと ${p.next.min-mmr} MMR`, `${p.next.min-mmr} MMR to ${tierLabel(p.next.key)}`, `${tierLabel(p.next.key)}까지 ${p.next.min-mmr} MMR`);
}
export function homeRankHtml(r: RankInfo): string {
  const tier = TIER_META[r.tier] ? r.tier : tierOf(r.mmr);
  return `<div class="home-rank" style="--rank-metal:${TIER_META[tier].color}">
    ${rankEmblem(tier)}<div class="home-rank-copy"><span class="rank-season">${esc(r.season)} · #${r.rank}</span>
    <strong>${tierLabel(tier)} <b>${r.mmr}<small> MMR</small></b></strong>
    <div class="rank-track" role="meter" aria-label="MMR" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(rankProgress(r.mmr).fraction*100)}" aria-valuetext="${r.mmr} MMR · ${progressLabel(r.mmr,tier)}"><i style="width:${rankProgress(r.mmr).fraction*100}%"></i></div>
    <span class="rank-target">${progressLabel(r.mmr,tier)}</span></div><span class="rank-link" aria-hidden="true">›</span></div>`;
}
const order = (key:string) => key === 'gm' ? 7 : TIERS.findIndex(t=>t.key===key);

/** The result owns one cancellable clock; no server state is mutated by playback. */
export class RankPresentation {
  private frame = 0;
  private observer?: MutationObserver;
  private el?: HTMLElement;
  private change?: RankChange;
  private played = false;
  private disposed = false;
  private retry?: () => void;
  private slow = false;
  private finish?: () => void;
  private hidden = () => { if (document.hidden) this.finish?.(); };
  constructor() { document.addEventListener('visibilitychange',this.hidden); }
  set(change:RankChange):void {
    if (this.disposed || this.change) return; // duplicate/reconnect notification
    if (![change.before,change.after].every(n=>Number.isFinite(n)&&n>=0)) return;
    this.change=change;
    if(this.el?.isConnected) this.render();
  }
  mount(el:HTMLElement,retry?:()=>void):void {
    this.detach(); this.el=el;this.retry=retry;
    el.style.display='';el.closest('.outcome-result')?.classList.add('has-rank');
    this.observer=new MutationObserver(()=>{if(!el.isConnected)this.detach();});
    this.observer.observe(document.getElementById('overlayRoot')??document.body,{childList:true,subtree:true});
    this.render();
  }
  pending(slow=false):void { this.slow=slow;if(!this.change&&this.el?.isConnected)this.render(); }
  private render():void {
    const el=this.el;if(!el)return;
    if(!this.change){
      el.innerHTML=`<div class="rank-pending" role="status">${this.slow?tr('MMRの確定を待っています。HOMEに戻っても確定処理は続きます。','Awaiting MMR confirmation. Processing continues if you return home.','MMR 확정 대기 중입니다. 홈으로 돌아가도 처리는 계속됩니다.'):tr('MMRを確認中…','Confirming MMR…','MMR 확인 중…')}${this.slow&&this.retry?`<button class="btn btn-ghost rank-retry">${tr('再確認','Check again','다시 확인')}</button>`:''}</div>`;
      el.querySelector<HTMLButtonElement>('button')?.addEventListener('click',()=>this.retry?.());return;
    }
    const c=this.change, before=c.tierBefore??tierOf(c.before), after=c.tierAfter??tierOf(c.after), delta=c.after-c.before;
    const direction=order(after)-order(before), changed=before!==after;
    const label=direction>0?tr('昇格','PROMOTED','승급'):direction<0?tr('ティア更新','TIER UPDATED','티어 변경'):tr('ランク更新','RANK UPDATED','랭크 갱신');
    el.className='win-rank rank-result';el.dataset.direction=delta>0?'up':delta<0?'down':'flat';
    el.innerHTML=`<div class="rank-result-header"><span>${tr('ランクマッチ','RANKED DUEL','랭크 매치')}</span><span>${esc(c.season??'')}</span></div>
      <div class="rank-medal" style="--rank-metal:${TIER_META[before].color}"><div class="rank-old">${rankEmblem(before)}</div><div class="rank-new" style="--rank-metal:${TIER_META[after].color}">${rankEmblem(after)}</div></div>
      <div class="rank-tier-name">${tierLabel(before)}</div><div class="rank-score"><b>${c.before}</b><span>MMR</span><strong class="rank-delta">${delta>0?'+':delta===0?'±':''}${delta}</strong></div>
      <div class="rank-track"><i></i><span class="rank-track-head"></span></div>
      <div class="rank-target"></div><div class="rank-verdict" aria-live="polite"></div>
      <div class="rank-previous">${c.before} → ${c.after}${c.rankAfter?` · #${c.rankAfter}`:''}</div>`;
    const medal=el.querySelector<HTMLElement>('.rank-medal')!, score=el.querySelector('.rank-score b')!, fill=el.querySelector<HTMLElement>('.rank-track i')!, head=el.querySelector<HTMLElement>('.rank-track-head')!, target=el.querySelector('.rank-target')!, name=el.querySelector('.rank-tier-name')!, verdict=el.querySelector('.rank-verdict')!;
    const oldCrest=medal.querySelector<HTMLElement>('.rank-old')!, newCrest=medal.querySelector<HTMLElement>('.rank-new')!;
    applyEmblemPose(oldCrest,assembledPose());applyEmblemPose(newCrest,arrivingPose(0));
    const paint=(value:number)=>{score.textContent=String(value);const p=rankProgress(value);fill.style.width=`${p.fraction*100}%`;head.style.left=`${p.fraction*100}%`;target.textContent=progressLabel(value,value===c.after?after:tierOf(value));};
    const complete=()=>{
      cancelAnimationFrame(this.frame);this.frame=0;this.finish=undefined;
      paint(c.after);oldCrest.style.visibility='hidden';newCrest.style.visibility='visible';applyEmblemPose(newCrest,assembledPose());el.style.setProperty('--rank-metal',TIER_META[after].color);
      name.textContent=tierLabel(after);el.dataset.phase='settled';
      verdict.textContent=changed?`${label} · ${tierLabel(after)}`:delta===0?tr('MMR変動なし','MMR unchanged','MMR 변동 없음'):label;
    };
    paint(c.before);el.style.setProperty('--rank-metal',TIER_META[before].color);el.dataset.phase='inscribe';
    // A reconnect or reload can replay the receipt, but must not replay the gain.
    if (c.matchId) {
      try {
        const seen: string[] = JSON.parse(sessionStorage.getItem('lore_rank_seen') ?? '[]');
        if (seen.includes(c.matchId)) this.played = true;
        sessionStorage.setItem('lore_rank_seen', JSON.stringify([...seen.filter(id=>id!==c.matchId), c.matchId].slice(-50)));
      } catch { /* storage can be unavailable; per-controller guard still applies */ }
    }
    if(this.played||document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches){this.played=true;complete();return;}
    this.played=true;this.finish=complete;const start=performance.now();
    const tick=(now:number)=>{
      if(!el.isConnected){this.detach();return;}
      const time=now-start, p=Math.max(0,Math.min(1,(time-500)/1600));
      const eased=p*p*(3-2*p);paint(Math.round(c.before+delta*eased));
      el.dataset.phase=time<500?'inscribe':time<2100?'count':'reveal';
      const reveal=time-RANK_REVEAL_START;
      if(changed&&reveal>=0){
        applyEmblemPose(oldCrest,departingPose(reveal));
        applyEmblemPose(newCrest,arrivingPose(reveal-180,direction<0));
      }else if(!changed){
        // An ordinary gain leaves the emblem intact; only its gemstone responds.
        const pulse=Math.sin(Math.max(0,Math.min(1,reveal/750))*Math.PI);
        applyEmblemPose(oldCrest,{...assembledPose(),body:1+pulse*.035,light:pulse});
      }
      if(time>=(changed?2700:2100)){name.textContent=tierLabel(after);el.style.setProperty('--rank-metal',TIER_META[after].color);}
      if(time>=(changed?RANK_PROMOTION_END:3000)){complete();return;}this.frame=requestAnimationFrame(tick);
    };this.frame=requestAnimationFrame(tick);
  }
  private detach():void {cancelAnimationFrame(this.frame);this.frame=0;this.finish=undefined;this.observer?.disconnect();this.observer=undefined;this.el=undefined;}
  destroy():void {this.disposed=true;this.detach();document.removeEventListener('visibilitychange',this.hidden);}
}
