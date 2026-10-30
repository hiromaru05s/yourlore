import type {Env,SessionUser} from './env';
import {ONBOARDING_BASICS,ONBOARDING_DECK,ONBOARDING_DONE,ONBOARDING_DRAW,ONBOARDING_BUY,ONBOARDING_REWARD,type OnboardingStatus} from '../../client/src/shared/onboarding';
import {createPartRun} from '../../client/src/shared/tutorialParts';
import {advanceLesson,tutorialActionAllowed,TUTORIAL_ACTION_LIMIT,type TutorialAction} from '../../client/src/shared/tutorialLesson';
import {isClientMessage} from './gameInput';

export async function onboardingStatus(env:Env,userId:string):Promise<OnboardingStatus>{
 const result=await env.DB.batch<{key?:string;request_id?:string;credits?:number}>([
  env.DB.prepare('SELECT key FROM rewards WHERE user_id=? AND key IN (?,?,?)').bind(userId,ONBOARDING_BASICS,ONBOARDING_DECK,ONBOARDING_DONE),
  env.DB.prepare('SELECT request_id FROM collection_transactions WHERE user_id=? AND request_id IN (?,?)').bind(userId,ONBOARDING_DRAW,ONBOARDING_BUY),
  env.DB.prepare('SELECT credits FROM users WHERE id=?').bind(userId),
 ]);
 const keys=result[0].results.map(r=>r.key),transactions=result[1].results.map(r=>r.request_id);
 const stage=!keys.includes(ONBOARDING_BASICS)?'basics':!transactions.includes(ONBOARDING_DRAW)?'gacha':!transactions.includes(ONBOARDING_BUY)?'starter':!keys.includes(ONBOARDING_DECK)?'deck':!keys.includes(ONBOARDING_DONE)?'book':'complete';
 return {stage,credits:Number(result[2].results[0]?.credits??0)};
}
export function replayBasics(actions:unknown):boolean {
 if(!Array.isArray(actions)||!actions.length||actions.length>TUTORIAL_ACTION_LIMIT)return false;
 const run=createPartRun(0);
 try {for(const action of actions){
  if(!isClientMessage({type:'action',action})||!tutorialActionAllowed(run,action as TutorialAction))return false;
  advanceLesson(run,action as TutorialAction);
 }}catch{return false;}
 return run.phase==='review'&&run.step===run.scenes[0].steps.length;
}
export async function handleOnboarding(env:Env,req:Request,path:string,user:SessionUser|null):Promise<Response>{
 const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
 if(!user)return json({error:'login required'},401);
 if(path==='/api/onboarding'&&req.method==='GET')return json(await onboardingStatus(env,user.id));
 if(req.method!=='POST')return json({error:'not found'},404);
 if(path==='/api/onboarding/basics'){
  const reader=req.body?.getReader(),decoder=new TextDecoder();let raw='',bytes=0;
  if(reader)try{for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>24576){await reader.cancel();return json({error:'transcript too large'},413);}raw+=decoder.decode(value,{stream:true});}raw+=decoder.decode();}finally{reader.releaseLock();}
  let actions:unknown;try{actions=JSON.parse(raw)?.actions;}catch{return json({error:'invalid transcript'},400);}
  if(!replayBasics(actions))return json({error:'basics not completed'},400);
  const result=await env.DB.batch([
   env.DB.prepare('INSERT OR IGNORE INTO rewards(user_id,key,amount,created_at) VALUES(?,?,?,?)').bind(user.id,ONBOARDING_BASICS,ONBOARDING_REWARD,Date.now()),
   env.DB.prepare('UPDATE users SET credits=credits+? WHERE id=? AND changes()=1').bind(ONBOARDING_REWARD,user.id),
  ]);
  return json({...await onboardingStatus(env,user.id),granted:result[0].meta.changes===1,amount:result[0].meta.changes===1?ONBOARDING_REWARD:0});
 }
 if(path==='/api/onboarding/finish'){
  const status=await onboardingStatus(env,user.id);
  if(status.stage!=='book'&&status.stage!=='complete')return json({error:'finish the starter deck first'},409);
  await env.DB.prepare('INSERT OR IGNORE INTO rewards(user_id,key,amount,created_at) VALUES(?,?,0,?)').bind(user.id,ONBOARDING_DONE,Date.now()).run();
  return json(await onboardingStatus(env,user.id));
 }
 return json({error:'not found'},404);
}
