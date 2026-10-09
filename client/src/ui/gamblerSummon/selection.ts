/** User selection, 2026-10-09: Gambler 01, Legendary Gambler 02. */
export const GAMBLER_VARIANTS={GAMBLER:0,LEGEND_GAMBLER:1} as const;
export type GamblerId=keyof typeof GAMBLER_VARIANTS;
export function isGambler(id:unknown):id is GamblerId{return id==='GAMBLER'||id==='LEGEND_GAMBLER';}
