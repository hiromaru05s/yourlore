import {attackPlan,attackPose as currentAttackPose} from '../attackVisual';
export type Kind='summon'|'attack'|'destroy'|'trigger'|'atk'|'hp'|'both'|'aura'|'ready'|'blocked';
export type Variant='A'|'B'|'C';
export const variants:Variant[]=['A','B','C'];
export const vi=(v:Variant)=>variants.indexOf(v);
export const options=(k:Kind):Variant[]=>k==='destroy'||k==='blocked'?['A','B']:variants;
export const studies:{id:Kind;name:string;en:string;ms:number;durations:[number,number,number];names:[string,string,string];notes:[string,string,string]}[]=[
{id:'summon',name:'召喚',en:'ON THE TABLE',ms:1700,durations:[1400,1700,1550],names:['平行にストン','重く沈めて接地','片側から柔らかく接地'],notes:['カードの面を盤面と平行に保つ。影へまっすぐ落ち、薄い接触光が広がる。','平行な面を高めで一瞬保持。加速落下の衝撃が四辺から薄く広がる。','盤面から最大4度だけ傾け、片側から全面へ接地。立てたカードにはしない。']},
{id:'attack',name:'攻撃→待機',en:'STRIKE / REST',ms:3200,durations:[3000,3200,3100],names:['横へ裂ける命中光','厚い衝撃と命中停止','二重に走る裂光'],notes:['採用方向の動作を維持。衝撃を横へ広げ、命中したカードも反応する。終了後はBの消灯。','深い溜めと長い命中停止。太い色面と白い芯で実盤面でも読ませる。終了後は消灯。','二つの時間差の裂光。加速と短い余韻を強調。終了後はグレーを維持。']},
{id:'destroy',name:'破壊→行き先',en:'SHATTER / TRANSFER',ms:2400,durations:[2400,2400,2400],names:['通常破壊 → シェルフ','虚無 → リフト',''],notes:['推奨：破壊Aの同じ16片が移動し、シェルフの面で綴じ直される。場には戻らない。','推奨：破壊Aの同じ破片が黒紫へ細くほどけ、そのままリフトへ吸収される。','']},
{id:'trigger',name:'効果発動',en:'LIFT / ACTIVATE',ms:1500,durations:[1200,1500,1350],names:['浮上して一閃','溜めて二段発光','傾きと光の返り'],notes:['前稿Bの浮上を継承。カードを持ち上げ、枠から鋭い光が一度だけ外へ抜ける。','浮上中に短く溜め、枠の点灯→外側の裂光の順で発動を伝える。','わずかな傾きに表面の反射が追従し、発動の瞬間に静止して戻る。']},
...(['atk','hp','both'] as const).map((id)=>({id,name:id==='atk'?'攻撃力バフ':id==='hp'?'体力バフ':'攻撃＋体力バフ',en:id==='both'?'DUAL UP':'STAT UP',ms:1800,durations:[1400,1800,1600] as [number,number,number],names:['浮上・一段の山形','溜め・二段の山形','弾む光・三段の山形'] as [string,string,string],notes:['浮上と拡大→青い枠が開く→カード内の山形。数値も着地前に更新。','高めに保持し、二段の山形と枠のハイライトを時間差で走らせる。','浮上後に小さく光が返り、三段の山形が上へ抜ける。外側の光は控えめ。'] as [string,string,string]})),
{id:'aura',name:'常時効果',en:'PERSISTENT ON',ms:3000,durations:[3000,3000,3000],names:['点灯した外周','四隅の点灯','左右の発光帯'],notes:['有効中は明るい青緑の縁が常に残る。呼吸の谷でも消えない。','四隅に太い青緑の明部を固定。内側から外へ弱い光が返る。','左右の帯が常時点灯。細いハイライトだけがゆっくり上がる。']},
{id:'ready',name:'攻撃可能',en:'FORWARD',ms:2200,durations:[2200,2200,2200],names:['一段・前へ脈動','二段・前へ送る','山形と予備動作'],notes:['Aの山形を大きく、短く明瞭に。相手方向へ送る。','二つの山形が交互に前進。最低一つは常に見える。','山形の前進とカードの小さい予備動作が同期する。']},
{id:'blocked',name:'攻撃不可',en:'EXHAUSTED B',ms:2800,durations:[2800,2800,2800],names:['攻撃後：Bで消灯→維持','他の理由：最初からグレー',''],notes:['採用Bの沈み・消灯を再生後、最後のグレーを保持。攻撃タブでは前後を連続確認。','召喚酔い等で最初から攻撃できない状態。遷移を挟まずBの最終状態へ。','']},
];
export const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export const ease=(a:number,b:number,t:number)=>{const x=clamp((t-a)/(b-a));return x*x*(3-2*x);};
export const out=(x:number)=>1-(1-clamp(x))**3;
export const pulse=(a:number,b:number,c:number,d:number,t:number)=>ease(a,b,t)*(1-ease(c,d,t));
export const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
export const duration=(k:Kind,v:Variant)=>studies.find(s=>s.id===k)!.durations[vi(v)];
export const persistent=(k:Kind)=>['aura','ready','blocked','attack','destroy'].includes(k);
export const localTime=(k:Kind,v:Variant,t:number)=>clamp(t*studies.find(s=>s.id===k)!.ms/duration(k,v));
export const strikeMs=(v:Variant)=>[880,1100,960][vi(v)];
export const strikeTime=(v:Variant,t:number)=>clamp(t*duration('attack',v)/strikeMs(v));
export const contactTime=(k:Kind,v:Variant)=>k==='summon'?[.42,.49,.47][vi(v)]:[340/880,.44,.35][vi(v)];
export const isBuff=(k:Kind)=>['atk','hp','both'].includes(k);
export function phase(k:Kind,t:number){if(k==='attack')return t<.38?'攻撃':t<.72?'B：消灯・彩度低下':'攻撃不可を維持';if(k==='destroy')return t<.25?'破壊A：分割':t<.83?'同じ破片が移動':'行き先で収束';if(k==='blocked')return t<.4?'B：消灯／即時切替':'攻撃不可を維持';if(persistent(k))return '有効な状態を持続';return t<.2?'浮上':t<.45?'溜め・拡大':t<.68?'発動・接触':'着地・収束';}
export type Rect={x:number;y:number;w:number;h:number;matrix?:DOMMatrix};
export const asRect=(r:Rect)=>({left:r.x-r.w/2,top:r.y-r.h/2,width:r.w,height:r.h});
export function baselinePose(_k:Kind,ms:number,r:Rect,target:Rect){const p=currentAttackPose(attackPlan(asRect(r),asRect(target)),Math.min(ms,880));return{x:p.x,y:p.y,angle:p.turn,scale:p.scale};}
export function pose(k:Kind,v:Variant,t:number,r:Rect,target:Rect,reduced=false,active=true,side=1){
 let x=r.x,y=r.y,angle=0,scale=1,reveal=1,brightness=1,saturation=1,edge=0,z=0,rock=0;const i=vi(v);
 if(k==='blocked'||k==='attack'&&(reduced||t*duration(k,v)>=strikeMs(v))){
  const bt=k==='attack'?(t*duration(k,v)-strikeMs(v))/1400:v==='B'?1:t*2;
  const q=reduced?1:ease(0,.62,bt);saturation=1-q;brightness=1-.43*q;y+=r.w*.035*q;scale=1-.018*q;
  return{x,y,angle,scale,reveal,brightness,saturation,edge,z,rock};
 }
 if(k==='aura'&&active){brightness=1.08;edge=1;}
 if(reduced)return{x,y,angle,scale,reveal:k==='destroy'?0:1,brightness,saturation,edge,z,rock};
 if(k==='summon'){
  const hit=contactTime(k,v),q=clamp((t-(v==='B'?.19:.04))/(hit-(v==='B'?.19:.04))),fall=q**(v==='B'?3.2:2.3);
  z=r.w*[.95,1.26,.76][i]*(1-fall);rock=v==='C'?4*(1-fall):0;
  if(t>=hit){const q=clamp((t-hit)/.19);z=r.w*[.024,.045,.014][i]*Math.sin(q*Math.PI)*Math.exp(-q*2);}
  brightness+=.12*pulse(hit,hit+.02,hit+.065,hit+.23,t);
 }
 if(k==='attack'){
  const at=strikeTime(v,t),plan=attackPlan(asRect(r),asRect(target));let ms=at*880;
  if(v!=='A'){const hit=contactTime(k,v),hold=v==='B'?.073:.052,launch=v==='B'?.28:.17;ms=at<launch?mix(0,180,at/launch):at<hit?mix(180,340,(at-launch)/(hit-launch)):at<hit+hold?mix(340,395,(at-hit)/hold):mix(395,880,(at-hit-hold)/(1-hit-hold));}
  const p=currentAttackPose(plan,ms);x=p.x;y=p.y;angle=p.turn;scale=p.scale;edge=pulse(.1,.2,.55,.8,at)*.75;brightness+=.14*pulse(.27,.36,.43,.63,at);
 }
 if(k==='trigger'||isBuff(k)){
  const buff=isBuff(k),rise=pulse(0,.22,.53,.88,t),charge=pulse(.14,.30,.50,.88,t);
  z=r.w*(buff?[.22,.30,.24][i]:[.18,.26,.21][i])*rise;scale+=rise*(buff?.12:.055);brightness+=charge*(buff?.16:.22);edge=charge;
  if(v==='C'){rock=Math.sin(t*Math.PI*2)*3.2*rise;scale+=.018*pulse(.42,.51,.57,.69,t);}
 }
 if(k==='ready'&&v==='C'){y-=side*r.w*.018*pulse(.10,.28,.36,.68,t);}
 return{x,y,angle,scale,reveal,brightness,saturation,edge,z,rock};
}
