import {attackPose,ATTACK_LAUNCH_MS,ATTACK_CONTACT_MS,ATTACK_DURATION_MS} from '../attackVisual';
import type {AttackPlan} from '../attackVisual';

/** Approved counter study 02, 片刃の切り返し. The 700ms replaces ordinary wind-up. */
export const COUNTER_PREP_MS=700;
export const COUNTER_CONTACT_MS=COUNTER_PREP_MS+ATTACK_CONTACT_MS-ATTACK_LAUNCH_MS;
export const COUNTER_DURATION_MS=COUNTER_PREP_MS+ATTACK_DURATION_MS-ATTACK_LAUNCH_MS;
export function ease(a:number,b:number,t:number){const x=Math.max(0,Math.min(1,(t-a)/(b-a)));return x*x*(3-2*x);}
export const envelope=(t:number)=>ease(0,290,t)*(1-ease(430,700,t));
export function counterPose(plan:AttackPlan,ms:number,reduced=false){
 if(reduced)return{x:plan.origin.x,y:plan.origin.y,scale:1,turn:0};
 if(ms>=COUNTER_PREP_MS)return attackPose(plan,Math.min(ATTACK_DURATION_MS,ms-COUNTER_PREP_MS+ATTACK_LAUNCH_MS));
 const end=attackPose(plan,ATTACK_LAUNCH_MS),u=ease(0,COUNTER_PREP_MS,ms),a=envelope(ms),cross=plan.u*.14*a;
 return{x:plan.origin.x+(end.x-plan.origin.x)*u-plan.ny*cross,
  y:plan.origin.y+(end.y-plan.origin.y)*u+plan.nx*cross,
  scale:1+(end.scale-1)*u,turn:end.turn*u-7*a*(plan.ny<0?1:-1)};
}

/** One clock owns preparation, launch and contact, even after a slow frame. */
export function runCounterTimeline(o:{signal:AbortSignal;isAlive:()=>boolean;paint:(ms:number)=>void;onLaunch:()=>void;onImpact:()=>void;reduced?:boolean;compact?:boolean}):Promise<boolean>{
 return new Promise((resolve,reject)=>{
  let frame=0,launched=false,hit=false,done=false;
  const prep=o.compact?100:COUNTER_PREP_MS;
  const start=performance.now(),launch=o.reduced?(o.compact?40:180):prep,contact=o.reduced?(o.compact?70:220):prep+ATTACK_CONTACT_MS-ATTACK_LAUNCH_MS,duration=o.reduced?(o.compact?160:320):prep+ATTACK_DURATION_MS-ATTACK_LAUNCH_MS;
  const cleanup=()=>{done=true;cancelAnimationFrame(frame);o.signal.removeEventListener('abort',abort);};
  const finish=(complete=false)=>{if(done)return;cleanup();resolve(complete);};
  const abort=()=>finish();
  const tick=(now:number)=>{
   try{
    if(o.signal.aborted||!o.isAlive()){finish();return;}
    const ms=Math.max(0,Math.min(duration,now-start));o.paint(o.reduced?(o.compact?ms*2:ms):o.compact?(ms<prep?ms/prep*COUNTER_PREP_MS:ms-prep+COUNTER_PREP_MS):ms);
    if(!launched&&ms>=launch){launched=true;o.onLaunch();}
    if(!hit&&ms>=contact&&!o.signal.aborted){hit=true;o.onImpact();}
    if(o.signal.aborted||ms>=duration){finish(!o.signal.aborted);return;}
    frame=requestAnimationFrame(tick);
   }catch(error){cleanup();reject(error);}
  };
  o.signal.addEventListener('abort',abort,{once:true});
  if(o.signal.aborted)finish();else frame=requestAnimationFrame(tick);
 });
}
