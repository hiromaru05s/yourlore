import {LIVING_THEMES,livingArt} from './livingCosmetics';
import {THEMES,asset} from './atelierThemes';
export interface Cosmetic {id:string;kind:'sleeve'|'furniture';url:string;ko:string;ja:string;en:string;price:number;}
const themes=[['astral','星図','Star Atlas','성도'],['verdant','翠葉','Verdant','녹엽'],['crimson','緋印','Crimson Seal','홍인'],['ivory','白銀','Ivory Moon','백은']] as const;
export const COSMETICS:Cosmetic[]=themes.flatMap(([key,ja,en,ko])=>[
 {id:key,kind:'sleeve' as const,url:`/cosmetics/v2/sleeve-${key}.webp`,ja:`${ja}のスリーブ`,en:`${en} Sleeve`,ko:`${ko} 슬리브`,price:0},
 {id:`furniture:${key}`,kind:'furniture' as const,url:`/cosmetics/v2/material-${key}.webp`,ja:`${ja}のデッキ置き場＆墓地`,en:`${en} Deck Holder & Graveyard`,ko:`${ko} 덱 받침 & 묘지`,price:0}
]);
COSMETICS.push(...THEMES.flatMap(t=>[
 {id:t.id,kind:'sleeve' as const,url:asset(t,'back.webp'),ja:t.name+'のスリーブ',en:t.en+' Sleeve',ko:t.name,price:0},
 {id:'furniture:'+t.id,kind:'furniture' as const,url:asset(t,'body.webp'),ja:t.name+'のデッキ置き場＆墓地',en:t.en+' Deck Holder & Graveyard',ko:t.name,price:0}
]));
COSMETICS.push(...LIVING_THEMES.flatMap(t=>[
 {id:t.id,kind:'sleeve' as const,url:livingArt(t.id),ja:t.ja+'のスリーブ',en:t.en+' Sleeve',ko:t.ko+' 슬리브',price:0},
 {id:'furniture:'+t.id,kind:'furniture' as const,url:livingArt(t.id),ja:t.ja+'のデッキ置き場＆墓地',en:t.en+' Deck Holder & Graveyard',ko:t.ko+' 덱 받침 & 묘지',price:0}
]));
export const FURNITURE_LIST=COSMETICS.filter(c=>c.kind==='furniture');
export const cosmetic=(id:string)=>COSMETICS.find(c=>c.id===id);
export const furnitureUrl=(id:string|null|undefined)=>FURNITURE_LIST.find(c=>c.id===id)?.url;
export function ownedCosmetics(raw:string|null|undefined):string[]{try{const ids=JSON.parse(raw||'[]');return ['default',...new Set<string>(Array.isArray(ids)?ids.filter((id:unknown)=>typeof id==='string'&&!!cosmetic(id)):[])];}catch{return ['default'];}}

export function equipmentId(value:unknown,kind:Cosmetic['kind']):string {
 return typeof value==='string'&&cosmetic(value)?.kind===kind?value:'default';
}
