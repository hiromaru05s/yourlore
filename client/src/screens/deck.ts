import {TutorialSpotlight} from '../ui/tutorialSpotlight';
import {copy as c} from '../shared/tutorialSteps';
import {onboardingDeck,isOnboardingDeck} from '../shared/onboarding';
import {ownsDeck} from '../shared/collection';
import {installDeckDrag} from '../ui/deckDrag';
import {deckDisplayArt} from '../ui/deckMasterArt';
import {prepareDeckCard} from '../ui/deckCardQuality';
import {disposeCardEffects} from '../ui/cardFinish';
import {starterCollection,constrainDeckStore} from '../shared/collection';
import {renderDeckAppearance} from '../ui/deckAppearance';
import {isLocalDevAccount,loadLocalGuestProfile} from '../dev/localAccount';
import {revealCards} from '../ui/assetReadiness';
import { homeIcon } from "../ui/homeIcons";
import { loungeText } from "../ui/loungeText";
// ============================================================
// LORE — 덱 빌더. 프리셋 5슬롯 × (초기 덱 9장 = 어튠 1 고정 + 자유 8장).
// 덱마다 "마켓 알림이"(watch)를 설정: 게임 중 마켓/제시에 그 카드가 뜨면
// 은은하게 표시된다. 저장은 서버(users.decks JSON + 활성 덱 csv 캐시).
// ============================================================
import type { App, Screen } from "../router";
import { DB, STARTERS, DECK_POOL, DECK_SIZE, DECK_MAX_COPIES, DECK_SLOTS, WATCH_MAX, BUYABLE_POOL, deckStoreForUser, sanitizeDeckName, type DeckStore } from "../shared/cards";
import type { CardDef, CardInst } from "../shared/types";
import { cardEl } from "../ui/cardView";
import { bindZoom, zoomCard } from "../ui/cardInspection";
import { confirmDialog } from "../ui/modal";
import { api } from "../net/api";
import { t, cardName, cardText, onLangChange, esc } from "../i18n";

const def = (id: string): CardDef => STARTERS[id] ?? DB[id];

export function mountDeck(app: App, options:{tutorial?:boolean}={}): Screen {
  const wrap = document.createElement("div");
  wrap.className = "screen deck-screen";
  wrap.innerHTML = `
    <div class="screen-brand"><div class="mark"></div><h1>LORE</h1></div>
    <div class="panel deck-panel" id="deckWorkspace">
      <h2 class="menu-sr-title">${t("deck.title")}</h2>
      <nav class="deck-tabs" id="deckTabs" aria-label="${t('deck.title')}"></nav>
      <div class="deck-editor">
      <div class="deck-controls editor-actions">
        <button class="btn btn-ghost" id="back">← ${t("common.back")}</button>
        <button id="editTab" class="deck-formation" aria-selected="true"><span>${loungeText('編成','Formation','편성')}</span><b id="deckCount"></b></button>
        <div class="deck-secondary-actions"><button id="watchTab" aria-selected="false">${t("deck.watch.title")}</button><button id="appearanceTab" aria-selected="false">${loungeText("外観","Appearance","외형")}</button></div>
        <button class="deck-use" id="useBtn"></button>
        <button id="deckUndo" class="lore-button-quiet" aria-label="${loungeText('元に戻す','Undo','되돌리기')}">↶</button>
        <button class="deck-confirm deck-action confirm" id="save"><svg class="confirm-seal" viewBox="0 0 28 28" aria-hidden="true"><path class="seal-edge" d="M14 2 26 14 14 26 2 14Z"/><path class="seal-check" d="m8.5 14 3.5 3.5 7.5-8"/></svg><span class="confirm-label">${loungeText('デッキを確定','Confirm deck','덱 확정')}</span></button>
      </div>
      <section id="deckEditSection"><div class="deck-stage" aria-hidden="true"><div class="deck-stage-depth"></div><svg class="deck-stage-floor" viewBox="0 0 1200 160" preserveAspectRatio="none"><defs><linearGradient id="deck-stone" x2="0" y2="1"><stop stop-color="#27434b" stop-opacity=".1"/><stop offset=".75" stop-color="#172b36"/><stop offset="1" stop-color="#08131d"/></linearGradient><linearGradient id="deck-rim"><stop stop-color="#829b9a" stop-opacity="0"/><stop offset=".25" stop-color="#819c9c" stop-opacity=".6"/><stop offset=".5" stop-color="#d2d6bd" stop-opacity=".7"/><stop offset=".75" stop-color="#819c9c" stop-opacity=".6"/><stop offset="1" stop-color="#829b9a" stop-opacity="0"/></linearGradient></defs><path d="M130 16 Q600 -10 1070 16 L1180 117 Q600 166 20 117Z" fill="url(#deck-stone)"/><path d="M20 117 Q600 166 1180 117L1180 128Q600 176 20 128Z" fill="#030c15"/><path d="M20 116 Q600 164 1180 116 M73 99 Q600 145 1127 99" fill="none" stroke="url(#deck-rim)"/><path d="M140 28 100 85M1060 28 1100 85M170 42Q600 21 1030 42" fill="none" stroke="#77979e" stroke-opacity=".14"/><path d="m580 139 20-7 20 7-20 7Z" fill="none" stroke="#bdd3ce" stroke-opacity=".5"/></svg></div><div class="deck-cur" id="deckCur" aria-label="${loungeText('編成中のカード','Cards in deck','편성 카드')}"></div><span id="deckHint" role="status"></span></section></div>
      <aside class="deck-filters deck-frame" id="deckFilters"><div class="deck-search-slot"><label class="deck-pool-search">${homeIcon('search')}<input id="poolSearch" type="search" aria-label="${t('cards.search')}" placeholder="${loungeText('検索','Search','검색')}"></label></div><div class="deck-pool-types" id="poolTypes"></div></aside>
      <section id="deckCandidates" class="deck-candidate-column deck-frame"><div class="deck-pool" id="deckPool"></div></section>
      <section id="deckWatchSection" class="deck-frame" hidden><div class="deck-pool-head deck-watch-head">${homeIcon("bell")} ${t("deck.watch.title")} <b id="watchCount"></b></div>
      <div class="deck-note">${t("deck.watch.desc")}</div>
      <input class="deck-watch-search" id="watchSearch" placeholder="${t("deck.watch.search")}">
      <div class="deck-pool deck-watchpool" id="watchPool"></div><div class="collection-pager"><button id="watchPrev">‹</button><span id="watchPage"></span><button id="watchNext">›</button></div>
      </section><section id="deckAppearanceSection" class="deck-frame" hidden></section><div class="deck-msg" id="deckMsg" role="status" aria-live="polite"></div>
    </div>`;
  app.root.appendChild(wrap);

  // ---- 상태: 서버 저장분(프리셋 5슬롯) 로드, 없으면 기존 단일 덱을 1번 슬롯에 승계 ----
  const starterCards=starterCollection(app.user?.starterCards);
  const store: DeckStore = isLocalDevAccount()?deckStoreForUser(app.user):constrainDeckStore(deckStoreForUser(app.user),starterCards);
  const sortCards=(cards:string[])=>cards.sort((a,b)=>Number(def(a).t!=='mon')-Number(def(b).t!=='mon')||def(a).cost-def(b).cost||a.localeCompare(b,'en'));
  store.list.forEach(d=>sortCards(d.cards));
  let cur = store.sel; // 현재 편집 중인 슬롯 (store.sel = 게임에 사용되는 슬롯)
  let watchQ = "";
  let activeTab:'edit'|'watch'|'appearance'='edit';
  let watching=false,watchPage=0,watchRevision=0;
  let owned:Set<string>|null=null,cosmeticError=false;
  let saved = JSON.stringify(store);
  let guide:TutorialSpotlight|undefined,lessonIndex=0,deckSaved=false;
  const draftKey='lore:onboarding:deck:'+app.user?.id;
  if(options.tutorial){
    store.list[cur].cards=sortCards(onboardingDeck());
    try{
      const draft=JSON.parse(sessionStorage.getItem(draftKey)??'null');
      if(draft&&Array.isArray(draft.cards)&&ownsDeck(draft.cards,starterCards)&&
       (isOnboardingDeck(draft.cards)||draft.cards.length===7&&draft.cards.filter((id:string)=>id==='STARTER_TRASH').length===5&&draft.cards.filter((id:string)=>id==='STARTER_CHEST').length===2)){
        store.list[cur].cards=sortCards(draft.cards);lessonIndex=draft.cards.length===7?3:4;
      }
    }catch{}
  }
  const saveDraft=()=>{if(options.tutorial&&!deckSaved)try{sessionStorage.setItem(draftKey,JSON.stringify({cards:store.list[cur].cards}));}catch{}};
  let saving = false;
  let dead = false;
  let pending: string | null = null;
  let undo: string[] | null = null;
  let poolType: 'all' | 'mon' | 'spell' = 'all';
  let poolQuery = '';
  const lifecycle=new AbortController();
  const handRows=new Map<string,HTMLElement>(),poolRows=new Map<string,HTMLElement>();
  const controlIcon=(swap=false,add=false)=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${swap?'M4 8h16m-4-4 4 4-4 4M20 16H4m4-4-4 4 4 4':add?'M6 12h12M12 6v12':'M6 12h12'}"/></svg>`;

  const q = (id: string): HTMLElement => wrap.querySelector("#" + id) as HTMLElement;
  const tabsEl = q("deckTabs"), curEl = q("deckCur"), poolEl = q("deckPool"), watchEl = q("watchPool");
  const countEl = q("deckCount"), watchCountEl = q("watchCount"), msgEl = q("deckMsg");
  const saveBtn = q("save") as HTMLButtonElement, useBtn = q("useBtn") as HTMLButtonElement;
  const searchEl = q("watchSearch") as HTMLInputElement;

  const setTab = (next:typeof activeTab):void => {
    pending = null;
    activeTab=next;watching=next==='watch';
    for(const key of ['edit','watch','appearance'] as const){
      q('deck'+key[0].toUpperCase()+key.slice(1)+'Section').hidden=key!==next;
      q(key+'Tab').setAttribute('aria-selected',String(key===next));
    }
    q('deckCandidates').hidden=next!=='edit';q('deckFilters').hidden=next!=='edit';
    render();
  };
  q('editTab').onclick=()=>setTab('edit');q('watchTab').onclick=()=>setTab('watch');q('appearanceTab').onclick=()=>setTab('appearance');
  const inst = (id: string, uid: string): CardInst => ({ uid, ...structuredClone(def(id)) });
  const deck = (): string[] => store.list[cur].cards;
  const watch = (): string[] => store.list[cur].watch;
  const countOf = (id: string): number => deck().filter((x) => x === id).length;

  const canAdd=(id:string)=>!saving&&(!options.tutorial||id!=='STARTER_TRASH'&&deck().length===7)&&(DECK_POOL.includes(id))&&countOf(id)<Math.min(DECK_MAX_COPIES,isLocalDevAccount()?DECK_MAX_COPIES:starterCards[id]??0);
  // 알림이 후보 = 마켓/제시에 나올 수 있는 카드 전부 (코스트순)
  const WATCHABLE = [...BUYABLE_POOL].sort((a, b) => DB[a].cost - DB[b].cost || DB[a].name.localeCompare(DB[b].name));

  let cancelDrag=()=>{};
  const render = (): void => {
    saveDraft();
    cancelDrag();
    wrap.dataset.tab=activeTab;
    // 슬롯 탭
    q("deckEditSection").inert = saving; q("deckWatchSection").inert = saving; q("deckAppearanceSection").inert = saving; tabsEl.inert = saving;q('deckCandidates').inert=saving;q('deckFilters').inert=saving;
    tabsEl.innerHTML = "";
    for (let i = 0; i < DECK_SLOTS; i++) {
      const row = document.createElement("div");
      row.className = "deck-tab-row" + (i === cur ? " is-on" : "");
      const b = document.createElement("button");
      b.className = "deck-tab" + (i === cur ? " is-on" : "") + (i === store.sel ? " is-active" : "");
      b.innerHTML = `<span class="deck-tab-name">${esc(store.list[i].name || t("deck.slot").replace("{n}", String(i + 1)))}</span>`;
      b.setAttribute('aria-current', String(i === cur));
      b.title = store.list[i].name || t("deck.slot").replace("{n}", String(i + 1));
      b.onclick = () => { cur = i; pending = null; undo = null; watchQ = ""; searchEl.value = ""; render(); };
      row.appendChild(b);
      if (i === store.sel) {
        const star = document.createElement('span');
        star.className = 'deck-star';
        star.innerHTML = homeIcon('check');
        star.title = t('deck.inuse');
        row.appendChild(star);
      }
      tabsEl.appendChild(row);
    }
    const rename=document.createElement('button');rename.className='deck-rename';rename.id='deckRename';rename.innerHTML=homeIcon('edit');rename.title=loungeText('デッキ名を変更','Rename deck','덱 이름 변경');rename.setAttribute('aria-label',rename.title);rename.disabled=saving;
    rename.onclick=()=>{
      const slot=cur,ov=document.createElement('div');ov.className='overlay';
      ov.innerHTML=`<div class="modal"><h2>${rename.title}</h2><label for="deckNameInput">${loungeText('デッキ名（24文字まで）','Deck name (up to 24 characters)','덱 이름 (최대 24자)')}</label><input class="input" id="deckNameInput" maxlength="48" value="${esc(store.list[slot].name||'')}" placeholder="${t('deck.slot').replace('{n}',String(slot+1))}"><p class="set-desc">${loungeText('空欄で元の名前に戻せます。変更後は「保存」で確定します。','Leave blank to restore the default. Use Save to keep your changes.','비워 두면 기본 이름으로 돌아갑니다. 변경 후 저장해 주세요.')}</p><div class="modal-row"><button class="btn btn-ghost" id="deckRenameCancel">${t('common.cancel')}</button><button class="btn btn-gold" id="deckRenameApply">${t('common.confirm')}</button></div></div>`;
      document.body.append(ov);const input=ov.querySelector<HTMLInputElement>('#deckNameInput')!;
      const apply=()=>{const name=sanitizeDeckName(input.value);if(name)store.list[slot].name=name;else delete store.list[slot].name;ov.remove();render();msgEl.textContent=loungeText('デッキ名を変更しました。「保存」で確定します。','Deck renamed. Save to keep your changes.','덱 이름을 변경했습니다. 저장해 주세요.');};
      ov.querySelector<HTMLButtonElement>('#deckRenameCancel')!.onclick=()=>ov.remove();ov.querySelector<HTMLButtonElement>('#deckRenameApply')!.onclick=apply;input.onkeydown=e=>{if(e.key==='Enter'&&!e.isComposing)apply();};input.oninput=()=>{input.value=Array.from(input.value).slice(0,24).join('');};input.focus();input.select();
    };tabsEl.querySelector('.deck-tab-row.is-on .deck-tab')!.after(rename);
    useBtn.innerHTML = cur === store.sel ? `${homeIcon("check")} ${t("deck.inuse")}` : t("deck.use");
    useBtn.disabled = saving || cur === store.sel || store.list.some(d => d.cards.length !== DECK_SIZE);

    countEl.innerHTML = `<span>${deck().length + 1}</span><small> / ${DECK_SIZE + 1}</small>`;
    q('deckHint').textContent = pending
      ? loungeText(`${cardName(inst(pending,''))}と入れ替えるカードの「⇄」を押す`, `Press ⇄ on a card to replace it with ${cardName(inst(pending,''))}`, `${cardName(inst(pending,''))}(으)로 교체할 카드의 ⇄ 누르기`)
      : '';
    (q('deckUndo') as HTMLButtonElement).disabled = saving || (!undo && !pending);
    curEl.classList.toggle('is-replacing', !!pending);
    // Reuse both the card and its button during presses and edits.
    // Hidden formation cards are refreshed when returning to the edit tab.
    if(activeTab==='edit'){
    const handKeys=new Set<string>();const occurrences=new Map<string,number>();
    const ordered=['STARTER_MANA',...deck()];
    ordered.forEach((id,index)=>{
      const occurrence=occurrences.get(id)??0;occurrences.set(id,occurrence+1);
      const key=`${cur}:${id}:${occurrence}:${store.list[cur].effect??'default'}:${store.list[cur].frame??'default'}`;handKeys.add(key);
      let row=handRows.get(key);const fixed=index===0,c=inst(id,`dk${index}`);
      if(!row){
        row=document.createElement('div');row.className='deck-entry'+(fixed?' is-fixed':'');row.dataset.card=id;
        const surface=document.createElement('div');surface.className='deck-card-float';
        const card=cardEl(c,{size:'mkt',fullArt:true,artSource:deckDisplayArt[id],effect:store.list[cur].effect,frame:store.list[cur].frame});prepareDeckCard(card,id);
        if(fixed)card.classList.add('deck-fixed');
        card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label',`${cardName(c)} · ${loungeText('拡大表示','Enlarge card','카드 확대')}`);
        bindZoom(card,c,undefined,undefined,store.list[cur].effect,store.list[cur].frame);
        card.onclick=()=>zoomCard(c,undefined,undefined,store.list[cur].effect,store.list[cur].frame);
        card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();zoomCard(c,undefined,undefined,store.list[cur].effect,store.list[cur].frame);}};
        surface.append(card);
        if(fixed){const lock=document.createElement('span');lock.className='deck-attune-lock';lock.title=t('deck.fixed');lock.innerHTML='<svg viewBox="0 0 24 28" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 12V8a6 6 0 0 1 12 0v4M4 12h16v13H4z"/><path d="M12 17v4"/></svg>';surface.append(lock);}
        else{const action=document.createElement('button');action.className='deck-hand-action card-action deck-action';surface.append(action);}
        const shadow=document.createElement('span');shadow.className='deck-card-shadow';shadow.setAttribute('aria-hidden','true');row.append(shadow,surface);handRows.set(key,row);
      }
      row.dataset.index=String(index);row.style.setProperty('--hand-turn',`${(index-4)*.5}deg`);row.style.setProperty('--hand-lift',`${Math.abs(index-4)*3-7}px`);
      if(!row.dataset.motionEpoch)row.dataset.motionEpoch=String(performance.now()/1000);
      row.style.setProperty('--idle-delay',`${-((Number(row.dataset.motionEpoch)-index*.35)%6.8+6.8)%6.8}s`);
      const action=row.querySelector<HTMLButtonElement>('.deck-hand-action');
      if(action){action.dataset.action=pending?'swap':'remove';action.innerHTML=controlIcon(!!pending);action.disabled=saving;
        action.setAttribute('aria-label',`${cardName(c)} · ${pending?loungeText('入れ替え','Replace','교체'):t('deck.remove')}`);
        action.onclick=()=>{if(saving||options.tutorial&&(id!=='STARTER_TRASH'||deck().length!==8||lessonIndex!==2))return;undo=[...deck()];if(pending){if(!canAdd(pending))return;deck()[index-1]=pending;pending=null;}else deck().splice(index-1,1);sortCards(deck());render();};}
      if(curEl.children[index]!==row)curEl.insertBefore(row,curEl.children[index]??null);
    });
    for(const [key,row] of handRows)if(!handKeys.has(key)){disposeCardEffects(row);row.remove();handRows.delete(key);}
    curEl.querySelectorAll('.deck-slot').forEach(e=>e.remove());
    for(let k=deck().length;k<DECK_SIZE;k++){const slot=document.createElement('div');slot.className='deck-slot deck-entry';slot.textContent='+';curEl.append(slot);}
    }
    // The collection remains mounted, so + never loses its painted face on press.
    if(!q('poolTypes').children.length)for(const [type,label] of [['all',t('cards.f.all')],['mon',t('cards.f.mon')],['spell',t('cards.f.spell')]] as const){
      const b=document.createElement('button');b.dataset.filter=type;b.textContent=label;b.onclick=()=>{poolType=type;render();};q('poolTypes').append(b);
    }
    q('poolTypes').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===poolType)));
    const visible=new Set<string>();let poolIndex=0;
    for(const id of DECK_POOL){
      const c=inst(id,'pool_'+id);
      if(poolType!=='all'&&(poolType==='mon'?c.t!=='mon':c.t==='mon'))continue;
      if(poolQuery&&![cardName(c),cardText(c),c.name].join(' ').toLowerCase().includes(poolQuery))continue;
      visible.add(id);let tile=poolRows.get(id);
      if(!tile){
        tile=document.createElement('div');tile.className='deck-pool-tile';tile.dataset.deckCard=id;
        const face=document.createElement('div');face.className='deck-pool-face';
        const card=cardEl(c,{size:'mkt',fullArt:true,artSource:deckDisplayArt[id],lazyArt:true});prepareDeckCard(card,id);
        card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label',`${cardName(c)} · ${loungeText('拡大表示','Enlarge card','카드 확대')}`);
        bindZoom(card,c);card.onclick=()=>zoomCard(c);card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();zoomCard(c);}};
        const cnt=document.createElement('div');cnt.className='deck-owned';cnt.title=loungeText('デッキ内 / 所持枚数','In deck / Owned','덱 구성 / 보유 수');card.append(cnt);
        const add=document.createElement('button');add.className='deck-card-action card-action deck-action';add.dataset.action='add';add.innerHTML=controlIcon(false,true);add.setAttribute('aria-label',`${cardName(c)} · ${loungeText('追加・入れ替え','Add or replace','추가 또는 교체')}`);
        add.onclick=()=>{if(!canAdd(id))return;if(deck().length<DECK_SIZE){undo=[...deck()];deck().push(id);sortCards(deck());pending=null;}else pending=pending===id?null:id;render();};
        face.append(card,add);tile.append(face);poolRows.set(id,tile);
      }
      const available=isLocalDevAccount()?DECK_MAX_COPIES:Math.min(DECK_MAX_COPIES,starterCards[id]??0);
      const count=tile.querySelector<HTMLElement>('.deck-owned')!;count.textContent=`${countOf(id)}/${available}`;count.classList.toggle('has',countOf(id)>0);
      const add=tile.querySelector<HTMLButtonElement>('.deck-card-action')!;add.disabled=!canAdd(id);add.setAttribute('aria-pressed',String(pending===id));
      tile.querySelector('.card')!.classList.toggle('is-candidate',pending===id);
      if(poolEl.children[poolIndex]!==tile)poolEl.insertBefore(tile,poolEl.children[poolIndex]??null);poolIndex++;
    }
    for(const [id,tile] of poolRows)if(!visible.has(id)){disposeCardEffects(tile);tile.remove();poolRows.delete(id);}
    poolEl.querySelector('.deck-pool-empty')?.remove();
    if(!visible.size){const empty=document.createElement('p');empty.className='deck-pool-empty';empty.textContent=t('cards.empty');poolEl.append(empty);}
    // ---- 마켓 알림이 픽커 ----
    watchCountEl.textContent = `${watch().length}/${WATCH_MAX}`;
    const watchVersion=++watchRevision,watchNodes:Node[]=[];
    let watchIdx = 0;
    const ql = watchQ.toLowerCase();
    const picked = WATCHABLE.filter((id) => watch().includes(id));
    const rest = WATCHABLE.filter((id) => !watch().includes(id) && (!ql || cardName({ uid: "", ...DB[id] }).toLowerCase().includes(ql) || DB[id].name.toLowerCase().includes(ql)));
    const candidates=[...picked,...rest];const pages=Math.max(1,Math.ceil(candidates.length/24));watchPage=Math.min(watchPage,pages-1);
    q('watchPage').textContent=`${watchPage+1} / ${pages}`;
    (q('watchPrev') as HTMLButtonElement).disabled=watchPage===0;(q('watchNext') as HTMLButtonElement).disabled=watchPage===pages-1;
    for (const id of watching?candidates.slice(watchPage*24,(watchPage+1)*24):[]) {
      const on = watch().includes(id);
      const c = inst(id, "w_" + id);
      const el = cardEl(c, { size: "mkt", fullArt: true, artSource:deckDisplayArt[id], playable: true, dim: !on && watch().length >= WATCH_MAX, lazyArt: watchIdx++ });
      prepareDeckCard(el,id);
      if (on) {
        el.classList.add("is-watch-pick");
        const bell = document.createElement("div");
        bell.className = "watch-bell";
        bell.innerHTML = homeIcon("bell");
        el.appendChild(bell);
      }
      el.onclick = () => {
        const w = watch();
        const i = w.indexOf(id);
        if (i >= 0) w.splice(i, 1);
        else if (w.length < WATCH_MAX) w.push(id);
        render();
      };
      bindZoom(el, c);
      watchNodes.push(el);
    }
    if(watching)void revealCards(watchEl,watchNodes,()=>watchVersion===watchRevision);else watchEl.replaceChildren();
    if(activeTab==='appearance')renderDeckAppearance(q('deckAppearanceSection'),{
      deck:store.list[cur],name:store.list[cur].name||t('deck.slot').replace('{n}',String(cur+1)),owned,error:cosmeticError,
      onPick:(kind,id)=>{if(!owned?.has(id)||saving)return;store.list[cur][kind]=id;render();msgEl.textContent=loungeText('外観を変更しました。「保存」で確定します。','Appearance changed. Save to keep your changes.','외형을 변경했습니다. 저장해 주세요.');},
      onShop:()=>app.shop(),onRetry:()=>{void loadOwned();},
    });
    saveBtn.disabled = saving || store.list.some(d => d.cards.length !== DECK_SIZE);
    saveBtn.classList.toggle('dirty',JSON.stringify(store)!==saved);
    saveBtn.classList.toggle('ready',!saveBtn.disabled&&JSON.stringify(store)!==saved);
    saveBtn.setAttribute('aria-busy',String(saving));
  };

  searchEl.oninput = () => { watchQ = searchEl.value.trim(); watchPage=0;render(); };
  (q('poolSearch') as HTMLInputElement).oninput=e=>{poolQuery=(e.target as HTMLInputElement).value.trim().toLowerCase();render();};
  q('deckUndo').onclick=()=>{if(pending)pending=null;else if(undo){store.list[cur].cards=[...undo];undo=null;}render();};
  q('watchPrev').onclick=()=>{watchPage--;render();};q('watchNext').onclick=()=>{watchPage++;render();};
  useBtn.onclick = () => { void doSave(cur); };

  const doSave = async (selected = store.sel): Promise<void> => {
    if (saving || store.list.some(d => d.cards.length !== DECK_SIZE)||options.tutorial&&!isOnboardingDeck(deck())) return;
    pending = null;saving = true; render();
    msgEl.textContent = "…";
    try {
      const r = await api.saveDecks({ ...store, sel: selected },!!options.tutorial);
      if (dead) return;
      Object.assign(store, r.decks);store.list.forEach(d=>sortCards(d.cards));
      saved = JSON.stringify(store);
      if (app.user) { app.user.decks = r.decks; app.user.deck = r.deck; const active=r.decks.list[r.decks.sel];app.user.sleeve=active.sleeve;app.user.furniture=active.furniture;app.user.effect=active.effect;app.user.frame=active.frame; }
      msgEl.textContent = t("deck.saved");
      if(options.tutorial){deckSaved=true;try{sessionStorage.removeItem(draftKey);}catch{}}
    } catch (e) {
      msgEl.textContent = (e as Error).message || t("api.fail");
    }
    saving = false;
    if (!dead) render();
  };
  saveBtn.onclick = () => { void doSave(); };
  q("back").onclick = () => app.home();
  const dirty = () => JSON.stringify(store) !== saved;
  const beforeUnload = (e: BeforeUnloadEvent) => { if (dirty()) { e.preventDefault(); e.returnValue = ""; } };
  window.addEventListener("beforeunload", beforeUnload);
  const off = onLangChange(() => app.deck(options));

  const loadOwned=async()=>{
    cosmeticError=false;
    try {const profile=isLocalDevAccount()?loadLocalGuestProfile():await api.profile();if(dead)return;owned=new Set(['default',...(profile.sleeves??[]),...('furnitures' in profile?profile.furnitures??[]:[]),...('effects' in profile?profile.effects??[]:[]),...('frames' in profile?profile.frames??[]:[])]);}
    catch {if(dead)return;cosmeticError=true;}
    render();
  };
  cancelDrag=installDeckDrag({pool:poolEl,hand:curEl,removeArea:q('deckCandidates'),
    canRemove:(id,index)=>!options.tutorial&&!saving&&activeTab==='edit'&&index>=0&&deck()[index]===id,
    remove:(_id,index)=>{undo=[...deck()];deck().splice(index,1);pending=null;render();},editor:q('deckEditSection'),signal:lifecycle.signal,canAdd,full:()=>deck().length>=DECK_SIZE,
    notice:message=>{msgEl.textContent=message;},drop:(id,index)=>{if(!canAdd(id))return;undo=[...deck()];if(deck().length<DECK_SIZE)deck().push(id);else if(index!==null)deck()[index]=id;else{pending=id;render();return;}sortCards(deck());pending=null;render();}});
  const syncVisibility=()=>wrap.classList.toggle('idle-paused',document.hidden);
  document.addEventListener('visibilitychange',syncVisibility,{signal:lifecycle.signal});syncVisibility();
  render();void loadOwned();
  if(options.tutorial){
    guide=new TutorialSpotlight(wrap,[
      {selector:'#deckCur',title:c('初期デッキを作ろう','Build a starting deck','시작 덱을 만들자'),body:c('初期デッキは、デュエルに持っていく最初のカードだよ。自由に選ぶ8枚と、固定のアチューン1枚で合計9枚。この実習では、使用中の枠をカル6枚・宝箱2枚から編集するよ。保存するまでは元のデッキは変わらないよ。','Your starting deck is the cards you bring into a duel: eight chosen cards plus one fixed Attune. For this exercise, edit the active slot from six Culls and two Chests. Your saved deck stays unchanged until you confirm.','시작 덱은 듀얼에 가져가는 첫 카드야. 자유롭게 고르는 8장과 고정 어튠 1장으로 총 9장이지. 이번 실습에서는 사용 중인 슬롯을 컬 6장·보물상자 2장부터 편집해. 확정 전까지 저장된 덱은 바뀌지 않아.')},
      {selector:'#deckCur .is-fixed',title:c('アチューンは固定の1枚','Attune is fixed','어튠은 고정 1장'),body:c('左端のアチューンは外せないよ。残り8枚を、所持しているスターターから選ぶんだ。対戦中にマーケットで買うカードとは別だよ。','The leftmost Attune cannot be removed. Choose the other eight from your owned starters. These are separate from cards bought in a duel’s market.','맨 왼쪽 어튠은 뺄 수 없어. 나머지 8장은 보유한 스타터에서 골라. 듀얼 중 마켓에서 사는 카드와는 달라.')},
      {selector:'#deckCur [data-card="STARTER_TRASH"] .deck-hand-action',action:'click',waitFor:()=>deck().length===7,title:c('カルを1枚外そう','Remove one Cull','컬 1장을 빼 보자'),body:c('カルの下の「−」を押して、1枚外してみよう。デッキから外しても、所持カードはなくならないよ。','Press − under one Cull. Removing it from your deck does not remove it from your collection.','컬 아래 −를 눌러 1장을 빼 봐. 덱에서 빼도 보유 카드는 없어지지 않아.')},
      {selector:'#deckPool .deck-pool-tile:not([data-deck-card="STARTER_TRASH"]) .deck-card-action:not(:disabled)',focus:'#deckCandidates',action:'click',waitFor:()=>isOnboardingDeck(deck()),title:c('別のカードを加えよう','Add another card','다른 카드를 넣자'),body:c('候補から、カル以外の所持カードを1枚選んで「＋」を押そう。ガチャやショップで手に入れたカードも、ここから組み込めるよ。','Choose one owned card other than Cull and press +. Cards obtained from gacha and the shop can be added here.','후보에서 컬 이외의 보유 카드 1장을 골라 +를 눌러. 뽑기나 상점에서 얻은 카드도 여기서 넣을 수 있어.')},
      {selector:'#save',action:'click',waitFor:()=>deckSaved,title:c('デッキを確定しよう','Confirm your deck','덱을 확정하자'),body:c('9枚そろったね。「デッキを確定」を押して保存しよう。このデッキで次のデュエルを始められるよ。','All nine cards are ready. Press Confirm deck to save and use it in your next duel.','9장이 모였네. 덱 확정을 눌러 저장하자. 다음 듀얼에서 이 덱을 쓸 수 있어.')},
      {title:c('きみだけのスターターデッキが完成！','Your own starter deck is ready!','너만의 스타터 덱 완성!'),body:c('きみだけのスターターデッキが完成したよ！ カードが増えたら、またここで自由に組み替えてみてね。','Your own starter deck is complete! Return here to customize it as your collection grows.','너만의 스타터 덱이 완성됐어! 카드가 늘어나면 여기서 자유롭게 바꿔 봐.')},
    ],{label:c('初期デッキの編成','Starting deck','시작 덱 편성'),startIndex:lessonIndex,onStep:i=>{lessonIndex=i;},previousStep:()=>-1,rewind:()=>{},onComplete:()=>app.onboarding(),onExit:()=>app.home()});
  }
  return {
    beforeLeave: async () => {
      if (saving) return false;
      if(options.tutorial){saveDraft();return true;}
      if (!dirty()) return true;
      return confirmDialog({title: loungeText("未保存の変更", "Unsaved changes", "저장하지 않은 변경"), body: loungeText("変更を破棄して移動しますか？", "Discard your changes and leave?", "변경을 취소하고 이동할까요?"), confirm: loungeText("破棄して移動", "Discard & leave", "취소하고 이동"), cancel: t("common.cancel")});
    },
    destroy: () => { guide?.destroy();lifecycle.abort();disposeCardEffects(wrap); dead = true;watchRevision++; off(); window.removeEventListener("beforeunload", beforeUnload); wrap.remove(); }
  };
}
