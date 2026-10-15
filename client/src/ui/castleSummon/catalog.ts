export type Id='CASTLE';
export const DURATION=2600;
/** 01 has no remaining stone geometry after this point. */
export const STONE_CLEAR_MS=2440;
export const ease=(a:number,b:number,t:number)=>{const x=Math.max(0,Math.min(1,(t-a)/(b-a)));return x*x*(3-2*x)};
/** Approved 01, including the native card seam correction. */
export function isCastle(id:unknown):id is 'CASTLE'{return id==='CASTLE';}
