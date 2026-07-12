// ============================================================
// LORE — 덱 빌더. 프리셋 5슬롯 × (초기 덱 9장 = 어튠 1 고정 + 자유 8장).
// 덱마다 "마켓 알림이"(watch)를 설정: 게임 중 마켓/제시에 그 카드가 뜨면
// 은은하게 표시된다. 저장은 서버(users.decks JSON + 활성 덱 csv 캐시).
// ============================================================
import type { App, Screen } from "../router";
import { DB, STARTERS, DECK_POOL, DECK_SIZE, DECK_MAX_COPIES, DECK_SLOTS, WATCH_MAX, BUYABLE_POOL, sanitizeDecks, type DeckStore } from "../shared/cards";
import type { CardDef, CardInst } from "../shared/types";
import { cardEl } from "../ui/cardView";
import { bindZoom } from "../ui/anim";
import { api } from "../net/api";
import { t, cardName } from "../i18n";

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
      <div class="deck-tabs" id="deckTabs"></div>
      <div class="deck-note">${t("deck.note")}</div>
      <div class="deck-cur-head"><span>${t("deck.current")} <b id="deckCount"></b></span><button class="btn btn-ghost deck-use" id="useBtn"></button></div>
      <div class="deck-cur" id="deckCur"></div>
      <div class="deck-pool-head">${t("deck.pool")}</div>
      <div class="deck-pool" id="deckPool"></div>
      <div class="deck-pool-head deck-watch-head">🔔 ${t("deck.watch.title")} <b id="watchCount"></b></div>
      <div class="deck-note">${t("deck.watch.desc")}</div>
      <input class="deck-watch-search" id="watchSearch" placeholder="${t("deck.watch.search")}">
      <div class="deck-pool deck-watchpool" id="watchPool"></div>
      <div class="deck-msg" id="deckMsg"></div>
    </div>`;
  app.root.appendChild(wrap);

  // ---- 상태: 서버 저장분(프리셋 5슬롯) 로드, 없으면 기존 단일 덱을 1번 슬롯에 승계 ----
  const store: DeckStore = sanitizeDecks(app.user?.decks ?? (app.user?.deck ? { sel: 0, list: [{ cards: app.user.deck, watch: [] }] } : null));
  let cur = store.sel; // 현재 편집 중인 슬롯 (store.sel = 게임에 사용되는 슬롯)
  let watchQ = "";

  const q = (id: string): HTMLElement => wrap.querySelector("#" + id) as HTMLElement;
  const tabsEl = q("deckTabs"), curEl = q("deckCur"), poolEl = q("deckPool"), watchEl = q("watchPool");
  const countEl = q("deckCount"), watchCountEl = q("watchCount"), msgEl = q("deckMsg");
  const saveBtn = q("save") as HTMLButtonElement, useBtn = q("useBtn") as HTMLButtonElement;
  const searchEl = q("watchSearch") as HTMLInputElement;

  const inst = (id: string, uid: string): CardInst => ({ uid, ...structuredClone(def(id)) });
  const deck = (): string[] => store.list[cur].cards;
  const watch = (): string[] => store.list[cur].watch;
  const countOf = (id: string): number => deck().filter((x) => x === id).length;

  // 알림이 후보 = 마켓/제시에 나올 수 있는 카드 전부 (코스트순)
  const WATCHABLE = [...BUYABLE_POOL].sort((a, b) => DB[a].cost - DB[b].cost || DB[a].name.localeCompare(DB[b].name));

  const render = (): void => {
    // 슬롯 탭
    tabsEl.innerHTML = "";
    for (let i = 0; i < DECK_SLOTS; i++) {
      const b = document.createElement("button");
      b.className = "deck-tab" + (i === cur ? " is-on" : "") + (i === store.sel ? " is-active" : "");
      b.innerHTML = `${t("deck.slot").replace("{n}", String(i + 1))}${i === store.sel ? ` <span class="deck-star">★</span>` : ""}`;
      b.onclick = () => { cur = i; watchQ = ""; searchEl.value = ""; render(); };
      tabsEl.appendChild(b);
    }
    useBtn.textContent = cur === store.sel ? `★ ${t("deck.inuse")}` : t("deck.use");
    useBtn.disabled = cur === store.sel;

    countEl.textContent = `${deck().length + 1} / ${DECK_SIZE + 1}`;
    // ---- 현재 덱: 어튠(고정) + 8장 ----
    curEl.innerHTML = "";
    const attune = cardEl(inst("STARTER_MANA", "fx_mana"), { size: "mkt" });
    attune.classList.add("deck-fixed");
    attune.appendChild(Object.assign(document.createElement("div"), { className: "deck-fixed-tag", textContent: t("deck.fixed") }));
    bindZoom(attune, inst("STARTER_MANA", "fx_mana"));
    curEl.appendChild(attune);
    deck().forEach((id, i) => {
      const c = inst(id, "dk" + i);
      const el = cardEl(c, { size: "mkt", playable: true });
      el.title = t("deck.remove");
      el.onclick = () => { deck().splice(i, 1); render(); };
      bindZoom(el, c);
      curEl.appendChild(el);
    });
    for (let k = deck().length; k < DECK_SIZE; k++) {
      const slot = document.createElement("div");
      slot.className = "deck-slot";
      slot.textContent = "+";
      curEl.appendChild(slot);
    }
    // ---- 스타팅 풀 ----
    poolEl.innerHTML = "";
    for (const id of DECK_POOL) {
      const c = inst(id, "pool_" + id);
      const n = countOf(id);
      const full = deck().length >= DECK_SIZE || n >= DECK_MAX_COPIES;
      const el = cardEl(c, { size: "mkt", playable: !full, dim: full });
      const cnt = document.createElement("div");
      cnt.className = "deck-owned" + (n > 0 ? " has" : "");
      cnt.textContent = `${n}/${DECK_MAX_COPIES}`;
      el.appendChild(cnt);
      if (!full) el.onclick = () => { deck().push(id); render(); };
      bindZoom(el, c);
      poolEl.appendChild(el);
    }
    // ---- 마켓 알림이 픽커 ----
    watchCountEl.textContent = `${watch().length}/${WATCH_MAX}`;
    watchEl.innerHTML = "";
    const ql = watchQ.toLowerCase();
    const picked = WATCHABLE.filter((id) => watch().includes(id));
    const rest = WATCHABLE.filter((id) => !watch().includes(id) && (!ql || cardName({ uid: "", ...DB[id] }).toLowerCase().includes(ql) || DB[id].name.toLowerCase().includes(ql)));
    for (const id of [...picked, ...rest]) {
      const on = watch().includes(id);
      const c = inst(id, "w_" + id);
      const el = cardEl(c, { size: "mkt", playable: true, dim: !on && watch().length >= WATCH_MAX });
      if (on) {
        el.classList.add("is-watch-pick");
        const bell = document.createElement("div");
        bell.className = "watch-bell";
        bell.textContent = "🔔";
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
      watchEl.appendChild(el);
    }
    saveBtn.disabled = false;
  };

  searchEl.oninput = () => { watchQ = searchEl.value.trim(); render(); };
  useBtn.onclick = () => { store.sel = cur; render(); void doSave(); };

  const doSave = async (): Promise<void> => {
    saveBtn.disabled = true;
    msgEl.textContent = "…";
    try {
      const r = await api.saveDecks(store);
      Object.assign(store, r.decks);
      if (app.user) { app.user.decks = r.decks; app.user.deck = r.deck; }
      msgEl.textContent = t("deck.saved");
    } catch (e) {
      msgEl.textContent = (e as Error).message || t("api.fail");
    }
    saveBtn.disabled = false;
    render();
  };
  saveBtn.onclick = () => { void doSave(); };
  (q("back")).onclick = () => app.home();

  render();
  return { destroy: () => wrap.remove() };
}
