import type {App, Screen} from '../router';
import {deckRepresentative, deckStoreForUser} from '../shared/cards';
import {onLangChange} from '../i18n';
import {artUrl} from '../ui/cardArt';
import {loungeText as L} from '../ui/loungeText';
import '../styles/cardHub.css';
import {playCardHubEntrance} from '../ui/cardHubEntrance';

export function mountCardHub(app:App):Screen {
  const store=deckStoreForUser(app.user);
  const root=document.createElement('section');
  let stopEntrance=()=>{};
  root.className='card-hub';
  const paint=()=>{
    stopEntrance();
    root.setAttribute('aria-label',L('カード','Cards','카드'));
    root.replaceChildren();
    const choices=[
      {label:L('カードリスト','Card List','카드 목록'), caption:'COLLECTION', art:'ELF_HAVEN', go:()=>app.cards()},
      {label:L('デッキ編集','Deck Editor','덱 편집'), caption:'DECK BUILDER', art:deckRepresentative(store.list[store.sel]), go:()=>app.deck()},
    ];
    choices.forEach(({label,caption,art,go})=>{
      const button=document.createElement('button');
      button.className='card-hub-tile'; button.type='button';
      button.innerHTML=`<img src="${artUrl.full(art)}" alt="">
        <span class="card-hub-label"><small aria-hidden="true">${caption}</small><strong>${label}</strong></span>
        <span class="card-hub-arrow" aria-hidden="true">→</span>`;
      button.onclick=go; root.append(button);
    });
  };
  paint(); app.root.append(root);
  stopEntrance=playCardHubEntrance(root);
  const unsubscribe=onLangChange(paint);
  return {destroy:()=>{stopEntrance();unsubscribe();}};
}
