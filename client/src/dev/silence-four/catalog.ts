export const CARDS=['NT_SEAL5','NT_SEAL3'] as const;
export const DURATION=3000;
export const designs=[
 {name:'封鍵の締結',en:'THE INTERLOCK',note:'装甲から伸びる二枚の封鍵。重い噛み合わせで魔力の流路を閉じる。',hit:1610},
 {name:'静謐の天蓋',en:'THE QUIET VAULT',note:'カード面が硝子の天蓋へ膨らみ、金の稜線を残して静かに押し鎮まる。',hit:1740},
 {name:'積層の鎮座',en:'THE STRATA',note:'絵柄を保った七層の石板。上から順に重なり、最後の一層で接地する。',hit:1880},
 {name:'星章の収束',en:'THE STILL STAR',note:'石装甲の星章が八枚の羽根へ展開。ひと捻りで閉じ、面へ還る。',hit:1660},
] as const;
export const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export const ease=(a:number,b:number,t:number)=>{const k=clamp((t-a)/(b-a));return k*k*(3-2*k);};
export const pulse=(a:number,b:number,c:number,d:number,t:number)=>ease(a,b,t)*(1-ease(c,d,t));
export function lift(v:number,t:number,reduced=false){if(reduced)return 0;const hit=designs[v].hit;return (.22+.16*ease(0,550,t))*(1-ease(hit-390,hit,t));}
export function phase(v:number,t:number){const hit=designs[v].hit;return t<400?'表面の覚醒':t<1100?'素材の展開':t<hit?'封鎖・収束':t<hit+300?'接地':'静止へ';}
