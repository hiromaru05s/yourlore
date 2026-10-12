export const DURATION=3400;
export const heroes=[
 {id:'CHOSEN_KNIGHT',name:'剣士',en:'KNIGHT',cue:'刃の鍛接 → 鍔の確定 → 面で着地'},
 {id:'CHOSEN_MAGE',name:'魔法使い',en:'MAGE',cue:'杖の芯 → 天球の組み上げ → 術式の収束'},
 {id:'CHOSEN_ARCHER',name:'弓手',en:'ARCHER',cue:'弓の張力 → 弦を引く → 矢筋の収束'},
 {id:'CHOSEN_ROGUE',name:'盗賊',en:'ROGUE',cue:'左右の短剣 → 時間差の交差 → 影を回収'},
];
export const designs=[
 {name:'金鍛の顕現',en:'GILDED FORGING',note:'黒鋼の兵装を下から鍛接。細い金の稜線が走り、重みを残して納まる。',material:'黒鋼 / 金象嵌',hit:1840},
 {name:'紫晶の解殻',en:'AMETHYST SHELL',note:'カードの輪郭から育つ薄い結晶殻。職ごとの兵装を包み、稜線から裂けて戻る。',material:'紫晶 / 内部反射',hit:1970},
 {name:'紺帛の解封',en:'SILKEN UNBINDING',note:'紺の織布がカード面からほどけ、兵装の輪郭を撫でて両端へ引き抜かれる。',material:'紺絹 / 金糸',hit:2120},
 {name:'白亜の継承',en:'IVORY RELIQUARY',note:'白亜のレリーフが部位ごとに起き上がる。金の継ぎ目が閉じ、職の印を刻む。',material:'白亜 / 彫金',hit:2040},
 {name:'銀膜の刻像',en:'SILVER IMPRINT',note:'水銀色の薄膜が兵装の形へ引き伸ばされ、鏡面の波が刃から柄へ返る。',material:'銀膜 / 黒い芯',hit:1880},
 {name:'双影の帰一',en:'CONVERGING ECHOES',note:'カード面の二つの影が対角へ分かれ、職固有の動作を描いて一つへ戻る。',material:'影の薄殻 / 銀の縁',hit:1730},
];
export const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export const ease=(x:number)=>{x=clamp(x);return x*x*(3-2*x)};
export const phase=(t:number,a:number,b:number)=>ease((t-a)/(b-a));
export function lift(t:number,v=0){const hit=designs[v].hit;return .32*(1-phase(t,400,hit))+.025*Math.sin(phase(t,hit,hit+250)*Math.PI)}
