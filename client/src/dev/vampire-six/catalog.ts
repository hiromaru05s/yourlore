import {DB} from '../../shared/cards';
export const ids=['VAMP1','VAMP2','VAMP3','VAMP4','VAMP5','VAMP_BUTLER'] as const;
export type Id=typeof ids[number];
export const DURATION=2600,CONTACT=1800;
export const ease=(a:number,b:number,t:number)=>{const u=Math.max(0,Math.min(1,(t-a)/(b-a)));return u*u*(3-2*u);};
export const title=(id:Id)=>DB[id].nameJa||DB[id].name;
export const rank=(id:Id)=>id==='VAMP_BUTLER'?2:ids.indexOf(id)+1;
export const designs=[
 {name:'吸血の歯列',en:'VAMPIRE / DENTAL ARCH',material:'長い犬歯と短い前歯 · 上下の咬合',note:'弓形の歯列が開き、長い犬歯を一度だけ噛み合わせる。'},
 {name:'血滴の双牙',en:'BLOOD / GROWING CANINES',material:'液体から育つ太い双牙 · 噛んで溶ける',note:'血の根元から二本の長牙が固まり、小さな下牙へ噛み込む。'},
 {name:'裂け目の牙',en:'WOUND / EMERGING TEETH',material:'傷口から突き出す歯 · 閉じる口',note:'暗い開口の内側から立体の牙が現れ、一噛みして傷を封じる。'},
 {name:'鉤牙の挟撃',en:'HOOK / LATERAL BITE',material:'内側へ湾曲した太い牙 · 左右の挟撃',note:'丸い歯冠から伸びる鉤牙が、左右から深く噛み合う。'},
 {name:'穿つ長牙',en:'PIERCE / TWO PUNCTURES',material:'奥行きへ起き上がる長牙 · 一度の穿刺',note:'二本の牙が起き上がり、鋭く伏せてカードへ噛み付く。'},
 {name:'包み込む顎',en:'JAW / ENCLOSING BITE',material:'両側の歯列と四本の牙 · 包むように閉じる',note:'カードの両側から歯列が立ち上がり、四本の牙が一度噛む。'},
];
export function physics(ms:number,reduced=false){const u=Math.max(0,Math.min(1,(ms-1350)/(CONTACT-1350)));const height=reduced||ms>=CONTACT?0:34*ease(0,420,ms)*(1-u*u);return {height,contact:CONTACT,underside:height};}
export const phase=(ms:number)=>ms<420?'予兆':ms<970?'開口・溜め':ms<1400?'一噛み':ms<CONTACT?'降下':ms<2210?'接地・余韻':'収束';
