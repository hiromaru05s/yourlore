import {openShopBoardPreview} from '../ui/shopBoardPreview';
import {mountShopGacha, type GachaVariant} from '../ui/shopGacha';
import '../styles/shopPreview.css';
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

export function mountShop(app: App, options: {gachaVariant?: GachaVariant} = {}): Screen {
  const wrap = document.createElement("div");
  wrap.className = "screen tut-screen";
  app.root.appendChild(wrap);

  let dead = false;
  let closePreview:(()=>void)|undefined;
  let destroyGacha:(()=>void)|undefined;
  let furnitureImages:Map<string,string>|undefined;
  let furnitureLoading=false, furnitureFailed=false;
  const furnitureArt=(id:string,selectedArt=false):string=>{
    const url=furnitureImages?.get(id);
    return url?`<img ${selectedArt?'class="shop-furniture-selected"':''} src="${url}" alt="">`:`<span class="shop-furniture-loading">${furnitureFailed?loungeText('見本を読み込めませんでした','Preview unavailable','미리보기를 불러오지 못했습니다'):loungeText('見本を準備中…','Preparing preview…','미리보기 준비 중…')}</span>`;
  };
  const loadFurniture=()=>{
    if(furnitureImages||furnitureLoading||furnitureFailed)return;
    furnitureLoading=true;
    const paint=()=>{
      if(dead||category!=='furniture')return;
      wrap.querySelectorAll<HTMLElement>('.shop-furniture-preview').forEach(tile=>{tile.innerHTML=furnitureArt(tile.dataset.preview!);});
      const placeholder=wrap.querySelector('#shopSelection>.shop-furniture-loading');
      if(placeholder)placeholder.outerHTML=furnitureArt(selected,true);
    };
    void import('../ui/cosmetics/catalogRender').then(m=>m.furnitureCatalog()).then(images=>{
      furnitureImages=images;
      paint();
    }).catch(()=>{furnitureFailed=true;paint();}).finally(()=>{furnitureLoading=false;});
  };
  let category: 'gacha'|'sleeve'|'furniture'='gacha';
  let selected=COSMETICS[0].id;
  const pending=new Set<string>();
  let owned = new Set<string>(["default"]);
  let credits = app.user?.credits ?? 0;

  const build = (): void => {
    closePreview?.();closePreview=undefined;
    destroyGacha?.();destroyGacha=undefined;
    wrap.classList.toggle('shop-gacha-active',category==='gacha');
    wrap.innerHTML = `
      <div class="tut">
        <div class="tut-head">
          <button class="btn btn-ghost" id="back">← ${t("common.back")}</button>
          <div><small class="menu-eyebrow">BIBLION / SHOP</small><h2>${t("shop.title")}</h2><p class="menu-subtitle">${loungeText("あなたのデッキに、しるしを。","Make your deck your own.","나의 덱에, 나만의 표식을.")}</p></div>
          <span class="shop-credits">${homeIcon("shard")} <b id="shopCredits">${credits}</b></span>
        </div>
        <div class="tut-body">
          <section class="tut-sec">
            <div class="shop-categories" role="group" aria-label="${esc(loungeText('ショップのカテゴリ','Shop categories','상점 카테고리'))}"><button data-category="gacha" aria-pressed="${category==='gacha'}">${loungeText('ガチャ','Gacha','뽑기')}</button><button data-category="sleeve" aria-pressed="${category==='sleeve'}">${loungeText('スリーブ','Sleeves','슬리브')}</button><button data-category="furniture" aria-pressed="${category==='furniture'}">${loungeText('デッキ置き場・墓地','Deck & Graveyard','덱・묘지')}</button></div>
            ${category==='gacha'?'<div id="shopGacha"></div>':`
            <p class="set-desc">${loungeText('デッキ構成の「外観」から、デッキごとに装備できます。','Equip cosmetics for each deck from Appearance in the deck builder.','덱 구성의 「외관」에서 덱마다 장착할 수 있습니다.')}</p>
            <div class="shop-catalog"><div class="shop-grid" id="grid"></div><aside class="shop-selection" id="shopSelection" aria-live="polite"></aside></div>
            `}
          </section>
        </div>
      </div>`;
    (wrap.querySelector("#back") as HTMLElement).onclick = () => app.home();
    wrap.querySelectorAll<HTMLButtonElement>('[data-category]').forEach(button=>button.onclick=()=>{
      category=button.dataset.category as typeof category;
      if(category!=='gacha')selected=COSMETICS.find(c=>c.kind===category)!.id;
      build();
      wrap.querySelector<HTMLButtonElement>(`[data-category="${category}"]`)?.focus({preventScroll:true});
    });
    if(category==='gacha')destroyGacha=mountShopGacha(wrap.querySelector('#shopGacha')!,{variant:options.gachaVariant,credits});
    else renderGrid();
  };

  const renderGrid = (): void => {
    if(category==='gacha')return;
    const grid = wrap.querySelector("#grid") as HTMLElement;
    if(category==='furniture')loadFurniture();
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
          <button class="sl-preview ${s.kind==='furniture'?'shop-furniture-preview':''}" data-preview="${s.id}" aria-label="${esc(s[getLang()])}" aria-pressed="${selected===s.id}" ${s.kind==='sleeve'?`style="background-image:url(${s.url})"`:''}>${s.kind==='furniture'?furnitureArt(s.id):''}</button>
          <div class="sl-name">${s[getLang()]}</div>
          ${has
            ? `<button class="btn btn-mini btn-ghost" disabled>${homeIcon("check")} ${t("shop.owned")}</button>`
            : `<button class="btn btn-mini btn-gold" data-buy="${s.id}" ${pending.has(s.id)?'disabled':''}>${t("shop.buy")} ${homeIcon("shard")}${s.price}</button>`}
        </div>`;
    }).join("");

    const current=cosmetic(selected)!;
    wrap.querySelector('#shopSelection')!.innerHTML=`${current.kind==='furniture'?furnitureArt(current.id,true):`<img src="${current.url}" alt="">`}<div><small>${loungeText('プレビュー中','Preview','미리보기')}</small><strong>${esc(current[getLang()])}</strong>${current.kind==='furniture'?`<span class="shop-furniture-label">${loungeText('左：デッキ置き場 ／ 右：墓地','Left: deck holder / Right: graveyard','왼쪽: 덱 받침 / 오른쪽: 묘지')}</span>`:''}<span>${owned.has(current.id)?t('shop.owned'):current.price+' '+t('home.shards')}</span><button class="btn btn-mini" data-board-preview>${loungeText('実盤面で見る','View on board','보드에서 보기')}</button></div>`;
    wrap.querySelector<HTMLButtonElement>('[data-board-preview]')!.onclick=()=>{closePreview?.();closePreview=openShopBoardPreview(current);};
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
  return { destroy: () => { dead = true; closePreview?.(); destroyGacha?.(); unsub(); } };
}
