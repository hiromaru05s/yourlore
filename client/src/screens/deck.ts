// ============================================================
// LORE — 덱 빌더. 초기 덱 9장 = 어튠 1장(고정) + 자유 8장.
// 풀: 컬/보물상자 + 스타팅 전용(noShop) 카드, 각 최대 8장 보유.
// 저장은 서버(users.deck) — 봇전/온라인/친선전 모두 이 덱으로 시작한다.
// ============================================================
import type { App, Screen } from "../router";
import { DB, STARTERS, DECK_POOL, DECK_SIZE, DECK_MAX_COPIES, DEFAULT_DECK_8, sanitizeDeck } from "../shared/cards";
import type { CardDef, CardInst } from "../shared/types";
import { cardEl } from "../ui/cardView";
import { bindZoom } from "../ui/anim";
import { api } from "../net/api";
import { t } from "../i18n";

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
      <div class="deck-note">${t("deck.note")}</div>
      <div class="deck-cur-head">${t("deck.current")} <b id="deckCount"></b></div>
      <div class="deck-cur" id="deckCur"></div>
      <div class="deck-pool-head">${t("deck.pool")}</div>
      <div class="deck-pool" id="deckPool"></div>
      <div class="deck-msg" id="deckMsg"></div>
    </div>`;
  app.root.appendChild(wrap);

  let deck: string[] = sanitizeDeck(app.user?.deck ?? DEFAULT_DECK_8);
  const curEl = wrap.querySelector("#deckCur") as HTMLElement;
  const poolEl = wrap.querySelector("#deckPool") as HTMLElement;
  const countEl = wrap.querySelector("#deckCount") as HTMLElement;
  const msgEl = wrap.querySelector("#deckMsg") as HTMLElement;
  const saveBtn = wrap.querySelector("#save") as HTMLButtonElement;

  const inst = (id: string, uid: string): CardInst => ({ uid, ...structuredClone(def(id)) });
  const countOf = (id: string): number => deck.filter((x) => x === id).length;

  const render = (): void => {
    countEl.textContent = `${deck.length + 1} / ${DECK_SIZE + 1}`;
    // ---- 현재 덱: 어튠(고정) + 8장 ----
    curEl.innerHTML = "";
    const attune = cardEl(inst("STARTER_MANA", "fx_mana"), { size: "mkt" });
    attune.classList.add("deck-fixed");
    attune.appendChild(Object.assign(document.createElement("div"), { className: "deck-fixed-tag", textContent: t("deck.fixed") }));
    bindZoom(attune, inst("STARTER_MANA", "fx_mana"));
    curEl.appendChild(attune);
    deck.forEach((id, i) => {
      const c = inst(id, "dk" + i);
      const el = cardEl(c, { size: "mkt", playable: true });
      el.title = t("deck.remove");
      el.onclick = () => { deck.splice(i, 1); render(); };
      bindZoom(el, c);
      curEl.appendChild(el);
    });
    for (let k = deck.length; k < DECK_SIZE; k++) {
      const slot = document.createElement("div");
      slot.className = "deck-slot";
      slot.textContent = "+";
      curEl.appendChild(slot);
    }
    // ---- 풀 ----
    poolEl.innerHTML = "";
    for (const id of DECK_POOL) {
      const c = inst(id, "pool_" + id);
      const n = countOf(id);
      const full = deck.length >= DECK_SIZE || n >= DECK_MAX_COPIES;
      const el = cardEl(c, { size: "mkt", playable: !full, dim: full });
      const cnt = document.createElement("div");
      cnt.className = "deck-owned" + (n > 0 ? " has" : "");
      cnt.textContent = `${n}/${DECK_MAX_COPIES}`;
      el.appendChild(cnt);
      if (!full) el.onclick = () => { deck.push(id); render(); };
      bindZoom(el, c);
      poolEl.appendChild(el);
    }
    saveBtn.disabled = deck.length !== DECK_SIZE;
  };

  saveBtn.onclick = async () => {
    saveBtn.disabled = true;
    msgEl.textContent = "…";
    try {
      const r = await api.saveDeck(deck);
      deck = r.deck;
      if (app.user) app.user.deck = r.deck;
      msgEl.textContent = t("deck.saved");
    } catch (e) {
      msgEl.textContent = (e as Error).message || t("api.fail");
    }
    saveBtn.disabled = false;
    render();
  };
  (wrap.querySelector("#back") as HTMLElement).onclick = () => app.home();

  render();
  return { destroy: () => wrap.remove() };
}
