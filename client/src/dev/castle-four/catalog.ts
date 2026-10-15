export type Id='CASTLE';
export const DURATION=2600;
/** 01 has no remaining stone geometry after this point. */
export const STONE_CLEAR_MS=2440;
export const ease=(a:number,b:number,t:number)=>{const x=Math.max(0,Math.min(1,(t-a)/(b-a)));return x*x*(3-2*x)};
export const designs=[
 {name:'白亜の築城',en:'COURSES OF IVORY',text:'石の被膜が周縁へ積み上がり、四隅の塔からカードへ沈み込む。',material:'白亜石・青鋼',hit:860},
 {name:'王門の開帳',en:'THE SOVEREIGN GATE',text:'カードを覆う重い双扉が軸を支点に開き、金の格子が引き上がる。',material:'青鉄・真鍮',hit:1050},
 {name:'金鋳の城印',en:'GILDED IMPRESSION',text:'金属の薄膜から城の浮彫りがせり上がり、細い鋳脈へ戻る。',material:'鋳金・黒曜の下地',hit:1120},
 {name:'四壁の展開',en:'FOLDING BASTION',text:'カード面を覆う四枚の城壁が順に起き、外周へ折り納まる。',material:'白石・紺の琺瑯',hit:980},
] as const;
