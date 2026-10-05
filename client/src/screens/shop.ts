import {themeFromUrl} from '../shared/atelierThemes';
import {COSMETICS,cosmetic} from '../shared/cosmetics';
import { loungeText } from "../ui/loungeText";
import { homeIcon } from "../ui/homeIcons";
// ============================================================
// LORE — Shop. Cosmetic prices and ownership come from the shared catalog/server.
// Server (social.ts /social/buy-sleeve) is authoritative on price &
// ownership; purchased cosmetics are equipped per deck in the deck builder.
// ============================================================
import type { App, Screen } from "../router";
import { api } from "../net/api";
import { t, onLangChange, getLang, esc } from "../i18n";
import { sfx } from "../ui/sound";

export function mountShop(app: App): Screen {
  const wrap = document.createElement("div");
  wrap.className = "screen tut-screen";
  app.root.appendChild(wrap);

  let dead = false;
  let category: 'sleeve'|'furniture'='sleeve';
  let selected=COSMETICS[0].id;
  const pending=new Set<string>();
  let owned = new Set<string>(["default"]);
  let credits = app.user?.credits ?? 0;

  const build = (): void => {
    wrap.innerHTML = `
      <div class="tut">
        <div class="tut-head">
          <button class="btn btn-ghost" id="back">← ${t("common.back")}</button>
          <div><small class="menu-eyebrow">BIBLION / SHOP</small><h2>${t("shop.title")}</h2><p class="menu-subtitle">${loungeText("あなたのデッキに、しるしを。","Make your deck your own.","나의 덱에, 나만의 표식을.")}</p></div>
          <span class="shop-credits">${homeIcon("shard")} <b id="shopCredits">${credits}</b></span>
        </div>
        <div class="tut-body">
          <section class="tut-sec">
            <div class="shop-categories" role="group" aria-label="${esc(loungeText('外観の種類','Cosmetic type','외관 종류'))}"><button data-category="sleeve" aria-pressed="${category==='sleeve'}">${loungeText('スリーブ','Sleeves','슬리브')}</button><button data-category="furniture" aria-pressed="${category==='furniture'}">${loungeText('デッキ置き場・シェルフ','Deck & Shelf','덱・셸프')}</button></div>
            <p class="set-desc">${loungeText('デッキ構成の「外観」から、デッキごとに装備できます。','Equip cosmetics for each deck from Appearance in the deck builder.','덱 구성의 「외관」에서 덱마다 장착할 수 있습니다.')}</p>
            <div class="shop-catalog"><div class="shop-grid" id="grid"></div><aside class="shop-selection" id="shopSelection" aria-live="polite"></aside></div>
          </section>
        </div>
      </div>`;
    (wrap.querySelector("#back") as HTMLElement).onclick = () => app.home();
    wrap.querySelectorAll<HTMLButtonElement>('[data-category]').forEach(button=>button.onclick=()=>{
      category=button.dataset.category as typeof category;selected=COSMETICS.find(c=>c.kind===category)!.id;build();
    });
    renderGrid();
  };

  const renderGrid = (): void => {
    const grid = wrap.querySelector("#grid") as HTMLElement;
    const buyable = COSMETICS.filter(c=>c.kind===category);
    if (!buyable.length) {
      const lang = getLang();
      grid.innerHTML = `<p class="shop-empty">${lang === "ja" ? "現在販売中の商品はありません。" : lang === "en" ? "There are currently no items for sale." : "현재 판매 중인 상품이 없습니다."}</p>`;
      return;
    }
    grid.innerHTML = buyable.map((s) => {
      const has = owned.has(s.id);
      return `
        <div class="shop-item ${has ? "is-owned" : ""} ${selected===s.id?'is-selected':''}">
          <button class="sl-preview ${s.kind==='furniture'?'furniture-preview':''}" data-preview="${s.id}" aria-label="${esc(s[getLang()])}" aria-pressed="${selected===s.id}" style="background-image:url(${s.url})"></button>
          <div class="sl-name">${s[getLang()]}</div>
          ${has
            ? `<button class="btn btn-mini btn-ghost" disabled>${homeIcon("check")} ${t("shop.owned")}</button>`
            : `<button class="btn btn-mini btn-gold" data-buy="${s.id}" ${pending.has(s.id)?'disabled':''}>${t("shop.buy")} ${homeIcon("shard")}${s.price}</button>`}
        </div>`;
    }).join("");

    const current=cosmetic(selected)!,theme=themeFromUrl(current.url);
    wrap.querySelector('#shopSelection')!.innerHTML=`<img src="${current.url}" alt=""><div><small>${loungeText('プレビュー中','Preview','미리보기')}</small><strong>${esc(current[getLang()])}</strong><span>${owned.has(current.id)?t('shop.owned'):current.price+' '+t('home.shards')}</span>${theme?`<a class="btn btn-mini" href="/cosmetic-studio.html?set=${theme.id}&side=self" target="_blank" rel="noopener">${loungeText('実盤面で見る ↗','View on board ↗','보드에서 보기 ↗')}</a>`:''}</div>`;
    grid.querySelectorAll<HTMLButtonElement>('[data-preview]').forEach(button=>button.onclick=()=>{selected=button.dataset.preview!;renderGrid();grid.querySelector<HTMLButtonElement>(`[data-preview="${selected}"]`)?.focus({preventScroll:true})});
    grid.querySelectorAll("[data-buy]").forEach((btn) => {
      (btn as HTMLElement).onclick = () => {
        const id = (btn as HTMLElement).dataset.buy!;
        if(pending.has(id))return;
        const s = cosmetic(id)!;
        if (credits < s.price) { sfx("error"); alert(t("shop.nocredit")); return; }

        pending.add(id);
        (btn as HTMLButtonElement).disabled = true;
        api.buySleeve(id).then((r) => {
          pending.delete(id);
          if(dead)return;
          credits = r.credits;
          owned = new Set([...r.sleeves,...r.furnitures]);
          if (app.user) app.user.credits = r.credits;
          sfx("coin");
          (wrap.querySelector("#shopCredits") as HTMLElement).textContent = String(credits);
          document.dispatchEvent(new Event("lore:user"));
          renderGrid();
        }).catch((e) => { pending.delete(id);if(dead)return;renderGrid(); sfx("error"); alert((e as Error).message); });
      };
    });
  };

  // load current ownership + credits
  void api.profile().then((p) => {
    if (dead) return;
    owned = new Set([...(p.sleeves??["default"]),...(p.furnitures??[])]);
    credits = p.credits ?? credits;
    build();
  }).catch(() => { if (!dead) build(); });

  build();
  const unsub = onLangChange(() => build());
  return { destroy: () => { dead = true; unsub(); } };
}
