import type { Env } from './env';
import { ONBOARDING_BASICS } from '../../client/src/shared/onboarding';
import { TUT_STEPS } from '../../client/src/shared/tutorialSteps';
import { SINGLE_READ_PREFIX, STORY_SCENES, type SingleProgress, type StoryScene } from '../../client/src/shared/singleStory';
/** Only settled matches and validated completion receipts count. Client flags are never trusted. */
export async function singleProgress(env:Env, id:string):Promise<SingleProgress> {
  const [receipts,matches] = await Promise.all([
    env.DB.prepare('SELECT key FROM rewards WHERE user_id=?').bind(id).all<{key:string}>(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM duel_reward_receipts WHERE user_id=? AND mode='online'").bind(id).first<{count:number}>(),
  ]);
  const keys=new Set(receipts.results.map(r=>r.key));
  return {
    tutorial:keys.has(ONBOARDING_BASICS)||TUT_STEPS.every(step=>keys.has(step.key)),
    normalMatches:matches?.count??0,
    botClears:['easy','normal','hard'].filter(d=>keys.has('bot:first:'+d)),
    ariesCleared:keys.has('story:aries:clear'),
    read:STORY_SCENES.filter(scene=>keys.has(SINGLE_READ_PREFIX+scene)),
  };
}
export async function saveSingleScene(env:Env,id:string,scene:StoryScene):Promise<void> {
  await env.DB.prepare('INSERT OR IGNORE INTO rewards(user_id,key,amount,created_at) VALUES(?,?,0,?)').bind(id,SINGLE_READ_PREFIX+scene,Date.now()).run();
}
