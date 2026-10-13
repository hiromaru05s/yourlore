export const DURATION=3000;
export const designs=[
 {name:'神殻の解封',en:'STONE / THE UNSEALING',note:'彫り込まれた巨盾の石殻。重い接地で亀裂が走り、割れた殻の内側から巨神が現れる。',hit:1120},
 {name:'蒼鋼の奔流',en:'METAL / THE UNDERTOW',note:'蒼い鋼が一枚の流体となる。大きく捻れた流れが盾面を鍛え、縁へ引き戻される。',hit:1280},
 {name:'晶壁の覚醒',en:'CRYSTAL / THE AWAKENING',note:'カード面から透明な結晶盾が隆起。稜線に光が走り、上端から順に面へ結び直される。',hit:1410},
 {name:'守誓の天幕',en:'CLOTH / THE OATH',note:'蒼い守護布が風を含んで大きくひるがえる。金糸の紋章を残し、対角線に沿って面へ織り戻る。',hit:1210},
] as const;
export const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export function ease(a:number,b:number,t:number){const x=clamp((t-a)/(b-a));return x*x*(3-2*x);}
export function lift(v:number,t:number){const hit=designs[v].hit;if(t>=hit+180)return 0;return .24*(1-ease(420,hit,t))+(t>=hit?.012*Math.sin(ease(hit,hit+180,t)*Math.PI):0);}
