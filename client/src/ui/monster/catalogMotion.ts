import {pose as approvedPose,studies as approvedStudies,type Kind as ApprovedKind,type Variant as ApprovedVariant} from './catalogBase';
import {attackPlan} from '../attackVisual';
export {clamp,ease,out,pulse,mix,asRect,baselinePose} from './catalogBase';
import {clamp,ease,out,pulse,mix,asRect} from './catalogBase';
export type {Rect} from './catalogBase';
import type {Rect} from './catalogBase';
export type Kind=ApprovedKind|'atkDown'|'hpDown'|'bothDown';
export type Variant='A'|'B'|'C'|'D'|'E';
export const variants:Variant[]=['A','B','C','D','E'];
export const vi=(v:Variant)=>variants.indexOf(v);
export const isDebuff=(k:Kind)=>['atkDown','hpDown','bothDown'].includes(k);
export const isBuff=(k:Kind)=>['atk','hp','both'].includes(k);
export const isStat=(k:Kind)=>isBuff(k)||isDebuff(k);
export const statKind=(k:Kind)=>k.replace('Down','');
export const approved=(k:Kind)=>['destroy','trigger','atk','hp','both','blocked'].includes(k);
export const options=(k:Kind):Variant[]=>k==='summon'?variants:k==='destroy'||k==='blocked'?['A','B']:['trigger','atk','hp','both'].includes(k)?['B']:k==='ready'?['C']:['A','B','C'];
type Study={id:Kind;name:string;en:string;ms:number;durations:number[];names:string[];notes:string[]};
const keep=(id:ApprovedKind):Study=>({...approvedStudies.find(s=>s.id===id)!});
export const studies:Study[]=[
{id:'summon',name:'召喚 · 5案',en:'WEIGHT / CONTACT',ms:1200,durations:[900,1100,1200,1050,1150],names:['静かに置く','柔らかい着地','重みのある一拍','片辺から馴染む','手元から置く'],notes:['接地影とカード本体だけ。短い落下で静かに置く。','低い高さから滑らかに減速。一度だけ小さく弾む。','短く保持して落下。接地の一拍と低い反動を重視。','盤面から2度だけ傾け、片辺から全面へ接地。','手元側から浅く進みながら下降。停止と接地を同時にする。']},
{id:'attack',name:'攻撃 · 再設計',en:'COMMIT / HIT / RETURN',ms:2900,durations:[2800,2900,2700],names:['鋭い打ち込み','重い一撃','速い斬り返し'],notes:['短い引き→加速→接触で55ms停止。光は接触点だけ。','深い溜め→75msの命中停止。相手の押し戻しに重み。','最短の踏み込みと斜め一閃。小さく反動して戻る。']},
keep('destroy'),keep('trigger'),keep('atk'),keep('hp'),keep('both'),
...(['atkDown','hpDown','bothDown'] as const).map((id):Study=>({id,name:id==='atkDown'?'攻撃力ダウン':id==='hpDown'?'体力ダウン':'攻撃＋体力ダウン',en:'STAT DOWN',ms:1550,durations:[1250,1550,1400],names:['静かな低下','二段で沈む','鋭く削がれる'],notes:['カード内部を一段の山形が下がり、対象数値が-2。','二段の山形と短い沈み込み。バフBと対になる低下。','一度だけ短く縮み、対象の能力値へ光が落ちる。']})),
{id:'aura',name:'常時効果 · 新方向',en:'ABILITY / ACTIVE',ms:3200,durations:[3200,3200,3200],names:['常時の灯標','能力の銘板','小さな灯火'],notes:['右上の金属の灯標が点灯。無効では石が暗くなる。','能力表示に添える「常時」の小さな銘板。青白い線が点灯。','右上の受け皿から小さな火が立つ。有効中だけ残る。']},
{...keep('ready'),name:'攻撃可能 · 確定',notes:['','','承認Cの予備動作と山形＋現行の赤いハイライト。'],names:['','','C＋現行の赤いハイライト']},keep('blocked')];
export const duration=(k:Kind,v:Variant)=>studies.find(s=>s.id===k)!.durations[vi(v)];
export const persistent=(k:Kind)=>['aura','ready','blocked','attack','destroy'].includes(k);
export const localTime=(k:Kind,v:Variant,t:number)=>clamp(t*studies.find(s=>s.id===k)!.ms/duration(k,v));
export const strikeMs=(v:Variant)=>[820,960,740][vi(v)];
export const strikeTime=(v:Variant,t:number)=>clamp(t*duration('attack',v)/strikeMs(v));
export const attackTiming=(v:Variant)=>[{wind:145,hit:270,hold:55,recoil:110},{wind:210,hit:345,hold:75,recoil:130},{wind:100,hit:210,hold:40,recoil:90}][vi(v)];
export const contactTime=(k:Kind,v:Variant)=>k==='summon'?[.38,.46,.43,.47,.48][vi(v)]:attackTiming(v).hit/strikeMs(v);
export function phase(k:Kind,t:number){if(k==='attack')return t<.34?'引き・踏み込み・命中・帰還':t<.78?'承認Bで消灯':'攻撃不可を維持';if(k==='summon')return t<.45?'盤面へ置く':'接地・減衰';if(isDebuff(k))return t<.46?'能力値が下がる':'低下後の数値を保持';if(k==='aura')return '常時能力の有効／無効';return t<.3?'予兆':t<.7?'発動':'収束・状態保持';}
export function pose(k:Kind,v:Variant,t:number,r:Rect,target:Rect,reduced=false,active=true,side=1){
 if(approved(k)||k==='ready')return approvedPose(k as ApprovedKind,v as ApprovedVariant,t,r,target,reduced,active,side);
 let x=r.x,y=r.y,angle=0,scale=1,reveal=1,brightness=1,saturation=1,edge=0,z=0,rock=0;
 if(k==='attack'&&(reduced||t*duration(k,v)>=strikeMs(v))){const q=reduced?1:ease(0,.62,(t*duration(k,v)-strikeMs(v))/1400);saturation=1-q;brightness=1-.43*q;y+=r.w*.035*q;scale=1-.018*q;return{x,y,angle,scale,reveal,brightness,saturation,edge,z,rock};}
 if(reduced)return{x,y,angle,scale,reveal,brightness,saturation,edge,z,rock};
 if(k==='summon'){
  const i=vi(v),hit=contactTime(k,v),begin=[.02,.03,.12,.02,.03][i],q=clamp((t-begin)/(hit-begin));
  const fall=v==='B'?ease(0,1,q):q*q*(.3+.7*q);
  z=r.w*[.45,.34,.68,.42,.36][i]*(1-fall);
  if(v==='D')rock=2*(1-fall);
  if(v==='E'){y+=side*r.w*.24*(1-fall);angle=side*1.4*(1-fall);}
  if(t>=hit){const a=(t-hit)/[.16,.24,.20,.22,.16][i];z=r.w*[.009,.031,.019,.008,.005][i]*Math.sin(clamp(a)*Math.PI)*Math.exp(-a*1.6);rock=v==='D'?-1.1*Math.sin(clamp(a)*Math.PI)*(1-clamp(a)):0;}
  brightness+=.035*pulse(hit,hit+.015,hit+.06,hit+.18,t);
 }
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
