import {COLLECTIBLE_STARTERS,STARTER_PRICE,type StarterCollection} from '../shared/collection';
import {DB,STARTERS} from '../shared/cards';
import {cardEl} from './cardView';
import {zoomCard} from './anim';
import {cardName} from '../i18n';
import {loungeText as l} from './loungeText';
export function renderShopStarters(host:HTMLElement,owned:StarterCollection,credits:number,busy:boolean,buy:(id:string)=>void){
 host.innerHTML=`<p class="set-desc">${l('初期所持：カル8枚・アチューン1枚・宝箱2枚。その他のスターターは購入またはガチャで集められます。','Initially owned: 8 Cull, 1 Attune and 2 Treasure Chests. Collect other starters through purchases or gacha.','초기 보유: 컬 8장·어튠 1장·보물상자 2장. 나머지 스타터는 구매 또는 뽑기로 수집합니다.')}</p><div class="starter-shop-grid"></div>`;
 const grid=host.querySelector('.starter-shop-grid')!;
 for(const id of COLLECTIBLE_STARTERS){
  const c={...(STARTERS[id]??DB[id]),uid:'shop-'+id},tile=document.createElement('article');tile.className='starter-shop-item';
  const face=document.createElement('button');face.className='starter-shop-face';face.setAttribute('aria-label',cardName(c));face.append(cardEl(c,{size:'mkt',playable:true}));face.onclick=()=>zoomCard(c);
  const count=document.createElement('span');count.textContent=l('所持','Owned','보유')+` ${owned[id]??0}/8`;
  const button=document.createElement('button');button.className='btn btn-gold';button.dataset.buyStarter=id;button.disabled=busy||(owned[id]??0)>=8||credits<STARTER_PRICE;
  button.textContent=(owned[id]??0)>=8?l('8枚所持済み','8 owned','8장 보유'):l('購入','Buy','구매')+` · ${STARTER_PRICE} `+l('シャード','Shards','샤드');button.onclick=()=>buy(id);
  tile.append(face,count,button);grid.append(tile);
 }
}
