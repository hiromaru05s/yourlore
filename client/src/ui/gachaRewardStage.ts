import type {CollectionReward} from '../shared/collection';
import {cosmetic} from '../shared/cosmetics';
import {STARTERS,DB} from '../shared/cards';
import {esc} from '../i18n';
import {cardEl} from './cardView';
import {disposeCardEffects} from './cardFinish';
import {rewardPresentation} from './collectionReward';
import {loungeText as l} from './loungeText';
import '../styles/gachaRewards.css';
export const rewardKind=(r:CollectionReward)=>r.kind==='cosmetic'?(cosmetic(r.id)?.kind??'sleeve'):r.kind??'starter';
const category=(kind:string)=>kind==='starter'?l('スターターカード','STARTER CARD','스타터 카드'):kind==='sleeve'?l('スリーブ','SLEEVE','슬리브'):kind==='furniture'?l('デッキ置き場 ＆ 墓地','DECK HOLDER & GRAVEYARD','덱 받침 & 묘지'):kind==='effect'?l('カードエフェクト','CARD EFFECT','카드 이펙트'):l('獲得結果','RESULT','획득 결과');
const note=(kind:string)=>kind==='starter'?l('新しい一枚を、次のデッキへ。','A new possibility for your next deck.','새로운 한 장을 다음 덱으로.'):kind==='sleeve'?l('手札に宿る、あなただけの装い。','A signature on every card in your hand.','손패에 깃드는 나만의 모습.'):kind==='furniture'?l('二つの造形が、あなたの盤面を彩る。','Two sculptures. A new presence on your board.','두 조형물이 나만의 보드를 꾸밉니다.'):l('光が巡るたび、カードの表情が変わる。','A different expression with every turn of the light.','빛이 흐를 때마다 달라지는 카드의 표정.');
function face(r:CollectionReward,uid:string){const def=r.kind==='effect'?STARTERS.STARTER_CHEST:STARTERS[r.id]??DB[r.id];return def?cardEl({...def,uid},{fullArt:true,size:'mkt',effect:r.kind==='effect'?r.id:'default'}):undefined;}
/** Lightweight overview retains the complete card frame and each reward's own proportions. */
export function mountRewardGallery(host:HTMLElement,rewards:CollectionReward[],inspect:(index:number)=>void):()=>void{
 let dead=false;
 const grid=document.createElement('div');grid.className='gacha-lineup reward-gallery';host.append(grid);
 rewards.forEach((r,i)=>{const p=rewardPresentation(r),kind=rewardKind(r),article=document.createElement('article');article.dataset.rewardKind=r.kind??'starter';article.dataset.presentation=kind;
  article.innerHTML=`<button class="reward-tile" data-inspect="${i}" aria-label="${esc(p.name+' · '+l('詳しく見る','Inspect','자세히 보기'))}"><span class="reward-tile-kind">${category(kind)}</span><span class="reward-tile-art"></span><strong>${esc(p.name)}</strong><small>${esc(p.detail)}</small></button>`;
  const art=article.querySelector<HTMLElement>('.reward-tile-art')!;
  if(kind==='starter'||kind==='effect'){const card=face(r,`gacha-summary-${i}`);if(card)art.append(card);}
  else if(kind==='furniture'){
   art.textContent=l('造形を準備中…','Preparing sculptures…','조형물 준비 중…');const item=cosmetic(r.id);
   if(item)void import('./gachaRewardFurniture').then(m=>m.rewardFurnitureImage(item)).then(url=>{if(dead)return;const img=new Image();img.src=url;img.alt='';art.replaceChildren(img);}).catch(()=>{if(!dead)art.textContent=l('選択して詳細を見る','Select to inspect','선택하여 자세히 보기');});
  }else{const img=new Image();img.src=p.image;img.alt='';art.append(img);}
  article.querySelector('button')!.onclick=()=>inspect(i);grid.append(article);
 });
 return()=>{dead=true;disposeCardEffects(grid);grid.remove();};
}
/** Read-only, cancellable reward inspection. Server order, ownership and refunds stay intact. */
export function mountRewardStage(host:HTMLElement,rewards:CollectionReward[],options:{index?:number;onIndex?:(index:number)=>void}={}):()=>void{
 const root=document.createElement('section');root.className='reward-stage';root.setAttribute('aria-label',l('獲得アイテム','Acquired item','획득 아이템'));host.append(root);
 let index=Math.max(0,Math.min(rewards.length-1,options.index??0)),dead=false,generation=0,raf=0,cleanup=()=>{},born=0,last=0;
 const media=matchMedia('(prefers-reduced-motion: reduce)'),events=new AbortController();
 function stop(){cancelAnimationFrame(raf);cleanup();cleanup=()=>{};disposeCardEffects(root);}
 function show(next:number){
  if(dead||!rewards.length)return;const hadFocus=root.contains(document.activeElement);stop();index=next;const ticket=++generation,r=rewards[index],p=rewardPresentation(r),kind=rewardKind(r);root.dataset.kind=kind;root.dataset.rewardId=r.id;root.dataset.ready='false';
  root.innerHTML=`<div class="reward-stage-heading"><span>${category(kind)}</span><span>${String(index+1).padStart(2,'0')} <i>/ ${String(rewards.length).padStart(2,'0')}</i></span></div><div class="reward-composition"><div class="reward-object"><div class="reward-object-ground"></div><div class="reward-object-art"></div><p class="reward-visual-status" role="status"></p></div><div class="reward-copy" aria-live="polite"><span class="reward-acquired">${r.refund?l('所持済み · シャード還元','OWNED · SHARDS REFUNDED','보유 중 · 샤드 환급'):l('コレクションに追加','ADDED TO YOUR COLLECTION','컬렉션에 추가')}</span><h2>${esc(p.name)}</h2><p class="reward-poem">${note(kind)}</p><p class="reward-detail">${esc(p.detail)}</p>${kind==='furniture'?`<div class="reward-pair-labels"><span>01 · ${l('デッキ置き場','Deck holder','덱 받침')}</span><span>02 · ${l('墓地','Graveyard','묘지')}</span></div>`:''}${kind==='effect'?`<small>${l('宝箱カードに適用した見本','Shown on a sample Chest card','보물상자 카드에 적용한 견본')}</small>`:''}</div></div><nav class="reward-navigation" aria-label="${l('結果を選ぶ','Select reward','결과 선택')}"><button data-prev ${index===0?'disabled':''} aria-label="${l('前の報酬','Previous reward','이전 보상')}">←</button><div class="reward-index">${rewards.map((x,i)=>`<button data-index="${i}" data-kind="${rewardKind(x)}" aria-current="${i===index}" aria-label="${esc((i+1)+'. '+rewardPresentation(x).name)}">${String(i+1).padStart(2,'0')}</button>`).join('')}</div><button data-next ${index===rewards.length-1?'disabled':''} aria-label="${l('次の報酬','Next reward','다음 보상')}">→</button></nav>`;
  root.querySelector<HTMLButtonElement>('[data-prev]')!.onclick=()=>show(index-1);root.querySelector<HTMLButtonElement>('[data-next]')!.onclick=()=>show(index+1);root.querySelectorAll<HTMLButtonElement>('[data-index]').forEach(b=>b.onclick=()=>show(Number(b.dataset.index)));
  if(rewards.length===1)root.querySelector<HTMLElement>('nav')!.hidden=true;
  const art=root.querySelector<HTMLElement>('.reward-object-art')!,status=root.querySelector<HTMLElement>('.reward-visual-status')!;
  let draw=(_t:number,_arrival:number)=>{},dispose=()=>{};
  const ready=()=>{if(dead||ticket!==generation)return;root.dataset.ready='true';born=performance.now();last=0;tick(born);};
  const failed=()=>{if(dead||ticket!==generation)return;dispose();dispose=()=>{};draw=()=>{};status.textContent=l('プレビューを読み込めませんでした。獲得結果は保存済みです。','Preview unavailable. Your reward is saved.','미리보기를 불러올 수 없습니다. 보상은 저장되었습니다.');ready();};
  function tick(now:number){if(dead||ticket!==generation)return;if(!document.hidden&&(media.matches||now-last>=1000/30)){last=now;try{draw(media.matches?1.5:now/1000,media.matches?1:Math.min(1,(now-born)/1400));}catch{failed();return;}}if(!media.matches&&(kind==='sleeve'||kind==='furniture'))raf=requestAnimationFrame(tick);}
  cleanup=()=>dispose();
  if(kind==='starter'||kind==='effect'){
   const card=face(r,`gacha-hero-${ticket}`);if(card)art.append(card);ready();
  }else if(kind==='sleeve'){
   const item=cosmetic(r.id)!;art.innerHTML=`<div class="reward-sleeve-fan"><div class="reward-sleeve-echo echo-left" style="background-image:url('${p.image}')"></div><div class="reward-sleeve-echo echo-right" style="background-image:url('${p.image}')"></div><div class="reward-sleeve-main card--back" style="background-image:url('${p.image}')"></div></div>`;
   void import('./gachaRewardSleeve').then(m=>{if(dead||ticket!==generation)return;return m.createRewardSleeve(art.querySelector('.reward-sleeve-main')!,item);}).then(view=>{if(!view)return;if(dead||ticket!==generation){view.dispose();return;}draw=view.draw;dispose=view.dispose;ready();}).catch(failed);
  }else if(kind==='furniture'){
   const item=cosmetic(r.id)!;status.textContent=l('造形を準備しています…','Preparing sculptures…','조형물 준비 중…');
   void import('./gachaRewardFurniture').then(m=>{if(dead||ticket!==generation)return;return m.createRewardFurniture(art,item);}).then(view=>{if(!view)return;if(dead||ticket!==generation){view.dispose();return;}status.textContent='';draw=view.draw;dispose=view.dispose;ready();}).catch(failed);
  }else{art.textContent=p.name;ready();}
  if(hadFocus)root.querySelector<HTMLButtonElement>(`[data-index="${index}"]`)?.focus({preventScroll:true});
  const selected=root.querySelector<HTMLElement>(`[data-index="${index}"]`),rail=selected?.parentElement;if(selected&&rail)rail.scrollLeft+=selected.getBoundingClientRect().left-rail.getBoundingClientRect().left-(rail.clientWidth-selected.clientWidth)/2;
  options.onIndex?.(index);
 }
 root.addEventListener('keydown',e=>{if(e.key==='ArrowRight'&&index<rewards.length-1){e.preventDefault();show(index+1);}if(e.key==='ArrowLeft'&&index>0){e.preventDefault();show(index-1);}},{signal:events.signal});
 media.addEventListener('change',()=>show(index),{signal:events.signal});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&media.matches)show(index);},{signal:events.signal});
 show(index);
 return()=>{if(dead)return;dead=true;generation++;events.abort();stop();root.remove();};
}
