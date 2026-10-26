import {api} from '../net/api';
import {loungeText as l} from './loungeText';
export interface PendingPurchase {kind:'buy'|'draw';id?:string;count?:number;requestId:string;shopDay?:string}
const key=(uid:string)=>'lore-collection-pending:'+uid;
export function pendingPurchase(uid:string):PendingPurchase|null {
 try{const v=JSON.parse(sessionStorage.getItem(key(uid))??'null') as PendingPurchase|null;return v&&(v.kind==='buy'||v.kind==='draw')&&typeof v.requestId==='string'?v:null;}catch{return null;}
}
export async function purchaseCollection(uid:string,op:Omit<PendingPurchase,'requestId'>){
 const previous=pendingPurchase(uid);
 if(previous&&(previous.kind!==op.kind||previous.id!==op.id||previous.count!==op.count||previous.shopDay!==op.shopDay))throw Error(l('未確認の購入があります。「購入結果を確認」を押してください。','A purchase is pending. Select Check purchase result.','미확인 구매가 있습니다. 구매 결과 확인을 눌러 주세요.'));
 const pending=previous??{...op,requestId:crypto.randomUUID()};sessionStorage.setItem(key(uid),JSON.stringify(pending));
 let result;
 try{result=await (pending.kind==='buy'?api.buyStarter(pending.id!,pending.requestId,pending.count??1,pending.shopDay):api.drawStarters(pending.count!,pending.requestId));}catch(error){if([400,401].includes((error as {status?:number}).status??0))sessionStorage.removeItem(key(uid));const messages:Record<string,string>={
 'shop refreshed':l('本日の商品が更新されました。ラインナップを確認してください。','The daily shop has refreshed. Check the new lineup.','오늘의 상품이 갱신되었습니다. 라인업을 확인해 주세요.'),
 'starter not offered today':l('このカードは本日の販売対象ではありません。','This card is not in today’s shop.','오늘 판매하는 카드가 아닙니다.'),
 'daily starter limit reached':l('このカードの本日分は売り切れです。','This card is sold out for today.','이 카드의 오늘 판매분은 품절입니다.')
 };if(error instanceof Error&&messages[error.message])error.message=messages[error.message];throw error;}
 sessionStorage.removeItem(key(uid));return result;
}
