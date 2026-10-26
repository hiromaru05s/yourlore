import {CARD_FRAMES} from '../shared/cardFrames';
import {STARTERS} from '../shared/cards';
import {getLang,esc} from '../i18n';
import {cardEl} from './cardView';
import {bindZoom,zoomCard} from './cardInspection';
import {disposeCardFrames} from './cardFrame';
import {loungeText as l} from './loungeText';
import '../styles/shopFrames.css';
export function confirmFramePurchase(id:string,buy:()=>void){
 const item=CARD_FRAMES.find(x=>x.id===id)!;
 const previous=document.activeElement as HTMLElement|null,dialog=document.createElement('dialog');dialog.className='starter-purchase-dialog';dialog.setAttribute('aria-labelledby','framePurchaseTitle');
 dialog.innerHTML=`<h2 id="framePurchaseTitle">${l('購入を確定しますか？','Confirm purchase?','구매하시겠습니까?')}</h2><p>${esc(item[getLang()])}</p><p><strong>${item.price.toLocaleString()} ${l('シャード','Shards','샤드')}</strong></p><p>${l('購入後、デッキ編成の「外観」で設定できます。','Equip it in Deck → Appearance after purchase.','구매 후 덱 편성의 외형에서 설정할 수 있습니다.')}</p><div class="modal-row"><button class="btn btn-ghost" data-frame-no>NO</button><button class="btn btn-gold" data-frame-yes>YES</button></div>`;
 let closed=false;const close=()=>{if(closed)return;closed=true;dialog.close();dialog.remove();if(previous?.isConnected)previous.focus();};
 dialog.querySelector<HTMLButtonElement>('[data-frame-no]')!.onclick=close;dialog.querySelector<HTMLButtonElement>('[data-frame-yes]')!.onclick=()=>{if(closed)return;close();buy();};dialog.addEventListener('cancel',e=>{e.preventDefault();close();});document.body.append(dialog);dialog.showModal();dialog.querySelector<HTMLButtonElement>('[data-frame-no]')!.focus();return close;
}
export function mountShopFrames(host:HTMLElement,buy:(id:string)=>void){
 host.innerHTML=`<div class="frame-shop-heading"><h3>${l('カードフレーム','Card frames','카드 프레임')}</h3><small>${l('表示モデル：アチューン · 購入したフレームはデッキ編成の「外観」で設定','Model: Attune · Equip purchased frames in Deck → Appearance','표시 모델: 어튠 · 구매한 프레임은 덱 편성의 외형에서 설정')}</small></div><div class="frame-shop-grid"></div>`;
 const grid=host.querySelector('.frame-shop-grid')!;
 for(const item of CARD_FRAMES){
  const tile=document.createElement('article');tile.className='frame-shop-item';tile.dataset.frameItem=item.id;
  const c={...STARTERS.STARTER_MANA,uid:'frame-shop-'+item.id},face=document.createElement('button');face.className='starter-shop-face frame-shop-face';face.setAttribute('aria-label',item[getLang()]);face.append(cardEl(c,{fullArt:true,effect:'default',frame:item.id}));face.onclick=()=>zoomCard(c,undefined,undefined,'default',item.id);bindZoom(face,c,undefined,undefined,'default',item.id);
  const name=document.createElement('h4');name.textContent=item[getLang()];const price=document.createElement('p');price.className='frame-shop-price';price.textContent=`${item.price.toLocaleString()} ${l('シャード','Shards','샤드')}`;
  const button=document.createElement('button');button.className='btn btn-gold';button.dataset.buyFrame=item.id;button.onclick=()=>buy(item.id);tile.append(face,name,price,button);grid.append(tile);
 }
 return {update(owned:Set<string>,credits:number,busy:boolean){for(const item of CARD_FRAMES){const button=host.querySelector<HTMLButtonElement>(`[data-buy-frame="${item.id}"]`)!;const has=owned.has(item.id);button.disabled=busy||has||credits<item.price;button.textContent=has?l('所持済み','Owned','보유 중'):credits<item.price?l('シャード不足','Not enough Shards','샤드 부족'):l('購入','Buy','구매');}},dispose(){disposeCardFrames(host);host.replaceChildren();}};
}
