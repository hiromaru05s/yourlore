import {STARTER_PRICE,type StarterCollection,type DailyStarterShop} from '../shared/collection';
import {DB,STARTERS} from '../shared/cards';
import {cardEl} from './cardView';
import {bindZoom,zoomCard} from './cardInspection';
import {cardName,esc} from '../i18n';
import {loungeText as l} from './loungeText';

export function confirmStarterPurchase(id:string,count:number,buy:()=>void,price=STARTER_PRICE):()=>void {
 const previous=document.activeElement as HTMLElement|null,dialog=document.createElement('dialog');
 const name=cardName({...(STARTERS[id]??DB[id]),uid:'purchase'});
 dialog.className='starter-purchase-dialog';dialog.setAttribute('aria-labelledby','starterPurchaseTitle');
 dialog.innerHTML=`<h2 id="starterPurchaseTitle">${l('購入を確定しますか？','Confirm purchase?','구매하시겠습니까?')}</h2><p>${esc(name)} × ${count}</p><p>${l('合計','Total','합계')} <strong>${(price*count).toLocaleString()} ${l('シャード','Shards','샤드')}</strong></p><div class="modal-row"><button class="btn btn-ghost" data-purchase-no>NO</button><button class="btn btn-gold" data-purchase-yes>YES</button></div>`;
 let closed=false;
 const close=()=>{if(closed)return;closed=true;dialog.close();dialog.remove();if(previous?.isConnected)previous.focus();};
 dialog.querySelector<HTMLButtonElement>('[data-purchase-no]')!.onclick=close;
 dialog.querySelector<HTMLButtonElement>('[data-purchase-yes]')!.onclick=()=>{if(closed)return;close();buy();};
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 dialog.onclick=e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}};
 document.body.append(dialog);dialog.showModal();dialog.querySelector<HTMLButtonElement>('[data-purchase-no]')!.focus();return close;
}

export function renderShopStarters(host:HTMLElement,owned:StarterCollection,credits:number,busy:boolean,buy:(id:string,count:number)=>void,daily?:DailyStarterShop,freeFirst=false){
 host.innerHTML=`<p class="starter-shop-date">${daily?`${daily.day} · ${l('本日のラインナップ','Today’s lineup','오늘의 라인업')}`:l('商品を読み込み中…','Loading today’s cards…','상품 불러오는 중…')}</p><div class="starter-shop-grid"></div>`;
 const grid=host.querySelector('.starter-shop-grid')!;
 for(const id of daily?.cards??[]){
  const c={...(STARTERS[id]??DB[id]),uid:'shop-'+id},tile=document.createElement('article');tile.className='starter-shop-item';
  const face=document.createElement('button');face.className='starter-shop-face';face.setAttribute('aria-label',cardName(c));face.append(cardEl(c,{size:'mkt'}));face.onclick=()=>zoomCard(c);bindZoom(face,c);
  const count=document.createElement('span');count.textContent=l('所持','Owned','보유')+` ${owned[id]??0}/8`;
  const remaining=daily?.remaining[id]??0;
  const stock=document.createElement('span');stock.textContent=l('本日の残り','Remaining today','오늘 남은 수량')+` ${remaining}/2`;
  const free=freeFirst&&id===daily?.cards[0];
  const max=free?1:Math.max(0,Math.min(remaining,8-(owned[id]??0),Math.floor(credits/STARTER_PRICE)));
  const quantity=document.createElement('label');quantity.className='starter-shop-quantity';quantity.textContent=l('数量','Quantity','수량');
  const select=document.createElement('select');select.dataset.starterQuantity=id;select.setAttribute('aria-label',cardName(c)+' '+l('購入数量','quantity','구매 수량'));select.disabled=busy||max===0;
  for(let n=1;n<=Math.max(1,max);n++){const option=document.createElement('option');option.value=String(n);option.textContent=String(n);select.append(option);}quantity.append(select);
  const button=document.createElement('button');button.className='btn btn-gold';button.dataset.buyStarter=id;button.disabled=busy||max===0;
  const update=()=>{button.textContent=free?l('今回だけ購入 · 0 シャード','One-time purchase · 0 Shards','이번만 구매 · 0 샤드'):remaining===0?l('本日分は売り切れ','Sold out today','오늘 품절'):(owned[id]??0)>=8?l('8枚所持済み','8 owned','8장 보유'):l('購入','Buy','구매')+` · ${(STARTER_PRICE*Number(select.value)).toLocaleString()} `+l('シャード','Shards','샤드');};
  select.onchange=update;update();button.onclick=()=>buy(id,Number(select.value));
  tile.append(face,count,stock,quantity,button);grid.append(tile);
 }
}
