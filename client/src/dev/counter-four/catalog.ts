export const PREP=700;
export const TOTAL=1760;
export const designs=[
 {name:'鋼弓の返し',en:'TEMPERED REBOUND',note:'カード全体が弓なりに力を受け、銀の縁を張って跳ね返す。',material:'反り・弾性・積層した銀縁'},
 {name:'片刃の切り返し',en:'EDGED RIPOSTE',note:'片側を軸に身を切り、フレームの刃を返して狙いを戻す。',material:'軸足・捻り・片刃の反射'},
 {name:'逆流の脈動',en:'REVERSE CURRENT',note:'受けた衝撃がカード面を沈み、二筋の濃い流れとなって逆流する。',material:'液膜・逆流・先端への収束'},
 {name:'折翼の反攻',en:'FOLDED RETORT',note:'左右のカード面を折り溜め、二つの稜線を同時に解放する。',material:'左右の折面・蝶番・鋭い復元'},
] as const;
export const ids=['INFKNIGHT','TDE2','MIMIC','CHOSEN_KNIGHT'] as const;
export const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export const ease=(a:number,b:number,t:number)=>{const x=clamp((t-a)/(b-a));return x*x*(3-2*x);};
export function envelope(v:number,t:number){return ease(0,[250,290,340,300][v],t)*(1-ease([480,430,460,490][v],700,t));}
