export const DURATION=2800;
export const designs=[
 {name:'切札の扇',en:'THE FINAL DEAL',note:'カード面が五枚の薄い札へ割れ、手首の返しのように開く。閉じる勢いを接地へ。',material:'象牙紙・赤箔',peak:1030},
 {name:'象牙の賽',en:'IVORY FATE',note:'絵柄を残した六面が賽へ折れ込む。重い一転のあと、面がほどけてカードへ戻る。',material:'象牙・彫金',peak:1280},
 {name:'黄金の掛金',en:'GILDED STAKES',note:'カードの記録を十二枚の硬貨へ鋳造。縁を見せて積み上がり、卓上へ配り戻す。',material:'黄銅・赤金',peak:1280},
 {name:'緋絹の手品',en:'CRIMSON SLEIGHT',note:'絵柄を保った細い絹帯が交差。裏面の緋色を返し、一枚のカードへ織り戻る。',material:'緋絹・金糸',peak:1130},
 {name:'運命の歯車',en:'WHEEL OF CHANCE',note:'カード面が扇形の象嵌へ変わり、局所的な回転盤を作る。減速して絵柄へ噛み合う。',material:'黒漆・象嵌',peak:1260},
 {name:'三紋の戴冠',en:'THE SOVEREIGN HAND',note:'カードの三層が縦に反転し、尖った宝石面を見せる。中央から時間差で封じ戻る。',material:'色硝子・王金',peak:1230},
];
export const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export const smooth=(v:number)=>{v=clamp(v);return v*v*(3-2*v)};
export const ramp=(t:number,a:number,b:number)=>smooth((t-a)/(b-a));
export const envelope=(t:number,a=.13,b=.37,c=.52,d=.84)=>ramp(t,a,b)*(1-ramp(t,c,d));
