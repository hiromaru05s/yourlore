import {ONBOARDING_BASICS,ONBOARDING_DRAW,ONBOARDING_BUY} from '../../client/src/shared/onboarding';
import {dailyStarterShop,DAILY_STARTER_LIMIT} from '../../client/src/shared/dailyStarterShop';
import {GACHA_COSMETICS,cosmetic} from '../../client/src/shared/cosmetics';
import {CARD_EFFECTS,isCardEffect,type CardEffectId} from '../../client/src/shared/cardEffects';
import {COLLECTIBLE_STARTERS,starterCollection,STARTER_PRICE,GACHA_PRICE,DUPLICATE_REFUNDS,type CollectionReceipt,gachaCategory,type CollectionReward} from '../../client/src/shared/collection';
import type {Env,SessionUser} from './env';
import {corsHeaders} from './auth';
const json=(env:Env,body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...corsHeaders(env)}});
function randomIndex(length:number):number {
 const limit=Math.floor(0x100000000/length)*length;
 const n=new Uint32Array(1);do{crypto.getRandomValues(n);}while(n[0]>=limit);
 return n[0]%length;
}
export async function handleCollection(env:Env,req:Request,path:string,user:SessionUser|null):Promise<Response>{
 if(!user)return json(env,{error:'로그인이 필요합니다.'},401);
 const state=async()=>{
  const row=await env.DB.prepare('SELECT credits, starter_cards, sleeves FROM users WHERE id = ?').bind(user.id).first<{credits:number;starter_cards:string|null;sleeves:string|null}>();
  if(!row)throw Error('Missing account');
  let stored:unknown;try{stored=JSON.parse(row.sleeves||'[]');}catch{stored=[];}
  const inventory:string[]=Array.isArray(stored)?stored.filter((id:unknown)=>typeof id==='string'):[];
  return {...row,inventory,starterCards:starterCollection(row.starter_cards)};
 };
 const shop=async()=>{
  const daily=dailyStarterShop(Date.now());
  const rows=await env.DB.prepare(`SELECT operation, receipt FROM collection_transactions WHERE user_id = ? AND created_at >= ? AND created_at < ?`).bind(user.id,daily.resetsAt-86_400_000,daily.resetsAt).all<{operation:string;receipt:string}>();
  for(const row of rows.results){const op=JSON.parse(row.operation);if(op.kind==='buy'&&!op.tutorial&&daily.cards.includes(op.id))daily.remaining[op.id]=Math.max(0,daily.remaining[op.id]-JSON.parse(row.receipt).rewards.length);}
  return daily;
 };
 const respond=async(receipt:CollectionReceipt)=>{const s=await state();return json(env,{dailyShop:await shop(),credits:s.credits,starterCards:s.starterCards,effects:s.inventory.filter(isCardEffect),cosmetics:s.inventory.filter(id=>!!cosmetic(id)),receipt});};
 if(path==='/api/collection'&&req.method==='GET'){const s=await state();return json(env,{dailyShop:await shop(),credits:s.credits,starterCards:s.starterCards,effects:s.inventory.filter(isCardEffect),cosmetics:s.inventory.filter(id=>!!cosmetic(id))});}
 if(path==='/api/collection/history'&&req.method==='GET'){
  const rows=await env.DB.prepare('SELECT receipt FROM collection_transactions WHERE user_id = ? ORDER BY created_at DESC, request_id DESC LIMIT 50').bind(user.id).all<{receipt:string}>();
  return json(env,{receipts:rows.results.map(r=>JSON.parse(r.receipt) as CollectionReceipt)});
 }
 const kind=path==='/api/collection/buy'?'buy':path==='/api/collection/draw'?'draw':null;
 if(!kind||req.method!=='POST')return json(env,{error:'not found'},404);
 const body=await req.json().catch(()=>null) as {requestId?:unknown;id?:unknown;count?:unknown;shopDay?:unknown;tutorial?:unknown}|null;
 if(!body||typeof body.requestId!=='string'||!/^[a-zA-Z0-9_-]{16,80}$/.test(body.requestId))return json(env,{error:'invalid request'},400);
 const id=body.id,count=kind==='buy'&&body.count===undefined?1:body.count;
 if(kind==='buy'&&(typeof id!=='string'||!COLLECTIBLE_STARTERS.includes(id)))return json(env,{error:'잘못된 상품입니다.'},400);
 if(typeof count!=='number'||!Number.isInteger(count)||(kind==='buy'?(count<1||count>8):(count!==1&&count!==10)))return json(env,{error:'invalid request'},400);
 const tutorial=body.tutorial===true;
 if(tutorial && (body.requestId!==(kind==='draw'?ONBOARDING_DRAW:ONBOARDING_BUY)||count!==(kind==='draw'?10:1)))return json(env,{error:'invalid tutorial purchase'},400);
 if(!tutorial && [ONBOARDING_DRAW,ONBOARDING_BUY].includes(body.requestId))return json(env,{error:'reserved request'},400);
 if(tutorial){
  const ready=await env.DB.prepare('SELECT key FROM rewards WHERE user_id=? AND key=?').bind(user.id,ONBOARDING_BASICS).first();
  const drawn=kind==='draw'||await env.DB.prepare('SELECT request_id FROM collection_transactions WHERE user_id=? AND request_id=?').bind(user.id,ONBOARDING_DRAW).first();
  if(!ready||!drawn)return json(env,{error:'complete the preceding tutorial first'},409);
 }
 // Tutorial purchase retries use one canonical operation even across midnight.
 const operation=JSON.stringify(tutorial?{kind,tutorial:true,count}:{kind,id:kind==='buy'?id:null,count,...(kind==='buy'&&typeof body.shopDay==='string'?{shopDay:body.shopDay}:{})});
 const free=tutorial&&kind==='buy';
 const cost=free?0:(kind==='buy'?STARTER_PRICE:GACHA_PRICE)*count;
 // Draw once per request. A CAS retry never rerolls the request's selection.
 let picks:Array<{kind:'starter'|'empty'|'effect'|'cosmetic';id:string}>|undefined;
 for(let attempt=0;attempt<6;attempt++){
  const previous=await env.DB.prepare('SELECT operation, receipt FROM collection_transactions WHERE user_id = ? AND request_id = ?').bind(user.id,body.requestId).first<{operation:string;receipt:string}>();
  if(previous)return previous.operation===operation?respond(JSON.parse(previous.receipt)):json(env,{error:'collection request conflict'},409);
  const s=await state();
  const daily=await shop();
  const shopRejection=kind==='buy'?(body.shopDay!==daily.day?'shop refreshed':!daily.cards.includes(id as string)||free&&daily.cards[0]!==id?'starter not offered today':!free&&count>daily.remaining[id as string]?'daily starter limit reached':null):null;
  const rejection=shopRejection??(s.credits<cost?'not enough shards':kind==='buy'&&!free&&s.starterCards[id as string]+count>8?'starter limit reached':null);
  if(rejection){
   // Another copy of this same request may have committed between the ledger
   // read and this balance read (including spending the last available Shards).
   const committed=await env.DB.prepare('SELECT operation, receipt FROM collection_transactions WHERE user_id = ? AND request_id = ?').bind(user.id,body.requestId).first<{operation:string;receipt:string}>();
   if(committed)return committed.operation===operation?respond(JSON.parse(committed.receipt)):json(env,{error:'collection request conflict'},409);
   return json(env,{error:rejection},400);
  }
  picks??=kind==='buy'?Array.from({length:count},()=>({kind:'starter' as const,id:id as string})):Array.from({length:count},()=>{
   const category=gachaCategory(randomIndex(10000));
   if(category==='cosmetic')return GACHA_COSMETICS.length?{kind:'cosmetic' as const,id:GACHA_COSMETICS[randomIndex(GACHA_COSMETICS.length)].id}:{kind:'empty' as const,id:'cosmetic-pending'};
   return {kind:category,id:category==='starter'?COLLECTIBLE_STARTERS[randomIndex(COLLECTIBLE_STARTERS.length)]:CARD_EFFECTS[randomIndex(CARD_EFFECTS.length)].id};
  });
  const rewards:CollectionReward[]=picks.map(pick=>{
   if(pick.kind==='empty')return {kind:'empty',id:'cosmetic-pending',refund:0,owned:0};
   if(pick.kind==='cosmetic'){const duplicate=s.inventory.includes(pick.id);if(!duplicate)s.inventory.push(pick.id);return {kind:'cosmetic',id:pick.id,refund:duplicate?DUPLICATE_REFUNDS.cosmetic:0,owned:1};}
   if(pick.kind==='effect'){const effect=pick.id as CardEffectId,duplicate=s.inventory.includes(effect);if(!duplicate)s.inventory.push(effect);return {kind:'effect',id:effect,refund:duplicate?DUPLICATE_REFUNDS.effect:0,owned:1};}
   const card=pick.id,duplicate=s.starterCards[card]>=8;if(!duplicate)s.starterCards[card]++;return {kind:'starter',id:card,refund:duplicate&&!free?DUPLICATE_REFUNDS.starter:0,owned:s.starterCards[card]};
  });
  const committedAt=Date.now();
  if(dailyStarterShop(committedAt).day!==daily.day)continue;
  const refund=rewards.reduce((sum,r)=>sum+r.refund,0);
  const receipt:CollectionReceipt={requestId:body.requestId,kind,cost,refund,rewards,createdAt:committedAt};
  // D1 batch is transactional. The conditional ledger insert runs only when
  // this request won the balance/inventory CAS; failed inserts roll back spend.
  const result=await env.DB.batch([
   env.DB.prepare(`UPDATE users SET credits = credits - ? + ?, starter_cards = ?, sleeves = ? WHERE id = ? AND credits = ? AND starter_cards IS ? AND sleeves IS ? AND NOT EXISTS (SELECT 1 FROM collection_transactions WHERE user_id = ? AND request_id = ?)
    AND (? = 'draw' OR (SELECT COALESCE(SUM(json_array_length(json_extract(receipt,'$.rewards'))),0) FROM collection_transactions WHERE user_id = ? AND created_at >= ? AND created_at < ? AND json_extract(operation,'$.kind') = 'buy' AND json_extract(operation,'$.id') = ?) + ? <= ?)` )
    .bind(cost,refund,JSON.stringify(s.starterCards),JSON.stringify(s.inventory),user.id,s.credits,s.starter_cards,s.sleeves,user.id,body.requestId,free?'draw':kind,user.id,daily.resetsAt-86_400_000,daily.resetsAt,kind==='buy'?id:null,count,DAILY_STARTER_LIMIT),
   env.DB.prepare(`INSERT INTO collection_transactions(user_id,request_id,operation,receipt,created_at) SELECT ?,?,?,?,? WHERE changes() = 1`)
    .bind(user.id,body.requestId,operation,JSON.stringify(receipt),receipt.createdAt)
  ]);
  if(result[0].meta.changes===1)return respond(receipt);
 }
 return json(env,{error:'collection busy; retry'},409);
}
