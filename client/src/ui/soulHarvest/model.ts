export type Point={x:number;y:number};
export type Layout={source:Point;target:Point;scale:number};
export type Options={variant:number;ms:number;side:number;dark:boolean;reduced:boolean;count:number;damage?:number;concurrent:boolean;board?:Layout};
export const DURATION=3900;
export const designs=[
 {name:'深弧の刈り抜き',en:'REAP THROUGH',material:'奥から手前へ大きく回り込む水平斬り',hit:1120,note:'柄を支点に鋼の刃が奥から手前へ加速。肖像を切り抜け、長い弧の向こうまで振り切る。'},
 {name:'重刃の斜断',en:'FALLING SEVER',material:'左上から右下へ叩き切る袈裟斬り',hit:1240,note:'振りかぶった鎌を重く落とす。刃に接続した幅広い斬撃が枠を横断し、魂を引き剥がす。'},
 {name:'返し刃の逆袈裟',en:'RISING REAP',material:'下から手前へ巻き上げる逆袈裟',hit:1360,note:'低い構えから刃がせり上がり、手前へ返りながら振り抜く。魂は斬られた面から浮かび上がる。'},
] as const;
export const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export const ease=(a:number,b:number,t:number)=>{const q=clamp((t-a)/(b-a));return q*q*(3-2*q);};
export const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
export function phase(o:Options){return o.ms===0?'魂の収穫を発動':damageOf(o)===0?'呪いなし — 攻撃は発生しない':o.ms<700?'相手の傍らに鎌が現れる':o.ms<designs[o.variant].hit?'死神の鎌が振り抜かれる':o.ms<DURATION?'斬撃・ダメージ・魂の離脱':'収穫完了';}
export const damageOf=(o:Options)=>Math.max(0,o.damage??o.count*4);
export function stateAt(o:Options){const hit=damageOf(o)>0&&o.ms>=designs[o.variant].hit;return {hp:Math.max(0,60-(hit?damageOf(o):0)),damage:hit?damageOf(o):0,hit,curseCount:o.count,phase:phase(o)};}
