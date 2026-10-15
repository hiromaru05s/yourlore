/** User selection, 2026-10-15. Values are zero-based preview indices. */
export const POISON_SELECTION = {POISON_MASTER:2,RUST_SLUG:0,RUST_SHROOM:3} as const;
export type CardId=keyof typeof POISON_SELECTION;
export function isPoisonSummon(id:unknown):id is CardId{return typeof id==='string'&&Object.prototype.hasOwnProperty.call(POISON_SELECTION,id);}
export const DURATION=2800,CONTACT_MS=640;
export const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export const ease=(a:number,b:number,t:number)=>{const x=clamp((t-a)/(b-a));return x*x*(3-2*x);};
export function cardHeight(ms:number,reduced=false){const u=clamp(ms/CONTACT_MS);return reduced?0:62*(1-u*u);}
