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
        <button class="btn btn-gold" id="save">${t("deck.save")}</button>
      </div>
      <div class="deck-controls">
      <div class="deck-tabs" id="deckTabs"></div>
      <div class="deck-local-tabs" role="tablist"><button id="editTab" role="tab" aria-selected="true">${t("deck.current")}</button><button id="watchTab" role="tab" aria-selected="false">${t("deck.watch.title")}</button><button id="appearanceTab" role="tab" aria-selected="false">${loungeText("外観","Appearance","외형")}</button></div>
      </div>
      <div class="deck-note">${t("deck.note")}</div>
      <section id="deckEditSection">
      <div class="deck-current-column"><div class="deck-cur-head"><span>${t("deck.current")} <b id="deckCount"></b></span><button class="btn btn-ghost deck-use" id="useBtn"></button></div>
      <div class="deck-cur" id="deckCur"></div>
      </div><div class="deck-candidate-column"><div class="deck-pool-head">${loungeText("追加するカードを選択（＋）","Choose cards to add (+)","추가할 카드 선택 (+)")}</div>
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

  const q = (id: string): HTMLElement => wrap.querySelector("#" + id) as HTMLElement;
  const tabsEl = q("deckTabs"), curEl = q("deckCur"), poolEl = q("deckPool"), watchEl = q("watchPool");
  const countEl = q("deckCount"), watchCountEl = q("watchCount"), msgEl = q("deckMsg");
  const saveBtn = q("save") as HTMLButtonElement, useBtn = q("useBtn") as HTMLButtonElement;
  const searchEl = q("watchSearch") as HTMLInputElement;

  const setTab = (next:typeof activeTab):void => {
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
      b.onclick = () => { cur = i; watchQ = ""; searchEl.value = ""; render(); };
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
    // ---- 현재 덱: 어튠(고정) + 8장 ----
    curEl.innerHTML = "";
    const attune = cardEl(inst("STARTER_MANA", "fx_mana"), { size: "mkt" });
    attune.classList.add("deck-fixed");
    attune.appendChild(Object.assign(document.createElement("div"), { className: "deck-fixed-tag", textContent: t("deck.fixed") }));
    bindZoom(attune, inst("STARTER_MANA", "fx_mana"));
    const entry=(card:HTMLElement,c:CardInst,fixed=false)=>{
      const row=document.createElement('div');row.className='deck-entry';row.append(card);
      const name=document.createElement('span');name.className='deck-entry-name';name.textContent=cardName(c);row.append(name);
      const cost=document.createElement('small');cost.textContent=fixed?t('deck.fixed'):String(c.cost);row.append(cost);
      const action=card.querySelector('button');if(action)row.append(action);
      row.tabIndex=0;row.setAttribute('aria-label',cardName(c));row.onkeydown=e=>{if(e.target===row&&(e.key==='Enter'||e.key===' ')){e.preventDefault();zoomCard(c);}};
      row.onclick=e=>{if(!(e.target as Element).closest('button'))zoomCard(c);};curEl.append(row);
    };
    entry(attune,inst('STARTER_MANA','fx_mana'),true);
    deck().forEach((id, i) => {
      const c = inst(id, "dk" + i);
      const el = cardEl(c, { size: "mkt", playable: true });
      el.title = t("deck.remove");
      const remove=document.createElement('button');remove.className='deck-card-action';remove.textContent='−';remove.setAttribute('aria-label',`${t('deck.remove')} ${cardName(c)}`);
      remove.onclick=e=>{e.stopPropagation();deck().splice(i,1);render();};el.append(remove);
      bindZoom(el, c);
      entry(el,c);
    });
    for (let k = deck().length; k < DECK_SIZE; k++) {
      const slot = document.createElement("div");
      slot.className = "deck-slot";
      slot.textContent = "+";
      curEl.appendChild(slot);
    }
    // ---- 스타팅 풀 ----
    poolEl.innerHTML = "";
    let poolIdx = 0;
    for (const id of DECK_POOL) {
      const c = inst(id, "pool_" + id);
      const n = countOf(id);
      const full = deck().length >= DECK_SIZE || n >= DECK_MAX_COPIES;
      const el = cardEl(c, { size: "mkt", playable: !full, dim: full, lazyArt: poolIdx++ });
      const cnt = document.createElement("div");
      cnt.className = "deck-owned" + (n > 0 ? " has" : "");
      cnt.textContent = `${n}/${DECK_MAX_COPIES}`;
      el.appendChild(cnt);
      const add=document.createElement('button');add.className='deck-card-action';add.textContent='+';add.disabled=full;add.setAttribute('aria-label',`${loungeText('追加','Add','추가')} ${cardName(c)}`);
      add.onclick=e=>{e.stopPropagation();deck().push(id);render();};el.append(add);
      el.onclick=()=>zoomCard(c);
      bindZoom(el, c);
      poolEl.appendChild(el);
    }
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
  q('watchPrev').onclick=()=>{watchPage--;render();};q('watchNext').onclick=()=>{watchPage++;render();};
  useBtn.onclick = () => { void doSave(cur); };

  const doSave = async (selected = store.sel): Promise<void> => {
    if (saving || store.list.some(d => d.cards.length !== DECK_SIZE)) return;
    saving = true; render();
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
