import type {CollectionReward} from '../shared/collection';
import {CARD_EFFECTS} from '../shared/cardEffects';
import {DB,STARTERS} from '../shared/cards';
import {cardName,getLang} from '../i18n';
import {artUrl} from './cardArt';
import {loungeText as l} from './loungeText';
export function rewardPresentation(r:CollectionReward){
 if(r.kind==='empty')return {name:l('空結果','Empty result','빈 결과'),image:'/cosmetics/effect-empty.svg',detail:l('スリーブ・家具枠（準備中）／獲得なし','Sleeve & furniture slot (coming soon) / No item','슬리브·가구 슬롯 (준비 중) / 획득 없음')};
 if(r.kind==='effect'){const e=CARD_EFFECTS.find(e=>e.id===r.id);return {name:e?.[getLang()]??r.id,image:e?.url??'/cosmetics/effect-empty.svg',detail:r.refund?`+${r.refund} `+l('シャード還元','Shards refunded','샤드 환급'):l('エフェクト獲得 · デッキの外観から装着','Effect acquired · Equip in deck appearance','이펙트 획득 · 덱 외형에서 장착')};}
 return {name:cardName({...STARTERS[r.id]??DB[r.id],uid:r.id}),image:artUrl.sm(r.id),detail:(r.refund?`+${r.refund} `+l('シャード還元','Shards refunded','샤드 환급'):l('獲得','Acquired','획득'))+` · ${l('所持','Owned','보유')} ${r.owned}/8`};
}
