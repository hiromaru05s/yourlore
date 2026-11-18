import type { App, Screen } from '../router';
import { cardName, esc, getLang, onLangChange, t } from '../i18n';
import { api } from '../net/api';
import { botNpc, SINGLE_DIFFICULTIES } from '../shared/botNpcs';
import { STARTERS, DB, deckStoreForUser } from '../shared/cards';
import { BOT_REWARDS } from '../shared/progression';
import { homeIcon } from '../ui/homeIcons';
import { artUrl } from '../ui/cardArt';
import { mountHomeDuelButton } from '../ui/homeDuelButton';
import { loungeText as L } from '../ui/loungeText';
import pageArrow from '../assets/single/page-arrow.svg';
import { mountSingleIdle } from '../ui/singleIdle';
import { deckName } from './deckLibrary';
import '../styles/singlePage.css';

import type { SingleLocation } from './single';
const lock = '<svg class="sp-lock" viewBox="0 0 20 22" aria-hidden="true"><path d="M5 10V7a5 5 0 0 1 10 0v3M3 10h14v10H3z"/><path d="M10 14v3"/></svg>';
const favoriteCards = { easy:'HALF_ELF', normal:'CASTLE', hard:'FLAME' } as const;
const chevron = `<img class="sp-chevron" src="${pageArrow}" alt="" draggable="false">`;

export function mountSingleBattle(app:App, initial:SingleLocation={}):Screen {
  const root=document.createElement('section');
  root.className='screen single-page';
  app.root.append(root);
  const cleared=new Set(app.user?.botClears ?? []);
  const guest=app.user?.id==='local-guest-user';
  if(guest) for(const d of SINGLE_DIFFICULTIES) if(localStorage.getItem('lore.guest.dojo.'+d)) cleared.add(d);
  const firstUncleared=()=>SINGLE_DIFFICULTIES.findIndex(d=>!cleared.has(d));
  const lastOpen=()=>firstUncleared()<0?2:firstUncleared();
  let page=Math.min(lastOpen(),Math.max(0,initial.page ?? lastOpen()));
  let duel:ReturnType<typeof mountHomeDuelButton>|undefined;
  let drawer:HTMLDialogElement|undefined;
  let dead=false;
  let stopIdle:(()=>void)|undefined;
  const location=():SingleLocation=>({page,tab:'battle'});
  function paint(){
    stopIdle?.();stopIdle=undefined;
    duel?.destroy();
    const npc=botNpc(SINGLE_DIFFICULTIES[page]),locale=getLang();
    const open=firstUncleared()<0;
    const store=deckStoreForUser(app.user),active=store.list[store.sel];
    const next=page<2?botNpc(SINGLE_DIFFICULTIES[page+1]):undefined;
    const lastName=npc.name[locale];
    const unlock=L(lastName+'に勝つと解放','Defeat '+lastName+' to unlock',lastName+' 승리 시 해금');
    const storyLabel=L('ストーリー','Story','스토리');
    const battleLabel=L('対戦','Battle','대전');
    const nextLabel=next?next.name[locale]:storyLabel;
    const favoriteId=favoriteCards[SINGLE_DIFFICULTIES[page]];
    const favoriteName=cardName({...(STARTERS[favoriteId]??DB[favoriteId]),uid:favoriteId});
    const nextOpen=page<2?page<lastOpen():open;
    root.dataset.story='false';
    root.innerHTML=`
      <div class="sp-stage">
        <div class="sp-art" aria-hidden="true"><span class="sp-figure sp-standing"><img src="/art/single-standing/refined-v2/${npc.id}.webp" alt=""></span></div>
        <div class="sp-shade"></div>
        <header class="sp-head"><nav class="sp-tabs" aria-label="${t('home.bot.title')}">
          <button data-story aria-pressed="false">${storyLabel}</button>
          <button data-battle-tab aria-pressed="true">${battleLabel}</button>
          <button data-training>${L('修練','Training','수련')}</button>
        </nav></header>
        <div class="sp-identity">
          <h1>${lastName}</h1>
            <div class="sp-favorite"><img src="${artUrl.sm(favoriteId)}" alt=""><div><small>${L('好きなカード','Favorite card','좋아하는 카드')}</small><strong>${esc(favoriteName)}</strong></div></div>
            <div class="sp-reward"><small>${L('初回クリア報酬','First clear reward','첫 클리어 보상')}</small>
              <span aria-label="${BOT_REWARDS[npc.difficulty]} ${t('home.shards')}">${homeIcon('shard')}${BOT_REWARDS[npc.difficulty].toLocaleString(locale)}</span>
              ${cleared.has(npc.difficulty)?`<small>${L('受取済み','Claimed','수령 완료')}</small>`:''}</div>
        </div>
        <div class="sp-actions"><button class="single-battle lounge-play-button" type="button" aria-label="BATTLE"></button>
          <button class="sp-deck" type="button" aria-haspopup="dialog">
            <span class="sp-fan">${active.cards.slice(0,3).map(id=>`<img src="${artUrl.sm(id)}" alt="">`).join('')}</span>
            <span><small>${t('deck.inuse')}</small><strong>${esc(deckName(active,store.sel))}</strong></span><b>›</b>
          </button></div>
        <nav class="sp-turn" aria-label="${L('対戦相手','Opponent','대전 상대')}">
          <button data-prev ${page===0?'disabled':''} aria-label="${L('前の相手','Previous opponent','이전 상대')}">${chevron}</button>
          <div class="sp-next"><button data-next ${nextOpen?'':'disabled aria-describedby="sp-unlock"'} aria-label="${nextLabel}">${chevron}${nextOpen?'':lock}</button>
          ${nextOpen?'':`<small id="sp-unlock">${unlock}</small>`}</div></nav>
      </div>`;
    const standing=root.querySelector<HTMLElement>('.sp-standing');
    if(standing)stopIdle=mountSingleIdle(standing,SINGLE_DIFFICULTIES[page]);
    const button=root.querySelector<HTMLButtonElement>('.single-battle')!;
    duel=mountHomeDuelButton(button);
    duel.setMode('bot');
    button.querySelector('strong')!.textContent='BATTLE';
    button.onclick=()=>{if(page<=lastOpen())app.botGame(npc.difficulty);};
    root.querySelector<HTMLButtonElement>('[data-story]')!.onclick=()=>app.single({tab:'story'});
    root.querySelector<HTMLButtonElement>('[data-training]')!.onclick=()=>app.single({tab:'training'});
    const prev=root.querySelector<HTMLButtonElement>('[data-prev]');
    const nextButton=root.querySelector<HTMLButtonElement>('[data-next]');
    if(prev)prev.onclick=()=>{if(page>0){page--;paint();}};
    if(nextButton)nextButton.onclick=()=>{if(!nextOpen)return;if(next){page++;paint();}else app.single({tab:'story'});};
    root.querySelector<HTMLButtonElement>('.sp-deck')!.onclick=openDeck;
  }
  function openDeck(){
    if(drawer?.open)return;
    const dlg=document.createElement('dialog');drawer=dlg;
    dlg.className='sp-deck-sheet';dlg.setAttribute('aria-labelledby','sp-deck-title');
    document.body.append(dlg);
    let store=deckStoreForUser(app.user),slot=store.sel,busy=false;
    const user=app.user;
    const render=()=>{
      const deck=store.list[slot],name=deckName(deck,slot);
      dlg.innerHTML=`<header><div><small>${L('使用デッキの確認','Deck preview','덱 미리보기')}</small><h2 id="sp-deck-title">${esc(name)}</h2></div>
        <button data-close class="lore-button lore-button-quiet" aria-label="${t('common.close')}">×</button></header>
        <label class="sp-choose">${L('デッキ切り替え','Choose deck','덱 전환')}<select ${busy?'disabled':''}>${store.list.map((d,i)=>`<option value="${i}" ${slot===i?'selected':''}>${esc(deckName(d,i))}${store.sel===i?' ✓':''}</option>`).join('')}</select></label>
        <div class="sp-cards">${['STARTER_MANA',...deck.cards].map(id=>{
          const def=STARTERS[id]??DB[id];
          return `<figure><img src="${artUrl.sm(id)}" alt=""><figcaption>${esc(cardName({...def,uid:id}))}</figcaption></figure>`;
        }).join('')}</div>
        <footer><span role="status"></span><button data-edit class="lore-button" ${busy?'disabled':''}>${L('デッキ編集','Edit deck','덱 편집')}</button>
        <button data-use class="lore-button lore-button-primary" ${busy||slot===store.sel?'disabled':''}>${slot===store.sel?t('deck.inuse'):L('このデッキを使う','Use this deck','이 덱 사용')}</button></footer>`;
      dlg.querySelector<HTMLSelectElement>('select')!.onchange=e=>{slot=Number((e.target as HTMLSelectElement).value);render();};
      dlg.querySelector<HTMLButtonElement>('[data-close]')!.onclick=()=>dlg.close();
      dlg.querySelector<HTMLButtonElement>('[data-edit]')!.onclick=()=>{
        const back=location();dlg.close();app.deck({slot,singleReturn:()=>app.single(back)});
      };
      dlg.querySelector<HTMLButtonElement>('[data-use]')!.onclick=async()=>{
        if(busy||!user)return;
        busy=true;render();
        try{
          const r=await api.saveDecks({...store,sel:slot});
          if(app.user?.id!==user.id)return;
          const active=r.decks.list[r.decks.sel];
          Object.assign(app.user,{decks:r.decks,deck:r.deck,sleeve:active.sleeve,furniture:active.furniture,effect:active.effect,frame:active.frame});
          store=r.decks;busy=false;
          if(!dead){paint();if(dlg.open)render();}
        }catch{busy=false;if(dlg.open){render();dlg.querySelector('[role=status]')!.textContent=t('api.fail');}}
      };
    };
    dlg.addEventListener('close',()=>{dlg.remove();if(drawer===dlg)drawer=undefined;if(!dead)root.querySelector<HTMLButtonElement>('.sp-deck')?.focus();},{once:true});
    render();dlg.showModal();
  }
  paint();
  if(!guest && app.user)void api.progression().then(state=>{
    if(dead)return;
    const was=lastOpen();
    for(const d of SINGLE_DIFFICULTIES)if(state.bot[d])cleared.add(d);
    if(page===was && initial.page===undefined)page=lastOpen();
    paint();
  }).catch(()=>{});
  const off=onLangChange(()=>app.single(location()));
  return {destroy(){dead=true;stopIdle?.();off();duel?.destroy();drawer?.close();drawer?.remove();root.remove();}};
}
