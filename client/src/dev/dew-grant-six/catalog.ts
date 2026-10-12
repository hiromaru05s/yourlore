export type Study={id:string;family:'dew';mode:'first'|'add';index:number;name:string;material:string;description:string;duration:number;contact:number};
export const studies:Study[]=[
 {id:'DF1',family:'dew',mode:'first',index:0,name:'朝露の凝結',material:'凝縮する水滴 / 濡れた金縁',description:'カード面に結んだ露が集まり、大小の水滴が一つの雫に融け合う。濡れた縁が最後に器を結ぶ。',duration:2500,contact:1660},
 {id:'DF2',family:'dew',mode:'first',index:1,name:'落滴の結器',material:'自由落下 / 表面張力',description:'大きな一滴が細い尾を引いて落下。着地でつぶれ、弾性で立ち上がった液体が雫の器になる。',duration:2350,contact:1550},
 {id:'DF3',family:'dew',mode:'first',index:2,name:'翠膜の抱露',material:'薄い水膜 / 折り返す反射',description:'カードからほどけた二枚の水膜が、前後から包み込む。薄い縁を残して閉じ、内側に露を宿す。',duration:2700,contact:1860},
 {id:'DA1',family:'dew',mode:'add',index:0,name:'一滴の波紋',material:'液面への合流 / 局所屈折',description:'既存の雫へ一滴が吸い込まれる。接触点から内部だけに波が伝わり、金縁を残して静まる。',duration:2100,contact:1160},
 {id:'DA2',family:'dew',mode:'add',index:1,name:'金縁の汲露',material:'毛細管 / 濡れた縁の充填',description:'下端から汲み上げた露が金縁の両側を這う。左右の液流が先端で合わさり、内面へ満ちる。',duration:2550,contact:1710},
 {id:'DA3',family:'dew',mode:'add',index:2,name:'双流の融和',material:'二つの液体 / ねじれる薄膜',description:'二つの厚い水の帯が既存の雫を包み、左右から内側へ融け込む。液面のうねりが一度だけ返る。',duration:2450,contact:1560},
];
export const groupLabel=(_family:string,mode:string)=>mode==='first'?'雫 / 初回付与':'雫 / 追加付与';
export const beforeCount=(s:Study)=>s.mode==='first'?0:5;
export const afterCount=(s:Study)=>beforeCount(s)+3;
