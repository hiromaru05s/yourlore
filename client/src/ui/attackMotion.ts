import {ATTACK_CONTACT_MS,ATTACK_DURATION_MS,ATTACK_LAUNCH_MS} from './attackVisual';
/** One cancellable clock drives the pose, launch audio and exactly one contact cue. */
export function runAttackTimeline(options:{start:number;signal:AbortSignal;isAlive:()=>boolean;paint:(ms:number)=>void;onLaunch:()=>void;onImpact:()=>void}):Promise<void>{
 const {start,signal,isAlive,paint,onLaunch,onImpact}=options;
 return new Promise((resolve,reject)=>{
  let frame=0,launched=false,hit=false;
  const finish=()=>{cancelAnimationFrame(frame);signal.removeEventListener('abort',finish);resolve();};
  const fail=(error:unknown)=>{cancelAnimationFrame(frame);signal.removeEventListener('abort',finish);reject(error);};
  const tick=(now:number)=>{
   try{
    if(signal.aborted||!isAlive()){finish();return;}
    const ms=Math.max(0,Math.min(ATTACK_DURATION_MS,now-start));paint(ms);
    if(!launched&&ms>=ATTACK_LAUNCH_MS){launched=true;onLaunch();}
    if(!hit&&ms>=ATTACK_CONTACT_MS&&!signal.aborted){hit=true;onImpact();}
    if(signal.aborted||ms>=ATTACK_DURATION_MS){finish();return;}
    frame=requestAnimationFrame(tick);
   }catch(error){fail(error);}
  };
  signal.addEventListener('abort',finish,{once:true});
  if(signal.aborted)finish();else frame=requestAnimationFrame(tick);
 });
}
