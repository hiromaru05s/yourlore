import {DB} from '../../shared/cards';
export const DURATION=2250;
export const tribes=['solitude','predation','noble','demon','origin'] as const;
export type Tribe=typeof tribes[number];
export type Mode='summon'|'synergy'|'victory';
export const families:Record<Tribe,{name:string;key:string;cards:string[];color:string;dark:string;studies:{name:string;material:string;note:string}[]}>= {
 solitude:{name:'孤独',key:'고독',cards:['TSO1','TSO2','TSO3','TSO5'],color:'#a5c9dd',dark:'#233340',studies:[
 {name:'静かな滑走',material:'薄い銀の反射',note:'横へ流れ、速度を落として静かに着地。残像はカードの軌道だけに残る。'},
 {name:'霧からの実体化',material:'曇ったカード表面',note:'輪郭を保ったまま霧が表面を抜け、絵柄が実体を取り戻す。'},
 {name:'銀刃の返し',material:'銀の切先',note:'一度だけ薄い側面を見せ、鋭い反射とともに正面へ返る。'}]},
 predation:{name:'捕食',key:'포식',cards:['TPO1','TPO2','TPO3','TPO5'],color:'#e9a158',dark:'#42231a',studies:[
 {name:'飛びかかり',material:'しなるカードの重さ',note:'小さく沈んでから跳躍。着地でカードがしなり、すぐに収まる。'},
 {name:'忍び寄る狩人',material:'抑えた琥珀の光',note:'短い二歩のためから、最後だけ加速して距離を詰める。'},
 {name:'爪の一撃',material:'絵柄をかすめる三爪',note:'斜めから鋭く飛び込み、三本の光が絵柄を一度だけ横切る。'}]},
 noble:{name:'貴族',key:'귀족',cards:['TAR1','TAR2','TAR3','TAR5'],color:'#e0c080',dark:'#392531',studies:[
 {name:'威厳の着座',material:'磨かれた金の縁',note:'真っ直ぐ持ち上がり、ゆったりと重みを戻す。'},
 {name:'優雅な旋回',material:'深紅の残像・金の反射',note:'軽く斜めを向いて弧を描き、正確な角度に落ち着く。'},
 {name:'黄金の叙任',material:'面を横切る金箔光沢',note:'手前に傾いた面が起き、広い光沢が一筋だけ抜ける。'}]},
 demon:{name:'魔族',key:'마족',cards:['TDE1','TDE2','TDE3','TDE4'],color:'#bf91ee',dark:'#24132f',studies:[
 {name:'重圧の落下',material:'暗い紫の縁',note:'短い静止から鋭く落下。接地の一瞬だけ厚みと重さを見せる。'},
 {name:'黒炎の消失',material:'表面を這う黒い炎',note:'下から上へ暗い熱が拭われ、奥の絵柄が姿を現す。'},
 {name:'魔力の圧縮',material:'内へ吸い込む影',note:'カードの幅がわずかに締まり、一息で元の面積へ解放される。'}]},
 origin:{name:'始原',key:'시초',cards:['TGE1','TGE2','TGE3','TGE4','TGE5','TGE6','TGE7','ORIGIN_MIMIC'],color:'#b5ead8',dark:'#193a36',studies:[
 {name:'最初の鼓動',material:'内側から透ける乳白光',note:'中心に命が灯り、カードが一度だけ膨らんで実体を結ぶ。'},
 {name:'古層の覚醒',material:'石緑の風化した膜',note:'下からせり上がり、古い薄膜が表面を抜けて鮮明になる。'},
 {name:'時間の収束',material:'重なり合う淡い残像',note:'離れていた同じ絵柄が一枚に収束し、真珠色の光が消える。'}]}
};
export const title=(id:string)=>DB[id]?.nameJa||DB[id]?.name||id;
export const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export const ease=(a:number,b:number,x:number)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
export const tier=(n:number)=>Math.min(3,Math.max(1,Math.floor(Number.isFinite(n)?n:1)));
export const synergyDuration=(n:number)=>1150+tier(n)*250;
export const duration=(mode:Mode,n:number)=>mode==='victory'?4800:mode==='synergy'?synergyDuration(n):DURATION;
export function selectSynergy(tribeKey:string,threshold:number,won:boolean){return tribeKey==='시초'&&threshold===6&&won?{mode:'victory' as Mode,stage:3}:{mode:'synergy' as Mode,stage:tier(threshold-1)};}
