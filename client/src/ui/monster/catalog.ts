import {pose as revision4Pose} from './catalogMotion';
import {pose as approvedPose,studies as approvedStudies,type Kind as ApprovedKind,type Variant as ApprovedVariant} from './catalogBase';
import {attackPlan} from '../attackVisual';
export {clamp,ease,out,pulse,mix,asRect,baselinePose} from './catalogBase';
import {clamp,ease,out,pulse,mix,asRect} from './catalogBase';
export type {Rect} from './catalogBase';
import type {Rect} from './catalogBase';
export type Kind=ApprovedKind|'atkDown'|'hpDown'|'bothDown';
export type Variant='A'|'B'|'C'|'D'|'E'|'F';
export const variants:Variant[]=['A','B','C','D','E','F'];
export const vi=(v:Variant)=>variants.indexOf(v);
export const isDebuff=(k:Kind)=>['atkDown','hpDown','bothDown'].includes(k);
export const isBuff=(k:Kind)=>['atk','hp','both'].includes(k);
export const isStat=(k:Kind)=>isBuff(k)||isDebuff(k);
export const statKind=(k:Kind)=>k.replace('Down','');
export const approved=(k:Kind)=>['destroy','trigger','atk','hp','both','blocked'].includes(k);
export const options=(k:Kind):Variant[]=>k==='summon'?variants.slice(0,5):k==='aura'?variants:k==='attack'?['A']:k==='destroy'||k==='blocked'?['A','B']:['trigger','atk','hp','both'].includes(k)?['B']:k==='ready'?['C']:['A','B','C'];
type Study={id:Kind;name:string;en:string;ms:number;durations:number[];names:string[];notes:string[]};
const keep=(id:ApprovedKind):Study=>({...approvedStudies.find(s=>s.id===id)!});
export const studies:Study[]=[
{id:'summon',name:'召喚B＋砂埃 · 5案',en:'APPROVED B / CONTACT DUST',ms:1500,durations:[1500,1500,1500,1500,1500],names:['薄い砂煙','左右へ払う砂埃','細かな砂粒','低く巻く砂煙','一拍残る余塵'],notes:['柔らかな接地に、角から低くほどける砂煙。','左右の辺から短く噴き、外へ流れて薄くなる。','小さな砂の塊と細かな粒。軽い乾いた着地。','少し厚い砂煙が低く巻き、内側から欠けて消える。','接地で押し出された砂埃に、弱い余塵が遅れて追いつく。']},
{id:'attack',name:'攻撃→待機 · A確定',en:'APPROVED A / EXHAUST',ms:2800,durations:[2800],names:['A · 鋭い打ち込み'],notes:['承認Aを固定。接触から帰還、Bの消灯を経てグレーを保持。']},
keep('destroy'),keep('trigger'),keep('atk'),keep('hp'),keep('both'),
...(['atkDown','hpDown','bothDown'] as const).map((id):Study=>({id,name:id==='atkDown'?'攻撃力ダウン':id==='hpDown'?'体力ダウン':'攻撃＋体力ダウン',en:'STAT DOWN',ms:1550,durations:[1250,1550,1400],names:['静かな低下','二段で沈む','鋭く削がれる'],notes:['カード内部を一段の山形が下がり、対象数値が-2。','二段の山形と短い沈み込み。バフBと対になる低下。','一度だけ短く縮み、対象の能力値へ光が落ちる。']})),
{id:'aura',name:'常時 · 緑の淡光6案',en:'GREEN / SOFT HIGHLIGHT',ms:4400,durations:[4400,4400,4400,4400,4400,4400],names:['現行に近い呼吸','ゆっくり淡く','深緑の細い光','若葉の柔らかな光','常灯＋小さな呼吸','細い縁＋淡い余光'],notes:['現行の攻撃待機と同じ1.1秒周期。明るさを抑えた緑。','2.2秒かけて静かに呼吸する、青みの少ない緑。','広がりを抑え、深緑の光を輪郭に沿わせる。','やや明るい若葉色。光を柔らかく広げる。','最低輝度を高め、点灯が途切れない控えめな明滅。','細い緑の縁を常に残し、その外側だけ淡く呼吸。']},
{...keep('ready'),name:'攻撃可能 · 確定',notes:['','','承認Cの予備動作と山形＋現行の赤いハイライト。'],names:['','','C＋現行の赤いハイライト']},keep('blocked')];
export const duration=(k:Kind,v:Variant)=>studies.find(s=>s.id===k)!.durations[vi(v)];
export const persistent=(k:Kind)=>['aura','ready','blocked','attack','destroy'].includes(k);
export const localTime=(k:Kind,v:Variant,t:number)=>clamp(t*studies.find(s=>s.id===k)!.ms/duration(k,v));
export const strikeMs=(v:Variant)=>[820,960,740][vi(v)];
export const strikeTime=(v:Variant,t:number)=>clamp(t*duration('attack',v)/strikeMs(v));
export const attackTiming=(v:Variant)=>[{wind:145,hit:270,hold:55,recoil:110},{wind:210,hit:345,hold:75,recoil:130},{wind:100,hit:210,hold:40,recoil:90}][vi(v)];
export const contactTime=(k:Kind,v:Variant)=>k==='summon'?506/1500:attackTiming(v).hit/strikeMs(v);
export function phase(k:Kind,t:number){if(k==='attack')return t<.34?'引き・踏み込み・命中・帰還':t<.78?'承認Bで消灯':'攻撃不可を維持';if(k==='summon')return t<506/1500?'盤面へ置く':'接地・減衰';if(isDebuff(k))return t<.46?'能力値が下がる':'低下後の数値を保持';if(k==='aura')return '常時能力の有効／無効';return t<.3?'予兆':t<.7?'発動':'収束・状態保持';}
export function pose(k:Kind,v:Variant,t:number,r:Rect,target:Rect,reduced=false,active=true,side=1){
 if(approved(k)||k==='ready')return approvedPose(k as ApprovedKind,v as ApprovedVariant,t,r,target,reduced,active,side);
 let x=r.x,y=r.y,angle=0,scale=1,reveal=1,brightness=1,saturation=1,edge=0,z=0,rock=0;
 if(k==='attack'&&(reduced||t*duration(k,v)>=strikeMs(v))){const q=reduced?1:ease(0,.62,(t*duration(k,v)-strikeMs(v))/1400);saturation=1-q;brightness=1-.43*q;y+=r.w*.035*q;scale=1-.018*q;return{x,y,angle,scale,reveal,brightness,saturation,edge,z,rock};}
 if(reduced)return{x,y,angle,scale,reveal,brightness,saturation,edge,z,rock};
 if(k==='summon')return revision4Pose('summon','B',clamp(t*1500/1100),r,target,reduced,active,side);
 if(k==='attack'){
  const ms=t*duration(k,v),{wind,hit,hold,recoil}=attackTiming(v),plan=attackPlan(asRect(r),asRect(target)),u=r.w,pull=u*[.13,.23,.09][vi(v)],total=strikeMs(v);let along=0;
  if(ms<wind){const q=ease(0,wind,ms);along=-pull*q;z=u*.08*q;scale=1+.032*q;angle=-side*1.2*q;}
  else if(ms<hit){const q=clamp((ms-wind)/(hit-wind))**2.5;along=mix(-pull,plan.travel,q);z=u*.08*(1-q);scale=mix(1.032,1,q);angle=-side*1.2*(1-q);}
  else if(ms<hit+hold){along=plan.travel;}
  else if(ms<hit+hold+recoil){const q=out((ms-hit-hold)/recoil);along=plan.travel-u*.10*q;z=u*.035*q;}
  else{const q=ease(hit+hold+recoil,total,ms);along=(plan.travel-u*.10)*(1-q);z=u*.035*(1-q);}
  x+=plan.nx*along;y+=plan.ny*along;
 }
 if(isDebuff(k)){const i=vi(v),q=pulse(.03,.22,.50,.91,t);scale-=q*[.028,.045,.055][i];y+=side*r.w*q*[.018,.035,.023][i];edge=pulse(.15,.29,.52,.87,t);brightness-=edge*.065;}
 return{x,y,angle,scale,reveal,brightness,saturation,edge,z,rock};
}
