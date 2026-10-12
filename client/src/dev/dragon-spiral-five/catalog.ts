export type Variant = 0 | 1 | 2 | 3 | 4;
export type ResultId = 'DRAGON_RIDER' | 'ANTIQUE_DK';
export {clamp, ease, mix, mateFor} from '../dragon-fusion-four/catalog';
export const designs = [
  {name:'蒼鱗の誓槍',en:'THE JADE COVENANT',duration:4000,hit:2870,description:'厚い鱗を連ねた竜が、銀の槍を大きく一周。顎を開いて穂先を追い、尾から順に槍身へ巻き締まる。',material:'重なり鱗・骨角・銀の鎬',action:'大きな一周 → 巻き締め → 貫入'},
  {name:'鉄鱗の鎧槍',en:'THE IRONBOUND OATH',duration:4000,hit:2790,description:'幅広い装甲竜が低く巻きつき、鱗板を起こして槍に噛み合わせる。重い竜頭と刃が一度だけ沈み、新しい面に鍛着する。',material:'多層装甲・鋲・磨いた刃',action:'低い旋回 → 装甲のロック → 圧着'},
  {name:'翼竜の旋槍',en:'THE WINGED VOW',duration:4000,hit:2760,description:'翼膜を張った竜が槍を斜めに追い越し、翼を折りながら旋回。穂先に沿う一筋の切り返しで、カードの面へ戻る。',material:'指骨・張った翼膜・曲刃',action:'翼の展開 → 斜旋回 → 切り返し'},
  {name:'白角の双螺',en:'THE IVORY HELIX',duration:4000,hit:2920,description:'枝分かれした長角と腹甲を持つ細身の竜。槍の前後を二重に縫い、頭から尾へ伝わる波で滑らかに収束する。',material:'枝角・真珠色の腹甲・細彫り',action:'二重の螺旋 → 伝播 → 引き込み'},
  {name:'黒金の王槍',en:'THE CROWNED SPEAR',duration:4000,hit:2960,description:'冠状の角と大きな顎を持つ竜が、槍を包んで一瞬静止。背の金鱗が閉じる重さを溜め、短く鋭い一撃で融合する。',material:'黒曜の鱗・金の稜線・冠角',action:'包囲 → 溜めと咆哮 → 一撃'},
] as const;
export const MAX_DURATION=4000;
export const phase=(v:Variant,t:number)=>t<280?'表面の呼応':t<950?'竜と槍の具現':t<2200?'螺旋の融合':t<designs[v].hit?'巻き締め':t<3700?'定着':'完了';
