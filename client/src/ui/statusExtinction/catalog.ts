export type Family = 'shield' | 'dew' | 'brand';
export type Study = {id:string;family:Family;name:string;en:string;description:string;duration:number;mode:number};
export const families:Family[]=['shield','dew','brand'];
export const names:Record<Family,string>={shield:'シールド',dew:'雫',brand:'烙印'};
export const art:Record<Family,string>={shield:'/art/biblion/modular/shield-ui.webp',dew:'/art/biblion/modular/dew-ui.webp',brand:'/art/biblion/modular/brand-seal-ui.png'};
export const studies:Study[]=[
 {id:'S1',family:'shield',name:'霜鋼の破断',en:'Brittle release',description:'亀裂が走り、厚い破片が一度だけ弾ける。断面から細く消える。',duration:940,mode:0},
 {id:'D2',family:'dew',name:'水膜の破裂',en:'Ruptured meniscus',description:'水膜に開いた穴が広がり、三日月状の液縁がちぎれて縮む。',duration:880,mode:5},
 {id:'B2',family:'brand',name:'呪紋の焼却',en:'Scorched seal',description:'斜めに進む焦げ目が封印を食み、反った炭化片を焼き切る。',duration:1040,mode:9},
];
export const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export const smooth=(a:number,b:number,x:number)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
/** Only a positive -> zero edge qualifies; decrements and repeated zero do not. */
export const isExtinction=(before:number,after:number)=>Number.isFinite(before)&&before>0&&after===0;
export const approvedExtinction=(family:Family):Study=>studies.find(s=>s.family===family)!;
