/** One server-calendar login gift per account per JST/KST date (UTC+09:00). */
export const DAILY_LOGIN_SHARDS = 10_000;
export const DAILY_LOGIN_PREFIX = 'daily-login-';
export const DAILY_LOGIN_ISSUER = 'system:daily-login';
// Existing gift storage uses a required timestamp. This sentinel means no expiry.
export const LOGIN_GIFT_NO_EXPIRY = 253_402_300_799_999;
const DAY = 86_400_000, OFFSET = 9 * 3_600_000;
export function dailyLoginPeriod(now:number) {
 const number=Math.floor((now+OFFSET)/DAY),startsAt=number*DAY-OFFSET;
 const day=new Date(number*DAY).toISOString().slice(0,10);
 return {day,id:DAILY_LOGIN_PREFIX+day,startsAt,resetsAt:startsAt+DAY};
}
export type GiftLocale='ja'|'ko'|'en';
export function dailyLoginGiftCopy(day:string,amount:number,lang:GiftLocale) {
 const n=amount.toLocaleString('en-US');
 return {
  ja:{title:`毎日のログインボーナス（${day}）`,body:`ログインありがとうございます。本日のボーナスとして${n}シャードをお届けします。\n毎日0:00（JST／KST）に更新されます。プレゼントBOXからお受け取りください。`},
  ko:{title:`일일 로그인 보너스 (${day})`,body:`로그인해 주셔서 감사합니다. 오늘의 보너스로 ${n} 샤드를 드립니다.\n매일 0:00(KST/JST)에 갱신됩니다. 선물함에서 받아 주세요.`},
  en:{title:`Daily login bonus (${day})`,body:`Thanks for logging in! Your bonus for today is ${n} Shards.\nResets daily at 00:00 JST/KST (UTC+09:00). Collect it from your Gift Box.`},
 }[lang];
}
