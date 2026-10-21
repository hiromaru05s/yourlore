import {GACHA_COSMETICS} from '../shared/cosmetics';
import {mountRewardGallery,mountRewardStage} from './gachaRewardStage';
import {CARD_EFFECTS} from '../shared/cardEffects';
import {loungeText as l} from './loungeText';
import {openGachaCinematic} from './gachaCinematic';
import {COLLECTIBLE_STARTERS,GACHA_PRICE,type CollectionResult,type CollectionReceipt} from '../shared/collection';
import {DB,STARTERS} from '../shared/cards';
import {cardName,esc,getLang} from '../i18n';
import {artUrl} from './cardArt';
import {api} from '../net/api';
import '../styles/shopGacha.css';
export type GachaVariant=1|2|3;
const name=(id:string)=>cardName({...(STARTERS[id]??DB[id]),uid:id});
const label=()=>l('ビブリオンのコレクション','Biblion Collection','비블리온 컬렉션');
const rewardList=(receipt:CollectionReceipt)=>`<div class="reward-results-summary"><span>${l('消費','Spent','사용')} <strong>${receipt.cost}</strong> ${l('シャード','Shards','샤드')}</span><span>${l('重複還元','Duplicate refund','중복 환급')} <strong>+${receipt.refund}</strong></span><span>${receipt.rewards.length} ${l('個の結果','results','개 결과')}</span></div><div data-receipt="${esc(receipt.requestId)}"></div>`;
const cosmeticRate=()=>String(7/GACHA_COSMETICS.length);
const sleeveCount=()=>GACHA_COSMETICS.filter(c=>c.kind==='sleeve').length;
const furnitureCount=()=>GACHA_COSMETICS.filter(c=>c.kind==='furniture').length;
const rateDetails=()=>`<table><tbody><tr><th>${l('スターター','Starter','스타터')}</th><td>92.5%</td></tr><tr><th>${l('スリーブ・デッキ置き場＆墓地','Sleeves & deck holder / graveyard','슬리브·덱 받침 & 묘지')}</th><td>7%</td></tr><tr><th>${l('エフェクト3種（均等）','3 effects (equal odds)','이펙트 3종 (동일 확률)')}</th><td>0.5%</td></tr></tbody></table><p>${l(`スリーブ${sleeveCount()}種とデッキ置き場＆墓地${furnitureCount()}種は別々に排出、各${cosmeticRate()}%。スターターは各種類均等、エフェクトは各1/600（約0.1667%）。10回も1回ずつ同じ抽選です。`,`${sleeveCount()} sleeves and ${furnitureCount()} deck holder/graveyard items drop separately at ${cosmeticRate()}% each. Starters have equal per-type odds. Each effect: 1/600 (about 0.1667%). Ten draws use the same independent odds.`,`슬리브 ${sleeveCount()}종과 덱 받침·묘지 ${furnitureCount()}종은 별도 배출되며 각각 ${cosmeticRate()}%. 스타터는 종류별 동일 확률, 각 이펙트는 1/600 (약 0.1667%). 10회도 매회 같은 추첨입니다.`)}</p><p>${l('重複還元：スターター8枚所持時50／スリーブ・家具100／エフェクト500シャード。','Duplicates: 50 Shards for starters at 8 copies / 100 for owned sleeves or furniture / 500 for owned effects.','중복 환급: 스타터 8장 보유 시 50 / 보유 슬리브·가구 100 / 이펙트 500샤드.')}</p>`;
export function mountShopGacha(host:HTMLElement,options:{variant?:GachaVariant;credits:number;draw?:(count:number)=>Promise<CollectionResult>}):()=>void {
 let visualCleanups:Array<()=>void>=[];
 let dead=false,busy=false,balance=options.credits,dialog:HTMLDialogElement|undefined,stopCinematic:(()=>void)|undefined,focus:HTMLElement|null=null;
 const close=()=>{visualCleanups.splice(0).forEach(f=>f());stopCinematic?.();stopCinematic=undefined;dialog?.close();dialog?.remove();dialog=undefined;const restore=focus?.isConnected?focus:focus?.dataset.pull?host.querySelector<HTMLButtonElement>(`[data-pull="${focus.dataset.pull}"]`):null;restore?.focus();};
 function show(title:string,body:string,receipts:CollectionReceipt[]=[]){
  close();focus=document.activeElement as HTMLElement;dialog=document.createElement('dialog');dialog.className='gacha-dialog';dialog.setAttribute('aria-labelledby','gacha-dialog-title');
  dialog.innerHTML=`<header><small>BIBLION / GACHA</small><button data-close aria-label="${l('閉じる','Close','닫기')}">×</button><h2 id="gacha-dialog-title">${title}</h2></header><div class="gacha-dialog-body">${body}</div><footer><button data-close>${l('閉じる','Close','닫기')}</button></footer>`;
  document.body.append(dialog);dialog.querySelectorAll<HTMLButtonElement>('[data-close]').forEach(b=>b.onclick=close);dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.showModal();hydrate(receipts);
 }
 function hydrate(receipts:CollectionReceipt[]){
  for(const host of dialog?.querySelectorAll<HTMLElement>('[data-receipt]')??[]){const receipt=receipts.find(r=>r.requestId===host.dataset.receipt);if(!receipt)continue;dialog!.classList.add('reward-results-dialog');visualCleanups.push(mountRewardGallery(host,receipt.rewards,index=>{
   show(l('獲得アイテム','Acquired item','획득 아이템'),`<button class="btn" data-overview>← ${l('結果一覧','All results','결과 목록')}</button><div class="reward-detail-host"></div>`);dialog!.classList.add('reward-results-dialog');visualCleanups.push(mountRewardStage(dialog!.querySelector('.reward-detail-host')!,receipt.rewards,{index}));dialog!.querySelector<HTMLButtonElement>('[data-overview]')!.onclick=()=>showResults(receipt);
  }));}
 }
 function showResults(receipt:CollectionReceipt){show(l('獲得結果','Draw results','획득 결과'),rewardList(receipt),[receipt]);}
 function rates(){show(l('提供割合','Drop rates','제공 확률'),rateDetails());}
 async function draw(count:number){
  if(busy||!options.draw)return;busy=true;render();
  try{
   const result=await options.draw(count);if(dead)return;balance=result.credits;
   close();focus=host.querySelector(`[data-pull="${count}"]`);
   const showResult=()=>showResults(result.receipt);
   stopCinematic=openGachaCinematic({count,edition:'ivory',rewards:result.receipt.rewards,onClose:showResult});
  }catch(e){if(!dead)show(l('購入結果を確認してください','Check purchase result','구매 결과를 확인해 주세요'),`<p>${esc((e as Error).message)}</p>`);}
  finally{busy=false;if(!dead)render();}
 }
 function render(){
  host.innerHTML=`<section class="gacha-page gacha-v2" data-edition="ivory" aria-label="${l('ガチャ','Gacha','뽑기')}">
   <div class="gacha-stage"><div class="gacha-stage-art" aria-hidden="true"></div><div class="gacha-copy"><div class="gacha-kicker"><span>${l('常設ガチャ','STANDARD GACHA','상시 뽑기')}</span></div><p class="gacha-english">STARTER COLLECTION</p><h2>${label()}</h2><p class="gacha-poem">${l('新しい一枚で、デッキを広げよう。','Discover new cards for your deck.','새로운 한 장으로 덱을 넓혀 보세요.')}</p><div class="gacha-feature"><span>92.5% / 7% / 0.5%</span><strong>${l('スターター / スリーブ・家具 / エフェクト','Starters / Sleeves & furniture / Effects','스타터 / 슬리브·가구 / 이펙트')}</strong></div></div>
   <button class="gacha-artwork" data-info="items" aria-label="${l('排出カード一覧','Card lineup','카드 목록')}"><span class="gacha-halo"></span>${[COLLECTIBLE_STARTERS[1],COLLECTIBLE_STARTERS[2],COLLECTIBLE_STARTERS[0]].map((id,i)=>`<img class="gacha-card gacha-card-${['left','right','main'][i]}" src="${artUrl.sm(id)}" alt="${esc(name(id))}">`).join('')}<span class="gacha-art-caption">${label()}<i>↗</i></span></button>
   <div class="gacha-guarantee"><b>${l('同じカードを8枚所持済みなら50シャード還元','50 Shards refunded when you already own 8 copies','동일 카드 8장 보유 시 50샤드 환급')}</b></div></div>
   <footer class="gacha-footer"><div class="gacha-meta"><div class="gacha-links"><button data-info="rates">${l('提供割合','Drop rates','제공 확률')}</button><button data-info="items">${l('一覧','Lineup','목록')}</button><button data-info="history">${l('履歴','History','기록')}</button></div><small>${l('提供割合を確認のうえプレイしてください','Review the drop rates before drawing','제공 확률을 확인한 후 뽑아 주세요')}</small></div><div class="gacha-actions">${[1,10].map(n=>`<button data-pull="${n}" class="gacha-draw ${n===10?'gacha-draw-ten':''}" ${busy||!options.draw||balance<n*GACHA_PRICE?'disabled':''}><span>${busy?l('処理中…','Processing…','처리 중…'):n+l('回プレイ',' draw'+(n===1?'':'s'),'회 뽑기')}</span><b>${(n*GACHA_PRICE).toLocaleString()} <small>${l('シャード','Shards','샤드')}</small></b></button>`).join('')}</div></footer></section>`;
  host.querySelector<HTMLButtonElement>('[data-info="rates"]')!.onclick=rates;
  host.querySelectorAll<HTMLButtonElement>('[data-info="items"]').forEach(b=>b.onclick=()=>show(l('排出カード一覧','Card lineup','카드 목록'),`<div class="gacha-lineup">${GACHA_COSMETICS.map(e=>`<article><img src="${e.url}" alt=""><strong>${esc(e[getLang()])}</strong><small>${(7/GACHA_COSMETICS.length).toFixed(4)}%</small></article>`).join('')}${CARD_EFFECTS.map(e=>`<article><img src="${e.url}" alt=""><strong>${esc(e[getLang()])}</strong><small>1/600 ≈ 0.1667%</small></article>`).join('')}${COLLECTIBLE_STARTERS.map(id=>`<article><img src="${artUrl.sm(id)}" alt=""><strong>${esc(name(id))}</strong><small>${(92.5/COLLECTIBLE_STARTERS.length).toFixed(4)}%</small></article>`).join('')}</div>`));
  host.querySelector<HTMLButtonElement>('[data-info="history"]')!.onclick=()=>{
   show(l('履歴','History','기록'),`<p>${l('読み込み中…','Loading…','불러오는 중…')}</p>`);const target=dialog;
   void api.collectionHistory().then(({receipts})=>{if(dead||dialog!==target)return;target!.querySelector('.gacha-dialog-body')!.innerHTML=receipts.length?receipts.map(r=>`<section><h3>${esc(new Date(r.createdAt).toLocaleString())} · ${r.kind==='draw'?l('ガチャ','Gacha','뽑기'):l('購入','Purchase','구매')}</h3>${rewardList(r)}</section>`).join(''):`<p>${l('まだ履歴はありません。','No history yet.','아직 기록이 없습니다.')}</p>`;hydrate(receipts);}).catch(e=>{if(!dead&&dialog===target)target!.querySelector('.gacha-dialog-body')!.textContent=(e as Error).message;});
  };
  host.querySelectorAll<HTMLButtonElement>('[data-pull]').forEach(b=>b.onclick=()=>void draw(Number(b.dataset.pull)));
 }
 render();return()=>{dead=true;close();host.replaceChildren();};
}
