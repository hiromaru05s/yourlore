export const DURATION=3000;
export const designs=[
 {name:'坑口の目覚め',en:'THE AWAKENING MAW',verb:'開く → 噛み合わせる',note:'カード面の岩肌が上下の顎へ。石の牙が一度だけ大きく開き、噛み合って盤面へ沈む。',peak:1190},
 {name:'果てなき坑道',en:'THE IMPOSSIBLE DEPTH',verb:'沈み込む → 奥から戻る',note:'カードの内側だけが深い坑道へ伸びる。奥の灯りを追い、地層が順にせり戻って一枚になる。',peak:1420},
 {name:'岩盤の呼吸',en:'THE BREATHING STRATA',verb:'盛り上がる → 重く鎮まる',note:'一枚のカードが岩盤として息を吸う。稜線から麓へ重さが伝わり、最後に面全体で接地する。',peak:1360},
 {name:'坑脈の進行',en:'THE ADVANCING MINE',verb:'支保工が起きる → 通り抜ける',note:'絵の線路が先へ伸び、坑道の支保工が順番に起きる。カードがその下を進み、岩肌へ畳み戻る。',peak:1540},
] as const;
export const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export const ease=(a:number,b:number,t:number)=>{const x=clamp((t-a)/(b-a));return x*x*(3-2*x);};
export const pulse=(a:number,b:number,c:number,d:number,t:number)=>ease(a,b,t)*(1-ease(c,d,t));
export function phase(t:number){return t<350?'予兆':t<1000?'岩肌の変化':t<1800?'坑道が生きる':t<2510?'接地・収束':'余韻';}
