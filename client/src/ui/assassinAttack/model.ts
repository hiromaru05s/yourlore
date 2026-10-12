/** Selected ambush study 01 only. Family selection is shared with the assassin presentation. */
export {isAssassin as usesAssassinStrike,ASSASSIN_IDS} from '../assassinSummon/selection';
export const IAI={duration:1000,contact:310,vanish:210,returnAt:650,returnEnd:840,color:'#d8edfa'} as const;
export const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export const ease=(a:number,b:number,t:number)=>{const q=clamp((t-a)/(b-a));return q*q*(3-2*q);};
export const lerp=(a:number,b:number,q:number)=>a+(b-a)*q;
export type Point={x:number;y:number};
export function runAssassinTimeline(o:{signal:AbortSignal;isAlive:()=>boolean;paint:(ms:number)=>void;onImpact:()=>void;reduced?:boolean}):Promise<boolean>{
 return new Promise((resolve,reject)=>{
  let frame=0,hit=false,done=false;const start=performance.now(),contact=o.reduced?120:IAI.contact,duration=o.reduced?260:IAI.duration;
  const cleanup=()=>{done=true;cancelAnimationFrame(frame);o.signal.removeEventListener('abort',abort);};
  const finish=(complete=false)=>{if(done)return;cleanup();resolve(complete);};const abort=()=>finish();
  const tick=(now:number)=>{try{
   if(o.signal.aborted||!o.isAlive()){finish();return;}
   const ms=Math.max(0,Math.min(duration,now-start));o.paint(o.reduced?ms/contact*IAI.contact:ms);
   if(!hit&&ms>=contact&&!o.signal.aborted){hit=true;o.onImpact();}
   if(o.signal.aborted||ms>=duration){finish(!o.signal.aborted);return;}frame=requestAnimationFrame(tick);
  }catch(error){cleanup();reject(error);}};
  o.signal.addEventListener('abort',abort,{once:true});if(o.signal.aborted)finish();else frame=requestAnimationFrame(tick);
 });
}
