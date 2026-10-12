export const CARDS=['VOID_APOSTLE','GM6_1'] as const;
export const names=['虚無空間の使徒','次元幽閉者'];
export const designs=[
 {name:'黒淵の噴出',en:'ABYSS / EJECTION',duration:1720,hit:1110,note:'何もない空中に黒い渦が瞬時に開く。奥からカードが一気に噴き出し、渦だけが背後へ潰れる。',jailer:'黒淵から重いカードが直進。飛び出した直後に入口を押し潰し、短く制動して着地。'},
 {name:'斜裂の抜け駆け',en:'FISSURE / SIDE EXIT',duration:1840,hit:1220,note:'斜めに走る黒い裂け目。カードが片縁から横滑りで抜け出し、裂け目は後端を追って縫い閉じる。',jailer:'狭い斜裂からカードを引き抜く。切断面が後端を追い、鋭く閉じてから着地。'},
 {name:'渦底からの反転',en:'VORTEX / ORBIT EXIT',duration:1990,hit:1370,note:'渦の奥からカードが回り込みながら現れる。黒紫の膜を振り切り、回転を止めて盤面へ降りる。',jailer:'逆回転する渦からカードが抜け、入口を巻き締める。回転を一段ずつ制動して着地。'},
 {name:'黒膜の突破',en:'MEMBRANE / BREACH',duration:1770,hit:1160,note:'黒い穴の表面が一瞬ふくらみ、カードが押し破る。裂けた厚い膜は四方へ反り、穴へ引き戻される。',jailer:'黒膜を正面から押し開く。カード通過後、裂けた膜が四方から急速に閉じて封鎖する。'},
];
export const DURATION=2800;
export const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export const ease=(x:number)=>{x=clamp(x);return x*x*(3-2*x);};
export const ramp=(t:number,a:number,b:number)=>ease((t-a)/(b-a));
export const envelope=(t:number,a:number,b:number,c:number,d:number)=>ramp(t,a,b)*(1-ramp(t,c,d));
export function motion(v:number,ms:number,reduced=false){const d=designs[v];return {transfer:1,lift:0,contact:reduced?0:envelope(ms,d.hit,d.hit+35,d.hit+85,d.hit+270),activity:reduced?0:envelope(ms,35,130,700,1100),done:ms>=d.duration};}
