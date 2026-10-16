/** Approved Roots 02. Furniture and sleeve are independent gacha rewards. */
export const ELFWEAVE_SLEEVE='sleeve:gacha-elfweave';
export const ELFWEAVE_FURNITURE='furniture:gacha-elfweave';
export const ELFWEAVE_ART='/cosmetics/elfweave-v1/sleeve.png';
export const ELFWEAVE_FURNITURE_ART='/cosmetics/elfweave-v1/furniture.png';
export const isElfweaveSleeve=(url:string|null|undefined)=>!!url?.includes(ELFWEAVE_ART);
export const isElfweaveFurniture=(url:string|null|undefined)=>!!url?.includes(ELFWEAVE_FURNITURE_ART);
