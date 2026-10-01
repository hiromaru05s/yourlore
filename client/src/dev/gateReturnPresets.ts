/** Art directions, not game mechanics. All five preserve the approved twin-gate transfer. */
export const GATE_STUDIES=[
 {id:'gate-astral',name:'星詠みの双環',en:'ASTRAL CONCORD',ms:2480,color:'#548be1',secondary:'#edc477',mode:0,description:'星雲の奥行き、金の軌道環、流星の転送。前回の双環を正統に磨いた案。'},
 {id:'gate-tidal',name:'蒼潮の双環',en:'TIDAL VEIL',ms:2380,color:'#25b8d0',secondary:'#91f3db',mode:1,description:'水面のように揺らぐ入口。厚い三日月がほどけ、細い水流へ変わってつながる。'},
 {id:'gate-fulgur',name:'雷紋の双環',en:'FULGUR SEAL',ms:2180,color:'#9473ec',secondary:'#88cfff',mode:2,description:'裂けた輪郭と枝分かれする雷光。短い転送のピークから、細い残光へ。'},
 {id:'gate-crystal',name:'晶花の双環',en:'CRYSTAL IRIS',ms:2620,color:'#619dde',secondary:'#c4edff',mode:3,description:'六つの結晶が花弁のように開く。光の薄片を送り、カードの輪郭から積み直す。'},
 {id:'gate-corona',name:'天冠の双環',en:'CORONA TRANSIT',ms:2520,color:'#d1a04b',secondary:'#86cfff',mode:4,description:'青い空洞を金の冠が囲む。圧縮された光が走り、幾重もの光輪を残して閉じる。'},
] as const;
export type GateVariant=typeof GATE_STUDIES[number]['id'];
