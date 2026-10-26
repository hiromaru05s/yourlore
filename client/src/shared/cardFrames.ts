/** Account-owned frame materials, equipped independently of art effects/sleeves. */
export const CARD_FRAMES = [
 {id:'frame:mirror-silver',kind:'frame',material:0,ja:'鏡面の銀',en:'Mirror Silver',ko:'거울 은빛',price:30_000,url:'/art/biblion/modular/base-spell-ui.webp'},
 {id:'frame:flowing-gold',kind:'frame',material:1,ja:'流光の金',en:'Flowing Gold',ko:'흐르는 금빛',price:50_000,url:'/art/biblion/modular/base-spell-ui.webp'},
 {id:'frame:nacre-prism',kind:'frame',material:3,ja:'虹彩の真珠',en:'Nacre Prism',ko:'무지갯빛 진주',price:100_000,url:'/art/biblion/modular/base-spell-ui.webp'},
 {id:'frame:obsidian-ember',kind:'frame',material:2,ja:'黒曜の熔脈',en:'Obsidian Ember',ko:'흑요석 용맥',price:200_000,url:'/art/biblion/modular/base-spell-ui.webp'},
 {id:'frame:verdigris-runes',kind:'frame',material:4,ja:'翠銅の秘紋',en:'Verdigris Runes',ko:'녹동의 비문',price:200_000,url:'/art/biblion/modular/base-spell-ui.webp'},
] as const;
export type CardFrameId = typeof CARD_FRAMES[number]['id'];
export const isCardFrame=(value:unknown):value is CardFrameId=>CARD_FRAMES.some(f=>f.id===value);
export const cardFrameId=(value:unknown):string=>isCardFrame(value)?value:'default';
export const frameMaterial=(value:unknown)=>CARD_FRAMES.find(f=>f.id===value)?.material;
