export const DURATION=3000;
// Geometry, timing and pigment stay fixed; only optical density and shading change.
export const designs=[
 {name:'薄影の水晶',en:'SOFT SHADOW',note:'元の透け感を保ち、カードと盤面にやわらかい影を添える。最も控えめな調整。',hit:1410,alpha:.67,edge:0,facet:0,shadow:.30},
 {name:'縁影の水晶',en:'DEFINED EDGE',note:'透明な中心を残し、外周と厚みのある稜線に深い蒼の陰影をつける。',hit:1410,alpha:.71,edge:.72,facet:.08,shadow:.34},
 {name:'厚硝子の水晶',en:'DENSE GLASS',note:'面の透明度を下げる。明るい盤面でも、盾全体の量感がはっきり見える。',hit:1410,alpha:.91,edge:.12,facet:.06,shadow:.24},
 {name:'稜影の水晶',en:'FACET SHADING',note:'光に背を向けた結晶面を深くし、三角形の稜面と中央の隆起を読みやすくする。',hit:1410,alpha:.74,edge:.12,facet:.85,shadow:.38},
 {name:'均衡の水晶',en:'BALANCED GLASS',note:'透け感をほどよく残し、落ち影・外周・面の濃淡を組み合わせる。',hit:1410,alpha:.83,edge:.40,facet:.42,shadow:.44},
] as const;
export const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export function ease(a:number,b:number,t:number){const x=clamp((t-a)/(b-a));return x*x*(3-2*x);}
export function lift(v:number,t:number){const hit=designs[v].hit;if(t>=hit+180)return 0;return .24*(1-ease(420,hit,t))+(t>=hit?.012*Math.sin(ease(hit,hit+180,t)*Math.PI):0);}
