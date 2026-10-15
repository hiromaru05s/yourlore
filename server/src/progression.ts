import { starterCollection } from '../../client/src/shared/collection';
import type { Env } from './env';
import { EXP_PER_LEVEL, MAX_EXP, LEVEL_MILESTONES, type ExperienceReceipt } from '../../client/src/shared/progression';

// Cumulative rewards at an EXP total. Milestones REPLACE the ordinary 100.
function rewardSql(exp: string): string {
  return `(CAST((${exp}) / ${EXP_PER_LEVEL} AS INTEGER) * 100 ${Object.entries(LEVEL_MILESTONES).map(([level, amount]) => `+ CASE WHEN (${exp}) >= ${(Number(level)-1)*EXP_PER_LEVEL} THEN ${amount-100} ELSE 0 END`).join(' ')})`;
}
/** Must be executed together in a D1 batch. No read/compute/write race between rooms.
 * The event PK gates both balance and EXP updates; all four writes roll back together. */
export function experienceStatements(env: Env, userId: string, key: string, amount: number, at = Date.now()): D1PreparedStatement[] {
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > MAX_EXP) throw Error('invalid EXP award');
  const next = `MIN(${MAX_EXP}, exp + ${amount})`;
  return [
    env.DB.prepare(`INSERT OR IGNORE INTO player_experience(user_id) SELECT id FROM users WHERE id=?`).bind(userId),
    env.DB.prepare(`INSERT OR IGNORE INTO experience_events(user_id,key,before_exp,after_exp,shards,created_at)
      SELECT user_id,?,exp,${next},${rewardSql(next)}-${rewardSql('exp')},? FROM player_experience WHERE user_id=?`).bind(key,at,userId),
    env.DB.prepare(`UPDATE users SET credits=credits+(SELECT shards FROM experience_events WHERE user_id=? AND key=?) WHERE id=? AND changes()=1`).bind(userId,key,userId),
    env.DB.prepare(`UPDATE player_experience SET exp=(SELECT after_exp FROM experience_events WHERE user_id=? AND key=?) WHERE user_id=? AND changes()=1`).bind(userId,key,userId),
  ];
}
export async function experienceReceipt(env: Env, userId: string, key: string): Promise<ExperienceReceipt | null> {
  return env.DB.prepare(`SELECT key,before_exp AS before,after_exp AS after,shards FROM experience_events WHERE user_id=? AND key=?`).bind(userId,key).first<ExperienceReceipt>();
}

import type { PlayerState } from '../../client/src/shared/types';
import { DECK_POOL, BUYABLE_POOL } from '../../client/src/shared/cards';
import { BOT_REWARDS, MATCH_REWARDS, QUESTS, questProgress, rewardDay, type DailyQuest, type QuestState, type ProgressionState } from '../../client/src/shared/progression';
export { rewardDay } from '../../client/src/shared/progression';
interface Row { day:string; revision:number; quest:string; progress:number; claimed:number }
const isHuman=(id:string)=>!id.startsWith('lore-test-bot-')&&!id.startsWith('lore-challenge-bot-');
const decode=(r:Row):QuestState=>({day:r.day,revision:r.revision,quest:JSON.parse(r.quest),progress:r.progress,claimed:!!r.claimed,rerollsLeft:Math.max(0,3-r.revision)});
function choose(starters:string[],previous?:DailyQuest):DailyQuest {
 const pool=QUESTS.filter(q=>q.kind!==previous?.kind),roll=crypto.getRandomValues(new Uint32Array(2));
 const quest={...pool[roll[0]%pool.length]};
 // Use the real playable catalogs; never assign retired cards or token-only cards.
 if(quest.kind==='starterWin')quest.card=starters[roll[1]%starters.length];
 if(quest.kind==='playCard'){const cards=[...new Set([...starters,...BUYABLE_POOL])];quest.card=cards[roll[1]%cards.length];}
 return quest;
}
async function eligibleStarters(env:Env,id:string):Promise<string[]> {
 const user=await env.DB.prepare('SELECT starter_cards FROM users WHERE id=?').bind(id).first<{starter_cards:string|null}>();
 const owned=starterCollection(user?.starter_cards);
 return DECK_POOL.filter(id=>(owned[id]??0)>0);
}
export async function ensureDaily(env:Env,id:string,now=Date.now()):Promise<QuestState> {
 const day=rewardDay(now),select=()=>env.DB.prepare('SELECT * FROM daily_challenges WHERE user_id=? AND day=?').bind(id,day).first<Row>();
 const existing=await select();if(existing)return decode(existing);
 const starters=await eligibleStarters(env,id);
 await env.DB.prepare('INSERT OR IGNORE INTO daily_challenges (user_id,day,quest) VALUES (?,?,?)').bind(id,day,JSON.stringify(choose(starters))).run();
 const row=await select();if(!row)throw Error('daily quest unavailable');return decode(row);
}
export async function progressionState(env:Env,id:string,now=Date.now()):Promise<ProgressionState> {
 const daily=await ensureDaily(env,id,now);
 const [rows,bots,user]=await Promise.all([
 env.DB.prepare('SELECT mode,SUM(amount) amount FROM duel_reward_receipts WHERE user_id=? AND day=? GROUP BY mode').bind(id,daily.day).all<{mode:string;amount:number}>(),
 env.DB.prepare("SELECT key FROM rewards WHERE user_id=? AND key LIKE 'bot:first:%'").bind(id).all<{key:string}>(),
 env.DB.prepare('SELECT credits FROM users WHERE id=?').bind(id).first<{credits:number}>(),
 ]);
 const bot:ProgressionState['bot']={};for(const r of bots.results??[])bot[r.key.slice(10) as keyof typeof BOT_REWARDS]=true;
 const spent=(mode:string)=>(rows.results??[]).find(r=>r.mode===mode)?.amount??0;
 return {daily,bot,online:spent('online'),ranked:spent('ranked'),credits:user?.credits??0,resetsAt:Date.parse(daily.day+'T00:00:00+09:00')+86400_000};
}
export async function rerollDaily(env:Env,id:string,day:unknown,revision:unknown,now=Date.now()):Promise<boolean> {
 const current=await ensureDaily(env,id,now);
 if(day!==current.day||revision!==current.revision||current.claimed||current.progress>=current.quest.target||current.rerollsLeft===0)return false;
 const starters=await eligibleStarters(env,id);
 const result=await env.DB.prepare('UPDATE daily_challenges SET quest=?,progress=0,revision=revision+1 WHERE user_id=? AND day=? AND revision=? AND claimed=0 AND progress<?')
 .bind(JSON.stringify(choose(starters,current.quest)),id,current.day,current.revision,current.quest.target).run();
 return (result.meta.changes??0)>0;
}
export interface Settlement { matchId:string; userId:string; mode:'online'|'ranked'|'bot'; difficulty?:keyof typeof BOT_REWARDS; won:boolean|null; player:PlayerState; deck:string[]; daily?:QuestState; endedAt:number }
/** Receipt, progress, cap and currency changes share one D1 transaction. Retries are harmless. */
export async function settleProgression(env:Env,s:Settlement):Promise<void> {
 if(!isHuman(s.userId))return;
 const {DB:db}=env,day=rewardDay(s.endedAt),q=s.daily;
 const statements:D1PreparedStatement[]=[];
 const add=(sql:string,...args:(string|number|null)[])=>statements.push(db.prepare(sql).bind(...args));
 const absent='NOT EXISTS (SELECT 1 FROM duel_reward_receipts WHERE user_id=? AND match_id=?)';
 if(q && q.day===day){
  const increment=questProgress(q.quest,s.player,s.won===true,s.deck);
  add(`UPDATE daily_challenges SET progress=MIN(?,progress+?) WHERE user_id=? AND day=? AND revision=? AND claimed=0 AND ${absent}`,q.quest.target,increment,s.userId,day,q.revision,s.userId,s.matchId);
  // A unique reward key and changes() make crediting atomic even across simultaneous matches.
  add(`INSERT OR IGNORE INTO rewards (user_id,key,amount,created_at) SELECT user_id,?,?,? FROM daily_challenges WHERE user_id=? AND day=? AND revision=? AND progress>=? AND claimed=0`, 'daily:'+day,q.quest.reward,s.endedAt,s.userId,day,q.revision,q.quest.target);
  add('UPDATE users SET credits=credits+? WHERE id=? AND changes()=1',q.quest.reward,s.userId);
  add(`UPDATE daily_challenges SET claimed=1 WHERE user_id=? AND day=? AND EXISTS (SELECT 1 FROM rewards WHERE user_id=? AND key=?)`,s.userId,day,s.userId,'daily:'+day);
 }
 if(s.mode==='bot'&&s.difficulty&&s.won===true){
  const amount=BOT_REWARDS[s.difficulty];
  add('INSERT OR IGNORE INTO rewards (user_id,key,amount,created_at) VALUES (?,?,?,?)',s.userId,'bot:first:'+s.difficulty,amount,s.endedAt);
  add('UPDATE users SET credits=credits+? WHERE id=? AND changes()=1',amount,s.userId);
 }
 const rule=s.mode==='bot'?null:MATCH_REWARDS[s.mode];
 const base=rule&&s.won!==null?(s.won?rule.win:rule.loss):0;
 add(`INSERT OR IGNORE INTO duel_reward_receipts (user_id,match_id,day,mode,amount,created_at)
 VALUES (?,?,?,?,MIN(?,MAX(0,?-(SELECT COALESCE(SUM(amount),0) FROM duel_reward_receipts WHERE user_id=? AND day=? AND mode=?))),?)`,s.userId,s.matchId,day,s.mode,base,rule?.cap??0,s.userId,day,s.mode,s.endedAt);
 add('UPDATE users SET credits=credits+(SELECT amount FROM duel_reward_receipts WHERE user_id=? AND match_id=?) WHERE id=? AND changes()=1',s.userId,s.matchId,s.userId);
 await db.batch(statements);
}
