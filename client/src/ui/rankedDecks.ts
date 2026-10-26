import type { RankedDeck } from '../net/api';
import { DB, STARTERS } from '../shared/cards';
import { cardName, getLang } from '../i18n';
import { cardEl } from './cardView';
import { bindZoom, zoomCard } from './cardInspection';
import { loungeText } from './loungeText';

export function renderRankedDecks(host:HTMLElement,decks:RankedDeck[]):void {
  host.replaceChildren();
  if(!decks.length){
    const empty=document.createElement('p');
    empty.textContent=loungeText('まだ使用デッキの記録がありません。機能追加後に完了したランク戦から記録されます。','No decks recorded yet. Decks are recorded from ranked matches completed after this feature was added.','아직 사용 덱 기록이 없습니다. 기능 추가 후 완료된 랭크전부터 기록됩니다.');
    host.append(empty);return;
  }
  const tabs=document.createElement('div');tabs.className='ranked-deck-tabs';
  tabs.setAttribute('aria-label',loungeText('最近使用したデッキ','Recently used decks','최근 사용한 덱'));
  const detail=document.createElement('div');
  const buttons=decks.map((_,index)=>{
    const b=document.createElement('button');b.type='button';b.className='btn btn-ghost';
    b.textContent=loungeText(`デッキ ${index+1}`,`Deck ${index+1}`,`덱 ${index+1}`);
    b.onclick=()=>paint(index);tabs.append(b);return b;
  });
  function paint(index:number):void {
    buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
    const deck=decks[index];
    const note=document.createElement('p');note.className='ranked-deck-note';
    const date=new Intl.DateTimeFormat(getLang(),{dateStyle:'medium',timeStyle:'short'}).format(deck.lastUsedAt);
    note.textContent=loungeText(`最終使用 ${date} · アチューン固定1枚＋自由枠8枚。カードをタップして詳細。`,`Last used ${date} · 1 fixed Attune + 8 cards. Tap a card for details.`,`마지막 사용 ${date} · 고정 어튠 1장 + 자유 슬롯 8장. 카드를 눌러 상세 확인.`);
    const grid=document.createElement('div');grid.className='ranked-deck-grid';
    const counts=new Map<string,number>();deck.cards.forEach(id=>counts.set(id,(counts.get(id)??0)+1));
    counts.forEach((count,id)=>{
      const def=STARTERS[id]??DB[id];if(!def)return;
      const c={...def,uid:`ranked-${index}-${id}`};
      const item=document.createElement('div');item.className='ranked-deck-card';
      const card=cardEl(c,{lazyArt:0});card.tabIndex=0;card.setAttribute('role','button');
      card.setAttribute('aria-label',`${cardName(c)} ×${count}`);
      bindZoom(card,c);card.onclick=()=>zoomCard(c);card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();zoomCard(c);}};
      const caption=document.createElement('span');caption.textContent=`${cardName(c)} ×${count}`;
      item.append(card,caption);grid.append(item);
    });
    detail.replaceChildren(note,grid);
  }
  host.append(tabs,detail);paint(0);
}
