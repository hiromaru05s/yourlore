export const DURATION=1000;
export const designs=[
 {name:'双翼の大盾',en:'TWIN AEGIS',material:'鋼 / 開く・噛み合う',description:'左右の枠から厚い鋼板が起き、中央で一枚の盾になる。構えを見せ、同じ枠へ折り戻る。',peak:460,color:'#8eadbd'},
 {name:'不退の踏み込み',en:'STAND YOUR GROUND',material:'カード / 引く・踏み込む',description:'カード自身が一度引き、相手へ短く踏み込む。面を保った接地と、前縁を走る圧で意思を伝える。',peak:430,color:'#bf9150'},
 {name:'戦旗の翻り',en:'THE CHALLENGER',material:'織布 / 巻き上がる・翻る',description:'上枠の帯が一枚の戦旗に持ち上がり、一度だけ大きく翻る。裾から巻き取り、カードに戻る。',peak:480,color:'#a74948'},
 {name:'城郭のせり上がり',en:'LIVING RAMPART',material:'石 / せり上がる・沈む',description:'枠の石目が段差となり、両側から胸壁へ育つ。重く構えた後、石段ごと枠に沈む。',peak:540,color:'#9a9382'},
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
 const brace=pulse(20,150,170,300,t),step=pulse(175,310,590,950,t);
 return {t,strength,lift:variant===1?12*pulse(150,265,300,430,t):3*pulse(120,330,690,950,t),advance:variant===1?-9*brace+16*step:0,scale:1+(variant===1?.045:0)*step,tilt:variant===1?.025*brace:0};
}
