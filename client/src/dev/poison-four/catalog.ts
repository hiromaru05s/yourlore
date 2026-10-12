export const IDS=['POISON_MASTER','RUST_SLUG','RUST_SHROOM'] as const;
export type CardId=typeof IDS[number];
export const DURATION=2800;
export const names:Record<CardId,string>={POISON_MASTER:'ポイズンマスター',RUST_SLUG:'ラストキャップ・スラッグ',RUST_SHROOM:'ラストマッシュルーム'};
export const studies:Record<CardId,{name:string;desc:string}[]>={
 POISON_MASTER:[
 {name:'毒瓶の傾注',desc:'絵の薬瓶から毒液が流れ、厚い液膜がカードの下辺を伝って引き戻る。'},
 {name:'硝子膜の破裂',desc:'カード表面の毒が一枚の薄膜へ膨らみ、穴がつながって縁へ裂ける。'},
 {name:'双流の調合',desc:'左右の薬液が別々の軌道で合流。重い一滴が面へ沈み、毛細管へ戻る。'},
 {name:'毒衣の脱殻',desc:'毒がカード面を縦に染め、二枚の粘る皮膜として剥がれ、端から巻き戻る。'}],
 RUST_SLUG:[
 {name:'粘足の這行',desc:'腹足の収縮波が前へ走る。濡れた幅広い軌跡を引き、触角から絵へ戻る。'},
 {name:'菌殻の開帳',desc:'背の菌床から大小の錆色の傘が順に開く。青緑のひだが一度だけ脈打つ。'},
 {name:'粘膜の乗り越え',desc:'前縁で粘液が盛り上がり、カードへ乗り上げる波が後端まで伝わる。'},
 {name:'殻床の脱皮',desc:'カードを包む濡れた菌床が上下へほどけ、繋がった粘糸を残して沈む。'}],
 RUST_SHROOM:[
 {name:'菌糸の発芽',desc:'カードの絵から枝分かれする菌糸。その節から小さな子実体が芽吹く。'},
 {name:'錆傘の開花',desc:'閉じた傘が軸を伸ばして開く。薄いひだと欠けた錆色の表皮を見せる。'},
 {name:'ひだの呼吸',desc:'傘の裏のひだを順に明るくし、薄い胞子膜を裾へ送り、裂いて消す。'},
 {name:'群生の波',desc:'小・中・大の三株が時間差で立ち上がり、傘のしなりを返して地に戻る。'}]
};
export const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export const ease=(a:number,b:number,t:number)=>{const x=clamp((t-a)/(b-a));return x*x*(3-2*x);};
