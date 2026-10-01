/** Five studies of a single card surface travelling through the approved twin gates. */
export const CONNECTED_STUDIES=[
 {id:'linked-silver',name:'銀紋の帰還',en:'SILVER CONTINUUM',ms:2820,color:'#6c71ce',secondary:'#d4d3ff',mode:0,strips:1,description:'枠と絵柄に走った銀紋が、一枚の光帯へほどける。同じ紋様がデッキの面へ戻る。'},
 {id:'linked-tidal',name:'蒼潮の綾',en:'TIDAL WEAVE',ms:2920,color:'#278da4',secondary:'#b9fae7',mode:1,strips:3,description:'カード面が三筋の潮流へ分かれ、波の位相をずらして重なる。先端から静かに積層する。'},
 {id:'linked-fulgur',name:'雷紋の継承',en:'FULGUR RELAY',ms:2360,color:'#7953c9',secondary:'#cceaff',mode:2,strips:5,description:'表面の光脈を溜め、カードの細片が折れた雷路を走る。接触ごとに鋭い光が返る。'},
 {id:'linked-petal',name:'晶翼の還流',en:'CRYSTAL FOLD',ms:3080,color:'#3a7fa9',secondary:'#d6f4ff',mode:3,strips:5,description:'絵柄を保った薄片が翼のように開く。光を拾う面を見せ、同じ順序でカードへ閉じる。'},
 {id:'linked-crown',name:'金綴じの双環',en:'GILDED BINDING',ms:3020,color:'#ab782d',secondary:'#fff0b4',mode:4,strips:3,description:'カードの枠が金糸へ伸び、三枚の織物として弧を描く。着地した面に金の縁が残る。'},
] as const;
export type ConnectedVariant=typeof CONNECTED_STUDIES[number]['id'];
