/** Approved mana crystallization timeline. */
// User-selected 01: 脈光の覚醒, preview d7c1ab06 (2026-10-07).
export const variants = [
 {name:'脈光の覚醒',sub:'枠から脈へ。光が内へ伝わる。',duration:1510,breakAt:440,joinAt:870,arriveAt:1190,mode:0,n:100,spread:.32,curve:-.10,note:'カードの縁を上る光が内側へ枝分かれ。絵柄を透かした青い脈が張り詰め、上端から細かな結晶へほどける。'},
] as const;
export type V = typeof variants[number];
export type P = {x:number;y:number};
export type Quad = [P,P,P,P];
export const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
export const smooth=(a:number,b:number,t:number)=>{const q=clamp((t-a)/(b-a));return q*q*(3-2*q);};
export const lerp=(a:P,b:P,t:number):P=>({x:mix(a.x,b.x,t),y:mix(a.y,b.y,t)});
export const quad=(x:number,y:number,w:number,h:number):Quad=>[{x:x-w/2,y:y-h/2},{x:x+w/2,y:y-h/2},{x:x+w/2,y:y+h/2},{x:x-w/2,y:y+h/2}];
export const at=(q:Quad,x:number,y:number)=>lerp(lerp(q[0],q[1],x),lerp(q[3],q[2],x),y);
export function phase(ms:number,v:V){return ms<60?'カード':ms<v.breakAt*.28?'光膜':ms<v.breakAt*.65?'内圧・溜め':ms<v.breakAt?'膨張・臨界':ms<v.joinAt-60?'光の破断':ms<v.joinAt?'一つの光へ':ms<v.arriveAt?'墓地へ':ms<v.duration-40?'輪郭から復元':'復元完了';}
