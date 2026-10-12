export const DURATION=3400;
export const designs=[
 {name:'竜牙の開殻',en:'CROWN / SPLIT',note:'内側の鼓動が縦の亀裂を走り、厚い殻が根元を残して開く。',hit:1280},
 {name:'螺旋の脱殻',en:'SPIRAL / UNWIND',note:'殻の継ぎ目が下からほどけ、一続きの鱗帯となって旋回する。',hit:1480},
 {name:'内圧の破殻',en:'PRESSURE / RUPTURE',note:'二度の息づきで内圧を溜め、大小の殻片を短く押し出す。',hit:1150},
 {name:'双翼の孵化',en:'WINGS / UNFOLD',note:'中央から裂けた殻が左右へ開き、内膜が翼として張り出す。',hit:1380},
];
export const outcomes=[
 {id:'D_BLACK',name:'黒竜',egg:'DRAGON_EGG',color:'#a393f2',deep:'#1a122e',shell:'#343040',accent:'#dcd2fa'},
 {id:'D_RED',name:'赤竜',egg:'DRAGON_EGG',color:'#ff8044',deep:'#4a171a',shell:'#53352d',accent:'#ffe3a6'},
 {id:'D_BLUE',name:'青竜',egg:'DRAGON_EGG',color:'#56d4ea',deep:'#132e4d',shell:'#28414b',accent:'#d0ffff'},
 {id:'DIVINE',name:'神獣',egg:'BEAST_EGG',color:'#e5c67e',deep:'#73643d',shell:'#e4dec9',accent:'#fff7db'},
];
export const clamp=(x:number)=>Math.min(1,Math.max(0,x));
export const smooth=(a:number,b:number,t:number)=>{const x=clamp((t-a)/(b-a));return x*x*(3-2*x);};
export function phase(ms:number,v:number){return ms<450?'卵の具現':ms<designs[v].hit?'鼓動・亀裂':ms<2100?'開殻・孵化':ms<2900?'記録の定着':'余韻';}
