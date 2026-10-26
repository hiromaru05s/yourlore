import type {CardEffectId} from './cardEffects';
import {DECK_POOL, DECK_MAX_COPIES, sanitizeDeck, type DeckStore} from './cards';
export type StarterCollection = Record<string, number>;
export const STARTER_PRICE = 100;
export const GACHA_PRICE = 100;
export const DUPLICATE_REFUNDS = {starter:50, cosmetic:100, effect:500} as const;
// Each category is selected first; its items then use equal unbiased odds.
export const ACTIVE_GACHA_RATES = {starter:92.5, cosmetic:7, effect:0.5} as const;
export const PLANNED_GACHA_RATES = ACTIVE_GACHA_RATES;
export function gachaCategory(roll:number):'starter'|'cosmetic'|'effect' {
 if(!Number.isInteger(roll)||roll<0||roll>=10000)throw Error('Invalid gacha roll');
 return roll<9250?'starter':roll<9950?'cosmetic':'effect';
}
export const COLLECTIBLE_STARTERS = DECK_POOL.filter(id=>id!=='STARTER_TRASH'&&id!=='STARTER_MANA');
export function starterCollection(raw?:unknown):StarterCollection {
 if(typeof raw==='string'){try{raw=JSON.parse(raw);}catch{raw=null;}}
 const input=raw&&typeof raw==='object'?raw as Record<string,unknown>:{};
 const result:StarterCollection={STARTER_TRASH:8,STARTER_MANA:1,STARTER_CHEST:2};
 for(const id of COLLECTIBLE_STARTERS){const n=input[id];result[id]=typeof n==='number'&&Number.isInteger(n)?Math.max(id==='STARTER_CHEST'?2:0,Math.min(DECK_MAX_COPIES,n)):(result[id]??0);}
 return result;
}
export function ownsDeck(cards:string[],owned:StarterCollection):boolean {
 const counts:Record<string,number>={};
 return cards.every(id=>(counts[id]=(counts[id]??0)+1)<=(owned[id]??0));
}
export function constrainDeckStore(store:DeckStore,owned:StarterCollection):DeckStore {
 return {...store,list:store.list.map(slot=>{const counts:Record<string,number>={};return {...slot,cards:sanitizeDeck(slot.cards.filter(id=>(counts[id]=(counts[id]??0)+1)<=(owned[id]??0)))};})};
}
export interface StarterReward {kind?:'starter';id:string;refund:number;owned:number}
export interface EffectReward {kind:'effect';id:CardEffectId;refund:number;owned:number}
export interface EmptyReward {kind:'empty';id:'cosmetic-pending';refund:0;owned:0}
export interface CosmeticReward {kind:'cosmetic';id:string;refund:number;owned:number}
export type CollectionReward=StarterReward|EffectReward|EmptyReward|CosmeticReward;
export interface CollectionReceipt {requestId:string;kind:'buy'|'draw';cost:number;refund:number;rewards:CollectionReward[];createdAt:number}
export interface DailyStarterShop {day:string;resetsAt:number;serverNow:number;cards:string[];remaining:Record<string,number>}
export interface CollectionState {dailyShop?:DailyStarterShop;credits:number;starterCards:StarterCollection;effects?:string[];cosmetics?:string[]}
export interface CollectionResult extends CollectionState {receipt:CollectionReceipt}
