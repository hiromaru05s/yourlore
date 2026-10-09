export const SOURCE_DURATION=3400;
export const FIRST_FRAME=850;
export const DURATION=SOURCE_DURATION-FIRST_FRAME;
export const IMPACT=SOURCE_DURATION*.94-FIRST_FRAME;
export const designs=[
 {name:'王金の鋳盤',en:'GOLD CASTING',note:'カードの縁が厚い金属へ育ち、一枚の塊のまま回転盤へ。重い回転を止め、面へ押し戻す。',material:'王金 / 深い赤漆 / 一体鋳造',peak:1610},
 {name:'象牙の虹彩',en:'IVORY IRIS',note:'厚い象牙の駒が中心の軸に沿って噛み合う。隣の面とつながったまま開閉し、最後の一駒が静かに収まる。',material:'象牙 / 黒檀 / 重なり機構',peak:1720},
 {name:'流金の賭卓',en:'LIQUID FORTUNE',note:'カード表面から金属のうねりが走る。粘性のある縁が円へまとまり、回転の余勢が波紋として落ち着く。',material:'液体金属 / 緋色エナメル / 表面張力',peak:1650},
 {name:'三層の天秤',en:'TRIPLE GOVERNOR',note:'カードから段差のある三層がせり上がる。中心・内周・外周が逆方向へ回り、順に制動してカードへ戻る。',material:'黄銅 / 黒漆 / 三段歯車',peak:1850},
 {name:'黒曜の封輪',en:'OBSIDIAN SEAL',note:'黒曜の厚い円盤が斜めに起き上がる。重心を保った一回の返しで金の断面を見せ、面全体で着地する。',material:'黒曜石 / 王金 / 慣性と面接地',peak:1800},
];
export const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export const smooth=(v:number)=>{v=clamp(v);return v*v*v*(v*(v*6-15)+10)};
export const ramp=(t:number,a:number,b:number)=>smooth((t-a)/(b-a));
export const envelope=(t:number,a=.09,b=.36,c=.66,d=.94)=>ramp(t,a,b)*(1-ramp(t,c,d));
