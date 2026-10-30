import type {Env} from './env';
import {DAILY_LOGIN_SHARDS,DAILY_LOGIN_ISSUER,LOGIN_GIFT_NO_EXPIRY,dailyLoginPeriod,dailyLoginGiftCopy} from '../../client/src/shared/dailyLoginGift';

/** Global immutable message per date; delivery PK gates each account independently.
 * No credits are added here. The existing atomic gift-claim transaction pays it.
 * Only an authenticated visit calls this; offline/missed days are never backfilled.
 */
export async function ensureDailyLoginGift(env:Env,userId:string,now=Date.now()):Promise<void> {
 const period=dailyLoginPeriod(now),copy=dailyLoginGiftCopy(period.day,DAILY_LOGIN_SHARDS,'ja');
 await env.DB.batch([
  env.DB.prepare(`INSERT OR IGNORE INTO gift_messages(id,title,body,amount,created_at,expires_at,created_by,audience)
    SELECT ?,?,?,?,?,?,?,'daily-login' WHERE EXISTS(SELECT 1 FROM users WHERE id=?)`)
   .bind(period.id,copy.title,copy.body,DAILY_LOGIN_SHARDS,period.startsAt,LOGIN_GIFT_NO_EXPIRY,DAILY_LOGIN_ISSUER,userId),
  env.DB.prepare(`INSERT OR IGNORE INTO gift_deliveries(gift_id,user_id)
    SELECT m.id,u.id FROM gift_messages m JOIN users u ON u.id=?
    WHERE m.id=? AND m.created_by=? AND m.amount=?`)
   .bind(userId,period.id,DAILY_LOGIN_ISSUER,DAILY_LOGIN_SHARDS),
 ]);
}
