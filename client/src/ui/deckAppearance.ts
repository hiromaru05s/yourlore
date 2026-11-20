import {isFreeSleeve} from '../shared/freeSleeves';
import {deckFurniturePreview} from './deckFurniturePreview';
import {CARD_FRAMES} from '../shared/cardFrames';
import {disposeCardEffects} from './cardFinish';
import {disposeCardFrames} from './cardFrame';
import '../styles/deckAppearance.css';
import '../styles/shopFrames.css';
import {CARD_EFFECTS} from '../shared/cardEffects';
import {cardEl} from './cardView';
import {bindZoom,zoomCard} from './cardInspection';
import {DB,STARTERS,deckRepresentative} from '../shared/cards';
import {finishArtPreview} from './finishArtPreview';
import {SLEEVE_LIST,sleeveUrl,type DeckPreset} from '../shared/cards';
import {FURNITURE_LIST,cosmetic} from '../shared/cosmetics';
import {getLang,esc} from '../i18n';
import {loungeText} from './loungeText';
export type CosmeticGroup='sleeve'|'furniture'|'effect'|'frame';
type AppearanceOptions={group?:CosmeticGroup;deck:DeckPreset;name:string;owned:Set<string>|null;error:boolean;onPick:(kind:'sleeve'|'furniture'|'effect'|'frame',id:string)=>void;onShop:()=>void;onRetry:()=>void};
const views=new WeakMap<HTMLElement,{key:string;appearance:string;options:AppearanceOptions}>();
export function renderDeckAppearance(host:HTMLElement,options:AppearanceOptions){
 const {deck,name,owned,error}=options;
 const featured=deckRepresentative(deck);
 host.dataset.group=options.group ?? '';
 const key=JSON.stringify([getLang(),options.group,featured,name,error,owned?[...owned].sort():null]);
 const current=views.get(host),appearance=JSON.stringify([deck.effect??'default',deck.frame??'default',deck.sleeve]);
 if(current?.key===key&&host.querySelector('.deck-appearance-groups')){
  current.options=options;
  for(const button of host.querySelectorAll<HTMLButtonElement>('[data-cosmetic-id]')){
   const kind=button.dataset.cosmeticKind as 'frame'|'effect'|'sleeve'|'furniture',selected=(deck[kind]??'default')===button.dataset.cosmeticId;
   if(button.getAttribute('aria-pressed')===String(selected))continue;
   button.classList.toggle('is-selected',selected);button.setAttribute('aria-pressed',String(selected));
   button.querySelector('.deck-cosmetic-state')!.textContent=selected?loungeText('選択中','Selected','선택됨'):loungeText('選択する','Select','선택');
  }
  if(current.appearance!==appearance){
   const section=host.querySelector<HTMLElement>('.deck-appearance-preview')!;
   const previous=section.querySelector<HTMLElement>(':scope > .card,:scope > .deck-finish-art,:scope > .deck-sleeve-preview');
   if(previous){disposeCardFrames(previous);disposeCardEffects(previous);previous.remove();}
   appendAppearancePreview(section,deck,options.group);current.appearance=appearance;
  }
  return;
 }
 views.set(host,{key,appearance,options});
 disposeCardEffects(host);
 disposeCardFrames(host);
 host.innerHTML=`<header class="deck-appearance-head"><div><h3>${esc(name)} · ${loungeText('外観','Appearance','외형')}</h3><p>${loungeText('このデッキのカード構成と一緒に保存されます。','Saved together with this deck’s cards.','이 덱의 카드 구성과 함께 저장됩니다.')}</p></div><button class="btn btn-ghost" data-cosmetic-shop>${loungeText('ショップ','Shop','상점')}</button></header><div class="deck-cosmetic-status" role="status">${error?loungeText('所持アイテムを読み込めませんでした。','Could not load owned items.','보유 아이템을 불러오지 못했습니다.'):!owned?loungeText('所持アイテムを確認中…','Loading owned items…','보유 아이템 확인 중…'):''}${error?` <button class="btn btn-mini" data-cosmetic-retry>${loungeText('再試行','Retry','재시도')}</button>`:''}</div><figure class="deck-appearance-preview"><figcaption>${loungeText('見本カード','Preview card','미리보기 카드')}</figcaption></figure><div class="deck-appearance-groups"></div>`;
 appendAppearancePreview(host.querySelector<HTMLElement>('.deck-appearance-preview')!,deck,options.group);
 const groups=host.querySelector('.deck-appearance-groups')!;
 for(const kind of ['frame','effect','sleeve','furniture'] as const){
  if(options.group && options.group!==kind)continue;
  const title=kind==='frame'?loungeText('カードフレーム','Card frame','카드 프레임'):kind==='effect'?loungeText('カードエフェクト','Card effect','카드 이펙트'):kind==='sleeve'?loungeText('スリーブ','Sleeve','슬리브'):loungeText('デッキ置き場 ＆ 墓地','Deck holder & graveyard','덱 받침 & 묘지');
  const list=kind==='frame'?[{id:'default',ja:'通常の白枠',en:'Original frame',ko:'기본 프레임',url:''},...CARD_FRAMES]:kind==='effect'?[{id:'default',ja:'なし',en:'None',ko:'없음',url:''},...CARD_EFFECTS]:kind==='sleeve'?SLEEVE_LIST:[{id:'default',ja:'デフォルト',en:'Default',ko:'기본',url:''},...FURNITURE_LIST];
  const section=document.createElement('section');section.className='deck-cosmetic-group';section.dataset.kind=kind;section.setAttribute('aria-label',title);
  section.innerHTML=`<h4>${title}</h4><div class="deck-cosmetic-grid">${list.map(item=>{
   const selected=(deck[kind]??'default')===item.id,unlocked=(kind==='sleeve'&&isFreeSleeve(item.id))||!!owned?.has(item.id),label=item[getLang()];
   const url=kind==='furniture'?deckFurniturePreview(item.id):item.url;
   return `<button type="button" class="deck-cosmetic ${selected?'is-selected':''}" data-cosmetic-kind="${kind}" data-cosmetic-id="${item.id}" aria-pressed="${selected}" aria-label="${esc(label)}" ${unlocked?'':'disabled'}><span class="deck-cosmetic-art ${kind==='furniture'?'furniture-preview':'sleeve-preview'}" style="${url?`background-image:url('${url}')`:''}"></span><span class="deck-cosmetic-name">${esc(label)}</span><span class="deck-cosmetic-state">${selected?loungeText('選択中','Selected','선택됨'):unlocked?loungeText('選択する','Select','선택'):(kind==='effect'||('gachaOnly' in (cosmetic(item.id)??{})))?loungeText('ガチャで入手','Get in gacha','뽑기로 획득'):loungeText('ショップで入手','Get in shop','상점에서 획득')}</span></button>`;
  }).join('')}</div>`;
  if(kind==='sleeve'){const note=document.createElement('p');note.textContent=loungeText('この2種類は最初から利用できます。','Both sleeves are available from the start.','이 두 슬리브는 처음부터 사용할 수 있습니다.');section.querySelector('h4')!.after(note);}
  if(kind==='frame'){
   const scope=document.createElement('p');scope.className='deck-frame-scope';scope.textContent=loungeText('スターター・対戦中の購入カードを含む全カードに適用。プレイ後もフレームが続きます。','Applies to the whole deck, including starters and cards bought during a duel. Frames remain after play.','스타터와 대전 중 구매한 카드를 포함한 모든 카드에 적용되며 플레이 후에도 유지됩니다.');section.querySelector('h4')!.after(scope);
   section.querySelectorAll<HTMLElement>('[data-cosmetic-id]').forEach(button=>{const slot=button.querySelector('.deck-cosmetic-art')!;slot.className='deck-frame-preview';slot.removeAttribute('style');slot.append(cardEl({...(STARTERS[featured] ?? DB[featured]),uid:'frame-picker-'+button.dataset.cosmeticId},{size:'mkt',effect:'default',frame:button.dataset.cosmeticId}));});
  }
  if(kind==='effect'){
   section.querySelectorAll<HTMLElement>('[data-cosmetic-id]').forEach(button=>{
    button.querySelector('.deck-cosmetic-art')!.replaceWith(finishArtPreview(featured,button.dataset.cosmeticId));
   });
  }
  section.querySelectorAll<HTMLButtonElement>('[data-cosmetic-id]').forEach(b=>b.onclick=()=>views.get(host)?.options.onPick(kind,b.dataset.cosmeticId!));groups.append(section);
 }
 host.querySelector<HTMLButtonElement>('[data-cosmetic-shop]')!.onclick=()=>views.get(host)?.options.onShop();
 const retry=host.querySelector<HTMLButtonElement>('[data-cosmetic-retry]');if(retry)retry.onclick=()=>views.get(host)?.options.onRetry();
}

function appendAppearancePreview(section:HTMLElement,deck:DeckPreset,group?:CosmeticGroup){
 const featured=deckRepresentative(deck);
 if(group==='sleeve'){
  const image=new Image();image.className='deck-sleeve-preview';image.src=sleeveUrl(deck.sleeve);image.alt=SLEEVE_LIST.find(s=>s.id===deck.sleeve)?.[getLang()]??SLEEVE_LIST[0][getLang()];section.append(image);return;
 }
 if(group==='effect'){
   section.append(finishArtPreview(featured,deck.effect));
   return;
 }
 const card={...(STARTERS[featured] ?? DB[featured]),uid:'appearance-preview'};
 const preview=cardEl(card,{size:'mkt',effect:deck.effect,frame:deck.frame});
 bindZoom(preview,card,undefined,undefined,deck.effect,deck.frame);
 preview.tabIndex=0;preview.setAttribute('role','button');
 preview.setAttribute('aria-label',loungeText('見本カードを拡大','Enlarge preview card','미리보기 카드 확대'));
 preview.onclick=()=>zoomCard(card,undefined,undefined,deck.effect,deck.frame);
 preview.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();preview.click();}};
 section.append(preview);
}
