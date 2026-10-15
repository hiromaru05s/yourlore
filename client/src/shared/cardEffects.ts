/** Account-owned, deck-selected card surface finishes. */
export const CRYSTAL_EFFECT='effect:crystal-facets';
export const CARD_EFFECTS=[
 {id:CRYSTAL_EFFECT,ja:'星晶の刻面',en:'Crystal Facets',ko:'성정의 각면',url:'/cosmetics/effect-crystal.svg'},
 {id:'effect:stardust-foil',ja:'星砂箔',en:'Stardust Foil',ko:'별모래 포일',url:'/cosmetics/effect-stardust.svg'},
 {id:'effect:prism-veil',ja:'虹彩の薄膜',en:'Prism Veil',ko:'무지개 박막',url:'/cosmetics/effect-prism.svg'}
] as const;
export type CardEffectId=typeof CARD_EFFECTS[number]['id'];
export function isCardEffect(value:unknown):value is CardEffectId {return CARD_EFFECTS.some(e=>e.id===value);}
export function cardEffectId(value:unknown):string {return isCardEffect(value)?value:'default';}
