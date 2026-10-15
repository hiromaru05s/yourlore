export type Variant=0|1|2|3;
export type ResultId='DRAGON_RIDER'|'ANTIQUE_DK';
export const designs=[
 {name:'翼鱗の抱擁',en:'THE WING COVENANT',duration:3400,hit:2350,description:'竜の表面から翼膜と骨格が起き上がり、騎士の鎧を抱き込む。一度だけ大きく羽ばたき、融合した面へ畳まれる。',material:'翼膜・竜骨・鎧',action:'展開 → 抱擁 → 羽ばたき'},
 {name:'竜鎧の鍛着',en:'SCALEFORGED',duration:3100,hit:2090,description:'竜の鱗と騎士の装甲が、厚みを持つ金属片として剥がれる。順番に噛み合い、熱い継ぎ目が冷えて一枚になる。',material:'厚い鱗・鍛鉄・熱線',action:'剥離 → 組み上げ → 鍛着'},
 {name:'螺竜の誓槍',en:'THE SPIRAL OATH',duration:3600,hit:2510,description:'竜の記録が角・顎・連なる鱗を持つ胴へ立ち上がる。騎士の槍を一周だけ包み、槍先からカード面へ収束する。',material:'竜の胴・角・銀の槍',action:'起立 → 一周 → 貫入'},
 {name:'双刻の圧印',en:'TWIN IMPRESSION',duration:3000,hit:1980,description:'二枚が竜紋と騎士紋の彫金版に変わる。上下で重なって圧着し、凹凸が光の筋を残して新しいカードに定着する。',material:'彫金・象嵌・圧着面',action:'浮彫 → 重合 → 圧印'},
] as const;
export const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export const ease=(a:number,b:number,t:number)=>{const x=clamp((t-a)/(b-a));return x*x*(3-2*x);};
export const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
export const mateFor=(id:ResultId)=>id==='ANTIQUE_DK'?'INFKNIGHT':'SOLDIER2';
export const phase=(v:Variant,t:number)=>t<250?'素材の呼応':t<850?'表面の変化':t<designs[v].hit?'融合':t<designs[v].duration-250?'定着':'完了';
export const MAX_DURATION=3600;
