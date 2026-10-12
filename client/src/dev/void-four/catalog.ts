export const CARDS=['VOID_APOSTLE','GM6_1'] as const;
export const names=['虚無空間の使徒','次元幽閉者'];
export const designs=[
 {name:'裂界の開帳',en:'REND / MEMBRANE',duration:2500,hit:1850,note:'カードの中心が裂け、絵柄ごと薄い空間膜に反る。裂け目が縫い合わさって着地。',jailer:'裂け目を外側から押し締め、最後の光を封じる。'},
 {name:'四面の次元折り',en:'FOLD / FACET',duration:2600,hit:1940,note:'カードの四面が立体的に折れ、黒い稜線を持つ小さな次元塊に凝縮。面を押し開いて顕現。',jailer:'四面が順に噛み合い、整然と封を解いて着地。'},
 {name:'虚層の編み戻し',en:'SHEAR / LAMELLA',duration:2700,hit:2050,note:'絵柄が厚みのある薄層へ分かれ、位相をずらして流れる。下層から時間差で編み戻す。',jailer:'離れた薄層を一方向へ揃え、上から順にロックする。'},
 {name:'黒檻の顕現',en:'LOCK / ARCHITECTURE',duration:2800,hit:2110,note:'四辺から黒い檻がせり上がる。内圧で開いた格子が、カードの縁へ折り戻る。',jailer:'カードの四辺から檻を組み、天蓋を閉じて盤面へ沈める。'},
];
export const DURATION=3200;
export const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export const ease=(x:number)=>{x=clamp(x);return x*x*(3-2*x);};
export const ramp=(t:number,a:number,b:number)=>ease((t-a)/(b-a));
export const envelope=(t:number,a:number,b:number,c:number,d:number)=>ramp(t,a,b)*(1-ramp(t,c,d));
export function motion(v:number,ms:number,reduced=false){const d=designs[v];return {transfer:reduced?1:ramp(ms,140,760),lift:reduced?0:.32*envelope(ms,0,240,1460,d.hit),contact:reduced?0:envelope(ms,d.hit,d.hit+55,d.hit+110,d.hit+390),activity:reduced?0:envelope(ms,180,550,1750,d.duration),done:ms>=d.duration};}
