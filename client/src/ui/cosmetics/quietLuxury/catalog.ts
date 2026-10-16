export const SETS = [
  {id:'lacquer', name:'黒漆の一閃', material:'黒漆 × シャンパンゴールド', body:'#10151c', metal:'#bca06c', accent:'#ead4a4',
    motion:'艶のある黒い一枚面。一本の金の象嵌を光がゆっくり走り、漆面に細い反射が流れる。'},
  {id:'porcelain', name:'白磁の余白', material:'白磁 × プラチナ', body:'#e7e6de', metal:'#a7b4bd', accent:'#e9f3f6',
    motion:'柔らかい角と、白磁の広い余白。銀の稜線に沿って光が折り返し、中央の小さな銀印が静かに輝く。'},
  {id:'emerald', name:'翠硝子の封印', material:'深緑ガラス × ペールゴールド', body:'#103f38', metal:'#bba577', accent:'#b6e2cf',
    motion:'面取りした深緑のガラスを、上下の金具で留める。ガラスの内側を淡い光の層がゆっくり往復する。'},
] as const;
export type SetIndex = 0 | 1 | 2;
