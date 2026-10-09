import {DB} from '../../shared/cards';
export const ids=['VAMP1','VAMP2','VAMP3','VAMP4','VAMP5','VAMP_BUTLER'] as const;
export type Id=typeof ids[number];
export const DURATION=3400,CONTACT=2260;
export const ease=(a:number,b:number,t:number)=>{const u=Math.max(0,Math.min(1,(t-a)/(b-a)));return u*u*(3-2*u);};
export const title=(id:Id)=>DB[id].nameJa||DB[id].name;
export const rank=(id:Id)=>id==='VAMP_BUTLER'?2:ids.indexOf(id)+1;
export const designs=[
 {name:'双牙の穿印',en:'TWIN FANG STRIKE',material:'双牙 / 短く鋭い一噛み',note:'長い犬歯が溜めて急降下。面が沈み、二つの噛み跡から血脈が広がる。'},
 {name:'顎門の咬合',en:'CLOSING JAWS',material:'上下顎 / 挟んで離す',note:'上下の歯列がカードを挟む。噛み合わせで一拍止まり、顎がゆっくり開く。'},
 {name:'斜牙の裂傷',en:'RAKING BITE',material:'斜めの双牙 / 噛み引く',note:'傾いた双牙が突き刺さり、噛んだまま短く引く。接点に沿って面が歪む。'},
 {name:'吸血の脈動',en:'SIPHONING FANGS',material:'双牙と血糸 / 深く溜める',note:'牙を留めたまま細い血糸が牙の根へ伸びる。力が戻ると傷が閉じる。'},
 {name:'血牙の凝成',en:'LIQUID FANGS',material:'血液から牙へ / 凝固して噛む',note:'脈打つ血の立体が湾曲した牙に固まり、遅れて一度だけ噛み落ちる。'},
 {name:'王牙の重咬',en:'SOVEREIGN BITE',material:'四牙と黒い顎 / 重い一撃',note:'四本の牙を持つ顎が大きく開き、重く噛み締める。長い静止から力を解く。'},
];
export function physics(ms:number,reduced=false){const u=Math.max(0,Math.min(1,(ms-1610)/(CONTACT-1610)));const height=reduced||ms>=CONTACT?0:62*ease(0,420,ms)*(1-u*u);return {height,contact:CONTACT,underside:height};}
export const phase=(ms:number)=>ms<420?'予兆':ms<1050?'開口・溜め':ms<1610?'咬合':ms<CONTACT?'降下':ms<2900?'接地・余韻':'収束';
