export const DURATION=1000;
export const designs=[
 {name:'双翼の大盾',en:'TWIN AEGIS',material:'鋼 / 開く・噛み合う',description:'左右の枠から厚い鋼板が起き、中央で一枚の盾になる。構えを見せ、同じ枠へ折り戻る。',peak:460,color:'#8eadbd'},
 {name:'銀刃の鬣',en:'QUICKSILVER MANE',material:'銀流 / 剥がれる・逆巻く',description:'左右の枠が厚い銀の流れとなってせり上がる。折り重なる刃の鬣を一度広げ、先端から枠へ戻る。',peak:460,color:'#91a8af'},
 {name:'獅子の咆哮',en:'LIONHEART',material:'浮彫 / 浮き上がる・吼える',description:'下枠の金属が獅子の浮彫へせり上がる。顎と鬣が一度大きく開き、彫刻面ごとカードへ沈む。',peak:470,color:'#9e875e'},
 {name:'黒曜の盾壁',en:'OBSIDIAN BASTION',material:'黒曜 / 起こす・せり出す',description:'上枠の黒曜が五枚の装甲へ連続して立ち上がる。層をずらした盾壁が前へせり出し、同じ枠へ折り戻る。',peak:480,color:'#786779'},
] as const;
export const cards=['SHIELD_TITAN','CASTLE','ELF'] as const;
export const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export function ease(a:number,b:number,t:number){const x=clamp((t-a)/(b-a));return x*x*(3-2*x);}
export const pulse=(a:number,b:number,c:number,d:number,t:number)=>ease(a,b,t)*(1-ease(c,d,t));
/** A deterministic clock: the pre-roll never contains or guesses the result. */
export function pose(variant:number,ms:number,reduced=false){
 const t=Math.max(0,Math.min(DURATION,ms)),active=ms>0&&ms<DURATION;
 const strength=active?pulse(0,150,830,1000,t):0;
 if(reduced)return {t,strength,lift:0,advance:0,scale:1,tilt:0};
 const lift=variant===0?3*pulse(120,330,690,950,t):variant===1?5*pulse(100,350,670,965,t):variant===2?2*pulse(280,400,690,950,t):4*pulse(160,400,640,960,t);
 return {t,strength,lift,advance:0,scale:1,tilt:0};
}
