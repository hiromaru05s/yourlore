import {starterCollection,type CollectionResult} from '../shared/collection';
import {renderShopStarters,confirmStarterPurchase} from '../ui/shopStarters';
import {pendingPurchase,purchaseCollection,type PendingPurchase} from '../ui/collectionPurchase';
import '../styles/shopStarters.css';
import {preparedFurnitureCatalog} from '../ui/cosmetics/catalogRender';
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
  let destroyGacha:(()=>void)|undefined;
  let furnitureImages:Map<string,string>|undefined=preparedFurnitureCatalog();
  let furnitureLoading=false, furnitureFailed=false;
  const furnitureArt=(id:string):string=>{
    const url=furnitureImages?.get(id);
    return url?`<img src="${url}" alt="">`:`<span class="shop-furniture-loading">${furnitureFailed?loungeText('見本を読み込めませんでした','Preview unavailable','미리보기를 불러오지 못했습니다'):loungeText('見本を準備中…','Preparing preview…','미리보기 준비 중…')}</span>`;
  };
  const loadFurniture=()=>{
    if(furnitureImages||furnitureLoading||furnitureFailed)return;
    furnitureLoading=true;
    const paint=()=>{
      if(dead||category!=='furniture')return;
      wrap.querySelectorAll<HTMLElement>('.shop-furniture-preview').forEach(tile=>{tile.innerHTML=furnitureArt(tile.dataset.preview!);});
    };
    void import('../ui/cosmetics/catalogRender').then(m=>m.furnitureCatalog()).then(images=>{
      furnitureImages=images;
      paint();
    }).catch(()=>{furnitureFailed=true;paint();}).finally(()=>{furnitureLoading=false;});
  };
  let category: 'gacha'|'starter'|'sleeve'|'furniture'='gacha';
  let closePurchase:(()=>void)|undefined;
  const pending=new Set<string>();
  let owned = new Set<string>(["default"]);
  let credits = app.user?.credits ?? 0;

  let starterCards=starterCollection(app.user?.starterCards),collectionReady=false,collectionBusy=false;
  let notice='';
  const uid=app.user?.id??'';
  const refreshCollectionUi=()=>{
    const recovery=wrap.querySelector<HTMLElement>('#collectionRecovery');
    if(recovery){recovery.hidden=!pendingPurchase(uid);const b=recovery.querySelector('button');if(b)b.disabled=collectionBusy;}
    const msg=wrap.querySelector<HTMLElement>('#collectionNotice');if(msg)msg.textContent=notice;
    if(category==='starter')renderShopStarters(wrap.querySelector('#shopStarters')!,starterCards,credits,!collectionReady||collectionBusy,(id,count)=>{closePurchase?.();closePurchase=confirmStarterPurchase(id,count,()=>{if(!dead)void transact({kind:'buy',id,count}).catch(()=>{});});});
  };
  const transact=async(op:Omit<PendingPurchase,'requestId'>):Promise<CollectionResult>=>{
    if(collectionBusy)throw Error(loungeText('処理中です','Processing','처리 중입니다'));
    collectionBusy=true;notice='';refreshCollectionUi();
    try{
      const result=await purchaseCollection(uid,op);credits=result.credits;starterCards=result.starterCards;for(const id of result.cosmetics??[])owned.add(id);
      if(app.user?.id===uid){app.user.credits=credits;app.user.starterCards=starterCards;app.user.effects=result.effects;document.dispatchEvent(new Event('lore:user'));}
      notice=loungeText('購入が完了しました。','Purchase complete.','구매가 완료되었습니다.');
      return result;
    }catch(error){notice=(error as Error).message;throw error;}
    finally{collectionBusy=false;if(!dead)refreshCollectionUi();}
  };
  const build = (): void => {
    closePurchase?.();closePurchase=undefined;
    destroyGacha?.();destroyGacha=undefined;
    wrap.classList.toggle('shop-gacha-active',category==='gacha');
    wrap.innerHTML = `
      <div class="tut">
        <div class="tut-head">
          <button class="btn btn-ghost" id="back">← ${t("common.back")}</button>
          <div><small class="menu-eyebrow">BIBLION / SHOP</small><h2>${t("shop.title")}</h2><p class="menu-subtitle">${loungeText("あなたのデッキに、しるしを。","Make your deck your own.","나의 덱에, 나만의 표식을.")}</p></div>
        </div>
        <div class="tut-body">
          <section class="tut-sec">
            <div class="shop-categories" role="group" aria-label="${esc(loungeText('ショップのカテゴリ','Shop categories','상점 카테고리'))}"><button data-category="gacha" aria-pressed="${category==='gacha'}">${loungeText('ガチャ','Gacha','뽑기')}</button><button data-category="starter" aria-pressed="${category==='starter'}">${loungeText('スターターカード','Starter cards','스타터 카드')}</button><button data-category="sleeve" aria-pressed="${category==='sleeve'}">${loungeText('スリーブ','Sleeves','슬리브')}</button><button data-category="furniture" aria-pressed="${category==='furniture'}">${loungeText('デッキ置き場・墓地','Deck & Graveyard','덱・묘지')}</button></div>
            <div id="collectionRecovery" hidden><button class="btn" id="collectionRetry">${loungeText('購入結果を確認','Check purchase result','구매 결과 확인')}</button></div><p id="collectionNotice" role="status"></p>
            ${category==='gacha'?'<div id="shopGacha"></div>':category==='starter'?'<div id="shopStarters"></div>':`
            <p class="set-desc">${loungeText('デッキ構成の「外観」から、デッキごとに装備できます。','Equip cosmetics for each deck from Appearance in the deck builder.','덱 구성의 「외관」에서 덱마다 장착할 수 있습니다.')}</p>
            <div class="shop-catalog"><div class="shop-grid" id="grid"></div></div>
            `}
          </section>
        </div>
      </div>`;
    (wrap.querySelector("#back") as HTMLElement).onclick = () => app.home();
    wrap.querySelectorAll<HTMLButtonElement>('[data-category]').forEach(button=>button.onclick=()=>{
      category=button.dataset.category as typeof category;
      build();
      wrap.querySelector<HTMLButtonElement>(`[data-category="${category}"]`)?.focus({preventScroll:true});
    });
    if(category==='gacha')destroyGacha=mountShopGacha(wrap.querySelector('#shopGacha')!,{variant:options.gachaVariant,credits,draw:collectionReady?(count)=>transact({kind:'draw',count}):undefined});
    else if(category!=='starter')renderGrid();
    wrap.querySelector<HTMLButtonElement>('#collectionRetry')!.onclick=()=>{const p=pendingPurchase(uid);if(p)void transact(p).then(()=>{if(!dead){build();notice=loungeText('確定済みの結果は履歴から確認できます。','View the confirmed result in History.','확정 결과는 기록에서 확인할 수 있습니다.');refreshCollectionUi();}}).catch(()=>{});};
    refreshCollectionUi();
  };

  const renderGrid = (): void => {
    if(category==='gacha'||category==='starter')return;
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
        <div class="shop-item ${has ? "is-owned" : ""}">
          <div class="sl-preview ${s.kind==='furniture'?'shop-furniture-preview':''}" data-preview="${s.id}" aria-label="${esc(s[getLang()])}" ${s.kind==='sleeve'?`style="background-image:url(${s.url})"`:''}>${s.kind==='furniture'?furnitureArt(s.id):''}</div>
          <div class="sl-name">${s[getLang()]}</div>
          ${has
            ? `<button class="btn btn-mini btn-ghost" disabled>${homeIcon("check")} ${t("shop.owned")}</button>`
            : ('gachaOnly' in s&&s.gachaOnly)?`<button class="btn btn-mini btn-ghost" data-gacha-item>${loungeText('ガチャで入手','Get in gacha','뽑기로 획득')}</button>`: `<button class="btn btn-mini btn-gold" data-buy="${s.id}" ${pending.has(s.id)?'disabled':''}>${t("shop.buy")} ${homeIcon("shard")}${s.price}</button>`}
        </div>`;
    }).join("");

    grid.querySelectorAll<HTMLButtonElement>('[data-gacha-item]').forEach(button=>button.onclick=()=>{category='gacha';build();});
    grid.querySelectorAll("[data-buy]").forEach((btn) => {
      (btn as HTMLElement).onclick = () => {
        const id = (btn as HTMLElement).dataset.buy!;
        if(pending.has(id))return;
        const s = cosmetic(id)!;if('gachaOnly' in s&&s.gachaOnly)return;
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
          document.dispatchEvent(new Event("lore:user"));
          renderGrid();
        }).catch((e) => { pending.delete(id);if(dead)return;renderGrid(); sfx("error"); alert((e as Error).message); });
      };
    });
  };

  // load current ownership + credits
  void Promise.all([api.profile(),api.collection()]).then(([p,collection]) => {
    if (dead) return;
    owned = new Set([...(p.sleeves??["default"]),...(p.furnitures??[])]);
    credits = collection.credits;starterCards=collection.starterCards;collectionReady=true;
    if(app.user){app.user.credits=credits;app.user.starterCards=starterCards;app.user.effects=collection.effects;}
    build();
  }).catch((e) => { if (!dead){notice=(e as Error).message;build();} });

  build();
  const unsub = onLangChange(() => build());
  return { destroy: () => { dead = true; closePurchase?.(); destroyGacha?.(); unsub(); } };
}
