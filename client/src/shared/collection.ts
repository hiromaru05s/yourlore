import {DECK_POOL, DECK_MAX_COPIES, sanitizeDeck, type DeckStore} from './cards';
export type StarterCollection = Record<string, number>;
export const STARTER_PRICE = 200;
export const GACHA_PRICE = 100;
export const DUPLICATE_REFUNDS = {starter:50, cosmetic:100, effect:500} as const;
export const PLANNED_GACHA_RATES = {starter:90, cosmetic:9.5, effect:0.5} as const;
// Temporary release: the cosmetic/effect catalogs are not ready.
export const ACTIVE_GACHA_RATES = {starter:100, cosmetic:0, effect:0} as const;
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
export interface StarterReward {id:string;refund:number;owned:number}
export interface CollectionReceipt {requestId:string;kind:'buy'|'draw';cost:number;refund:number;rewards:StarterReward[];createdAt:number}
export interface CollectionState {credits:number;starterCards:StarterCollection}
export interface CollectionResult extends CollectionState {receipt:CollectionReceipt}
