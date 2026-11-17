import type {App, Screen} from '../router';
import {deckStoreForUser, sleeveUrl, type DeckPreset} from '../shared/cards';
import {profileBackground} from '../shared/profileAppearance';
import {t, esc, onLangChange} from '../i18n';
import {artUrl} from '../ui/cardArt';
import {characterAppearance} from '../ui/characterAppearance';
import {loungeText as L} from '../ui/loungeText';

export const deckName = (deck:DeckPreset, index:number) => deck.name || t('deck.slot').replace('{n}',String(index+1));

export function mountDeckLibrary(app:App):Screen {
  const store=deckStoreForUser(app.user);
  const root=document.createElement('section');
  root.className='screen deck-library';
  const title=document.createElement('h2');
  title.textContent=L('デッキ一覧','Decks','덱 목록');
  const grid=document.createElement('div');
  grid.className='deck-library-grid';
  store.list.forEach((deck,index)=>{
    const character=characterAppearance(deck.avatar ?? app.user?.avatar);
    const featured=deck.cards.find(id=>id!=='STARTER_TRASH') ?? deck.cards[0] ?? 'STARTER_MANA';
    const button=document.createElement('button');
    button.type='button';button.className='deck-banner';
    button.dataset.slot=String(index);
    button.dataset.background=profileBackground(deck.background ?? app.user?.background);
    button.innerHTML=`<img class="deck-banner-land" src="${artUrl.full(featured)}" alt="">
      <img class="deck-banner-character" src="${character.daylightPoster ?? character.home}" alt="">
      <span class="deck-banner-shade"></span>
      <span class="deck-banner-no" aria-hidden="true">${String(index+1).padStart(2,'0')}</span>
      ${index===store.sel?`<span class="deck-banner-active">${t('deck.inuse')}</span>`:''}
      <span class="deck-banner-sleeve"><img src="${sleeveUrl(deck.sleeve)}" alt=""></span>
      <strong>${esc(deckName(deck,index))}</strong>`;
    button.onclick=()=>app.deck({slot:index});
    grid.append(button);
  });
  root.append(title,grid);app.root.append(root);
  const off=onLangChange(()=>app.deck());
  return {destroy(){off();root.remove();}};
}
