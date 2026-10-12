export const IDS=['POISON_MASTER','RUST_SLUG','RUST_SHROOM'] as const;
export type CardId=typeof IDS[number];
export const DURATION=2800;
export const names:Record<CardId,string>={POISON_MASTER:'ポイズンマスター',RUST_SLUG:'ラストキャップ・スラッグ',RUST_SHROOM:'ラストマッシュルーム'};
export const studies:Record<CardId,{name:string;desc:string}[]>={
 POISON_MASTER:[
 {name:'毒瓶の傾注',desc:'絵の薬瓶から毒液が流れ、カード面への落下点から濡れた膜が広がる。'},
 {name:'毒膜の圧潰',desc:'カードの面に付いた毒が立体的に膨らみ、重さで潰れて面へ広がる。'},
 {name:'双流の調合',desc:'面上の二つの薬液が合わさって一滴を押し上げ、重力で同じ面へ落ちる。'},
 {name:'毒衣の脱殻',desc:'面上の毒膜の左右が持ち上がり、中央を面に残して重さで垂れ戻る。'}],
 RUST_SLUG:[
 {name:'粘足の這行',desc:'水平な面を腹足が這い、胴の収縮波とともに濡れた幅広い軌跡を残す。'},
 {name:'菌殻の開帳',desc:'面に伏せた菌床から、大小の錆色の傘が順に軸を伸ばして開く。'},
 {name:'粘膜の乗り越え',desc:'カード面に付いた粘液が盛り上がり、低い波が面を横切って伝わる。'},
 {name:'殻床の脱皮',desc:'面に根付いた二つの菌床が左右へ開き、低く潰れてカード面へ戻る。'}],
 RUST_SHROOM:[
 {name:'菌糸の発芽',desc:'カードの絵から枝分かれする菌糸。その節から小さな子実体が芽吹く。'},
 {name:'錆傘の開花',desc:'閉じた傘が軸を伸ばして開く。薄いひだと欠けた錆色の表皮を見せる。'},
 {name:'ひだの呼吸',desc:'傘の裏に青緑のひだが現れ、胞子が傘からカード面へ落ちる。'},
 {name:'群生の波',desc:'小・中・大の三株が時間差で立ち上がり、傘のしなりを返して地に戻る。'}]
};
export const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export const ease=(a:number,b:number,t:number)=>{const x=clamp((t-a)/(b-a));return x*x*(3-2*x);};
