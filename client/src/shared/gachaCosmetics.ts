/** Selected 01 / 02 / 03. Furniture and sleeve are independent rewards. */
export const GACHA_THEMES=[
 {variant:0,key:'tidal',ja:'蒼潮の硝子',en:'Tidal Glass',ko:'푸른 물결의 유리'},
 {variant:1,key:'ivory',ja:'象牙の翼綴',en:'Ivory Wingbinding',ko:'상아의 날개'},
 {variant:2,key:'rose',ja:'黒紅の開花',en:'Black Rose Bloom',ko:'흑홍의 개화'}
] as const;
export type GachaVariant=typeof GACHA_THEMES[number]['variant'];
export const gachaArt=(variant:GachaVariant)=>`/cosmetics/gacha-trio-v1/${GACHA_THEMES[variant].key}.webp`;
export const gachaFromUrl=(url:string|null|undefined)=>url?GACHA_THEMES.find(t=>url.includes(`/cosmetics/gacha-trio-v1/${t.key}.webp`)):undefined;
