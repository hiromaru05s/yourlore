import {loungeText as l} from './loungeText';
import {openGachaCinematic} from './gachaCinematic';
import {COLLECTIBLE_STARTERS,GACHA_PRICE,type CollectionResult,type CollectionReceipt} from '../shared/collection';
import {DB,STARTERS} from '../shared/cards';
import {cardName,esc} from '../i18n';
import {artUrl} from './cardArt';
import {api} from '../net/api';
import '../styles/shopGacha.css';
export type GachaVariant=1|2|3;
const name=(id:string)=>cardName({...(STARTERS[id]??DB[id]),uid:id});
const label=()=>l('スターターカード','Starter cards','스타터 카드');
const waiting=()=>l('準備中','Coming soon','준비 중');
const rewardList=(receipt:CollectionReceipt)=>`<p>${l('消費','Spent','사용')} ${receipt.cost} · ${l('還元','Refund','환급')} ${receipt.refund} ${l('シャード','Shards','샤드')}</p><div class="gacha-lineup">${receipt.rewards.map(r=>`<article><img src="${artUrl.sm(r.id)}" alt=""><strong>${esc(name(r.id))}</strong><small>${r.refund?`+${r.refund} `+l('シャード還元','Shards refunded','샤드 환급'):l('獲得','Acquired','획득')} · ${l('所持','Owned','보유')} ${r.owned}/8</small></article>`).join('')}</div>`;
export function mountShopGacha(host:HTMLElement,options:{variant?:GachaVariant;credits:number;draw?:(count:number)=>Promise<CollectionResult>}):()=>void {
 let dead=false,busy=false,balance=options.credits,dialog:HTMLDialogElement|undefined,stopCinematic:(()=>void)|undefined,focus:HTMLElement|null=null;
 const close=()=>{stopCinematic?.();stopCinematic=undefined;dialog?.close();dialog?.remove();dialog=undefined;if(focus?.isConnected)focus.focus();};
 function show(title:string,body:string){
  close();focus=document.activeElement as HTMLElement;dialog=document.createElement('dialog');dialog.className='gacha-dialog';dialog.setAttribute('aria-labelledby','gacha-dialog-title');
  dialog.innerHTML=`<header><small>BIBLION / GACHA</small><button data-close aria-label="${l('閉じる','Close','닫기')}">×</button><h2 id="gacha-dialog-title">${title}</h2></header><div class="gacha-dialog-body">${body}</div><footer><button data-close>${l('閉じる','Close','닫기')}</button></footer>`;
  document.body.append(dialog);dialog.querySelectorAll<HTMLButtonElement>('[data-close]').forEach(b=>b.onclick=close);dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.showModal();
 }
 function rates(){show(l('提供割合','Drop rates','제공 확률'),`<p>${l('現在はスターターカードのみ100%排出。カル・アチューンを除く全種類から、1回ごとに均等な確率で抽選します。','Currently 100% starter cards. Every draw independently selects equally from all starters except Cull and Attune.','현재 스타터 카드만 100% 배출됩니다. 컬·어튠을 제외한 모든 종류에서 매회 동일 확률로 추첨합니다.')}</p><p>${COLLECTIBLE_STARTERS.length}${l('種類・各',' types · each','종 · 각')} 1/${COLLECTIBLE_STARTERS.length} (${(100/COLLECTIBLE_STARTERS.length).toFixed(4)}%)</p><table><tbody><tr><th>${label()}</th><td>100%</td><td>${l('8枚所持済みなら50シャード還元','50 Shards if already owning 8','8장 보유 시 50샤드 환급')}</td></tr><tr><th>${l('カードスリーブ、デッキ置き場＆墓地','Card sleeves, deck holder & graveyard','카드 슬리브, 덱 받침 & 묘지')}</th><td>0%</td><td>${waiting()}</td></tr><tr><th>${l('エフェクト','Effects','이펙트')}</th><td>0%</td><td>${waiting()}</td></tr></tbody></table><p>${l('景品追加後の予定：スターター90%（8枚所持済みなら50還元）、カードスリーブ・デッキ置き場＆墓地9.5%（重複100還元）、エフェクト0.5%（重複500還元）。現在は適用されません。','Planned after new rewards: starters 90% (50 refunded at 8 owned), sleeves / deck holder & graveyard 9.5% (100 for duplicates), effects 0.5% (500 for duplicates). These rates are not active yet.','경품 추가 후 예정: 스타터 90%(8장 보유 시 50환급), 슬리브·덱 받침 & 묘지 9.5%(중복 100환급), 이펙트 0.5%(중복 500환급). 현재는 적용되지 않습니다.')}</p>`);}
 async function draw(count:number){
  if(busy||!options.draw)return;busy=true;render();
  try{
   const result=await options.draw(count);if(dead)return;balance=result.credits;
   close();focus=host.querySelector(`[data-pull="${count}"]`);
   const showResult=()=>show(l('獲得結果','Draw results','획득 결과'),rewardList(result.receipt));
   stopCinematic=openGachaCinematic({count,edition:'ivory',rewards:result.receipt.rewards,onClose:showResult});
  }catch(e){if(!dead)show(l('購入結果を確認してください','Check purchase result','구매 결과를 확인해 주세요'),`<p>${esc((e as Error).message)}</p>`);}
  finally{busy=false;if(!dead)render();}
 }
 function render(){
  host.innerHTML=`<section class="gacha-page gacha-v2" data-edition="ivory" aria-label="${l('ガチャ','Gacha','뽑기')}"><div class="gacha-editions"><button aria-pressed="true"><span><small>01 / STANDARD</small><b>${label()}</b></span></button><button disabled><span><small>02 / ${waiting()}</small><b>${l('カードスリーブ、デッキ置き場＆墓地','Card sleeves, deck holder & graveyard','카드 슬리브, 덱 받침 & 묘지')}</b></span></button><button disabled><span><small>03 / ${waiting()}</small><b>${l('エフェクト','Effects','이펙트')}</b></span></button></div>
   <div class="gacha-stage"><div class="gacha-stage-art" aria-hidden="true"></div><div class="gacha-copy"><div class="gacha-kicker"><span>${l('常設ガチャ','STANDARD GACHA','상시 뽑기')}</span></div><p class="gacha-english">STARTER COLLECTION</p><h2>${label()}</h2><p class="gacha-poem">${l('新しい一枚で、デッキを広げよう。','Discover new cards for your deck.','새로운 한 장으로 덱을 넓혀 보세요.')}</p><div class="gacha-feature"><span>100%</span><strong>${l('現在はスターターカードのみ','Currently starter cards only','현재 스타터 카드만 배출')}</strong></div></div>
   <button class="gacha-artwork" data-info="items" aria-label="${l('排出カード一覧','Card lineup','카드 목록')}"><span class="gacha-halo"></span>${[COLLECTIBLE_STARTERS[1],COLLECTIBLE_STARTERS[2],COLLECTIBLE_STARTERS[0]].map((id,i)=>`<img class="gacha-card gacha-card-${['left','right','main'][i]}" src="${artUrl.sm(id)}" alt="${esc(name(id))}">`).join('')}<span class="gacha-art-caption">${label()}<i>↗</i></span></button>
   <div class="gacha-guarantee"><b>${l('同じカードを8枚所持済みなら50シャード還元','50 Shards refunded when you already own 8 copies','동일 카드 8장 보유 시 50샤드 환급')}</b></div></div>
   <footer class="gacha-footer"><div class="gacha-meta"><div class="gacha-links"><button data-info="rates">${l('提供割合','Drop rates','제공 확률')}</button><button data-info="items">${l('一覧','Lineup','목록')}</button><button data-info="history">${l('履歴','History','기록')}</button></div><small>${l('各カード均等・10回も同じ確率','Equal per-card odds · Same odds for ten draws','각 카드 동일 확률 · 10회도 같은 확률')}</small></div><div class="gacha-actions">${[1,10].map(n=>`<button data-pull="${n}" class="gacha-draw ${n===10?'gacha-draw-ten':''}" ${busy||!options.draw||balance<n*GACHA_PRICE?'disabled':''}><span>${busy?l('処理中…','Processing…','처리 중…'):n+l('回プレイ',' draw'+(n===1?'':'s'),'회 뽑기')}</span><b>${(n*GACHA_PRICE).toLocaleString()} <small>${l('シャード','Shards','샤드')}</small></b></button>`).join('')}</div></footer></section>`;
  host.querySelector<HTMLButtonElement>('[data-info="rates"]')!.onclick=rates;
  host.querySelectorAll<HTMLButtonElement>('[data-info="items"]').forEach(b=>b.onclick=()=>show(l('排出カード一覧','Card lineup','카드 목록'),`<div class="gacha-lineup">${COLLECTIBLE_STARTERS.map(id=>`<article><img src="${artUrl.sm(id)}" alt=""><strong>${esc(name(id))}</strong><small>1/${COLLECTIBLE_STARTERS.length}</small></article>`).join('')}</div>`));
  host.querySelector<HTMLButtonElement>('[data-info="history"]')!.onclick=()=>{
   show(l('履歴','History','기록'),`<p>${l('読み込み中…','Loading…','불러오는 중…')}</p>`);const target=dialog;
   void api.collectionHistory().then(({receipts})=>{if(dead||dialog!==target)return;target!.querySelector('.gacha-dialog-body')!.innerHTML=receipts.length?receipts.map(r=>`<section><h3>${esc(new Date(r.createdAt).toLocaleString())} · ${r.kind==='draw'?l('ガチャ','Gacha','뽑기'):l('購入','Purchase','구매')}</h3>${rewardList(r)}</section>`).join(''):`<p>${l('まだ履歴はありません。','No history yet.','아직 기록이 없습니다.')}</p>`;}).catch(e=>{if(!dead&&dialog===target)target!.querySelector('.gacha-dialog-body')!.textContent=(e as Error).message;});
  };
  host.querySelectorAll<HTMLButtonElement>('[data-pull]').forEach(b=>b.onclick=()=>void draw(Number(b.dataset.pull)));
 }
 render();return()=>{dead=true;close();host.replaceChildren();};
}
