import {DB} from '../../shared/cards';
export const ids=['VAMP1','VAMP2','VAMP3','VAMP4','VAMP5','VAMP_BUTLER'] as const;
export type Id=typeof ids[number];
export const DURATION=2600,CONTACT=1800;
export const ease=(a:number,b:number,t:number)=>{const u=Math.max(0,Math.min(1,(t-a)/(b-a)));return u*u*(3-2*u);};
export const title=(id:Id)=>DB[id].nameJa||DB[id].name;
export const rank=(id:Id)=>id==='VAMP_BUTLER'?2:ids.indexOf(id)+1;
export const designs=[
 {name:'紅い犬歯',en:'ENAMEL / HINGED CANINES',material:'厚い琺瑯の四牙 · 顎の回転',note:'根元の血から湾曲した犬歯が育ち、顎を一度閉じて沈む。'},
 {name:'血潮の咬合',en:'LIQUID / VISCOUS JAWS',material:'連続した血の膜 · 張力と滴り',note:'血溜まりが厚い膜と牙へ伸び、一噛みして液体へ戻る。'},
 {name:'傷口の顎',en:'WOUND / LIVING APERTURE',material:'カードに開く口 · 内側の紅牙',note:'表面の裂け目そのものが口となり、赤い牙を噛み合わせて閉じる。'},
 {name:'紅玉の鉗子',en:'GARNET / CRYSTAL LOCK',material:'立体結晶の群 · 左右の挟撃',note:'異形の紅玉が左右に組み上がり、交互に噛み込んで崩れる。'},
 {name:'血帯の蛇牙',en:'RIBBON / COILING FANGS',material:'厚い血の帯 · 巻き締める牙',note:'二本の血帯が尖った鉤へ連なり、一度だけ巻き締めて吸収される。'},
 {name:'漆翼の咬門',en:'LACQUER / HINGED RELIEF',material:'牙を彫った漆の板 · 閉じる蝶番',note:'カード端の赤い漆が牙のある二枚の翼へ育ち、一度噛んで伏せる。'},
];
export function physics(ms:number,reduced=false){const u=Math.max(0,Math.min(1,(ms-1350)/(CONTACT-1350)));const height=reduced||ms>=CONTACT?0:34*ease(0,420,ms)*(1-u*u);return {height,contact:CONTACT,underside:height};}
export const phase=(ms:number)=>ms<420?'予兆':ms<970?'開口・溜め':ms<1400?'一噛み':ms<CONTACT?'降下':ms<2210?'接地・余韻':'収束';
