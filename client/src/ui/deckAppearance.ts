import {CARD_FRAMES} from '../shared/cardFrames';
import {disposeCardFrames} from './cardFrame';
import {disposeCardEffects} from './cardFinish';
import '../styles/deckAppearance.css';
import '../styles/shopFrames.css';
import {CARD_EFFECTS} from '../shared/cardEffects';
import {cardEl} from './cardView';
import {bindZoom,zoomCard} from './cardInspection';
import {STARTERS} from '../shared/cards';
import {SLEEVE_LIST,type DeckPreset} from '../shared/cards';
import {FURNITURE_LIST,cosmetic} from '../shared/cosmetics';
import {getLang,esc} from '../i18n';
import {loungeText} from './loungeText';
export function renderDeckAppearance(host:HTMLElement,options:{deck:DeckPreset;name:string;owned:Set<string>|null;error:boolean;onPick:(kind:'sleeve'|'furniture'|'effect'|'frame',id:string)=>void;onShop:()=>void;onRetry:()=>void}){
 const {deck,name,owned,error,onPick,onShop,onRetry}=options;
 disposeCardFrames(host);
 disposeCardEffects(host);
 host.innerHTML=`<header class="deck-appearance-head"><div><h3>${esc(name)} · ${loungeText('外観','Appearance','외형')}</h3><p>${loungeText('このデッキのカード構成と一緒に保存されます。','Saved together with this deck’s cards.','이 덱의 카드 구성과 함께 저장됩니다.')}</p></div><button class="btn btn-ghost" data-cosmetic-shop>${loungeText('ショップ','Shop','상점')}</button></header><div class="deck-cosmetic-status" role="status">${error?loungeText('所持アイテムを読み込めませんでした。','Could not load owned items.','보유 아이템을 불러오지 못했습니다.'):!owned?loungeText('所持アイテムを確認中…','Loading owned items…','보유 아이템 확인 중…'):''}${error?` <button class="btn btn-mini" data-cosmetic-retry>${loungeText('再試行','Retry','재시도')}</button>`:''}</div><figure class="deck-appearance-preview"><figcaption>${loungeText('見本カード','Preview card','미리보기 카드')}</figcaption></figure><div class="deck-appearance-groups"></div>`;
 const card={...STARTERS.STARTER_MANA,uid:'appearance-preview'};
 const preview=cardEl(card,{size:'mkt',effect:deck.effect,frame:deck.frame});
 bindZoom(preview,card,undefined,undefined,deck.effect,deck.frame);
 preview.tabIndex=0;preview.setAttribute('role','button');
 preview.setAttribute('aria-label',loungeText('見本カードを拡大','Enlarge preview card','미리보기 카드 확대'));
 preview.onclick=()=>zoomCard(card,undefined,undefined,deck.effect,deck.frame);
 preview.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();preview.click();}};
 host.querySelector('.deck-appearance-preview')!.append(preview);
 const groups=host.querySelector('.deck-appearance-groups')!;
 for(const kind of ['frame','effect','sleeve','furniture'] as const){
  const title=kind==='frame'?loungeText('カードフレーム','Card frame','카드 프레임'):kind==='effect'?loungeText('カードエフェクト','Card effect','카드 이펙트'):kind==='sleeve'?loungeText('スリーブ','Sleeve','슬리브'):loungeText('デッキ置き場 ＆ 墓地','Deck holder & graveyard','덱 받침 & 묘지');
  const list=kind==='frame'?[{id:'default',ja:'通常の白枠',en:'Original frame',ko:'기본 프레임',url:''},...CARD_FRAMES]:kind==='effect'?[{id:'default',ja:'なし',en:'None',ko:'없음',url:''},...CARD_EFFECTS]:kind==='sleeve'?SLEEVE_LIST:[{id:'default',ja:'デフォルト',en:'Default',ko:'기본',url:''},...FURNITURE_LIST];
  const section=document.createElement('section');section.className='deck-cosmetic-group';section.dataset.kind=kind;section.setAttribute('aria-label',title);
  section.innerHTML=`<h4>${title}</h4><div class="deck-cosmetic-grid">${list.map(item=>{
   const selected=(deck[kind]??'default')===item.id,unlocked=!!owned?.has(item.id),label=item[getLang()];
   return `<button type="button" class="deck-cosmetic ${selected?'is-selected':''}" data-cosmetic-kind="${kind}" data-cosmetic-id="${item.id}" aria-pressed="${selected}" aria-label="${esc(label)}" ${unlocked?'':'disabled'}><span class="deck-cosmetic-art ${kind==='furniture'?'furniture-preview':'sleeve-preview'}" style="${item.url?`background-image:url('${item.url}')`:''}"></span><span class="deck-cosmetic-name">${esc(label)}</span><span class="deck-cosmetic-state">${selected?loungeText('選択中','Selected','선택됨'):unlocked?loungeText('選択する','Select','선택'):(kind==='effect'||('gachaOnly' in (cosmetic(item.id)??{})))?loungeText('ガチャで入手','Get in gacha','뽑기로 획득'):loungeText('ショップで入手','Get in shop','상점에서 획득')}</span></button>`;
  }).join('')}</div>`;
  if(kind==='frame'){
   const scope=document.createElement('p');scope.className='deck-frame-scope';scope.textContent=loungeText('スターター・対戦中の購入カードを含む全カードに適用。プレイ後もフレームが続きます。','Applies to the whole deck, including starters and cards bought during a duel. Frames remain after play.','스타터와 대전 중 구매한 카드를 포함한 모든 카드에 적용되며 플레이 후에도 유지됩니다.');section.querySelector('h4')!.after(scope);
   section.querySelectorAll<HTMLElement>('[data-cosmetic-id]').forEach(button=>{const slot=button.querySelector('.deck-cosmetic-art')!;slot.className='deck-frame-preview';slot.removeAttribute('style');slot.append(cardEl({...STARTERS.STARTER_MANA,uid:'frame-picker-'+button.dataset.cosmeticId},{size:'mkt',effect:'default',frame:button.dataset.cosmeticId}));});
  }
  section.querySelectorAll<HTMLButtonElement>('[data-cosmetic-id]').forEach(b=>b.onclick=()=>onPick(kind,b.dataset.cosmeticId!));groups.append(section);
 }
 host.querySelector<HTMLButtonElement>('[data-cosmetic-shop]')!.onclick=onShop;
 const retry=host.querySelector<HTMLButtonElement>('[data-cosmetic-retry]');if(retry)retry.onclick=onRetry;
}
