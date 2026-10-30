import {ensureDailyLoginGift} from './dailyLoginGift';
import {DAILY_LOGIN_ISSUER,DAILY_LOGIN_PREFIX,dailyLoginPeriod} from '../../client/src/shared/dailyLoginGift';
import type {Env} from './env';
import {corsHeaders,getUser} from './auth';
import type {GiftInbox,GiftItem,GiftClaim} from '../../client/src/shared/gifts';
const json=(env:Env,data:unknown,status=200)=>Response.json(data,{status,headers:{...corsHeaders(env),'Cache-Control':'no-store'}});
const idOK=(id:unknown):id is string=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(id);
export async function giftInbox(env:Env,userId:string,now=Date.now()):Promise<GiftInbox>{
 const rows=await env.DB.prepare(`SELECT m.id,m.title,m.body,m.amount,m.created_at AS createdAt,m.expires_at AS expiresAt,d.read_at AS readAt,d.claimed_at AS claimedAt,CASE WHEN m.created_by=? THEN 'daily-login' END AS kind,CASE WHEN m.created_by=? THEN substr(m.id,13) END AS day
 FROM gift_deliveries d JOIN gift_messages m ON m.id=d.gift_id WHERE d.user_id=?
 ORDER BY CASE WHEN d.claimed_at IS NULL AND m.expires_at>? THEN 0 ELSE 1 END,m.created_at DESC,m.id LIMIT 300`).bind(DAILY_LOGIN_ISSUER,DAILY_LOGIN_ISSUER,userId,now).all<GiftItem>();
 const summary=await env.DB.prepare(`SELECT COUNT(*) AS n,COALESCE(SUM(CASE WHEN d.read_at IS NULL THEN 1 ELSE 0 END),0) AS unread,COALESCE(SUM(m.amount),0) AS amount FROM gift_deliveries d JOIN gift_messages m ON m.id=d.gift_id WHERE d.user_id=? AND d.claimed_at IS NULL AND m.expires_at>?`).bind(userId,now).first<{n:number;unread:number;amount:number}>();
 return {items:rows.results??[],pendingCount:summary?.n??0,unreadCount:summary?.unread??0,pendingAmount:summary?.amount??0,now,resetsAt:dailyLoginPeriod(now).resetsAt};
}
export async function claimGifts(env:Env,userId:string,id:string|null,now=Date.now()):Promise<GiftClaim>{
 const token=crypto.randomUUID();
 // Every mutation and the returned receipt share one transaction. Only this
 // request's newly claimed rows can add to the balance; retries add zero.
 const result=await env.DB.batch<GiftClaim>([
  env.DB.prepare(`UPDATE gift_deliveries SET claimed_at=?,read_at=COALESCE(read_at,?),claim_token=? WHERE user_id=? AND claimed_at IS NULL AND (? IS NULL OR gift_id=?) AND EXISTS(SELECT 1 FROM gift_messages m WHERE m.id=gift_id AND m.expires_at>?)`).bind(now,now,token,userId,id,id,now),
  env.DB.prepare(`UPDATE users SET credits=credits+COALESCE((SELECT SUM(m.amount) FROM gift_deliveries d JOIN gift_messages m ON m.id=d.gift_id WHERE d.user_id=? AND d.claim_token=?),0) WHERE id=?`).bind(userId,token,userId),
  env.DB.prepare(`INSERT INTO rewards(user_id,key,amount,created_at) SELECT d.user_id,'gift:'||m.id,m.amount,? FROM gift_deliveries d JOIN gift_messages m ON m.id=d.gift_id WHERE d.user_id=? AND d.claim_token=?`).bind(now,userId,token),
  env.DB.prepare(`SELECT COUNT(*) AS count,COALESCE(SUM(m.amount),0) AS amount,(SELECT credits FROM users WHERE id=?) AS credits FROM gift_deliveries d JOIN gift_messages m ON m.id=d.gift_id WHERE d.user_id=? AND d.claim_token=?`).bind(userId,userId,token),
 ]);
 return result[3].results[0];
}
export async function handleGifts(env:Env,req:Request,path:string):Promise<Response>{
 if(req.method==='OPTIONS')return new Response(null,{headers:corsHeaders(env)});
 const user=await getUser(env,req);if(!user)return json(env,{error:'unauthorized'},401);
 if(path==='/gifts'&&req.method==='GET'){
  const now=Date.now();await ensureDailyLoginGift(env,user.id,now);
  return json(env,await giftInbox(env,user.id,now));
 }
 if(req.method==='POST'&&(path==='/gifts/read'||path==='/gifts/claim')){
  const body=await req.json().catch(()=>null) as {id?:unknown;all?:unknown}|null;
  if(path==='/gifts/read'){
   if(!idOK(body?.id))return json(env,{error:'invalid gift'},400);
   await env.DB.prepare('UPDATE gift_deliveries SET read_at=COALESCE(read_at,?) WHERE user_id=? AND gift_id=?').bind(Date.now(),user.id,body.id).run();
   return json(env,{ok:true});
  }
  if(body?.all!==true&&!idOK(body?.id))return json(env,{error:'invalid gift'},400);
  return json(env,await claimGifts(env,user.id,body?.all===true?null:body!.id as string));
 }
 return json(env,{error:'not found'},404);
}
/** Called only after the isolated admin route authenticates its operator. */
export async function issueGift(env:Env,req:Request,operator:string):Promise<Response>{
 const b=await req.json().catch(()=>null) as {id?:unknown;title?:unknown;body?:unknown;amount?:unknown;expiresAt?:unknown;userId?:unknown;all?:unknown}|null;
 const now=Date.now();
 if(!b||!idOK(b.id)||b.id.startsWith(DAILY_LOGIN_PREFIX)||typeof b.title!=='string'||!b.title.trim()||b.title.length>100||typeof b.body!=='string'||!b.body.trim()||b.body.length>2000||!Number.isSafeInteger(b.amount)||Number(b.amount)<1||Number(b.amount)>100000||!Number.isSafeInteger(b.expiresAt)||Number(b.expiresAt)<=now||Number(b.expiresAt)>now+366*86400000||(b.all===true?b.userId!==undefined:!idOK(b.userId)))return json(env,{error:'invalid gift'},400);
 const audience=b.all===true?'all':b.userId as string;
 if(audience!=='all'&&!await env.DB.prepare('SELECT id FROM users WHERE id=?').bind(audience).first())return json(env,{error:'unknown recipient'},404);
 // Immutable IDs are the operator's idempotency key. Retrying never adds new
 // recipients or replaces a previously issued amount/message.
 const [insert]=await env.DB.batch([
  env.DB.prepare('INSERT OR IGNORE INTO gift_messages(id,title,body,amount,created_at,expires_at,created_by,audience) VALUES(?,?,?,?,?,?,?,?)').bind(b.id,b.title.trim(),b.body.trim(),b.amount,now,b.expiresAt,operator,audience),
  env.DB.prepare(`INSERT INTO gift_deliveries(gift_id,user_id) SELECT ?,id FROM users WHERE changes()=1 AND (?='all' OR id=?) AND created_at<=?`).bind(b.id,audience,audience,now),
 ]);
 const saved=await env.DB.prepare('SELECT title,body,amount,expires_at AS expiresAt,audience FROM gift_messages WHERE id=?').bind(b.id).first<{title:string;body:string;amount:number;expiresAt:number;audience:string}>();
 if(!saved||saved.title!==b.title.trim()||saved.body!==b.body.trim()||saved.amount!==b.amount||saved.expiresAt!==b.expiresAt||saved.audience!==audience)return json(env,{error:'gift id already used with different content'},409);
 const count=await env.DB.prepare('SELECT COUNT(*) AS n FROM gift_deliveries WHERE gift_id=?').bind(b.id).first<{n:number}>();
 return json(env,{id:b.id,created:(insert.meta.changes??0)>0,recipients:count?.n??0});
}
