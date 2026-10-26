import {homeIcon} from './homeIcons';
import {GACHA_COSMETICS} from '../shared/cosmetics';
import {mountRewardGallery} from './gachaRewardStage';
import {loungeText as l} from './loungeText';
import {openGachaCinematic,prepareGachaCinematic} from './gachaCinematic';
import {COLLECTIBLE_STARTERS,GACHA_PRICE,type CollectionResult,type CollectionReceipt} from '../shared/collection';
import {FRAME_BACK} from '../shared/cards';
import {esc} from '../i18n';
import {sample,shopLineup,shopRewardCategoryName,mountShopRewardPreviews,type ShopRewardCategory} from './shopRewardPreview';
import {artUrl} from './cardArt';
import {api} from '../net/api';
import '../styles/shopGacha.css';
import '../styles/shopGachaTable.css';
export type GachaVariant=1|2|3;
const label=()=>l('ビブリオンのコレクション','Biblion Collection','비블리온 컬렉션');
const rewardList=(receipt:CollectionReceipt)=>`<div class="reward-results-summary"><span>${l('消費','Spent','사용')} <strong>${receipt.cost}</strong> ${l('シャード','Shards','샤드')}</span><span>${l('重複還元','Duplicate refund','중복 환급')} <strong>+${receipt.refund}</strong></span><span>${receipt.rewards.length} ${l('個の結果','results','개 결과')}</span></div><div data-receipt="${esc(receipt.requestId)}"></div>`;
const cosmeticRate=()=>String(7/GACHA_COSMETICS.length);
const sleeveCount=()=>GACHA_COSMETICS.filter(c=>c.kind==='sleeve').length;
const furnitureCount=()=>GACHA_COSMETICS.filter(c=>c.kind==='furniture').length;
const rateDetails=()=>`<table><tbody><tr><th>${l('スターター','Starter','스타터')}</th><td>92.5%</td></tr><tr><th>${l('スリーブ・デッキ置き場＆墓地','Sleeves & deck holder / graveyard','슬리브·덱 받침 & 묘지')}</th><td>7%</td></tr><tr><th>${l('エフェクト3種（均等）','3 effects (equal odds)','이펙트 3종 (동일 확률)')}</th><td>0.5%</td></tr></tbody></table><p>${l(`スリーブ${sleeveCount()}種とデッキ置き場＆墓地${furnitureCount()}種は別々に排出、各${cosmeticRate()}%。スターターは各種類均等、エフェクトは各1/600（約0.1667%）。10回も1回ずつ同じ抽選です。`,`${sleeveCount()} sleeves and ${furnitureCount()} deck holder/graveyard items drop separately at ${cosmeticRate()}% each. Starters have equal per-type odds. Each effect: 1/600 (about 0.1667%). Ten draws use the same independent odds.`,`슬리브 ${sleeveCount()}종과 덱 받침·묘지 ${furnitureCount()}종은 별도 배출되며 각각 ${cosmeticRate()}%. 스타터는 종류별 동일 확률, 각 이펙트는 1/600 (약 0.1667%). 10회도 매회 같은 추첨입니다.`)}</p><p>${l('重複還元：スターター8枚所持時50／スリーブ・家具100／エフェクト500シャード。','Duplicates: 50 Shards for starters at 8 copies / 100 for owned sleeves or furniture / 500 for owned effects.','중복 환급: 스타터 8장 보유 시 50 / 보유 슬리브·가구 100 / 이펙트 500샤드.')}</p>`;
export function mountShopGacha(host:HTMLElement,options:{variant?:GachaVariant;credits:number;draw?:(count:number)=>Promise<CollectionResult>}):()=>void {
 const warmTimer=setTimeout(()=>{if(host.isConnected)void prepareGachaCinematic().catch(()=>{});},350);
 let visualCleanups:Array<()=>void>=[],stopSamples=()=>{};
 let closeConfirmation:(()=>void)|undefined;
 let dead=false,busy=false,balance=options.credits,dialog:HTMLDialogElement|undefined,stopCinematic:(()=>void)|undefined,focus:HTMLElement|null=null;
 const close=()=>{closeConfirmation?.();visualCleanups.splice(0).forEach(f=>f());stopCinematic?.();stopCinematic=undefined;dialog?.close();dialog?.remove();dialog=undefined;const restore=focus?.isConnected?focus:focus?.dataset.pull?host.querySelector<HTMLButtonElement>(`[data-pull="${focus.dataset.pull}"]`):null;restore?.focus();};
 function show(title:string,body:string,receipts:CollectionReceipt[]=[]){
  const opener=(stopCinematic||dialog?.contains(document.activeElement))?focus:document.activeElement as HTMLElement;close();focus=opener;dialog=document.createElement('dialog');dialog.className='gacha-dialog';dialog.setAttribute('aria-labelledby','gacha-dialog-title');
  dialog.innerHTML=`<header><small>BIBLION / GACHA</small><button data-close aria-label="${l('閉じる','Close','닫기')}">×</button><h2 id="gacha-dialog-title">${title}</h2></header><div class="gacha-dialog-body">${body}</div><footer><button data-close>${l('閉じる','Close','닫기')}</button></footer>`;
  document.body.append(dialog);dialog.querySelectorAll<HTMLButtonElement>('[data-close]').forEach(b=>b.onclick=close);dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.showModal();hydrate(receipts);
 }
 function hydrate(receipts:CollectionReceipt[]){
  for(const host of dialog?.querySelectorAll<HTMLElement>('[data-receipt]')??[]){const receipt=receipts.find(r=>r.requestId===host.dataset.receipt);if(!receipt)continue;dialog!.classList.add('reward-results-dialog');visualCleanups.push(mountRewardGallery(host,receipt.rewards));}
 }
 function confirmRedraw(count:number){
  if(dead||busy||closeConfirmation)return;
  const previous=document.activeElement as HTMLElement|null,confirm=document.createElement('dialog');confirm.className='starter-purchase-dialog gacha-redraw-confirm';confirm.setAttribute('aria-labelledby','gacha-redraw-title');
  const cost=count*GACHA_PRICE;
  confirm.innerHTML=`<h2 id="gacha-redraw-title">${l(count===10?'もう一度10連ガチャを引きますか？':'もう一度ガチャを引きますか？',`Draw ${count} again?`,count===10?'10회 뽑기를 다시 하시겠습니까?':'다시 뽑으시겠습니까?')}</h2><p>${l('消費','Cost','소모')} <strong>${cost.toLocaleString()} ${l('シャード','Shards','샤드')}</strong></p><div class="modal-row"><button class="btn btn-ghost" data-redraw-no>NO</button><button class="btn btn-gold" data-redraw-yes ${balance<cost?'disabled':''}>YES</button></div>`;
  let closed=false;const dismiss=()=>{if(closed)return;closed=true;confirm.close();confirm.remove();closeConfirmation=undefined;if(previous?.isConnected)previous.focus({preventScroll:true});};closeConfirmation=dismiss;
  confirm.querySelector<HTMLButtonElement>('[data-redraw-no]')!.onclick=dismiss;
  confirm.querySelector<HTMLButtonElement>('[data-redraw-yes]')!.onclick=()=>{if(closed||busy)return;dismiss();void draw(count);};
  confirm.addEventListener('cancel',e=>{e.preventDefault();dismiss();});document.body.append(confirm);confirm.showModal();confirm.querySelector<HTMLButtonElement>('[data-redraw-no]')!.focus();
 }
 function showResults(receipt:CollectionReceipt){
  show(l('獲得結果','Draw results','획득 결과'),rewardList(receipt),[receipt]);
  const count=receipt.rewards.length===10?10:1;
  dialog!.querySelector('footer')!.innerHTML=`<button class="lore-button-primary" data-redraw="${count}">${l('もう一度引く','Draw again','다시 뽑기')}</button>`;
  dialog!.querySelector<HTMLButtonElement>('[data-redraw]')!.onclick=()=>confirmRedraw(count);updateControls();
 }
 function updateControls(){
  host.querySelectorAll<HTMLButtonElement>('[data-pull]').forEach(button=>{button.disabled=busy||!options.draw||balance<Number(button.dataset.pull)*GACHA_PRICE;});
  const status=host.querySelector<HTMLElement>('.gacha-table-status p');if(status)status.textContent=busy?l('抽選結果を確認しています…','Confirming your draw…','추첨 결과를 확인하고 있습니다…'):!options.draw?l('残高を確認しています…','Checking your balance…','잔액을 확인하고 있습니다…'):balance<GACHA_PRICE?l('シャードが不足しています','Not enough Shards','샤드가 부족합니다'):'';
  const redraw=dialog?.querySelector<HTMLButtonElement>('[data-redraw]');if(redraw){redraw.disabled=busy||!options.draw||balance<Number(redraw.dataset.redraw)*GACHA_PRICE;redraw.title=balance<Number(redraw.dataset.redraw)*GACHA_PRICE?l('シャードが不足しています','Not enough Shards','샤드가 부족합니다'):'';}
 }
 function rates(){show(l('提供割合','Drop rates','제공 확률'),rateDetails());}
 async function draw(count:number){
  if(dead||busy||!options.draw||balance<count*GACHA_PRICE)return;void prepareGachaCinematic().catch(()=>{});busy=true;updateControls();
  try{
   const result=await options.draw(count);if(dead)return;balance=result.credits;
   close();focus=host.querySelector(`[data-pull="${count}"]`);
   const showResult=()=>showResults(result.receipt);
   stopCinematic=openGachaCinematic({count,edition:'ivory',rewards:result.receipt.rewards,onClose:showResult});
  }catch(e){if(!dead)show(l('購入結果を確認してください','Check purchase result','구매 결과를 확인해 주세요'),`<p>${esc((e as Error).message)}</p>`);}
  finally{busy=false;if(!dead)updateControls();}
 }
 function render(){
  stopSamples();
  host.innerHTML=`<section class="gacha-page gacha-table" aria-label="${l('ガチャ','Gacha','뽑기')}">
   <header class="gacha-table-heading"><h2>${label()}</h2></header>
   <div class="gacha-table-fan" aria-hidden="true">${Array.from({length:9},(_,i)=>`<img class="gacha-table-card" src="${FRAME_BACK}" alt="" draggable="false" style="--card-x:${9+i*8.1}%;--card-y:${44-Math.sin(i/8*Math.PI)*19}%;--card-angle:${-24+i*4.5}deg;z-index:${i}">`).join('')}<div class="gacha-table-featured"><img src="${artUrl.full('STARTER_CHEST')}" alt="" draggable="false"></div></div>
   <div class="gacha-table-bottom">
    <section class="gacha-table-prizes" aria-label="${l('主な獲得アイテム','Featured rewards','주요 획득 아이템')}"><small>${l('主な獲得アイテム','Featured rewards','주요 획득 아이템')}</small><div class="gacha-table-prize-list">
     <button data-info="starter"><span class="gacha-prize-art gacha-prize-hand">${COLLECTIBLE_STARTERS.slice(0,3).map(sample).join('')}</span><span>${shopRewardCategoryName('starter')}</span></button>
     <button data-info="cosmetic"><span class="gacha-prize-art gacha-prize-hand">${['sleeve:gacha-goldfault','sleeve:gacha-amethyst-cleft','sleeve:gacha-elfweave'].map(sample).join('')}</span><span>${shopRewardCategoryName('cosmetic')}</span></button>
     <button data-info="effect"><span class="gacha-prize-art gacha-prize-effect">${sample('effect:prism-veil')}</span><span>${shopRewardCategoryName('effect')}</span></button>
    </div></section>
    <section class="gacha-table-controls" aria-label="${l('ガチャを回す','Draw from the collection','뽑기')}">
     <div class="gacha-table-links"><button class="lore-button-quiet" data-info="rates">${l('提供割合','Drop rates','제공 확률')} ›</button><button class="lore-button-quiet" data-info="items">${l('ラインナップ','Lineup','라인업')} ›</button><button class="lore-button-quiet" data-info="history">${l('履歴','History','기록')} ›</button></div>
     <div class="gacha-actions">${[1,10].map(n=>`<button data-pull="${n}" class="gacha-draw ${n===10?'gacha-draw-ten':''}" ${busy||!options.draw||balance<n*GACHA_PRICE?'disabled':''}><span>${busy?l('処理中…','Processing…','처리 중…'):l(n+'回引く','Draw '+n,n+'회 뽑기')}</span><b>${homeIcon('shard')}${(n*GACHA_PRICE).toLocaleString()} <small>${l('シャード','Shards','샤드')}</small></b></button>`).join('')}</div>
     <div class="gacha-table-status"><p role="status">${busy?l('抽選結果を確認しています…','Confirming your draw…','추첨 결과를 확인하고 있습니다…'):!options.draw?l('残高を確認しています…','Checking your balance…','잔액을 확인하고 있습니다…'):balance<GACHA_PRICE?l('シャードが不足しています','Not enough Shards','샤드가 부족합니다'):''}</p></div>
    </section>
   </div>
  </section>`;
  host.querySelector<HTMLButtonElement>('[data-info="rates"]')!.onclick=rates;
  host.querySelectorAll<HTMLButtonElement>('[data-info="items"],[data-info="starter"],[data-info="cosmetic"],[data-info="effect"]').forEach(b=>b.onclick=()=>{
   const category=b.dataset.info==='items'?undefined:b.dataset.info as ShopRewardCategory;
   show(category?shopRewardCategoryName(category):l('ラインナップ','Lineup','라인업'),shopLineup(category));dialog!.classList.add('shop-lineup-dialog');visualCleanups.push(mountShopRewardPreviews(dialog!));
  });
  stopSamples=mountShopRewardPreviews(host);
  host.querySelector<HTMLButtonElement>('[data-info="history"]')!.onclick=()=>{
   show(l('履歴','History','기록'),`<p>${l('読み込み中…','Loading…','불러오는 중…')}</p>`);const target=dialog;
   void api.collectionHistory().then(({receipts})=>{if(dead||dialog!==target)return;target!.querySelector('.gacha-dialog-body')!.innerHTML=receipts.length?receipts.map(r=>`<section><h3>${esc(new Date(r.createdAt).toLocaleString())} · ${r.kind==='draw'?l('ガチャ','Gacha','뽑기'):l('購入','Purchase','구매')}</h3>${rewardList(r)}</section>`).join(''):`<p>${l('まだ履歴はありません。','No history yet.','아직 기록이 없습니다.')}</p>`;hydrate(receipts);}).catch(e=>{if(!dead&&dialog===target)target!.querySelector('.gacha-dialog-body')!.textContent=(e as Error).message;});
  };
  host.querySelectorAll<HTMLButtonElement>('[data-pull]').forEach(b=>b.onclick=()=>void draw(Number(b.dataset.pull)));
 }
 render();return()=>{dead=true;clearTimeout(warmTimer);stopSamples();close();host.replaceChildren();};
}
