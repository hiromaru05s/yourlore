import type { App, Screen } from '../router';
import { cardName, esc, getLang, onLangChange, t } from '../i18n';
import { api } from '../net/api';
import { botNpc, SINGLE_DIFFICULTIES } from '../shared/botNpcs';
import { ARIES_ROUTE, ARIES_COMPLETED_KEY } from '../shared/ariesStory';
import { STARTERS, DB, deckStoreForUser } from '../shared/cards';
import { BOT_FIRST_CLEAR_EXP, BOT_REWARDS } from '../shared/progression';
import { firstClearLabel } from '../ui/dailyRewards';
import { artUrl } from '../ui/cardArt';
import { mountHomeDuelButton } from '../ui/homeDuelButton';
import { loungeText as L } from '../ui/loungeText';
import { storyPortraits } from '../ui/singlePortraits';
import { deckName } from './deckLibrary';
import '../styles/singlePage.css';

export interface SingleLocation { page?:number; tab?:'story'|'battle' }
const lock = '<svg class="sp-lock" viewBox="0 0 20 22" aria-hidden="true"><path d="M5 10V7a5 5 0 0 1 10 0v3M3 10h14v10H3z"/><path d="M10 14v3"/></svg>';
const tiers = () => [L('かんたん','Easy','쉬움'),L('ふつう','Normal','보통'),L('むずかしい','Hard','어려움')];

export function mountSingle(app:App, initial:SingleLocation={}):Screen {
  const root=document.createElement('section');
  root.className='screen single-page';
  app.root.append(root);
  const cleared=new Set(app.user?.botClears ?? []);
  const guest=app.user?.id==='local-guest-user';
  if(guest) for(const d of SINGLE_DIFFICULTIES) if(localStorage.getItem('lore.guest.dojo.'+d)) cleared.add(d);
  const firstUncleared=()=>SINGLE_DIFFICULTIES.findIndex(d=>!cleared.has(d));
  const lastOpen=()=>firstUncleared()<0?2:firstUncleared();
  let page=Math.min(lastOpen(),Math.max(0,initial.page ?? lastOpen()));
  let story=initial.tab==='story' && firstUncleared()<0;
  let ariesCleared=guest && !!localStorage.getItem(ARIES_COMPLETED_KEY+'.guest');
  let duel:ReturnType<typeof mountHomeDuelButton>|undefined;
  let drawer:HTMLDialogElement|undefined;
  let dead=false;
  const location=():SingleLocation=>({page,tab:story?'story':'battle'});
  function paint(){
    duel?.destroy();
    const npc=botNpc(SINGLE_DIFFICULTIES[page]),locale=getLang();
    const open=firstUncleared()<0, done=SINGLE_DIFFICULTIES.filter(d=>cleared.has(d)).length;
    const store=deckStoreForUser(app.user),active=store.list[store.sel];
    const next=page<2?botNpc(SINGLE_DIFFICULTIES[page+1]):undefined;
    const lastName=npc.name[locale];
    const unlock=L(lastName+'に勝つと解放','Defeat '+lastName+' to unlock',lastName+' 승리 시 해금');
    const storyHint=L('対戦の3人に勝利','Defeat all 3 opponents','대전 상대 3명에게 승리')+' · '+done+'/3';
    const storyLabel=L('ストーリー','Story','스토리');
    const battleLabel=L('対戦','Battle','대전');
    const nextLabel=next?next.name[locale]:storyLabel;
    const nextOpen=page<2?page<lastOpen():open;
    root.dataset.story=String(story);
    root.innerHTML=`
      <div class="sp-stage">
        <div class="sp-art" aria-hidden="true"><img class="sp-figure" src="${story?storyPortraits[0]:'/art/single-standing/'+npc.id+'.webp'}" alt=""></div>
        <div class="sp-shade"></div>
        <header class="sp-head"><nav class="sp-tabs" aria-label="${t('home.bot.title')}">
          <button data-story aria-pressed="${story}" ${open?'':'disabled'}>${open?'':lock}${storyLabel}</button>
          <button data-battle-tab aria-pressed="${!story}">${battleLabel}</button>
          <button disabled>${lock}${L('修練','Training','수련')}</button>
        </nav>${!open?`<small class="sp-story-hint">${storyLabel} · ${storyHint}</small>`:''}</header>
        <div class="sp-identity">
          <div class="sp-tier">${story?L('マスターシーカーへの道','Path to the Master Seekers','마스터 시커의 길'):tiers()[page]}<i></i>${story?'ARIES':String(page+1).padStart(2,'0')+' / 03'}</div>
          <small>${story?ARIES_ROUTE[0].title[locale]:npc.title[locale]}</small>
          <h1>${story?ARIES_ROUTE[0].name[locale]:lastName}</h1>
          <p>${story?L('ルカに勝利して、Ariesに挑む。','Defeat Luca to challenge Aries.','루카에게 승리하고 Aries에게 도전하세요.'):npc.style[locale]}</p>
          <span class="sp-reward">${story?(ariesCleared?L('Aries撃破済み','Aries defeated','Aries 격파 완료'):''):(cleared.has(npc.difficulty)?'✓ '+L('クリア済み','Cleared','클리어 완료'):firstClearLabel(BOT_REWARDS[npc.difficulty])+' · '+BOT_FIRST_CLEAR_EXP[npc.difficulty]+' EXP')}</span>
        </div>
        <div class="sp-actions"><button class="single-battle lounge-play-button" type="button" aria-label="BATTLE"></button>
          <button class="sp-deck" type="button" aria-haspopup="dialog">
            <span class="sp-fan">${active.cards.slice(0,3).map(id=>`<img src="${artUrl.sm(id)}" alt="">`).join('')}</span>
            <span><small>${t('deck.inuse')}</small><strong>${esc(deckName(active,store.sel))}</strong></span><b>›</b>
          </button></div>
        ${story?'':`<footer class="sp-turn"><button data-prev ${page===0?'disabled':''} aria-label="${L('前の相手','Previous opponent','이전 상대')}">‹</button>
          <div class="sp-pages" aria-hidden="true">${SINGLE_DIFFICULTIES.map((_,i)=>`<i class="${i===page?'current':''}"></i>`).join('')}</div>
          <button data-next ${nextOpen?'':'disabled'}><span>${nextOpen?'':lock}${nextLabel} ${nextOpen?'›':''}</span><small>${nextOpen?L('次へ','Next','다음'):unlock}</small></button>
        </footer>`}
      </div>`;
    const button=root.querySelector<HTMLButtonElement>('.single-battle')!;
    duel=mountHomeDuelButton(button);
    duel.setMode('bot');
    button.querySelector('strong')!.textContent='BATTLE';
    button.onclick=()=>{if(story && open)app.storyGame(0);else if(!story && page<=lastOpen())app.botGame(npc.difficulty);};
    root.querySelector<HTMLButtonElement>('[data-story]')!.onclick=()=>{if(open && !story){story=true;paint();}};
    root.querySelector<HTMLButtonElement>('[data-battle-tab]')!.onclick=()=>{if(story){story=false;paint();}};
    const prev=root.querySelector<HTMLButtonElement>('[data-prev]');
    const nextButton=root.querySelector<HTMLButtonElement>('[data-next]');
    if(prev)prev.onclick=()=>{if(page>0){page--;paint();}};
    if(nextButton)nextButton.onclick=()=>{if(!nextOpen)return;if(next)page++;else story=true;paint();};
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
    ariesCleared=!!state.ariesCleared;
    if(page===was && initial.page===undefined)page=lastOpen();
    paint();
  }).catch(()=>{});
  const off=onLangChange(()=>app.single(location()));
  return {destroy(){dead=true;off();duel?.destroy();drawer?.close();drawer?.remove();root.remove();}};
}
