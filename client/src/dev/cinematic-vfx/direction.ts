export type Kind='draw'|'summon'|'attack'|'spell';
export type Point={x:number;y:number};
export type Rect=Point&{w:number;h:number};
export const DURATIONS:Record<Kind,number>={draw:2.35,summon:3.2,attack:1.9,spell:2.5};
export const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export const ease=(a:number,b:number,t:number)=>{const q=clamp((t-a)/(b-a));return q*q*(3-2*q);};
export const out=(x:number)=>1-Math.pow(1-clamp(x),3);
export const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
export const point=(a:Point,b:Point,t:number):Point=>({x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t)});
export const rnd=(n:number)=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
export function phase(k:Kind,t:number){const names=k==='draw'?['引き抜き','反転・開示','手札へ','定着']:k==='summon'?['浮上','記録の実体化','着地','余韻']:k==='attack'?['溜め','突進','命中','帰還']:['カード提示','四隅の共鳴','墓地へ移動','完了'];const cuts=k==='draw'?[.4,1.05,1.75]:k==='summon'?[.65,1.4,1.65]:k==='attack'?[.43,.69,.83]:[.36,1.53,2.20];return names[cuts.filter(v=>t>=v).length];}
export function bezier(a:Point,b:Point,c:Point,d:Point,t:number):Point{const s=1-t;return{x:s*s*s*a.x+3*s*s*t*b.x+3*s*t*t*c.x+t*t*t*d.x,y:s*s*s*a.y+3*s*s*t*b.y+3*s*t*t*c.y+t*t*t*d.y};}
