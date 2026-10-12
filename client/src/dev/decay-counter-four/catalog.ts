export const studies = [
  {name:'菌糸の侵蝕',en:'MYCELIAL INGRESS',material:'菌糸',motion:'枝分かれして走り、根へ引き戻る',duration:1280,contact:970},
  {name:'粘膜の浸潤',en:'VISCOUS INFUSION',material:'粘性の膜',motion:'濡れた面が広がり、細い流れへ絞られる',duration:1160,contact:860},
  {name:'緑青の蝕刻',en:'PATINA ETCHING',material:'腐食した金属',motion:'錆の結晶が噛み合い、亀裂へ沈む',duration:1200,contact:910},
  {name:'腐皮の捲縮',en:'BLIGHTED DELAMINATION',material:'薄い表皮',motion:'カード面に浮いた皮膜がめくれ、縮み込む',duration:1360,contact:1030},
] as const;
export const DURATION=1600;
export type Settings={variant:number;ms:number;before:number;amount:number;reduced:boolean;side:number;multi:boolean;dark:boolean;card:string};
export const defaults:Settings={variant:0,ms:0,before:0,amount:1,reduced:false,side:1,multi:false,dark:false,card:'ELF'};
export const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export const ease=(x:number)=>{x=clamp(x);return x*x*(3-2*x);};
export function countAt(s:Settings){return s.ms>=(s.reduced?180:studies[s.variant].contact)?Math.min(3,s.before+s.amount):s.before;}
