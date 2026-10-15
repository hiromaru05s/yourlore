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
