export type Family = 'shield' | 'dew' | 'brand';
export type Study = {id:string;family:Family;name:string;en:string;description:string;duration:number;mode:number};
export const families:Family[]=['shield','dew','brand'];
export const names:Record<Family,string>={shield:'シールド',dew:'雫',brand:'烙印'};
export const art:Record<Family,string>={shield:'/art/biblion/modular/shield-ui.webp',dew:'/art/biblion/modular/dew-ui.webp',brand:'/art/biblion/modular/brand-seal-ui.png'};
export const studies:Study[]=[
 {id:'S1',family:'shield',name:'霜鋼の破断',en:'Brittle release',description:'亀裂が走り、厚い破片が一度だけ弾ける。断面から細く消える。',duration:940,mode:0},
 {id:'S2',family:'shield',name:'甲殻の折畳',en:'Inward armour',description:'左右の装甲が時間差で内側へ折れ、中央の細い継ぎ目に閉じる。',duration:1040,mode:1},
 {id:'S3',family:'shield',name:'銀箔の剥離',en:'Silver delamination',description:'盾の表面が細い箔に分かれ、反りながら薄くほどける。',duration:1120,mode:2},
 {id:'S4',family:'shield',name:'輪郭の失効',en:'Hollow ward',description:'青い面が中心から抜け、残された銀縁が内側へ崩れる。',duration:960,mode:3},
 {id:'D1',family:'dew',name:'毛細の吸収',en:'Capillary drain',description:'雫が下端へ吸い込まれ、厚い液面から細い糸へつながる。',duration:1100,mode:4},
 {id:'D2',family:'dew',name:'水膜の破裂',en:'Ruptured meniscus',description:'水膜に開いた穴が広がり、三日月状の液縁がちぎれて縮む。',duration:880,mode:5},
 {id:'D3',family:'dew',name:'双滴の離水',en:'Liquid necking',description:'上下に引かれた雫がくびれ、つながる糸が切れて二滴が消える。',duration:1160,mode:6},
 {id:'D4',family:'dew',name:'蒸露の昇華',en:'Rising evaporation',description:'上縁から液体が反り上がり、細い蒸気の帯へ変わる。',duration:1180,mode:7},
 {id:'B1',family:'brand',name:'封蝋の熔落',en:'Wax yielding',description:'赤い封蝋と金縁が熱でたわみ、重さを持って滴り落ちる。',duration:1200,mode:8},
 {id:'B2',family:'brand',name:'呪紋の焼却',en:'Scorched seal',description:'斜めに進む焦げ目が封印を食み、反った炭化片を焼き切る。',duration:1040,mode:9},
 {id:'B3',family:'brand',name:'赤糸の解呪',en:'Unbound inscription',description:'印面が渦巻く細帯へ連続してほどけ、赤金の糸が引き抜かれる。',duration:1220,mode:10},
 {id:'B4',family:'brand',name:'封印の脱殻',en:'Released shell',description:'封蝋の外殻が三方向へめくれ、裏面を見せながら砕け落ちる。',duration:1080,mode:11},
];
export const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export const smooth=(a:number,b:number,x:number)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
/** Only a positive -> zero edge qualifies; decrements and repeated zero do not. */
export const isExtinction=(before:number,after:number)=>Number.isFinite(before)&&before>0&&after===0;
