import {CARD_FRAMES} from './cardFrames';
import {COFFER_SLEEVE,COFFER_FURNITURE,COFFER_ART,COFFER_FURNITURE_ART} from './mimicCofferCosmetics';
import {ELFWEAVE_SLEEVE,ELFWEAVE_FURNITURE,ELFWEAVE_ART,ELFWEAVE_FURNITURE_ART} from './elfweaveCosmetics';
import {QUIET_LUXURY_THEMES,quietLuxuryId,quietLuxuryArt} from './quietLuxuryCosmetics';
import {AMETHYST_SLEEVE,AMETHYST_FURNITURE,AMETHYST_ART,AMETHYST_FURNITURE_ART} from './amethystCosmetics';
import {GOLDFAULT_SLEEVE,GOLDFAULT_FURNITURE,GOLDFAULT_ART,GOLDFAULT_FURNITURE_ART} from './goldfaultCosmetics';
import {isCardEffect} from './cardEffects';
import {GACHA_THEMES,gachaArt} from './gachaCosmetics';
export interface Cosmetic {id:string;kind:'sleeve'|'furniture'|'frame';url:string;ko:string;ja:string;en:string;price:number;gachaOnly?:boolean;}
export const GACHA_COSMETICS:Cosmetic[]=GACHA_THEMES.flatMap(t=>[
 {id:'sleeve:gacha-'+t.key,kind:'sleeve' as const,url:gachaArt(t.variant),ja:t.ja+'のスリーブ',en:t.en+' Sleeve',ko:t.ko+' 슬리브',price:1000,gachaOnly:true},
 {id:'furniture:gacha-'+t.key,kind:'furniture' as const,url:gachaArt(t.variant),ja:t.ja+'のデッキ置き場＆墓地',en:t.en+' Deck Holder & Graveyard',ko:t.ko+' 덱 받침 & 묘지',price:1000,gachaOnly:true}
]);
GACHA_COSMETICS.push(
 {id:GOLDFAULT_SLEEVE,kind:'sleeve',url:GOLDFAULT_ART,ja:'金脈の黒曜のスリーブ',en:'Goldfault Sleeve',ko:'금맥의 흑요석 슬리브',price:1000,gachaOnly:true},
 {id:GOLDFAULT_FURNITURE,kind:'furniture',url:GOLDFAULT_FURNITURE_ART,ja:'金脈の黒曜のデッキ置き場＆墓地',en:'Goldfault Deck Holder & Graveyard',ko:'금맥의 흑요석 덱 받침 & 묘지',price:1000,gachaOnly:true}
);
GACHA_COSMETICS.push(...QUIET_LUXURY_THEMES.flatMap(t=>(['sleeve','furniture'] as const).map(kind=>({id:quietLuxuryId(t.variant,kind),kind,url:quietLuxuryArt(t.variant,kind),ja:t.ja+(kind==='sleeve'?'のスリーブ':'のデッキ置き場＆墓地'),en:t.en+(kind==='sleeve'?' Sleeve':' Deck Holder & Graveyard'),ko:t.ko+(kind==='sleeve'?' 슬리브':' 덱 받침 & 묘지'),price:1000,gachaOnly:true}))));
GACHA_COSMETICS.push(
 {id:AMETHYST_SLEEVE,kind:'sleeve',url:AMETHYST_ART,ja:'紫晶の断層のスリーブ',en:'Amethyst Cleft Sleeve',ko:'자수정 단층 슬리브',price:1000,gachaOnly:true},
 {id:AMETHYST_FURNITURE,kind:'furniture',url:AMETHYST_FURNITURE_ART,ja:'紫晶の断層のデッキ置き場＆墓地',en:'Amethyst Cleft Deck Holder & Graveyard',ko:'자수정 단층 덱 받침 & 묘지',price:1000,gachaOnly:true}
);
GACHA_COSMETICS.push(
 {id:ELFWEAVE_SLEEVE,kind:'sleeve',url:ELFWEAVE_ART,ja:'エルフの葉織のスリーブ',en:'Elven Leafweave Sleeve',ko:'엘프의 잎직조 슬리브',price:1000,gachaOnly:true},
 {id:ELFWEAVE_FURNITURE,kind:'furniture',url:ELFWEAVE_FURNITURE_ART,ja:'エルフの葉織のデッキ置き場＆墓地',en:'Elven Leafweave Deck Holder & Graveyard',ko:'엘프의 잎직조 덱 받침 & 묘지',price:1000,gachaOnly:true}
);
GACHA_COSMETICS.push(
 {id:COFFER_SLEEVE,kind:'sleeve',url:COFFER_ART,ja:'貪欲な宝箱のスリーブ',en:'The Hungry Coffer Sleeve',ko:'탐욕의 보물상자 슬리브',price:1000,gachaOnly:true},
 {id:COFFER_FURNITURE,kind:'furniture',url:COFFER_FURNITURE_ART,ja:'貪欲な宝箱のデッキ置き場＆墓地',en:'The Hungry Coffer Deck Holder & Graveyard',ko:'탐욕의 보물상자 덱 받침 & 묘지',price:1000,gachaOnly:true}
);
// Gacha cosmetics and directly sold frame materials. Unknown legacy equipment
// resolves to the standard appearance through equipmentId/sleeveUrl.
export const COSMETICS:Cosmetic[] = [...GACHA_COSMETICS,...CARD_FRAMES];
export const FURNITURE_LIST=COSMETICS.filter(c=>c.kind==='furniture');
export const cosmetic=(id:string)=>COSMETICS.find(c=>c.id===id);
export const furnitureUrl=(id:string|null|undefined)=>FURNITURE_LIST.find(c=>c.id===id)?.url;
export function ownedCosmetics(raw:string|null|undefined):string[]{try{const ids=JSON.parse(raw||'[]');return ['default',...new Set<string>(Array.isArray(ids)?ids.filter((id:unknown)=>typeof id==='string'&&(!!cosmetic(id)||isCardEffect(id))):[])];}catch{return ['default'];}}

export function equipmentId(value:unknown,kind:Cosmetic['kind']):string {
 return typeof value==='string'&&cosmetic(value)?.kind===kind?value:'default';
}
