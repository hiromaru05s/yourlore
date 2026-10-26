import {GACHA_COSMETICS,cosmetic} from '../shared/cosmetics';
import {CARD_EFFECTS} from '../shared/cardEffects';
import {COLLECTIBLE_STARTERS} from '../shared/collection';
import {DB,STARTERS} from '../shared/cards';
import {cardName,esc,getLang} from '../i18n';
import {cardEl} from './cardView';
import {disposeCardEffects} from './cardFinish';
import {loungeText as l} from './loungeText';

export type ShopRewardCategory='starter'|'cosmetic'|'effect';
export const shopRewardCategoryName=(kind:ShopRewardCategory)=>kind==='starter'?l('スターター','Starters','스타터'):kind==='cosmetic'?l('スリーブ・デッキ・墓地','Sleeves · Deck · Graveyard','슬리브·덱·묘지'):l('エフェクト','Effects','이펙트');
export const sample=(id:string)=>`<span class="shop-reward-sample" data-sample-id="${esc(id)}"></span>`;
export function shopLineup(kind?:ShopRewardCategory){
 return (kind?[kind]:['starter','cosmetic','effect'] as const).map(category=>{
  const entries=category==='starter'?COLLECTIBLE_STARTERS.map(id=>({id,name:cardName({...(STARTERS[id]??DB[id]),uid:id})})):category==='cosmetic'?GACHA_COSMETICS.map(item=>({id:item.id,name:item[getLang()]})):CARD_EFFECTS.map(item=>({id:item.id,name:item[getLang()]}));
  return `<section data-lineup-category="${category}">${kind?'':`<h3>${shopRewardCategoryName(category)}</h3>`}<div class="shop-reward-grid">${entries.map(item=>`<article data-reward-id="${esc(item.id)}">${sample(item.id)}<strong>${esc(item.name)}</strong></article>`).join('')}</div></section>`;
 }).join('');
}
/** Reuse equipped card surfaces; the viewport owns playback and teardown. */
export function mountShopRewardPreviews(root:HTMLElement):()=>void{
 let dead=false,raf=0,last=0;
 const motion=matchMedia('(prefers-reduced-motion: reduce)'),events=new AbortController();
 const resize=new ResizeObserver(entries=>{for(const {target} of entries){const host=target as HTMLElement;host.style.setProperty('--preview-cw',`${host.clientWidth}px`);host.style.setProperty('--preview-ch',`${host.clientHeight}px`);}});
 const views=new Map<HTMLElement,{visible:boolean;loaded:boolean;draw?:(t:number)=>void;dispose?:()=>void}>();
 // Navigation may temporarily make the whole page inert. Prepare the surface
 // regardless; playback alone pauses until interaction resumes.
 async function load(host:HTMLElement){
  const state=views.get(host)!;if(state.loaded||dead)return;state.loaded=true;
  const id=host.dataset.sampleId!,item=cosmetic(id);
  try{
   if(item?.kind==='sleeve'){
    const back=document.createElement('span');back.className='shop-sleeve-surface card--back';back.style.backgroundImage=`url('${item.url}')`;host.append(back);
    const {createRewardSleeve}=await import('./gachaRewardSleeve');if(dead)return;
    const view=await createRewardSleeve(back,item);if(dead){view.dispose();return;}state.draw=view.draw;state.dispose=view.dispose;view.draw(motion.matches?1.5:performance.now()/1000);host.dataset.ready='true';
   }else if(item?.kind==='furniture'){
    const {rewardFurnitureImage}=await import('./gachaRewardFurniture');if(dead)return;const url=await rewardFurnitureImage(item);if(dead)return;
    const img=new Image();img.src=url;img.alt='';host.append(img);host.dataset.ready='true';
   }else{
    const effect=id.startsWith('effect:'),def=effect?STARTERS.STARTER_MANA:STARTERS[id]??DB[id];
    if(def){host.append(cardEl({...def,uid:`shop-sample-${id}`},{fullArt:true,size:'mkt',effect:effect?id:'default'}));host.dataset.ready='true';}
   }
  }catch{if(!dead){host.dataset.ready='error';host.setAttribute('aria-label',l('プレビューを読み込めませんでした','Preview unavailable','미리보기를 불러올 수 없습니다'));}}
 }
 const observer=new IntersectionObserver(entries=>{for(const entry of entries){const host=entry.target as HTMLElement,state=views.get(host)!;state.visible=entry.isIntersecting;if(state.visible)void load(host);}},{rootMargin:'0px'});
 root.querySelectorAll<HTMLElement>('[data-sample-id]').forEach(host=>{views.set(host,{visible:false,loaded:false});resize.observe(host);observer.observe(host);});
 function tick(now:number){
  if(dead)return;
  if(!document.hidden&&(!document.querySelector('dialog[open]')||root.closest('dialog[open]'))&&now-last>=1000/24){last=now;for(const [host,state] of views)if(state.visible&&!host.closest('[inert]')&&state.draw){state.draw(motion.matches?1.5:now/1000);host.dataset.previewFrame=String(now);}}
  if(!motion.matches)raf=requestAnimationFrame(tick);
 }
 const restart=()=>{cancelAnimationFrame(raf);last=0;tick(performance.now());};motion.addEventListener('change',restart,{signal:events.signal});restart();
 return()=>{dead=true;cancelAnimationFrame(raf);observer.disconnect();resize.disconnect();events.abort();views.forEach(state=>state.dispose?.());disposeCardEffects(root);};
}
