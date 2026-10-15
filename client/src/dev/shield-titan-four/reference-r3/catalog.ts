export const DURATION=3000;
export const designs=[
 {name:'蒼晶の巨盾',en:'MONOLITH',note:'③を継ぐ一枚の巨晶盾。中央の稜線から厚い透明面がせり上がり、上端から静かに解ける。',hit:1410},
 {name:'双晶の契り',en:'TWIN LOCK',note:'左右の結晶面が斜めに重なり、中央で噛み合う。接地後は継ぎ目から両端へほどける。',hit:1220},
 {name:'八稜の花冠',en:'CRYSTAL COROLLA',note:'カードの縁を根に、八つの結晶面が花冠のように開く。中心を見せたまま、対になる面から収まる。',hit:1320},
 {name:'連晶の城塞',en:'PRISM CASCADE',note:'七本の稜柱が時間差で伸び、一枚の透明な城壁を結ぶ。光とともに順を追って面へ還る。',hit:1490},
] as const;
export const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export function ease(a:number,b:number,t:number){const x=clamp((t-a)/(b-a));return x*x*(3-2*x);}
export function lift(v:number,t:number){const hit=designs[v].hit;if(t>=hit+180)return 0;return .24*(1-ease(420,hit,t))+(t>=hit?.012*Math.sin(ease(hit,hit+180,t)*Math.PI):0);}
