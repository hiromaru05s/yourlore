import {DB} from '../../shared/cards';
export const ids=['VAMP1','VAMP2','VAMP3','VAMP4','VAMP5','VAMP_BUTLER'] as const;
export type Id=typeof ids[number];
export const DURATION=3400,CONTACT=2260;
export const ease=(a:number,b:number,t:number)=>{const u=Math.max(0,Math.min(1,(t-a)/(b-a)));return u*u*(3-2*u);};
export const title=(id:Id)=>DB[id].nameJa||DB[id].name;
export const rank=(id:Id)=>id==='VAMP_BUTLER'?2:ids.indexOf(id)+1;
export const designs=[
 {name:'緋流の凝結',en:'SANGUINE CURRENT',material:'血の流れ → 絵柄への凝結',note:'濡れた血流が捻れながら立ち上がり、細い流れからカード面へ戻る。'},
 {name:'夜翼の帰還',en:'NOCTURNE EMBRACE',material:'翼膜 → 内側へ畳む一拍',note:'翼の付け根から膜が広がる。先端が遅れて追い付き、内側へ畳まれる。'},
 {name:'荊薔薇の覚醒',en:'THORN ROSE',material:'花弁 → 芯からの開花',note:'芯から花弁がほどけ、外周の荊が遅れて回る。花の中心に絵柄が現れる。'},
 {name:'黒衣の顕現',en:'VESPER MANTLE',material:'影布 → 重い裾の揺れ',note:'黒衣が上から下へ形を取り、波打つ裾を引いてカードへ溶ける。'},
 {name:'血晶の解放',en:'HEMATIC FRACTURE',material:'黒曜と血晶 → 収束・亀裂',note:'離れた結晶面が収束。圧縮された血の核から亀裂が走り、絵柄を解放する。'},
 {name:'銀血の戴冠',en:'SILVERBLOOD CORONATION',material:'彫銀 → 枝ごとの鋳造',note:'中央から銀の枝が組み上がる。冠が面へ押し込まれ、一筋の箔光が残る。'},
];
export function physics(ms:number,reduced=false){const u=Math.max(0,Math.min(1,(ms-1610)/(CONTACT-1610)));const height=reduced||ms>=CONTACT?0:62*ease(0,420,ms)*(1-u*u);return {height,contact:CONTACT,underside:height};}
export const phase=(ms:number)=>ms<420?'予兆':ms<1050?'被覆・溜め':ms<1610?'解放':ms<CONTACT?'降下':ms<2900?'接地・余韻':'収束';
