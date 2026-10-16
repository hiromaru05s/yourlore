/** Approved set 02: each piece is an independent reward and equipment slot. */
export const AMETHYST_SLEEVE='sleeve:gacha-amethyst-cleft';
export const AMETHYST_FURNITURE='furniture:gacha-amethyst-cleft';
export const AMETHYST_ART='/cosmetics/amethyst-cleft-v1/sleeve.png';
export const AMETHYST_FURNITURE_ART='/cosmetics/amethyst-cleft-v1/furniture.png';
export const AMETHYST_PALETTE={id:'amethyst-cleft',body:'#231334',metal:'#8e77af',accent:'#c3a1fa'} as const;
export const isAmethystSleeve=(url?:string)=>!!url?.includes(AMETHYST_ART);
export const isAmethystFurniture=(url?:string)=>!!url?.includes(AMETHYST_FURNITURE_ART);
