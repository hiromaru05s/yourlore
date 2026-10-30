import {TutorialSpotlight} from '../ui/tutorialSpotlight';
import {copy as c} from '../shared/tutorialSteps';
import {ONBOARDING_DRAW,ONBOARDING_BUY} from '../shared/onboarding';
import {mountShopFrames,confirmFramePurchase} from '../ui/shopFrames';
import {isCardFrame} from '../shared/cardFrames';
import {starterCollection,type CollectionResult,type DailyStarterShop} from '../shared/collection';
import {renderShopStarters,confirmStarterPurchase} from '../ui/shopStarters';
import {pendingPurchase,purchaseCollection,type PendingPurchase} from '../ui/collectionPurchase';
import '../styles/shopStarters.css';
import '../styles/shopCatalog.css';
import {mountShopGacha, type GachaVariant} from '../ui/shopGacha';
import '../styles/shopPreview.css';
import { loungeText } from "../ui/loungeText";
// ============================================================
// Shared shop frame; collection API owns prices, rotation and stock.
import type { App, Screen } from "../router";
import { api } from "../net/api";
import { t, onLangChange, esc } from "../i18n";

export function mountShop(app: App, options: {gachaVariant?: GachaVariant;tutorial?:'gacha'|'starter'} = {}): Screen {
  const wrap = document.createElement("div");
  wrap.className = "screen tut-screen";
  app.root.appendChild(wrap);

  let dead = false;
  let guide:TutorialSpotlight|undefined;
  const teaching=options.tutorial;
  let bought=false;
  let destroyGacha:(()=>void)|undefined;
  let frames:ReturnType<typeof mountShopFrames>|undefined,ownedFrames=new Set(app.user?.frames??[]);
  let category: 'gacha'|'starter'|'accessories'='gacha';
  let closePurchase:(()=>void)|undefined;
  let dailyShop:DailyStarterShop|undefined;
  let refreshing=false,stateRevision=0;
  let credits = app.user?.credits ?? 0;

  let starterCards=starterCollection(app.user?.starterCards),collectionReady=false,collectionBusy=false;
  let notice='';
  const uid=app.user?.id??'';
  const refreshCollectionUi=()=>{
    const recovery=wrap.querySelector<HTMLElement>('#collectionRecovery');
    if(recovery){recovery.hidden=!pendingPurchase(uid);const b=recovery.querySelector('button');if(b)b.disabled=collectionBusy;}
    const msg=wrap.querySelector<HTMLElement>('#collectionNotice');if(msg)msg.textContent=notice;
    const reload=wrap.querySelector<HTMLButtonElement>('#collectionReload');if(reload){reload.hidden=collectionReady||!notice;reload.disabled=refreshing;}
    frames?.update(ownedFrames,credits,!collectionReady||collectionBusy);
    if(category==='starter')renderShopStarters(wrap.querySelector('#shopStarters')!,starterCards,credits,!collectionReady||collectionBusy,(id,count)=>{closePurchase?.();closePurchase=confirmStarterPurchase(id,count,()=>{if(!dead)void transact({kind:'buy',id,count,shopDay:dailyShop?.day}).catch(()=>{});},teaching?0:undefined);},dailyShop,teaching==='starter');
  };
  const transact=async(op:Omit<PendingPurchase,'requestId'>):Promise<CollectionResult>=>{
    if(collectionBusy)throw Error(loungeText('処理中です','Processing','처리 중입니다'));
    collectionBusy=true;stateRevision++;notice='';refreshCollectionUi();
    try{
      if(teaching&&(teaching==='gacha'?(op.kind!=='draw'||op.count!==10):(op.kind!=='buy'||op.id!==dailyShop?.cards[0]||op.count!==1)))throw Error('Follow the tutorial action');
      const result=await (teaching?(op.kind==='draw'?api.drawStarters(10,ONBOARDING_DRAW,true):api.buyStarter(op.id!,ONBOARDING_BUY,1,op.shopDay,true)):purchaseCollection(uid,op));credits=result.credits;starterCards=result.starterCards;dailyShop=result.dailyShop;
      if(app.user?.id===uid){app.user.credits=credits;app.user.starterCards=starterCards;app.user.effects=result.effects;document.dispatchEvent(new Event('lore:user'));}
      if(teaching==='starter'&&op.kind==='buy')bought=true;
      notice=op.kind==='draw'?'':loungeText('購入が完了しました。','Purchase complete.','구매가 완료되었습니다.');
      return result;
    }catch(error){notice=(error as Error).message;void refreshCollection();throw error;}
    finally{collectionBusy=false;if(!dead)refreshCollectionUi();}
  };
  const buyFrame=async(id:string)=>{
    if(collectionBusy||!collectionReady)return;collectionBusy=true;stateRevision++;notice='';refreshCollectionUi();
    try{const result=await api.buyFrame(id);credits=result.credits;ownedFrames=new Set(result.frames);
      if(app.user?.id===uid){app.user.credits=credits;app.user.frames=result.frames;document.dispatchEvent(new Event('lore:user'));}
      notice=loungeText('購入しました。デッキ編成の「外観」で設定できます。','Purchased. Equip it in Deck → Appearance.','구매했습니다. 덱 편성의 외형에서 설정할 수 있습니다.');
    }catch(error){notice=(error as Error).message==='not enough shards'?loungeText('シャードが不足しています。','Not enough Shards.','샤드가 부족합니다.'):(error as Error).message;void refreshCollection();}
    finally{collectionBusy=false;if(!dead)refreshCollectionUi();}
  };
  const build = (): void => {
    closePurchase?.();closePurchase=undefined;
    destroyGacha?.();destroyGacha=undefined;frames?.dispose();frames=undefined;
    wrap.classList.add('shop-gacha-active');
    wrap.dataset.shopCategory=category;
    wrap.innerHTML = `
      <div class="tut">
        ${category==='gacha'?'<span class="shop-table-frame" aria-hidden="true"></span>':''}
        <div class="tut-head">
          <button class="btn btn-ghost" id="back">← ${t("common.back")}</button>
          <div><small class="menu-eyebrow">BIBLION / SHOP</small><h2>${t("shop.title")}</h2><p class="menu-subtitle">${loungeText("あなたのデッキに、しるしを。","Make your deck your own.","나의 덱에, 나만의 표식을.")}</p></div>
        </div>
        <div class="tut-body">
          <section class="tut-sec">
            <div class="shop-categories" role="group" aria-label="${esc(loungeText('ショップのカテゴリ','Shop categories','상점 카테고리'))}"><button data-category="gacha" aria-pressed="${category==='gacha'}">${loungeText('ガチャ','Gacha','뽑기')}</button><button data-category="starter" aria-pressed="${category==='starter'}">${loungeText('スターター','Starters','스타터')}</button><button data-category="accessories" aria-pressed="${category==='accessories'}">${loungeText('アクセサリー','Accessories','액세서리')}</button></div>
            <div id="collectionRecovery" hidden><button class="btn" id="collectionRetry">${loungeText('購入結果を確認','Check purchase result','구매 결과 확인')}</button></div><p id="collectionNotice" role="status"></p><button class="lore-button" id="collectionReload" hidden>${loungeText('商品を再読み込み','Reload shop','상품 다시 불러오기')}</button>
            <div class="shop-content">
              <div id="shopGacha" ${category!=='gacha'?'inert aria-hidden="true"':''}></div>
              ${category==='starter'?'<div class="shop-other" id="shopStarters"></div>':category==='accessories'?'<div class="shop-other" id="shopFrames"></div>':''}
            </div>
          </section>
        </div>
      </div>`;
    (wrap.querySelector("#back") as HTMLElement).onclick = () => app.home();
    wrap.querySelectorAll<HTMLButtonElement>('[data-category]').forEach(button=>button.onclick=()=>{
      category=button.dataset.category as typeof category;
      build();
      wrap.querySelector<HTMLButtonElement>(`[data-category="${category}"]`)?.focus({preventScroll:true});
    });
    destroyGacha=mountShopGacha(wrap.querySelector('#shopGacha')!,{variant:options.gachaVariant,credits,tutorial:!!teaching,onResultsClosed:teaching?()=>{guide?.destroy();app.onboarding();}:undefined,draw:collectionReady?(count)=>transact({kind:'draw',count}):undefined});
    wrap.querySelector<HTMLButtonElement>('#collectionRetry')!.onclick=()=>{const p=pendingPurchase(uid);if(p)void transact(p).then(()=>{if(!dead){build();notice=loungeText('確定済みの結果は履歴から確認できます。','View the confirmed result in History.','확정 결과는 기록에서 확인할 수 있습니다.');refreshCollectionUi();}}).catch(()=>{});};
    if(category==='accessories')frames=mountShopFrames(wrap.querySelector('#shopFrames')!,id=>{closePurchase?.();closePurchase=confirmFramePurchase(id,()=>{if(!dead)void buyFrame(id);});});
    wrap.querySelector<HTMLButtonElement>('#collectionReload')!.onclick=()=>void refreshCollection();
    refreshCollectionUi();
  };

  // Refresh by server time, including after a sleeping tab wakes at midnight.
  let serverDeadline=Infinity;
  const refreshCollection=async()=>{
    if(dead||refreshing)return;
    refreshing=true;
    try{
      const firstLoad=!collectionReady,revision=stateRevision;
      const collection=await api.collection();if(dead||revision!==stateRevision)return;
      ownedFrames=new Set((collection.cosmetics??[]).filter(isCardFrame));credits=collection.credits;starterCards=collection.starterCards;dailyShop=collection.dailyShop;collectionReady=true;
      serverDeadline=dailyShop?performance.now()+Math.max(0,dailyShop.resetsAt-dailyShop.serverNow):Infinity;
      if(app.user){app.user.credits=credits;app.user.starterCards=starterCards;app.user.effects=collection.effects;app.user.frames=[...ownedFrames];}
      if(category==='gacha'&&firstLoad)build();else {closePurchase?.();refreshCollectionUi();}
    }catch(e){serverDeadline=performance.now()+30_000;if(!dead){notice=(e as Error).message;refreshCollectionUi();}}
    finally{refreshing=false;if(!dead)refreshCollectionUi();}
  };
  const wake=()=>{if(!document.hidden&&!collectionBusy)void refreshCollection();};
  const timer=window.setInterval(()=>{if(!collectionBusy&&performance.now()>=serverDeadline){collectionReady=false;refreshCollectionUi();void refreshCollection();}},1000);
  document.addEventListener('visibilitychange',wake);
  window.addEventListener('focus',wake);
  void refreshCollection();

  build();
  if(teaching){
    const steps=teaching==='gacha'?[
      {title:c('3,000シャードを受け取ったよ！','You received 3,000 Shards!','3,000샤드를 받았어!'),body:c('デュエルの基本、クリアおめでとう！ 初回クリア報酬の3,000シャードを受け取ったよ。次はガチャを10回引いてみよう。','You finished Duel basics and received 3,000 Shards as your first-clear reward! Next, try ten gacha draws.','듀얼의 기본을 완료하고 첫 완료 보상 3,000샤드를 받았어! 이제 뽑기 10회를 해 보자.')},
      {selector:'[data-pull="10"]',action:'click' as const,waitFor:()=>false,suspendForDialog:true,allow:'#collectionReload',title:c('ガチャを10回引こう','Draw ten times','10회 뽑기를 해 보자'),body:c('「10回引く」を押そう。1,000シャードを使って、スターターなどを10個入手できるよ。','Press 10 draws. Spend 1,000 Shards to receive ten items, including possible starters.','10회 뽑기를 눌러. 1,000샤드로 스타터 등을 10개 얻을 수 있어.')},
    ]:[
      {selector:'[data-category="starter"]',action:'click' as const,title:c('スターターショップへ','Visit the Starter Shop','스타터 상점으로'),body:c('次はスターターを選んで買ってみよう。「スターター」を押してね。','Next, buy a starter directly. Press Starters.','이번에는 스타터를 골라 사 보자. 스타터를 눌러 줘.')},
      {selector:'.starter-shop-item:first-child [data-buy-starter]',action:'click' as const,waitFor:()=>bought,suspendForDialog:true,allow:'#collectionReload',title:c('左端のカードを購入しよう','Buy the leftmost card','맨 왼쪽 카드를 사 보자'),body:c('一番左のカードを1枚買おう。今回だけ0シャードだよ。購入を押して、確認画面でYESを選んでね。','Buy one copy of the leftmost card. This purchase alone costs 0 Shards. Press Buy, then YES.','맨 왼쪽 카드를 1장 사 보자. 이번만 0샤드야. 구매를 누르고 YES를 골라 줘.')},
      {title:c('カードを手に入れたね','Your card is ready','카드를 얻었네'),body:c('次はデッキページで、きみだけの初期デッキを組んでみよう。','Next, build your own starting deck on the Deck page.','이제 덱 페이지에서 너만의 시작 덱을 만들어 보자.')},
    ];
    guide=new TutorialSpotlight(wrap,steps,{label:c('スターターデッキを作ろう','Build your starter deck','스타터 덱 만들기'),onStep:()=>{},previousStep:()=>-1,rewind:()=>{},onComplete:()=>app.onboarding(),onExit:()=>app.home()});
  }
  const unsub = onLangChange(() => build());
  return { destroy: () => { dead = true; guide?.destroy(); window.clearInterval(timer);document.removeEventListener('visibilitychange',wake);window.removeEventListener('focus',wake);closePurchase?.(); destroyGacha?.(); frames?.dispose(); unsub(); } };
}
