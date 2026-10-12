export const CARDS=['NT_SEAL5','NT_SEAL3'] as const;
export const DURATION=3000;
export const designs=[
 {name:'天律の封圧',en:'THE SOVEREIGN SEAL',note:'浮き上がった大印が重く落ちる。刻印の下で魔力が押し潰され、沈黙だけが残る。',hit:1700},
 {name:'四柱の禁域',en:'THE FOUR WARDENS',note:'四隅の碑柱が起立し、秘文の壁を結ぶ。結界が閉じた瞬間、魔法の流れが止まる。',hit:1840},
 {name:'双環の禁錠',en:'THE ARCANE DEADLOCK',note:'逆転する二重の術式を三本の封鍵が貫く。回転も魔力も、重い噛み合わせで停止する。',hit:1650},
 {name:'黒碑の勅封',en:'THE OBSIDIAN EDICT',note:'カードの刻印から黒い碑文が編まれる。最後の一画が刻まれ、術式そのものを塗り封じる。',hit:1900},
] as const;
export const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export const ease=(a:number,b:number,t:number)=>{const k=clamp((t-a)/(b-a));return k*k*(3-2*k);};
export const pulse=(a:number,b:number,c:number,d:number,t:number)=>ease(a,b,t)*(1-ease(c,d,t));
export function lift(v:number,t:number,reduced=false){if(reduced)return 0;const hit=designs[v].hit;return (.12+.12*ease(0,600,t))*(1-ease(hit-300,hit,t));}
export function phase(v:number,t:number){const hit=designs[v].hit;return t<450?'刻印の覚醒':t<1100?'封印術式の構築':t<hit?'魔力を封鎖':t<hit+300?'封印の確定':'静寂の余韻';}
