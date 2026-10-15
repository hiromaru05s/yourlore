import type {Env} from './env';
import {LEGACY_TUTORIAL_IDS,TUT_STEPS,TUTORIAL_TOTAL,tutorialAward,type LessonId} from '../../client/src/shared/tutorialSteps';
const legacyKeys=LEGACY_TUTORIAL_IDS.map(id=>`tutorial:v2:${id}`);
const legacySlots=legacyKeys.map(()=>'?').join(',');
/** Snapshot the old paid budget once; learning completion uses separate v3 receipts. */
function initialize(env:Env,userId:string){
 return env.DB.prepare(`INSERT OR IGNORE INTO tutorial_accounts(user_id,legacy_paid,created_at)
 SELECT ?, MIN(3000,COALESCE(SUM(amount),0)), ? FROM rewards WHERE user_id=? AND key IN (${legacySlots})`)
 .bind(userId,Date.now(),userId,...legacyKeys);
}
export async function tutorialStatus(env:Env,userId:string,credits:number){
 await initialize(env,userId).run();
 const [claims,account]=await Promise.all([
  env.DB.prepare('SELECT key,amount FROM rewards WHERE user_id=?').bind(userId).all<{key:string;amount:number}>(),
  env.DB.prepare('SELECT legacy_paid FROM tutorial_accounts WHERE user_id=?').bind(userId).first<{legacy_paid:number}>(),
 ]);
 const rows=claims.results??[],keys=rows.map(r=>r.key),legacyPaid=account?.legacy_paid??0;
 const awarded=rows.filter(r=>legacyKeys.includes(r.key)||TUT_STEPS.some(s=>s.key===r.key)).reduce((n,r)=>n+r.amount,0);
 return {keys,credits,legacyPaid,awarded,offered:keys.some(k=>k.startsWith('tutorial:v2:')||k.startsWith('tutorial:v3:')),amounts:Object.fromEntries(TUT_STEPS.map(s=>[s.id,tutorialAward(s.id,legacyPaid)]))};
}
export async function grantTutorial(env:Env,userId:string,id:LessonId){
 const index=TUT_STEPS.findIndex(s=>s.id===id),lesson=TUT_STEPS[index];
 const before=TUT_STEPS.slice(0,index).reduce((n,s)=>n+s.reward,0),after=before+lesson.reward;
 const allKeys=[...legacyKeys,...TUT_STEPS.map(s=>s.key)],slots=allKeys.map(()=>'?').join(',');
 // Every payment and receipt is in one D1 transaction. The cap is calculated in SQL,
 // not from a prior request, so simultaneous completions cannot overspend the budget.
 const result=await env.DB.batch([
  initialize(env,userId),
  env.DB.prepare(`INSERT OR IGNORE INTO rewards(user_id,key,amount,created_at)
   SELECT ?,?,MAX(0,MIN(
    ? - COALESCE((SELECT SUM(amount) FROM rewards WHERE user_id=? AND key IN (${slots})),0),
    CAST(? * (? - legacy_paid) / ? AS INTEGER) - CAST(? * (? - legacy_paid) / ? AS INTEGER)
   )),? FROM tutorial_accounts WHERE user_id=?`)
   .bind(userId,lesson.key,TUTORIAL_TOTAL,userId,...allKeys,after,TUTORIAL_TOTAL,TUTORIAL_TOTAL,before,TUTORIAL_TOTAL,TUTORIAL_TOTAL,Date.now(),userId),
  env.DB.prepare('UPDATE users SET credits=credits+(SELECT amount FROM rewards WHERE user_id=? AND key=?) WHERE id=? AND changes()=1').bind(userId,lesson.key,userId),
  env.DB.prepare('SELECT amount FROM rewards WHERE user_id=? AND key=?').bind(userId,lesson.key),
  env.DB.prepare('SELECT credits FROM users WHERE id=?').bind(userId),
 ]);
 const granted=(result[1].meta?.changes??0)>0;
 const amount=Number((result[3].results?.[0] as {amount?:number}|undefined)?.amount??0);
 const credits=Number((result[4].results?.[0] as {credits?:number}|undefined)?.credits??0);
 return {granted,amount:granted?amount:0,credits};
}
