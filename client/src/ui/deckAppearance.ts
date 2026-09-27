import {SLEEVE_LIST,type DeckPreset} from '../shared/cards';
import {FURNITURE_LIST} from '../shared/cosmetics';
import {getLang,esc} from '../i18n';
import {loungeText} from './loungeText';
export function renderDeckAppearance(host:HTMLElement,options:{deck:DeckPreset;name:string;owned:Set<string>|null;error:boolean;onPick:(kind:'sleeve'|'furniture',id:string)=>void;onShop:()=>void;onRetry:()=>void}){
 const {deck,name,owned,error,onPick,onShop,onRetry}=options;
 host.innerHTML=`<header class="deck-appearance-head"><div><h3>${esc(name)} · ${loungeText('外観','Appearance','외형')}</h3><p>${loungeText('このデッキのカード構成と一緒に保存されます。','Saved together with this deck’s cards.','이 덱의 카드 구성과 함께 저장됩니다.')}</p></div><button class="btn btn-ghost" data-cosmetic-shop>${loungeText('ショップ','Shop','상점')}</button></header><div class="deck-cosmetic-status" role="status">${error?loungeText('所持アイテムを読み込めませんでした。','Could not load owned items.','보유 아이템을 불러오지 못했습니다.'):!owned?loungeText('所持アイテムを確認中…','Loading owned items…','보유 아이템 확인 중…'):''}${error?` <button class="btn btn-mini" data-cosmetic-retry>${loungeText('再試行','Retry','재시도')}</button>`:''}</div><div class="deck-appearance-groups"></div>`;
 const groups=host.querySelector('.deck-appearance-groups')!;
 for(const kind of ['sleeve','furniture'] as const){
  const title=kind==='sleeve'?loungeText('スリーブ','Sleeve','슬리브'):loungeText('デッキ置き場 ＆ シェルフ','Deck holder & shelf','덱 받침 & 선반');
  const list=kind==='sleeve'?SLEEVE_LIST:[{id:'default',ja:'デフォルト',en:'Default',ko:'기본',url:''},...FURNITURE_LIST];
  const section=document.createElement('section');section.className='deck-cosmetic-group';section.setAttribute('aria-label',title);
  section.innerHTML=`<h4>${title}</h4><div class="deck-cosmetic-grid">${list.map(item=>{
   const selected=deck[kind]===item.id,unlocked=!!owned?.has(item.id),label=item[getLang()];
   return `<button type="button" class="deck-cosmetic ${selected?'is-selected':''}" data-cosmetic-kind="${kind}" data-cosmetic-id="${item.id}" aria-pressed="${selected}" aria-label="${esc(label)}" ${unlocked?'':'disabled'}><span class="deck-cosmetic-art ${kind==='furniture'?'furniture-preview':'sleeve-preview'}" style="${item.url?`background-image:url('${item.url}')`:''}"></span><span class="deck-cosmetic-name">${esc(label)}</span><span class="deck-cosmetic-state">${selected?loungeText('選択中','Selected','선택됨'):unlocked?loungeText('選択する','Select','선택'):loungeText('ショップで入手','Get in shop','상점에서 획득')}</span></button>`;
  }).join('')}</div>`;
  section.querySelectorAll<HTMLButtonElement>('[data-cosmetic-id]').forEach(b=>b.onclick=()=>onPick(kind,b.dataset.cosmeticId!));groups.append(section);
 }
 host.querySelector<HTMLButtonElement>('[data-cosmetic-shop]')!.onclick=onShop;
 const retry=host.querySelector<HTMLButtonElement>('[data-cosmetic-retry]');if(retry)retry.onclick=onRetry;
}
