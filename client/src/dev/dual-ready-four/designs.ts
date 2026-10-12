export const designs=[
 {name:'金縁の呼吸',en:'GILDED BREATH',period:2600,note:'輪郭の金に、二つの反射がゆっくり巡る。',detail:'色の違いを中心に、枠そのものの厚みと細い反射で仕上げる。'},
 {name:'双刃の構え',en:'PAIRED EDGES',period:2900,note:'左右の縁が、二枚の刃のように前へ構える。',detail:'カード枠とつながる刃の面。左右が時間差で伸び、静かに枠へ戻る。'},
 {name:'双光の反射',en:'CROSSED REFLECTION',period:3400,note:'二筋の光が、カード面を逆方向に横切る。',detail:'絵柄を透かす薄い反射。二つの光源が左右の金属縁へ受け渡される。'},
 {name:'双拍の踏み込み',en:'TWIN CADENCE',period:2800,note:'一拍、もう一拍。カード自身が小さく前へ。',detail:'二度の予備動作と、左右の縁の点灯を同期。重心の変化で二刀流を伝える。'},
] as const;
export const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export const smooth=(a:number,b:number,n:number)=>{const t=clamp((n-a)/(b-a));return t*t*(3-2*t);};
export const pulse=(a:number,b:number,c:number,d:number,t:number)=>smooth(a,b,t)*(1-smooth(c,d,t));
export type Remaining=0|1|2;
