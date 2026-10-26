import {tutorialStatus,grantTutorial} from './tutorialRewards';
import { progressionState, rerollDaily } from './progression';
import { BOT_REWARDS } from '../../client/src/shared/progression';
import { botNpc } from '../../client/src/shared/botNpcs';
import { TUT_STEPS } from '../../client/src/shared/tutorialSteps';
import { replayLesson, TUTORIAL_ACTION_LIMIT } from '../../client/src/shared/tutorialLesson';
import { isClientMessage } from './gameInput';
import type { TutorialAction } from '../../client/src/shared/tutorialLesson';
// ============================================================
// LORE server — one-shot credit rewards (tutorial steps, …).
// The client only ever sends a reward KEY; amounts live here
// (server-authoritative) and the rewards table's PK guarantees
// each (user, key) is paid at most once.
// ============================================================
import type { Env } from "./env";
import { corsHeaders, getUser } from "./auth";

/** Retired keys: retained to recognize old clients; these no longer issue payments. */
export const REWARDS: Record<string, number> = {
  // legacy 6-step tutorial (kept so old grads' claims stay valid) — total 150
  "tut:1": 10, "tut:2": 20, "tut:3": 25, "tut:4": 25, "tut:5": 30, "tut:6": 40,
  // Active interactive tutorial — 9 steps, total 890; existing keys stay stable.
  "tuto:1": 50,   // 화면 이해
  "tuto:2": 70,   // 카드 구매
  "tuto:3": 80,   // 제시 리롤
  "tuto:4": 90,   // 몬스터 소환
  "tuto:5": 100,  // 마법 시전
  "tuto:6": 90,   // 공격
  "tuto:7": 110,  // retired trap lesson; retained for legacy clients/claims only
  "tuto:8": 130,  // 종족 시너지
  "tuto:9": 80,   // 어튠
  "tuto:10": 200, // 승리
};


function isTutorialTranscriptAction(action:unknown):boolean {
 if(!action||typeof action!=='object'||Array.isArray(action))return false;
 const a=action as Record<string,unknown>;
 if(a.type==='continueLesson')return Object.keys(a).length===1;
 if(a.type==='answer')return Object.keys(a).length===2&&Number.isInteger(a.choice)&&Number(a.choice)>=0&&Number(a.choice)<2;
 return isClientMessage({type:'action',action});
}

function json(env: Env, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(env) },
  });
}

export async function handleRewards(env: Env, req: Request, path: string): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(env) });
  const user = await getUser(env, req);
  if (!user) return json(env, { error: "로그인이 필요합니다." }, 401);

  if(path==='/rewards/result'&&req.method==='GET') {
    const roomId=new URL(req.url).searchParams.get('roomId')??'';
    if(!/^[A-Za-z0-9_-]{1,128}$/.test(roomId))return json(env,{error:'invalid room'},400);
    const matchId=env.GAME_ROOM.idFromName(roomId).toString();
    const receipt=await env.DB.prepare('SELECT amount FROM duel_reward_receipts WHERE user_id=? AND match_id=?').bind(user.id,matchId).first<{amount:number}>();
    return json(env,{settled:!!receipt,amount:receipt?.amount??0});
  }
  if (path === '/rewards/progression' && req.method === 'GET') return json(env, await progressionState(env,user.id));
  if (path === '/rewards/daily/reroll' && req.method === 'POST') {
    const body=await req.json() as {day?:unknown;revision?:unknown};
    const changed=await rerollDaily(env,user.id,body.day,body.revision);
    return json(env,{...await progressionState(env,user.id),changed},changed?200:409);
  }
  if (path === '/rewards/bot/start' && req.method === 'POST') {
    const body=await req.json() as {difficulty?:unknown;lang?:unknown};
    if(typeof body.difficulty!=='string'||!Object.hasOwn(BOT_REWARDS,body.difficulty))return json(env,{error:'invalid difficulty'},400);
    const difficulty=body.difficulty as keyof typeof BOT_REWARDS,npc=botNpc(difficulty);
    const roomId=crypto.randomUUID(),botId='lore-challenge-bot-'+difficulty;
    const lang=body.lang==='en'?'en':body.lang==='ko'?'ko':'ja';
    const response=await env.GAME_ROOM.get(env.GAME_ROOM.idFromName(roomId)).fetch(new Request('https://room/setup',{method:'POST',body:JSON.stringify({
      players:[{id:user.id,name:user.display,deck:user.deck?.join(','),sleeve:user.sleeve,furniture:user.furniture,effect:user.effect,frame:user.frame},{id:botId,name:npc.name[lang]}],
      seed:crypto.getRandomValues(new Uint32Array(1))[0],challengeDifficulty:difficulty,
    })}));
    if(!response.ok)return json(env,{error:'could not start duel'},503);
    return json(env,{roomId,you:0,oppName:npc.name[lang],oppAvatar:npc.avatar,difficulty});
  }

  if (path === '/rewards/tutorial' && req.method === 'GET') {
    return json(env,await tutorialStatus(env,user.id,user.credits));
  }
  if (path === '/rewards/tutorial/decision' && req.method === 'POST') {
    const body = await req.json().catch(()=>null) as {decision?:unknown}|null;
    if(body?.decision !== 'start' && body?.decision !== 'skip')return json(env,{error:'invalid decision'},400);
    await env.DB.prepare('INSERT OR IGNORE INTO rewards (user_id,key,amount,created_at) VALUES (?,?,0,?)')
      .bind(user.id,`tutorial:v3:intro:${body.decision}`,Date.now()).run();
    return json(env,{ok:true});
  }
  if (path === '/rewards/tutorial/complete' && req.method === 'POST') {
    // Bound transcript input before invoking the same deterministic reducer as the client.
    const reader=req.body?.getReader(),decoder=new TextDecoder();
    let raw='',bytes=0;
    if(reader)try {
      for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;
        if(bytes>24576){await reader.cancel();return json(env,{error:'tutorial transcript too large'},413);}
        raw+=decoder.decode(value,{stream:true});
      }
      raw+=decoder.decode();
    }finally{reader.releaseLock();}
    let body: {lesson?:unknown;actions?:unknown};
    try { body=JSON.parse(raw); } catch {return json(env,{error:'invalid transcript'},400);}
    const lesson=TUT_STEPS.find(s=>s.id===body?.lesson);
    const actions=body?.actions;
    if(!lesson || !Array.isArray(actions) || actions.length>TUTORIAL_ACTION_LIMIT || !actions.every(action=>isTutorialTranscriptAction(action)))return json(env,{error:'invalid transcript'},400);
    let complete=false;
    try {complete=replayLesson(lesson.id,actions as TutorialAction[]);} catch { /* Invalid replay is never a reward. */ }
    if(!complete)return json(env,{error:'lesson not completed'},400);
    return json(env,await grantTutorial(env,user.id,lesson.id));
  }

  // GET /rewards/claimed → keys already paid to this user (+ current balance)
  if (path === "/rewards/claimed" && req.method === "GET") {
    const rows = await env.DB.prepare(`SELECT key FROM rewards WHERE user_id = ?`)
      .bind(user.id).all<{ key: string }>();
    return json(env, { keys: (rows.results ?? []).map((r) => r.key), credits: user.credits });
  }

  // POST /rewards/claim: retired unverified tutorial route.
  if (path === "/rewards/claim" && req.method === "POST") {
    const body = (await req.json().catch(() => ({}))) as { key?: string };
    const key = typeof body?.key === 'string' ? body.key : '';
    const amount = Object.hasOwn(REWARDS,key) ? REWARDS[key] : 0;
    if (!amount) return json(env, { error: "unknown reward" }, 400);

    // Historical rows remain readable for migration accounting. New rewards
    // require the validated lesson transcript at /rewards/tutorial/complete.
    return json(env, { error: "legacy reward retired; complete the current tutorial" }, 410);
  }

  // POST /rewards/coupon { code } → redeem a coupon code (once per user unless explicitly repeatable)
  if (path === "/rewards/coupon" && req.method === "POST") {
    const body = (await req.json().catch(() => ({}))) as { code?: string };
    const code = (typeof body?.code === 'string' ? body.code : '').trim().toUpperCase().slice(0, 32);
    if (!code) return json(env, { error: "쿠폰 코드를 입력하세요." }, 400);
    const c = await env.DB.prepare(`SELECT code, amount, max_uses, uses, expires_at, repeatable FROM coupons WHERE code = ?`)
      .bind(code).first<{ code: string; amount: number; max_uses: number | null; uses: number; expires_at: number | null; repeatable: number }>();
    if (!c) return json(env, { error: "존재하지 않는 쿠폰입니다." }, 404);
    if (c.expires_at != null && c.expires_at < Date.now()) return json(env, { error: "만료된 쿠폰입니다." }, 410);
    if (c.max_uses != null && c.uses >= c.max_uses) return json(env, { error: "소진된 쿠폰입니다." }, 410);
    const [ins] = await env.DB.batch([
      env.DB.prepare(`INSERT INTO coupon_claims (code,user_id,created_at)
        SELECT code,?,? FROM coupons WHERE code=? AND (max_uses IS NULL OR uses<max_uses) AND (expires_at IS NULL OR expires_at>=?)
        ON CONFLICT(code,user_id) DO UPDATE SET claim_count=coupon_claims.claim_count+1,created_at=excluded.created_at
        WHERE (SELECT repeatable FROM coupons WHERE code=excluded.code)=1`)
        .bind(user.id,Date.now(),code,Date.now()),
      env.DB.prepare(`UPDATE users SET credits = credits + (SELECT amount FROM coupons WHERE code=?) WHERE id=? AND changes()=1`).bind(code,user.id),
      env.DB.prepare(`UPDATE coupons SET uses = uses + 1 WHERE code = ? AND changes()=1`).bind(code),
    ]);
    if ((ins.meta?.changes ?? 0) === 0) {
      const prior=await env.DB.prepare(`SELECT 1 AS claimed FROM coupon_claims WHERE code=? AND user_id=?`).bind(code,user.id).first();
      const alreadyUsed=prior&&!c.repeatable;
      return json(env,{error:alreadyUsed ? '이미 사용한 쿠폰입니다.' : '소진되었거나 만료된 쿠폰입니다.'},alreadyUsed ? 409 : 410);
    }
    const row = await env.DB.prepare(`SELECT credits FROM users WHERE id = ?`).bind(user.id).first<{ credits: number }>();
    return json(env, { granted: true, amount: c.amount, credits: row?.credits ?? 0 });
  }

  return json(env, { error: "not found" }, 404);
}
