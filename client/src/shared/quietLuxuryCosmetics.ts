/** Approved quiet luxury collection: three independently equipable pairs. */
export const QUIET_LUXURY_THEMES=[
 {variant:0,key:'lacquer',ja:'黒漆の一閃',en:'Lacquer Gleam',ko:'흑칠의 섬광'},
 {variant:1,key:'porcelain',ja:'白磁の余白',en:'Porcelain Silence',ko:'백자의 여백'},
 {variant:2,key:'emerald',ja:'翠硝子の封印',en:'Emerald Glass Seal',ko:'비취 유리의 봉인'}
] as const;
export type QuietLuxuryVariant=typeof QUIET_LUXURY_THEMES[number]['variant'];
export const quietLuxuryId=(variant:QuietLuxuryVariant,kind:'sleeve'|'furniture')=>`${kind}:quiet-${QUIET_LUXURY_THEMES[variant].key}`;
export const quietLuxuryArt=(variant:QuietLuxuryVariant,kind:'sleeve'|'furniture'='sleeve')=>`/cosmetics/quiet-luxury-v1/${QUIET_LUXURY_THEMES[variant].key}-${kind}.png`;
export const quietLuxuryFromUrl=(url:string|null|undefined,kind:'sleeve'|'furniture'='sleeve')=>url?QUIET_LUXURY_THEMES.find(t=>url.includes(quietLuxuryArt(t.variant,kind))):undefined;
