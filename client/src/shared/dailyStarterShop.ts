import {COLLECTIBLE_STARTERS,type DailyStarterShop} from './collection';
const DAY=86_400_000,KST=9*3_600_000;
export const DAILY_STARTER_LIMIT=2;
/** Stable across users, processes and timezones; independent of purchases. */
export function dailyStarterShop(now:number):DailyStarterShop {
 const dayNumber=Math.floor((now+KST)/DAY);
 const day=new Date(dayNumber*DAY).toISOString().slice(0,10);
 // A fixed shuffled cycle makes consecutive days different, including at wrap.
 const pool=[...COLLECTIBLE_STARTERS].sort();
 let seed=0x4c4f5245;
 for(let i=pool.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[pool[i],pool[j]]=[pool[j],pool[i]];}
 const start=((dayNumber*5)%pool.length+pool.length)%pool.length;
 const cards=Array.from({length:5},(_,i)=>pool[(start+i)%pool.length]);
 return {day,serverNow:now,resetsAt:(dayNumber+1)*DAY-KST,cards,remaining:Object.fromEntries(cards.map(id=>[id,DAILY_STARTER_LIMIT]))};
}
