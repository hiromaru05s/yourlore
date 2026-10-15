export const SETS = [
  {id:'orrery',name:'星儀の金工',en:'THE CELESTIAL ENGINE',material:'真鍮 × 群青エナメル',accent:'#d9bd79',body:'#132d40',metal:'#b69754',description:'細い歯車が噛み合い、星儀の針が時を刻む。磨かれた真鍮と、深い群青のエナメル。',motion:'置き場の側面で歯車が回転。墓地の二重目盛りと、スリーブに封じた星儀がゆっくり連動。',period:24},
  {id:'moonlotus',name:'月蓮の白磁',en:'THE PORCELAIN BLOOM',material:'白磁 × 螺鈿 × 月光',accent:'#81c9c3',body:'#d9e2dc',metal:'#b2a67d',description:'重なった白磁の花弁が、呼吸するようにほどける。螺鈿の葉脈に、淡い月光が満ちる。',motion:'カードの外側で花弁が小さく開閉。スリーブの蓮も同じ呼吸で開き、葉脈を光が伝う。',period:10},
  {id:'goldfault',name:'金脈の黒曜',en:'THE GILDED FAULT',material:'黒曜石 × 金継ぎ × 金液',accent:'#eeaf56',body:'#171b25',metal:'#c79342',description:'艶のある黒曜石の内側を、細い金液が流れる。継ぎ目だけが動く、静かな重厚感。',motion:'磨かれた黒曜石に細い反射が移り、面をつなぐ金の継ぎ目を光が巡る。スリーブにも同じ金脈が走る。',period:12},
] as const;
export type SetIndex = 0 | 1 | 2;
