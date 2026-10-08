import {DB} from '../../shared/cards';
export const ids=['VAMP1','VAMP2','VAMP3','VAMP4','VAMP5','VAMP_BUTLER'] as const;
export type Id=typeof ids[number];
export const DURATION=3400,CONTACT=2260;
export const ease=(a:number,b:number,t:number)=>{const u=Math.max(0,Math.min(1,(t-a)/(b-a)));return u*u*(3-2*u);};
export const title=(id:Id)=>DB[id].nameJa||DB[id].name;
export const rank=(id:Id)=>id==='VAMP_BUTLER'?2:ids.indexOf(id)+1;
export const designs=[
 {name:'緋漆の解封',en:'SANGUINE LACQUER',material:'血液 / 張力と濡れた反射',note:'カード面を覆う緋色の膜が中央から割れ、縁へ引き戻される。'},
 {name:'夜絹の開帳',en:'VELVET REVEAL',material:'黒絹 / 刺繍と布の重み',note:'絵柄から立ち上がった黒い布が、しなりながら左右へほどける。'},
 {name:'黒棺の覚醒',en:'OBSIDIAN CASKET',material:'黒曜 / 厚みと蝶番',note:'輪郭に沿う黒曜の棺蓋が開き、銀の断面を見せて盤面へ沈む。'},
 {name:'夜翼の抱擁',en:'NOCTURNE WINGS',material:'翼膜 / 骨格と薄い透過',note:'カードを包んだ一対の翼が関節から開き、折り畳まれて縁へ戻る。'},
 {name:'血薔薇の開花',en:'CRIMSON BLOOM',material:'緋硝子 / 花弁の重なり',note:'重なる血色の花弁が外から順に開き、着地の波で低く伏せる。'},
 {name:'銀血の織成',en:'SILVERBLOOD WEAVE',material:'銀箔 / 彫金と巻き戻り',note:'カードの細部をなぞる銀の薄片が、段差を付けて巻きほどける。'},
];
export function physics(ms:number,reduced=false){const u=Math.max(0,Math.min(1,(ms-1610)/(CONTACT-1610)));const height=reduced||ms>=CONTACT?0:62*ease(0,420,ms)*(1-u*u);return {height,contact:CONTACT,underside:height};}
export const phase=(ms:number)=>ms<420?'予兆':ms<1050?'被覆・溜め':ms<1610?'解放':ms<CONTACT?'降下':ms<2900?'接地・余韻':'収束';
