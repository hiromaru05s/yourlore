export const CARDS=['NT_SEAL5','NT_SEAL3'] as const;
export const DURATION=3000;
export const designs=[
 {name:'紫紋の圧封',en:'VIOLET COMPRESSION',note:'上下の紫の魔法陣が重なり、立ち上るオーラをカード面へ押し封じる。',hit:1700},
 {name:'六鎖の禁陣',en:'SIXFOLD BINDING',note:'魔法陣から六本の秘文帯が立ち上がり、紫の魔力を締めて動きを止める。',hit:1840},
 {name:'双扉の閉呪',en:'THE CLOSING SIGIL',note:'左右に分かれた紫の術式が閉じる。中央の封鎖線が走り、魔力の通り道を断つ。',hit:1650},
 {name:'紫淵の封刻',en:'THE ARRESTED VORTEX',note:'カード面の紫の渦が急停止し、魔力を吸い込んだ封印の刻印だけが残る。',hit:1900},
] as const;
export const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export const ease=(a:number,b:number,t:number)=>{const k=clamp((t-a)/(b-a));return k*k*(3-2*k);};
export const pulse=(a:number,b:number,c:number,d:number,t:number)=>ease(a,b,t)*(1-ease(c,d,t));
export function lift(v:number,t:number,reduced=false){if(reduced)return 0;const hit=designs[v].hit;return (.12+.12*ease(0,600,t))*(1-ease(hit-300,hit,t));}
export function phase(v:number,t:number){const hit=designs[v].hit;return t<450?'刻印の覚醒':t<1100?'封印術式の構築':t<hit?'魔力を封鎖':t<hit+300?'封印の確定':'静寂の余韻';}
