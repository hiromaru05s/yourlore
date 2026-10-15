/** Approved atelier 03, 2026-10-16. Two independent gacha rewards. */
export const GOLDFAULT_SLEEVE='sleeve:gacha-goldfault';
export const GOLDFAULT_FURNITURE='furniture:gacha-goldfault';
export const GOLDFAULT_ART='/cosmetics/goldfault-v1/sleeve.png';
export const GOLDFAULT_FURNITURE_ART='/cosmetics/goldfault-v1/furniture.png';
export const isGoldfaultSleeve=(url:string|null|undefined)=>!!url?.includes(GOLDFAULT_ART);
export const isGoldfaultFurniture=(url:string|null|undefined)=>!!url?.includes(GOLDFAULT_FURNITURE_ART);
