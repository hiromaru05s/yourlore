export const IDS=['POISON_MASTER','RUST_SLUG','RUST_SHROOM'] as const;
export type CardId=typeof IDS[number];
export const DURATION=2800;
export const names:Record<CardId,string>={POISON_MASTER:'ポイズンマスター',RUST_SLUG:'ラストキャップ・スラッグ',RUST_SHROOM:'ラストマッシュルーム'};
export const studies:Record<CardId,{name:string;desc:string}[]>={
 POISON_MASTER:[
 {name:'毒溜まりから浮かぶ',desc:'着地で広がった毒液の中央から、カード面が浮かび上がる。'},
 {name:'毒液が流れ落ちる',desc:'カードを包む毒液が面に沿って一方向へ流れ、絵と枠を露出させる。'},
 {name:'毒膜が溶ける',desc:'厚い毒膜に穴が開き、穴がつながるにつれてカードが現れる。'},
 {name:'二液が割れて現れる',desc:'二つの毒液の境目が開き、左右へ引く液体の間からカードが現れる。'}],
 RUST_SLUG:[
 {name:'粘液が這い退く',desc:'太い粘液の波がカード面を這い、通った後にカードが残る。'},
 {name:'粘膜が引き裂かれる',desc:'粘膜の中央に裂け目が走り、持ち上がる縁の下からカードが現れる。'},
 {name:'粘液が先端へ縮む',desc:'カードを包んだ粘液が一端へ縮み、後方からカードが露出する。'},
 {name:'粘皮が剥がれる',desc:'片側から厚い粘皮がめくれ、下にあるカードを横方向へ見せる。'}],
 RUST_SHROOM:[
 {name:'菌床がほどける',desc:'錆色の菌床が枝分かれした境界からほどけ、カード面へ戻る。'},
 {name:'菌殻が開く',desc:'膨らんだ菌殻が中央から裂け、開いた殻の下にカードが現れる。'},
 {name:'胞子層が崩れる',desc:'菌床に小さな空洞が生まれ、胞子の層が崩れるとカードが残る。'},
 {name:'三つの菌床が解ける',desc:'三か所の菌床が別々にほどけ、その境目がつながって一枚のカードになる。'}]
};
export const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export const ease=(a:number,b:number,t:number)=>{const x=clamp((t-a)/(b-a));return x*x*(3-2*x);};
