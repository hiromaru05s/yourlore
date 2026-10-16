import {api} from '../net/api';
import {loungeText as l} from './loungeText';
export interface PendingPurchase {kind:'buy'|'draw';id?:string;count?:number;requestId:string}
const key=(uid:string)=>'lore-collection-pending:'+uid;
export function pendingPurchase(uid:string):PendingPurchase|null {
 try{const v=JSON.parse(sessionStorage.getItem(key(uid))??'null') as PendingPurchase|null;return v&&(v.kind==='buy'||v.kind==='draw')&&typeof v.requestId==='string'?v:null;}catch{return null;}
}
export async function purchaseCollection(uid:string,op:Omit<PendingPurchase,'requestId'>){
 const previous=pendingPurchase(uid);
 if(previous&&(previous.kind!==op.kind||previous.id!==op.id||previous.count!==op.count))throw Error(l('未確認の購入があります。「購入結果を確認」を押してください。','A purchase is pending. Select Check purchase result.','미확인 구매가 있습니다. 구매 결과 확인을 눌러 주세요.'));
 const pending=previous??{...op,requestId:crypto.randomUUID()};sessionStorage.setItem(key(uid),JSON.stringify(pending));
 let result;
 try{result=await (pending.kind==='buy'?api.buyStarter(pending.id!,pending.requestId,pending.count??1):api.drawStarters(pending.count!,pending.requestId));}catch(error){if([400,401].includes((error as {status?:number}).status??0))sessionStorage.removeItem(key(uid));throw error;}
 sessionStorage.removeItem(key(uid));return result;
}
