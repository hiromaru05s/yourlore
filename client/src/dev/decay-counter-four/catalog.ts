export const studies = [
  {name:'菌糸の侵蝕',en:'MYCELIAL INGRESS',material:'菌糸',motion:'枠から全面へ腐食脈が走り、内側へ収束',duration:2100,contact:1680},
  {name:'粘膜の浸潤',en:'VISCOUS INFUSION',material:'粘性の膜',motion:'カード全体を粘液が覆い、濡れた縁が流れ去る',duration:2000,contact:1600},
  {name:'緑青の蝕刻',en:'PATINA ETCHING',material:'腐食した金属',motion:'絵柄と枠が全面腐食し、酸化した面が戻る',duration:2200,contact:1760},
  {name:'腐皮の捲縮',en:'BLIGHTED DELAMINATION',material:'薄い表皮',motion:'印刷面全体に皺が寄り、折り目がほどける',duration:2300,contact:1840},
] as const;
export const DURATION=2600;
export type Settings={variant:number;ms:number;before:number;amount:number;reduced:boolean;side:number;multi:boolean;dark:boolean;card:string};
export const defaults:Settings={variant:0,ms:0,before:0,amount:1,reduced:false,side:1,multi:false,dark:false,card:'ELF'};
export const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export const ease=(x:number)=>{x=clamp(x);return x*x*(3-2*x);};
export function countAt(s:Settings){return s.ms>=(s.reduced?180:studies[s.variant].contact)?Math.min(3,s.before+s.amount):s.before;}
