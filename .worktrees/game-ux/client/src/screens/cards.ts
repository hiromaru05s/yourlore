// ============================================================
// LORE — card list / gallery. Browse every card in card-UI form.
// Reachable from HOME. Filter by type + cost, search by name,
// tap any card to enlarge (same zoom overlay used in-game).
// ============================================================
import type { App, Screen } from "../router";
import type { CardInst, CardType } from "../shared/types";
import { DB, STARTERS } from "../shared/cards";
import { cardEl } from "../ui/cardView";
import { zoomCard } from "../ui/anim";
import { t, cardName, onLangChange } from "../i18n";
import { langSelectEl } from "../ui/langSelect";

// Build a stable, sorted list of every card as instances (uid = id).
const ALL: CardInst[] = [...Object.values(DB), ...Object.values(STARTERS)]
  .map((d) => ({ ...d, uid: d.id }))
  .sort((a, b) => {
    const order: Record<CardType, number> = { mon: 0, spell: 1, trap: 2, starter: 3 };
    if (order[a.t] !== order[b.t]) return order[a.t] - order[b.t];
    if (a.cost !== b.cost) return a.cost - b.cost;
    return a.id.localeCompare(b.id);
  });

type TypeFilter = "all" | CardType;

export function mountCards(app: App): Screen {
  let typeF: TypeFilter = "all";
  let costF = -1; // -1 = all
  let q = "";

  const wrap = document.createElement("div");
  wrap.className = "screen cards-screen";
  wrap.innerHTML = `
    <div class="topright-lang"></div>
    <div class="cards">
      <div class="cards-head">
        <button class="btn btn-ghost" id="back">← ${t("cards.back")}</button>
        <h2>${t("cards.title")} <span class="cards-count" id="count"></span></h2>
        <input class="cards-search" id="search" type="text" placeholder="${t("cards.search")}" />
      </div>
      <div class="cards-filters">
        <div class="chip-row" id="typeRow"></div>
        <div class="chip-row" id="costRow"></div>
      </div>
      <div class="cards-hint">${t("cards.hint")}</div>
      <div class="cards-grid" id="grid"></div>
    </div>`;
  app.root.appendChild(wrap);
  wrap.querySelector(".topright-lang")!.appendChild(langSelectEl());

  const grid = wrap.querySelector("#grid") as HTMLElement;
  const count = wrap.querySelector("#count") as HTMLElement;
  const typeRow = wrap.querySelector("#typeRow") as HTMLElement;
  const costRow = wrap.querySelector("#costRow") as HTMLElement;

  // ---- type chips ----
  const typeDefs: [TypeFilter, string][] = [
    ["all", t("cards.f.all")], ["mon", t("cards.f.mon")],
    ["spell", t("cards.f.spell")], ["trap", t("cards.f.trap")],
    ["starter", t("cards.f.starter")],
  ];
  const typeChips = typeDefs.map(([key, label]) => {
    const b = document.createElement("button");
    b.className = "chip"; b.textContent = label;
    b.onclick = () => { typeF = key; render(); };
    typeRow.appendChild(b);
    return { key, el: b };
  });

  // ---- cost chips (distinct costs present) ----
  const costs = [...new Set(ALL.map((c) => c.cost))].sort((a, b) => a - b);
  const costChips: { val: number; el: HTMLElement }[] = [];
  const addCost = (val: number, label: string) => {
    const b = document.createElement("button");
    b.className = "chip"; b.textContent = label;
    b.onclick = () => { costF = val; render(); };
    costRow.appendChild(b);
    costChips.push({ val, el: b });
  };
  addCost(-1, t("cards.cost.all"));
  costs.forEach((c) => addCost(c, String(c)));

  const search = wrap.querySelector("#search") as HTMLInputElement;
  search.oninput = () => { q = search.value.trim().toLowerCase(); render(); };

  function render(): void {
    typeChips.forEach((c) => c.el.classList.toggle("is-on", c.key === typeF));
    costChips.forEach((c) => c.el.classList.toggle("is-on", c.val === costF));

    const list = ALL.filter((c) => {
      if (typeF !== "all" && c.t !== typeF) return false;
      if (costF !== -1 && c.cost !== costF) return false;
      if (q && !cardName(c).toLowerCase().includes(q) && !c.name.toLowerCase().includes(q)) return false;
      return true;
    });

    count.textContent = `${list.length}${t("cards.count")}`;
    grid.innerHTML = "";
    if (!list.length) {
      grid.innerHTML = `<div class="cards-empty">${t("cards.empty")}</div>`;
      return;
    }
    const frag = document.createDocumentFragment();
    for (const c of list) {
      const node = cardEl(c, { size: "mkt" });
      node.style.cursor = "pointer";
      node.onclick = () => zoomCard(c);
      frag.appendChild(node);
    }
    grid.appendChild(frag);
  }

  (wrap.querySelector("#back") as HTMLElement).onclick = () => app.home();
  render();

  const unsub = onLangChange(() => app.cards());
  return { destroy: unsub };
}
