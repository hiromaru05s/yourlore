import {DB} from '../../shared/cards';
export const ids=['VAMP1','VAMP2','VAMP3','VAMP4','VAMP5','VAMP_BUTLER'] as const;
export type Id=typeof ids[number];
export const DURATION=2600,CONTACT=1800;
export const ease=(a:number,b:number,t:number)=>{const u=Math.max(0,Math.min(1,(t-a)/(b-a)));return u*u*(3-2*u);};
export const title=(id:Id)=>DB[id].nameJa||DB[id].name;
export const rank=(id:Id)=>id==='VAMP_BUTLER'?2:ids.indexOf(id)+1;
export const designs=[
 {name:'紅牙',en:'CRIMSON SNAP',material:'湾曲した四牙 / 速い一噛み',note:'上下に開いた紅い牙が、一拍の溜めから鋭く閉じる。'},
 {name:'鋸牙',en:'SERRATED BITE',material:'結晶の歯列 / 面で噛み込む',note:'長短の赤い牙が噛み合い、接線から薄く砕けて消える。'},
 {name:'斜咬',en:'OBLIQUE SNAP',material:'斜めの長牙 / 捻って噛む',note:'斜めに構えた長牙が、ひと振りで噛み合う。'},
 {name:'針牙',en:'NEEDLE BITE',material:'細い四牙 / 最短の一撃',note:'細い血紅の牙が絞られ、一瞬で閉じて痕へ収束する。'},
 {name:'血刃',en:'LIQUID BITE',material:'幅広い血の牙 / 柔から鋭へ',note:'濡れた血の曲面が張り、一度噛んで根元からほどける。'},
 {name:'王咬',en:'SOVEREIGN SNAP',material:'大きな紅い歯列 / 重い一噛み',note:'大きく開いた牙を一気に閉じ、短い静止で重さを残す。'},
];
export function physics(ms:number,reduced=false){const u=Math.max(0,Math.min(1,(ms-1350)/(CONTACT-1350)));const height=reduced||ms>=CONTACT?0:34*ease(0,420,ms)*(1-u*u);return {height,contact:CONTACT,underside:height};}
export const phase=(ms:number)=>ms<420?'予兆':ms<970?'開口・溜め':ms<1400?'一噛み':ms<CONTACT?'降下':ms<2210?'接地・余韻':'収束';
