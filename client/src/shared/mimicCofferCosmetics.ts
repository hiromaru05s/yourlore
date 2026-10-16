/** Approved mimic 01: two independently owned gacha rewards. */
export const COFFER_SLEEVE='sleeve:gacha-mimic-coffer';
export const COFFER_FURNITURE='furniture:gacha-mimic-coffer';
export const COFFER_ART='/cosmetics/mimic-coffer-v1/sleeve.png';
export const COFFER_FURNITURE_ART='/cosmetics/mimic-coffer-v1/furniture.png';
export const isCofferSleeve=(url:string|null|undefined)=>!!url?.includes(COFFER_ART);
export const isCofferFurniture=(url:string|null|undefined)=>!!url?.includes(COFFER_FURNITURE_ART);
