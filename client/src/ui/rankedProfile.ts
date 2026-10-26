import '../styles/rankedProfile.css';
import type {Profile} from '../net/api';
import {DB,STARTERS} from '../shared/cards';
import {cardName,getLang} from '../i18n';
import {tierChipHtml} from './tier';
import {cardEl} from './cardView';
import {bindZoom,zoomCard} from './cardInspection';
import {purchaseCards} from './purchaseCards';
import {loungeText as L} from './loungeText';

export function renderRankedProfile(host:HTMLElement,p:Profile):void {
  host.classList.add('ranked-profile');host.replaceChildren();
  if(p.private){const note=document.createElement('p');note.textContent=L('戦績は非公開です。','This profile’s stats are private.','전적이 비공개입니다.');host.append(note);return;}
  const data=p.ranked;
  const rank=document.createElement('section');rank.className='rp-rank';
  const title=document.createElement('h3');title.textContent=L('現在のランク','Current rank','현재 랭크');
  const badge=document.createElement('div');badge.innerHTML=p.tier?tierChipHtml(p.tier,p.mmr??undefined)+(p.mmr==null?'':' <span class="rp-mmr-label">MMR</span>'):'—';
  rank.append(title,badge);
  const stats=document.createElement('div');stats.className='rp-stats';
  const items=[
    [L('ランク試合数','Ranked games','랭크 경기 수'),data?.games],
    [L('ランク勝利数','Ranked wins','랭크 승리 수'),data?.wins],
    [L('ランク敗北数','Ranked losses','랭크 패배 수'),data?.losses],
    [L('勝率','Win rate','승률'),data?.winRate==null?'—':`${Math.round(data.winRate*100)}%`],
  ];
  for(const [label,value] of items){const item=document.createElement('div'),b=document.createElement('b'),span=document.createElement('span');b.textContent=String(value??'—');span.textContent=String(label);item.append(b,span);stats.append(item);}
  const note=document.createElement('p');note.className='rp-note';note.textContent=L('戦績はランク戦の通算。勝率は引き分けを含む全試合に対する勝利の割合です。','Lifetime ranked results. Win rate includes drawn games in the total.','랭크 통산 전적. 승률은 무승부를 포함한 전체 경기 대비 승리 비율입니다.');
  const purchase=document.createElement('section'),purchaseTitle=document.createElement('h3');purchaseTitle.textContent=L('購入率 TOP 5','Top 5 purchased cards','구매율 TOP 5');
  const purchaseNote=document.createElement('p');purchaseNote.className='rp-note';const n=data?.purchases.sampleGames??0;
  purchaseNote.textContent=n?L(`購入記録のあるランク戦 ${n} 試合で、各カードを1回以上購入した割合。`,`Share of ${n} ranked games with purchase records in which each card was bought at least once.`,`구매 기록이 있는 랭크 ${n}경기 중 해당 카드를 1회 이상 구매한 비율입니다.`):L('購入記録はまだありません。','No purchase records yet.','아직 구매 기록이 없습니다.');
  purchase.append(purchaseTitle,purchaseCards(data?.purchases,true),purchaseNote);
  const decks=document.createElement('section'),decksTitle=document.createElement('h3');decksTitle.textContent=L('直近3試合の使用デッキ','Decks from the last 3 ranked games','최근 랭크 3경기 사용 덱');
  const grid=document.createElement('div');grid.className='rp-decks';
  for(let i=0;i<3;i++){
    const deck=data?.recentDecks[i],panel=document.createElement('article');panel.className='rp-deck';
    const heading=document.createElement('header');heading.className='rp-deck-heading';
    const h=document.createElement('h4');h.textContent=L(`${i+1}試合前`,`${i+1} game${i?'s':''} ago`,`${i+1}경기 전`);heading.append(h);panel.append(heading);
    if(deck?.cards?.length){
      const date=document.createElement('small');date.textContent=new Intl.DateTimeFormat(getLang(),{dateStyle:'short',timeStyle:'short'}).format(deck.at);heading.append(date);
      const cards=document.createElement('div');cards.className='rp-deck-cards';
      deck.cards.forEach((id,index)=>{const def=STARTERS[id]??DB[id];if(!def)return;const c={...def,uid:`profile-${i}-${index}`};
        const el=cardEl(c,{lazyArt:0});el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label',cardName(c));
        bindZoom(el,c);el.onclick=()=>zoomCard(c);el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();zoomCard(c);}};cards.append(el);
      });panel.append(cards);
    }else{const empty=document.createElement('p');empty.className='rp-empty';empty.textContent=L('デッキの記録なし','No deck recorded','덱 기록 없음');panel.append(empty);}
    grid.append(panel);
  }
  decks.append(decksTitle,grid);host.append(rank,stats,note,decks,purchase);
}
