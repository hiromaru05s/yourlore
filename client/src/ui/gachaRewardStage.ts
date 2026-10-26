import type {CollectionReward} from '../shared/collection';
import {quietLuxuryFromUrl} from '../shared/quietLuxuryCosmetics';
import {cosmetic} from '../shared/cosmetics';
import {STARTERS,DB,frameFor} from '../shared/cards';
import {artUrl} from './cardArt';
import {decodeAsset} from './imageAssets';
import {esc} from '../i18n';
import {cardEl} from './cardView';
import {disposeCardEffects} from './cardFinish';
import {rewardPresentation} from './collectionReward';
import {loungeText as l} from './loungeText';
import '../styles/gachaRewards.css';
export const rewardKind=(r:CollectionReward)=>r.kind==='cosmetic'?(cosmetic(r.id)?.kind??'sleeve'):r.kind??'starter';
const category=(kind:string)=>kind==='starter'?l('スターターカード','STARTER CARD','스타터 카드'):kind==='sleeve'?l('スリーブ','SLEEVE','슬리브'):kind==='furniture'?l('デッキ置き場 ＆ 墓地','DECK HOLDER & GRAVEYARD','덱 받침 & 묘지'):kind==='effect'?l('カードエフェクト','CARD EFFECT','카드 이펙트'):l('獲得結果','RESULT','획득 결과');
const cardDefinition=(r:CollectionReward)=>r.kind==='effect'?STARTERS.STARTER_CHEST:STARTERS[r.id]??DB[r.id];
const rewardCategory=(r:CollectionReward)=>{
 const kind=rewardKind(r);if(kind!=='starter')return category(kind);
 const type=cardDefinition(r)?.t;return type==='mon'?l('モンスターカード','MONSTER CARD','몬스터 카드'):type==='trap'?l('トラップカード','TRAP CARD','함정 카드'):type==='quest'?l('クエストカード','QUEST CARD','퀘스트 카드'):l('魔法カード','SPELL CARD','마법 카드');
};
function face(r:CollectionReward,uid:string){const def=cardDefinition(r);return def?cardEl({...def,uid},{fullArt:true,size:'mkt',effect:r.kind==='effect'?r.id:'default'}):undefined;}
/** Decode the complete face before revealing it; CSS backgrounds have no load event. */
export async function prepareRewardCard(r:CollectionReward):Promise<void>{
 if(!['starter','effect'].includes(rewardKind(r)))return;const def=cardDefinition(r);if(!def)return;
 await Promise.all([frameFor(def.t,true),artUrl.full(def.id),...['cost','attack','health'].map(k=>`/art/biblion/modular/${k}-print.webp`)].map(url=>decodeAsset(url)));
}
/** Lightweight overview retains the complete card frame and each reward's own proportions. */
export function mountRewardGallery(host:HTMLElement,rewards:CollectionReward[]):()=>void{
 let dead=false;
 const grid=document.createElement('div');grid.className='gacha-lineup reward-gallery';grid.dataset.count=String(rewards.length);host.append(grid);
 rewards.forEach((r,i)=>{const p=rewardPresentation(r),kind=rewardKind(r),article=document.createElement('article');article.dataset.rewardKind=r.kind??'starter';article.dataset.presentation=kind;
  article.innerHTML=`<div class="reward-tile" data-reward-index="${i}"><span class="reward-tile-kind">${rewardCategory(r)}</span><span class="reward-tile-art"></span><strong>${esc(p.name)}</strong><small>${esc(p.detail)}</small>${kind==='effect'?`<span class="reward-sample-note">${l('宝箱カードは装着見本','Chest card shown as a sample','보물상자 카드는 장착 견본')}</span>`:''}</div>`;
  const art=article.querySelector<HTMLElement>('.reward-tile-art')!;
  if(kind==='starter'||kind==='effect'){
   const card=face(r,`gacha-summary-${i}`);if(card){art.dataset.ready='false';art.append(card);const status=document.createElement('span');status.className='reward-tile-status';status.textContent=l('カードを準備中…','Preparing card…','카드 준비 중…');art.append(status);
    void prepareRewardCard(r).then(()=>{if(dead)return;art.dataset.ready='true';status.remove();}).catch(()=>{if(dead)return;art.dataset.ready='error';status.textContent=l('プレビューを読み込めませんでした','Preview unavailable','미리보기를 불러올 수 없습니다');});
   }
  }
  else if(kind==='furniture'){
   art.textContent=l('造形を準備中…','Preparing sculptures…','조형물 준비 중…');const item=cosmetic(r.id);
   if(item)void import('./gachaRewardFurniture').then(m=>m.rewardFurnitureImage(item)).then(url=>{if(dead)return;const img=new Image();img.src=url;img.alt='';art.replaceChildren(img);}).catch(()=>{if(!dead)art.textContent=l('プレビューを読み込めませんでした','Preview unavailable','미리보기를 불러올 수 없습니다');});
  }else{const img=new Image();img.src=p.image;img.alt='';if(kind==='sleeve'&&quietLuxuryFromUrl(p.image))img.className='reward-sleeve-quiet';art.append(img);}
  grid.append(article);
 });
 return()=>{dead=true;disposeCardEffects(grid);grid.remove();};
}
