export const cards = ['NHEX','HEXER1','HEXER2','HEXER3','HEXER4'] as const;
export type Id = typeof cards[number];
export const names = ['見習い呪術師','初級呪術師','中級呪術師','上級呪術師','ケロイド'];
export const designs = [
 {name:'紫墨の解呪',en:'LIVING INK',note:'刻まれた呪文から黒紫の膜が滲む。厚い縁がめくれ、細い刻印を残してカードへ帰る。',material:'流れる被膜 / 湿った反射 / 刻印'},
 {name:'鎖印の解放',en:'UNBOUND',note:'カードの刻印が交差する鎖を結ぶ。引き絞られた鎖が中央から解け、四隅へ沈む。',material:'連なる金属 / 張力 / 解放'},
 {name:'黒帷の開帳',en:'DARK REVELATION',note:'左右の枠から一枚ずつの黒い帷が立ち上がる。柔らかな襞と影が走り、絵柄が現れる。',material:'二枚の薄膜 / 移動する襞 / 透過'},
 {name:'黒曜の再成',en:'REFORGED RECORD',note:'絵柄を保ったカード表面が細片に分かれて浮く。紫の亀裂が閉じ、元の一面へ戻る。',material:'絵柄を持つ薄片 / 亀裂 / 再成'},
 {name:'血蝋の血判',en:'BLOOD PACT',note:'呪文の細い溝から血蝋が凝り、印が押し込まれる。封印は滲んで面へ染み戻る。',material:'血蝋 / 彫り込む印 / 毛細管'},
 {name:'呪冠の降臨',en:'CROWN OF HEXES',note:'カードの四隅から黒い呪角が伸びる。高さと重みを持つ冠が、接地に合わせて枠へ沈む。',material:'黒い呪角 / 四隅の支点 / 重力'},
];
export const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export const ease=(a:number,b:number,t:number)=>{const p=clamp((t-a)/(b-a));return p*p*(3-2*p);};
export const duration=(id:Id)=>[2600,2900,3150,3400,3700][cards.indexOf(id)];
export function motion(id:Id,ms:number,reduced=false){const t=clamp(ms/duration(id)),level=cards.indexOf(id);const fall=clamp((t-.58)/.18);return {t,level,height:reduced?0:(44+level*5)*ease(0,.14,t)*(1-fall*fall),grow:reduced?0:ease(.1,.34,t),open:reduced?1:ease(.40,.70,t),return:reduced?1:ease(.68,.92,t),contact:.76*duration(id)};}
