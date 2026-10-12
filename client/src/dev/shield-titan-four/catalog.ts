export const DURATION=3000;
export const designs=[
 {name:'巨盾の圧印',en:'THE GREAT SEAL',note:'一枚の重い大盾。厚い盾面が力を溜めて接地し、押された紋様がカードへ刻み込まれる。',hit:1240},
 {name:'積層の鎧',en:'LAMELLAR WEIGHT',note:'七層の石鎧。噛み合った装甲が一度圧縮され、段差を刻みながら順番に収まる。',hit:1100},
 {name:'蒼核の鋳造',en:'CORE CASTING',note:'青い核が面を押し広げる。湾曲した鋳膜が盾となり、中心からカード面へ戻る。',hit:1440},
 {name:'城郭の起立',en:'LIVING BASTION',note:'カードの左右が城壁へ起き上がる。支柱が支え、重みを受けて縁へ格納される。',hit:1360},
] as const;
export const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export function ease(a:number,b:number,t:number){const x=clamp((t-a)/(b-a));return x*x*(3-2*x);}
export function lift(v:number,t:number){const hit=designs[v].hit;if(t>=hit+230)return 0;return .30*(1-ease(480,hit,t))+(t>=hit?.018*Math.sin(ease(hit,hit+230,t)*Math.PI):0);}
