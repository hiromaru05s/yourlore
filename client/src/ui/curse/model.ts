export const DURATION=5800;
export const SPELL_LAND=1750;
export const designs=[
 {name:'髑髏の五芒',en:'THE FIVEFOLD HEX',material:'一斉生成 → 扇状に開く → 時間差で沈む',note:'墓地に重なる髑髏のもとで五つの黒い面が同時に開き、呪いの絵柄を現して墓地へ重なる。'},
 {name:'死者の吐息',en:'BREATH OF THE DEAD',material:'呼吸 → 一枚ずつ実体化 → 落ちる',note:'髑髏の口から濃い息が脈打ち、五枚を一枚ずつ吐き出して墓地へ落とす。'},
 {name:'双影の縫合',en:'THE STITCHED SHADOW',material:'左右の影 → 五面を縫合 → 連続着地',note:'左右へ割れた黒い薄膜が五枚に閉じる。縫い目から呪いが実体化し、順に収まる。'},
 {name:'冥府の積層',en:'LAYERS OF THE UNDERWORLD',material:'下から積層 → 五枚を浮上 → 連鎖圧着',note:'墓地の上に黒い層が持ち上がり、五枚の呪いへ分かれる。髑髏の圧力で下から重なる。'},
];
export type Rect={x:number;y:number;w:number;h:number};
export type Layout={source:Rect;target:Rect;played?:Rect;ownGrave?:Rect};
export type Options={variant:number;ms:number;side:number;dark:boolean;reduced:boolean;concurrent:boolean;board?:Layout;skullOpacity?:number;hideSource?:boolean;pixelRatio?:number};
export const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export const prog=(t:number,a:number,b:number)=>clamp((t-a)/(b-a));
export const smooth=(x:number)=>{x=clamp(x);return x*x*(3-2*x);};
export const ease=(t:number,a:number,b:number)=>smooth(prog(t,a,b));
export const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
export const birth=(v:number,i:number)=>[2050,2000+i*430,2050+i*160,2000+i*180][v];
export const arrival=(v:number,i:number)=>[3500+i*230,2820+i*430,3550+i*200,3450+i*240][v];
export function stateAt(o:Pick<Options,'variant'|'ms'>){const deposited=Array.from({length:5},(_,i)=>o.ms>=arrival(o.variant,i)).filter(Boolean).length;return {generated:Array.from({length:5},(_,i)=>o.ms>=birth(o.variant,i)+380).filter(Boolean).length,deposited,graveyard:7+deposited,played:o.ms>0,spellDiscarded:o.ms>=SPELL_LAND,effects:o.ms>0&&o.ms<DURATION};}
export function phase(ms:number){return ms<=0?'手札のカースを上へドラッグしてプレイ':ms<650?'手札からプレイ':ms<1250?'カース発動':ms<2000?'相手墓地に髑髏が重なる':ms<3400?'黒い光から呪い5枚を生成':ms<4700?'墓地へ追加':'髑髏と残光が収束';}
