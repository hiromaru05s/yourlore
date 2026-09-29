import {passiveIcon} from '../ui/passiveIcon';
import {revealCards} from '../ui/assetReadiness';
import {loungeText} from '../ui/loungeText';
import { homeIcon } from "../ui/homeIcons";
// ============================================================
// LORE — card list / gallery. Browse every card in card-UI form.
// Reachable from HOME. Filter by type + cost, search by name,
// tap any card to enlarge (same zoom overlay used in-game).
// ============================================================
import type { App, Screen } from "../router";
import type { CardInst, CardType } from "../shared/types";
import { DB, STARTERS, cardPassives, PASSIVES } from "../shared/cards";
import { cardEl } from "../ui/cardView";
import { zoomCard } from "../ui/anim";
import { t, cardName, onLangChange, getLang } from "../i18n";
import { langSelectEl } from "../ui/langSelect";

// Build a stable, sorted list of every card as instances (uid = id).
const ALL: CardInst[] = [...Object.values(DB), ...Object.values(STARTERS)]
  .map((d) => ({ ...d, uid: d.id }))
  .sort((a, b) => {
    const order: Record<CardType, number> = { mon: 0, spell: 1, quest: 2, trap: 3, starter: 4 };
    if (order[a.t] !== order[b.t]) return order[a.t] - order[b.t];
    if (a.cost !== b.cost) return a.cost - b.cost;
    return a.id.localeCompare(b.id);
  });

type TypeFilter = "all" | "quick" | CardType;

export function mountCards(app: App): Screen {
  let typeF: TypeFilter = "all";
  let costF = -1; // -1 = all
  let q = "";
  const passiveFilters=new Set<string>();
  let page=0,revision=0;const pageSize=96;

  const wrap = document.createElement("div");
  wrap.className = "screen cards-screen";
  wrap.innerHTML = `
    <div class="cards">
      <div class="cards-head">
        <button class="btn btn-ghost" id="back">← ${t("cards.back")}</button>
        <h2>${homeIcon("cards")}${t("cards.title")} <span class="cards-count" id="count"></span></h2>
        <div class="cards-head-r">
          <label class="lounge-search">${homeIcon("search")}<input aria-label="${t("cards.search")}" class="cards-search" id="search" type="text" placeholder="${t("cards.search")}" /></label>
          <div class="cards-lang"></div>
        </div>
      </div>
      <div class="cards-toolbar">
        <div class="chip-row" id="typeRow"></div>
        <details class="cards-advanced"><summary>${loungeText("絞り込み","Filters","필터")}<span id="activeFilterCount" hidden></span></summary>
          <div class="cards-filter-panel">
            <div class="cards-filter-heading"><strong>${loungeText("コスト","Cost","코스트")}</strong><button id="resetFilters">${loungeText("条件をリセット","Reset filters","필터 초기화")}</button></div>
            <div class="chip-row" id="costRow"></div>
            <div class="cards-filter-heading"><strong>${loungeText("パッシブ","Passives","패시브")}</strong></div>
            <div id="passiveFilters" class="passive-filters"></div>
          </div>
        </details>
      </div>
      <div class="cards-grid" id="grid"></div><div class="collection-pager"><span class="cards-hint">${t("cards.hint")}</span><button id="prevPage" aria-label="${loungeText("前のページ","Previous page","이전 페이지")}">‹</button><span id="pageLabel" aria-live="polite"></span><button id="nextPage" aria-label="${loungeText("次のページ","Next page","다음 페이지")}">›</button></div>
    </div>`;
  app.root.appendChild(wrap);
  wrap.querySelector(".cards-lang")!.appendChild(langSelectEl());

  const grid = wrap.querySelector("#grid") as HTMLElement;
  const count = wrap.querySelector("#count") as HTMLElement;
  const typeRow = wrap.querySelector("#typeRow") as HTMLElement;
  const costRow = wrap.querySelector("#costRow") as HTMLElement;
  const advanced=wrap.querySelector<HTMLDetailsElement>('.cards-advanced')!;
  const closeFilters=(event:PointerEvent):void=>{if(!advanced.contains(event.target as Node))advanced.open=false;};
  const escapeFilters=(event:KeyboardEvent):void=>{
    if(event.key==='Escape'&&advanced.open){advanced.open=false;advanced.querySelector('summary')!.focus();}
  };
  document.addEventListener('pointerdown',closeFilters);
  wrap.addEventListener('keydown',escapeFilters);

  // ---- type chips ----
  const typeDefs: [TypeFilter, string][] = [
    ["all", t("cards.f.all")], ["mon", t("cards.f.mon")],
    ["spell", t("cards.f.spell")],
    ["quick", getLang() === "ja" ? "クイック魔法" : getLang() === "en" ? "Quick spells" : "퀵 마법"],
    ["quest", getLang() === "ja" ? "クエスト" : getLang() === "en" ? "Quests" : "퀘스트"],
    ["starter", t("cards.f.starter")],
  ];
  const typeChips = typeDefs.map(([key, label]) => {
    const b = document.createElement("button");
    b.className = "chip"; b.textContent = label;
    b.onclick = () => { typeF = key; page=0; render(); };
    typeRow.appendChild(b);
    return { key, el: b };
  });

  // ---- cost chips (distinct costs present) ----
  const costs = [...new Set(ALL.map((c) => c.cost))].sort((a, b) => a - b);
  const costChips: { val: number; el: HTMLElement }[] = [];
  const addCost = (val: number, label: string) => {
    const b = document.createElement("button");
    b.className = "chip"; b.textContent = label;
    b.onclick = () => { costF = val; page=0; render(); };
    costRow.appendChild(b);
    costChips.push({ val, el: b });
  };
  addCost(-1, t("cards.cost.all"));
  costs.forEach((c) => addCost(c, String(c)));

  const passiveButtons=Object.keys(PASSIVES).map(key=>{
    const b=document.createElement('button');b.type='button';b.dataset.passive=key;b.setAttribute('aria-pressed','false');
    b.innerHTML=passiveIcon(key)+`<span>${PASSIVES[key][getLang()].name}</span>`;
    b.onclick=()=>{passiveFilters.has(key)?passiveFilters.delete(key):passiveFilters.add(key);page=0;render();};
    wrap.querySelector('#passiveFilters')!.append(b);return b;
  });
  const search = wrap.querySelector("#search") as HTMLInputElement;
  search.oninput = () => { q = search.value.trim().toLowerCase(); page=0; render(); };

  (wrap.querySelector('#prevPage') as HTMLButtonElement).onclick=()=>{page--;render();};
  (wrap.querySelector('#nextPage') as HTMLButtonElement).onclick=()=>{page++;render();};
  (wrap.querySelector('#resetFilters') as HTMLButtonElement).onclick=()=>{typeF='all';costF=-1;q='';page=0;passiveFilters.clear();search.value='';render();};
  function render(): void {
    const version=++revision;
    passiveButtons.forEach(b=>b.setAttribute("aria-pressed",String(passiveFilters.has(b.dataset.passive!))));
    typeChips.forEach((c) => {c.el.classList.toggle("is-on", c.key === typeF);c.el.setAttribute('aria-pressed',String(c.key===typeF));});
    costChips.forEach((c) => {c.el.classList.toggle("is-on", c.val === costF);c.el.setAttribute('aria-pressed',String(c.val===costF));});
    const activeCount=passiveFilters.size+(costF===-1?0:1);
    const filterCount=wrap.querySelector<HTMLElement>('#activeFilterCount')!;
    filterCount.hidden=activeCount===0;filterCount.textContent=String(activeCount);

    const list = ALL.filter((c) => {
      // "스타터" 탭 = 컬/보물상자/어튠 + 덱 구성 전용(noShop) 스타팅 카드 전부
      if (typeF === "starter") { if (!(c.t === "starter" || c.noShop)) return false; }
      else if (typeF === "quick") { if (!c.quick) return false; }
      else if (typeF !== "all" && c.t !== typeF) return false;
      if (passiveFilters.size && ![...passiveFilters].every(k=>cardPassives(c).includes(k))) return false;
      if (costF !== -1 && c.cost !== costF) return false;
      if(q && ![cardName(c),c.name,c.text,c.textJa,...cardPassives(c).map(k=>PASSIVES[k]?.[getLang()].name)].join(' ').toLowerCase().includes(q))return false;
      return true;
    });

    count.textContent = `${list.length}${t("cards.count")}`;
    const pages=Math.max(1,Math.ceil(list.length/pageSize));page=Math.max(0,Math.min(page,pages-1));
    (wrap.querySelector('#prevPage') as HTMLButtonElement).disabled=page===0;
    (wrap.querySelector('#nextPage') as HTMLButtonElement).disabled=page===pages-1;
    wrap.querySelector('#pageLabel')!.textContent=`${page+1} / ${pages}`;
    if (!list.length) {
      grid.innerHTML = `<div class="cards-empty">${t("cards.empty")}</div>`;
      return;
    }
    const frag = document.createDocumentFragment();
    // lazyArt takes the index: the first screenful loads immediately (it is what
    // the player is looking at the moment they switch tabs), the rest defer.
    list.slice(page*pageSize,(page+1)*pageSize).forEach((c, i) => {
      const node = cardEl(c, { size: "mkt", lazyArt: i });
      node.style.cursor = "pointer";
      node.onclick = () => zoomCard(c);
      node.tabIndex = 0; node.setAttribute("role","button"); node.setAttribute("aria-label",cardName(c));
      node.onkeydown = e => { if(e.key === "Enter" || e.key === " "){e.preventDefault();zoomCard(c);} };
      frag.appendChild(node);
    });
    void revealCards(grid,Array.from(frag.childNodes),()=>version===revision);
  }

  (wrap.querySelector("#back") as HTMLElement).onclick = () => app.home();
  render();

  const unsub = onLangChange(() => app.cards());
  return { destroy: ()=>{revision++;document.removeEventListener('pointerdown',closeFilters);wrap.removeEventListener('keydown',escapeFilters);unsub();} };
}
