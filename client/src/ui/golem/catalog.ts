export const cards=[['GOLEM1','兵士'],['GOLEM2','リーダー'],['GOLEM3','キング'],['M10','マナ'],['NGA3','戦士'],['NWL3','ガーディアン'],['MANA_GIANT','ジャイアント']] as const;
export type Id=typeof cards[number][0];
export const DURATION=3400;
export const designs=[
 {name:'岩殻の解放',en:'LIMESTONE / RELEASE',note:'カードを包む石殻が、割れ目から外へほどける。断面を見せて盤面に落ち着く。',hit:1490},
 {name:'薄層の剥離',en:'SHALE / PEEL',note:'重なった薄い地層が順に起き上がり、カードの両端へ剥がれ落ちる。',hit:1590},
 {name:'巨殻の脱皮',en:'BEDROCK / MOLT',note:'厚く盛り上がった岩塊を内側から押し開く。大きく重い殻が外へ転がる。',hit:1640},
 {name:'核石の解錠',en:'CORE / UNSEAL',note:'石肌の細い晶脈が灯り、周囲の石が解ける。中央の要石が最後に外れる。',hit:1760},
 {name:'石甲の展開',en:'ARMOR / UNFOLD',note:'左右の厚い石甲が外へ倒れ、カードを解放。板の縁から盤面へ接地する。',hit:1600},
 {name:'風化の目覚め',en:'MINERAL / SHED',note:'細かな石片が上から順に剥がれ、低く滑り落ちる。石肌からカードが現れる。',hit:1510},
];
export const sat=(x:number)=>Math.min(1,Math.max(0,x));
export const ease=(a:number,b:number,t:number)=>{const x=sat((t-a)/(b-a));return x*x*(3-2*x);};
export const weight=(id:Id)=>id==='GOLEM3'?1.18:id==='MANA_GIANT'?1.28:id==='GOLEM1'?.78:1;
export function lift(v:number,t:number,id:Id){const hit=designs[v].hit;return (.32+.1*weight(id))*(1-ease(470,hit,t)**2)+.012*Math.sin(sat((t-hit)/230)*Math.PI);}
