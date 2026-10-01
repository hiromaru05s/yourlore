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
import { bindZoom, zoomCard } from "../ui/anim";
import { confirmDialog } from "../ui/modal";
import { api } from "../net/api";
import { t, cardName, onLangChange, esc } from "../i18n";

const def = (id: string): CardDef => STARTERS[id] ?? DB[id];

export function mountDeck(app: App): Screen {
  const wrap = document.createElement("div");
  wrap.className = "screen deck-screen";
  wrap.innerHTML = `
    <div class="screen-brand"><div class="mark"></div><h1>LORE</h1></div>
    <div class="panel deck-panel">
      <div class="deck-head">
        <button class="btn btn-ghost" id="back">← ${t("common.back")}</button>
        <h2>${t("deck.title")}</h2>
        <button class="deck-confirm" id="save"><span aria-hidden="true">✓</span> ${loungeText('デッキを確定','Confirm deck','덱 확정')}</button>
      </div>
      <div class="deck-controls">
      <div class="deck-tabs" id="deckTabs"></div>
      <div class="deck-local-tabs" role="tablist"><button id="editTab" role="tab" aria-selected="true">${t("deck.current")}</button><button id="watchTab" role="tab" aria-selected="false">${t("deck.watch.title")}</button><button id="appearanceTab" role="tab" aria-selected="false">${loungeText("外観","Appearance","외형")}</button></div>
      </div>
      <div class="deck-note">${loungeText('アチューン1枚固定 ＋ 自由枠8枚','1 fixed Attune + 8 cards of your choice','어튠 1장 고정 + 자유 8장')}</div>
      <section id="deckEditSection">
      <div class="deck-current-column"><div class="deck-cur-head"><span>${t("deck.current")} <b id="deckCount"></b></span><button class="btn btn-ghost deck-use" id="useBtn"></button></div>
      <div class="deck-cur" id="deckCur"></div><div class="deck-hand-help"><span id="deckHint" role="status"></span><button id="deckUndo">${loungeText('元に戻す','Undo','되돌리기')}</button></div>
      </div><div class="deck-candidate-column"><div class="deck-pool-head"><div class="deck-pool-types" id="poolTypes"></div><label class="deck-pool-search">${homeIcon('search')}<input id="poolSearch" aria-label="${t('cards.search')}" placeholder="${t('cards.search')}"></label></div>
      <div class="deck-pool" id="deckPool"></div></div>
      </section><section id="deckWatchSection" hidden><div class="deck-pool-head deck-watch-head">${homeIcon("bell")} ${t("deck.watch.title")} <b id="watchCount"></b></div>
      <div class="deck-note">${t("deck.watch.desc")}</div>
      <input class="deck-watch-search" id="watchSearch" placeholder="${t("deck.watch.search")}">
      <div class="deck-pool deck-watchpool" id="watchPool"></div><div class="collection-pager"><button id="watchPrev">‹</button><span id="watchPage"></span><button id="watchNext">›</button></div>
      </section><section id="deckAppearanceSection" hidden></section><div class="deck-msg" id="deckMsg" role="status" aria-live="polite"></div>
    </div>`;
  app.root.appendChild(wrap);

  // ---- 상태: 서버 저장분(프리셋 5슬롯) 로드, 없으면 기존 단일 덱을 1번 슬롯에 승계 ----
  const store: DeckStore = deckStoreForUser(app.user);
  let cur = store.sel; // 현재 편집 중인 슬롯 (store.sel = 게임에 사용되는 슬롯)
  let watchQ = "";
  let activeTab:'edit'|'watch'|'appearance'='edit';
  let watching=false,watchPage=0,watchRevision=0;
  let owned:Set<string>|null=null,cosmeticError=false;
  let saved = JSON.stringify(store);
  let saving = false;
  let dead = false;
  let pending: string | null = null;
  let undo: string[] | null = null;
  let poolType: 'all' | 'mon' | 'spell' = 'all';
  let poolQuery = '';

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
    render();
  };
  q('editTab').onclick=()=>setTab('edit');q('watchTab').onclick=()=>setTab('watch');q('appearanceTab').onclick=()=>setTab('appearance');
  const inst = (id: string, uid: string): CardInst => ({ uid, ...structuredClone(def(id)) });
  const deck = (): string[] => store.list[cur].cards;
  const watch = (): string[] => store.list[cur].watch;
  const countOf = (id: string): number => deck().filter((x) => x === id).length;

  // 알림이 후보 = 마켓/제시에 나올 수 있는 카드 전부 (코스트순)
  const WATCHABLE = [...BUYABLE_POOL].sort((a, b) => DB[a].cost - DB[b].cost || DB[a].name.localeCompare(DB[b].name));

  const render = (): void => {
    // 슬롯 탭
    q("deckEditSection").inert = saving; q("deckWatchSection").inert = saving; q("deckAppearanceSection").inert = saving; tabsEl.inert = saving;
    tabsEl.innerHTML = "";
    for (let i = 0; i < DECK_SLOTS; i++) {
      const b = document.createElement("button");
      b.className = "deck-tab" + (i === cur ? " is-on" : "") + (i === store.sel ? " is-active" : "");
      b.innerHTML = `<span class="deck-tab-name">${esc(store.list[i].name || t("deck.slot").replace("{n}", String(i + 1)))}</span>${i === store.sel ? ` <span class="deck-star">${homeIcon("check")}</span>` : ""}`;
      b.title = store.list[i].name || t("deck.slot").replace("{n}", String(i + 1));
      b.onclick = () => { cur = i; pending = null; undo = null; watchQ = ""; searchEl.value = ""; render(); };
      tabsEl.appendChild(b);
    }
    const rename=document.createElement('button');rename.className='deck-rename';rename.id='deckRename';rename.innerHTML=homeIcon('edit');rename.title=loungeText('デッキ名を変更','Rename deck','덱 이름 변경');rename.setAttribute('aria-label',rename.title);rename.disabled=saving;
    rename.onclick=()=>{
      const slot=cur,ov=document.createElement('div');ov.className='overlay';
      ov.innerHTML=`<div class="modal"><h2>${rename.title}</h2><label for="deckNameInput">${loungeText('デッキ名（24文字まで）','Deck name (up to 24 characters)','덱 이름 (최대 24자)')}</label><input class="input" id="deckNameInput" maxlength="48" value="${esc(store.list[slot].name||'')}" placeholder="${t('deck.slot').replace('{n}',String(slot+1))}"><p class="set-desc">${loungeText('空欄で元の名前に戻せます。変更後は「保存」で確定します。','Leave blank to restore the default. Use Save to keep your changes.','비워 두면 기본 이름으로 돌아갑니다. 변경 후 저장해 주세요.')}</p><div class="modal-row"><button class="btn btn-ghost" id="deckRenameCancel">${t('common.cancel')}</button><button class="btn btn-gold" id="deckRenameApply">${t('common.confirm')}</button></div></div>`;
      document.body.append(ov);const input=ov.querySelector<HTMLInputElement>('#deckNameInput')!;
      const apply=()=>{const name=sanitizeDeckName(input.value);if(name)store.list[slot].name=name;else delete store.list[slot].name;ov.remove();render();msgEl.textContent=loungeText('デッキ名を変更しました。「保存」で確定します。','Deck renamed. Save to keep your changes.','덱 이름을 변경했습니다. 저장해 주세요.');};
      ov.querySelector<HTMLButtonElement>('#deckRenameCancel')!.onclick=()=>ov.remove();ov.querySelector<HTMLButtonElement>('#deckRenameApply')!.onclick=apply;input.onkeydown=e=>{if(e.key==='Enter'&&!e.isComposing)apply();};input.oninput=()=>{input.value=Array.from(input.value).slice(0,24).join('');};input.focus();input.select();
    };tabsEl.append(rename);
    useBtn.innerHTML = cur === store.sel ? `${homeIcon("check")} ${t("deck.inuse")}` : t("deck.use");
    useBtn.disabled = saving || cur === store.sel || store.list.some(d => d.cards.length !== DECK_SIZE);

    countEl.textContent = `${deck().length + 1} / ${DECK_SIZE + 1}`;
    q('deckHint').textContent = pending
      ? loungeText(`${cardName(inst(pending,''))}と入れ替えるカードを選択`, `Choose a card to replace with ${cardName(inst(pending,''))}`, `${cardName(inst(pending,''))}(으)로 교체할 카드를 선택`)
      : loungeText('候補をタップで追加 · 手札をタップで外す','Tap a candidate to add · Tap a hand card to remove','후보를 눌러 추가 · 손패를 눌러 제거');
    (q('deckUndo') as HTMLButtonElement).disabled = saving || (!undo && !pending);
    curEl.classList.toggle('is-replacing', !!pending);
    // ---- 현재 덱: 어튠(고정) + 8장 ----
    curEl.innerHTML = "";
    const attune = cardEl(inst("STARTER_MANA", "fx_mana"), { size: "mkt" });
    attune.classList.add("deck-fixed");
    const entry=(card:HTMLElement,c:CardInst,index:number,fixed=false)=>{
      const row=document.createElement('div');row.className='deck-entry'+(fixed?' is-fixed':'');
      row.style.setProperty('--hand-turn',`${(index-4)*2}deg`);row.style.setProperty('--hand-lift',`${Math.abs(index-4)*2}px`);
      row.style.setProperty('--hand-layer',String(index+1));row.append(card);
      const activate=()=>{if(saving)return;if(fixed){zoomCard(c);return;}undo=[...deck()];if(pending){deck()[index-1]=pending;pending=null;}else deck().splice(index-1,1);render();};
      card.tabIndex=0;card.setAttribute('role','button');
      card.setAttribute('aria-label',`${cardName(c)} · ${fixed?t('deck.fixed'):pending?loungeText('入れ替え','Replace','교체'):t('deck.remove')}`);
      card.onclick=activate;card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate();}};
      if(fixed){const lock=document.createElement('span');lock.className='deck-attune-lock';lock.innerHTML=`<span class="deck-lock-glyph" aria-hidden="true"></span><span>${t('deck.fixed')}</span>`;row.append(lock);}
      else {const detail=document.createElement('button');detail.className='deck-hand-detail';detail.textContent=loungeText('詳細','Details','상세');detail.setAttribute('aria-label',`${cardName(c)} · ${detail.textContent}`);detail.onclick=()=>zoomCard(c);row.append(detail);}
      curEl.append(row);
    };
    entry(attune,inst('STARTER_MANA','fx_mana'),0,true);
    deck().forEach((id, i) => {
      const c = inst(id, "dk" + i);
      const el = cardEl(c, { size: "mkt", playable: true });
      entry(el,c,i+1);
    });
    for (let k = deck().length; k < DECK_SIZE; k++) {
      const slot = document.createElement("div");
      slot.className = "deck-slot deck-entry";
      slot.textContent = "+";
      curEl.appendChild(slot);
    }
    // ---- 스타팅 풀 ----
    poolEl.innerHTML = "";
    q('poolTypes').replaceChildren();
    for(const [type,label] of [['all',t('cards.f.all')],['mon',t('cards.f.mon')],['spell',t('cards.f.spell')]] as const){
      const b=document.createElement('button');b.textContent=label;b.setAttribute('aria-pressed',String(poolType===type));b.onclick=()=>{poolType=type;render();};q('poolTypes').append(b);
    }
    let poolIdx = 0;
    for (const id of DECK_POOL) {
      const c = inst(id, "pool_" + id);
      if(poolType!=='all' && (poolType==='mon'?c.t!=='mon':c.t==='mon'))continue;
      if(poolQuery && ![cardName(c),c.name].join(' ').toLowerCase().includes(poolQuery))continue;
      const n = countOf(id);
      const full = n >= DECK_MAX_COPIES;
      const el = cardEl(c, { size: "mkt", playable: !full, dim: full, lazyArt: poolIdx++ });
      const cnt = document.createElement("div");
      cnt.className = "deck-owned" + (n > 0 ? " has" : "");
      cnt.textContent = `${n}/${DECK_MAX_COPIES}`;
      el.appendChild(cnt);
      const choose=()=>{if(saving||full)return;if(deck().length<DECK_SIZE){undo=[...deck()];deck().push(id);pending=null;}else pending=pending===id?null:id;render();};
      el.tabIndex=full?-1:0;el.setAttribute('role','button');el.setAttribute('aria-disabled',String(full));el.setAttribute('aria-label',`${cardName(c)} · ${loungeText('追加・入れ替え','Add or replace','추가 또는 교체')}`);
      el.classList.toggle('is-candidate',pending===id);el.onclick=choose;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}};
      const add=document.createElement('span');add.className='deck-card-action';add.textContent='+';add.setAttribute('aria-hidden','true');el.append(add);
      const tile=document.createElement('div');tile.className='deck-pool-tile';tile.append(el);
      const detail=document.createElement('button');detail.className='deck-pool-detail';detail.textContent=loungeText('詳細','Details','상세');detail.setAttribute('aria-label',`${cardName(c)} · ${detail.textContent}`);detail.onclick=()=>zoomCard(c);tile.append(detail);poolEl.append(tile);
    }
    if(!poolEl.children.length)poolEl.textContent=t('cards.empty');
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
      const el = cardEl(c, { size: "mkt", playable: true, dim: !on && watch().length >= WATCH_MAX, lazyArt: watchIdx++ });
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
  };

  searchEl.oninput = () => { watchQ = searchEl.value.trim(); watchPage=0;render(); };
  (q('poolSearch') as HTMLInputElement).oninput=e=>{poolQuery=(e.target as HTMLInputElement).value.trim().toLowerCase();render();};
  q('deckUndo').onclick=()=>{if(pending)pending=null;else if(undo){store.list[cur].cards=[...undo];undo=null;}render();};
  q('watchPrev').onclick=()=>{watchPage--;render();};q('watchNext').onclick=()=>{watchPage++;render();};
  useBtn.onclick = () => { void doSave(cur); };

  const doSave = async (selected = store.sel): Promise<void> => {
    if (saving || store.list.some(d => d.cards.length !== DECK_SIZE)) return;
    pending = null;saving = true; render();
    msgEl.textContent = "…";
    try {
      const r = await api.saveDecks({ ...store, sel: selected });
      if (dead) return;
      Object.assign(store, r.decks);
      saved = JSON.stringify(store);
      if (app.user) { app.user.decks = r.decks; app.user.deck = r.deck; const active=r.decks.list[r.decks.sel];app.user.sleeve=active.sleeve;app.user.furniture=active.furniture; }
      msgEl.textContent = t("deck.saved");
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
  const off = onLangChange(() => app.deck());

  const loadOwned=async()=>{
    cosmeticError=false;
    try {const profile=isLocalDevAccount()?loadLocalGuestProfile():await api.profile();if(dead)return;owned=new Set(['default',...(profile.sleeves??[]),...('furnitures' in profile?profile.furnitures??[]:[])]);}
    catch {if(dead)return;cosmeticError=true;}
    render();
  };
  render();void loadOwned();
  return {
    beforeLeave: async () => {
      if (saving) return false;
      if (!dirty()) return true;
      return confirmDialog({title: loungeText("未保存の変更", "Unsaved changes", "저장하지 않은 변경"), body: loungeText("変更を破棄して移動しますか？", "Discard your changes and leave?", "변경을 취소하고 이동할까요?"), confirm: loungeText("破棄して移動", "Discard & leave", "취소하고 이동"), cancel: t("common.cancel")});
    },
    destroy: () => { dead = true;watchRevision++; off(); window.removeEventListener("beforeunload", beforeUnload); wrap.remove(); }
  };
}
