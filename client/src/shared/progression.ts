/** Shared progression rules. Awards are settled by the server. */
export const MAX_LEVEL = 50;
export const EXP_PER_LEVEL = 100;
export const MAX_EXP = (MAX_LEVEL - 1) * EXP_PER_LEVEL;
export const BOT_FIRST_CLEAR_EXP = { easy: 20, normal: 35, hard: 60, hell: 120 } as const;
export type ClearDifficulty = keyof typeof BOT_FIRST_CLEAR_EXP;
export const ONLINE_WIN_EXP = 20;
export const ONLINE_LOSS_EXP = 5;
export const LEVEL_MILESTONES: Record<number, number> = {10:300,20:500,30:700,40:1000,50:3000};
export function levelReward(level: number): number {
  return Number.isInteger(level) && level >= 2 && level <= MAX_LEVEL ? LEVEL_MILESTONES[level] ?? 100 : 0;
}
export function seekerLevel(exp = 0) {
  const total = Math.min(MAX_EXP, Math.max(0, Number.isFinite(exp) ? Math.floor(exp) : 0));
  const level = 1 + Math.floor(total / EXP_PER_LEVEL);
  return {level, total, progress: level === MAX_LEVEL ? 0 : total % EXP_PER_LEVEL, required: EXP_PER_LEVEL, max: level === MAX_LEVEL};
}
export interface ExperienceReceipt {
  key: string;
  before: number;
  after: number;
  shards: number;
}

import { DB, STARTERS } from './cards';
import type { PlayerState } from './types';
export const BOT_REWARDS = { easy: 300, normal: 500, hard: 1000, hell: 2000 } as const;
export const MATCH_REWARDS = { online: { win: 10, loss: 5, cap: 100 }, ranked: { win: 20, loss: 10, cap: 300 } } as const;
export type Activity = 'shield'|'heal'|'damage'|'decay'|'rift'|'draw'|'counter';
export type QuestKind = Activity|'starterWin'|'buySpell'|'buyMonster'|'playSpell'|'playExpensive'|'playCard';
export interface DailyQuest { kind: QuestKind; target: number; reward: number; card?: string }
export const QUESTS: DailyQuest[] = [
 {kind:'starterWin',target:3,reward:300}, {kind:'shield',target:20,reward:350},
 {kind:'heal',target:40,reward:300}, {kind:'damage',target:150,reward:350},
 {kind:'buySpell',target:30,reward:400}, {kind:'buyMonster',target:20,reward:300},
 {kind:'decay',target:3,reward:400}, {kind:'rift',target:30,reward:350},
 {kind:'draw',target:10,reward:400}, {kind:'counter',target:3,reward:350},
 {kind:'playSpell',target:50,reward:350}, {kind:'playExpensive',target:20,reward:350},
 {kind:'playCard',target:1,reward:350},
];
export function trackActivity(p: PlayerState, key: Activity, amount = 1): void {
 if (p.activity && amount > 0) p.activity[key] = (p.activity[key] ?? 0) + amount;
}
export function questProgress(q: DailyQuest, p: PlayerState, won: boolean, deck: string[]): number {
 if(q.kind==='starterWin')return won && deck.includes(q.card!) ? 1 : 0;
 if(q.kind==='playCard')return p.uses[q.card!]??0;
 if(q.kind==='buySpell'||q.kind==='buyMonster'||q.kind==='playSpell'||q.kind==='playExpensive') {
  const entries=q.kind.startsWith('buy')?p.buys:p.uses;
  return Object.entries(entries??{}).reduce((sum,[id,n])=>{
   const c=DB[id]??STARTERS[id];if(!c)return sum;
   const ok=q.kind==='playExpensive'?c.cost>=5:q.kind==='buyMonster'?c.t==='mon':c.t==='spell'||c.t==='quest';
   return sum+(ok?n:0);
  },0);
 }
 return p.activity?.[q.kind]??0;
}
export interface QuestState { day:string; revision:number; quest:DailyQuest; progress:number; claimed:boolean; rerollsLeft:number }
export interface ProgressionState { daily:QuestState; bot:Partial<Record<keyof typeof BOT_REWARDS,boolean>>; online:number; ranked:number; credits:number; resetsAt:number }
export const rewardDay=(now=Date.now()):string=>new Date(now+9*3600_000).toISOString().slice(0,10);
