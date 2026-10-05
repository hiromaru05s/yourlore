export const DURATION=2500;
export const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export const ease=(a:number,b:number,x:number)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
export const designs=[
 {name:'砂紋の着地',en:'SILT / LAMINAR',note:'カードの縁から薄い砂の層が走る。低い噴出と細かな沈降。',hit:620,color:'#cbb697'},
 {name:'巻雲の着地',en:'VOLUME / CURL',note:'圧縮した煙が四隅で巻き返す。明るい外縁と深い内部。',hit:690,color:'#b8bbc6'},
 {name:'岩層の着地',en:'SLATE / WEIGHT',note:'一拍溜めた重い接地。角張った砕片と低い砂の尾。',hit:790,color:'#b6a78f'},
 {name:'光絹の着地',en:'SILK / FLOW',note:'枠の光が薄い膜へほどけ、接地面を滑って先端から裂ける。',hit:730,color:'#d1c7ad'},
 {name:'圧塵の着地',en:'PRESSURE / RELEASE',note:'鋭い接地で圧力が一度だけ解放。広がる面が細く崩れる。',hit:570,color:'#bba694'},
 {name:'晶霧の着地',en:'MICA / REFRACTION',note:'表面の冷たい反射が結晶片に移り、細い霧へ戻る。',hit:760,color:'#b5cbd1'},
];
export function motion(v:number,ms:number,reduced=false){
 const hit=designs[Math.min(v,5)].hit;if(reduced)return{lift:0,tilt:0,scale:1,hit};
 const q=clamp(ms/hit),drop=v===2?ease(.32,1,q)**2:v===4?q*q*q:ease(.02,1,q),age=Math.max(0,(ms-hit)/420);
 const bounce=ms>hit?Math.sin(Math.min(1,age)*Math.PI)*Math.exp(-age*4):0;
 return{lift:(1-drop)*[.43,.5,.66,.38,.53,.46][v]+bounce*[.025,.04,.016,.018,.01,.025][v],tilt:0,scale:1,hit};
}
