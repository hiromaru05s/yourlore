/** Approved MMR 01 soft count, synthesized for the actual server receipt. */
export const COUNT_MS=1700;
export function countEvents(before:number,after:number){
 const difference=after-before;
 if(!Number.isFinite(difference)||!difference)return [];
 const count=Math.min(80,Math.abs(Math.round(difference))),up=difference>0;
 return Array.from({length:count},(_,i)=>{
  const progress=(i+.5)/count;let low=0,high=1;
  for(let n=0;n<32;n++){const mid=(low+high)/2;if(mid*mid*(3-2*mid)<progress)low=mid;else high=mid;}
  const start=up?540:850,end=up?850:540;
  return {at:(low+high)/2*1.7,frequency:start*(end/start)**((i+1)/count)};
 });
}
export function resultCountPcm(before:number,after:number,sampleRate=44100,settleOnly=false){
 const events=countEvents(before,after),n=Math.round(sampleRate*(settleOnly?.6:2.3));
 const left=new Float32Array(n),right=new Float32Array(n);
 if(!events.length)return [left,right];
 const add=(at:number,f:number,amp:number,decay:number,attack:number)=>{
  const start=Math.round(at*sampleRate),length=Math.min(n-start,Math.ceil(decay*12*sampleRate));
  for(let j=0;j<length;j++){
   const t=j/sampleRate,phase=2*Math.PI*f*t;
   const v=(Math.sin(phase)*Math.exp(-t/decay)+.035*Math.sin(phase*2)*Math.exp(-t/(decay*.5)))*amp*(1-Math.exp(-t/attack))*Math.min(1,(n-start-j)/(.15*sampleRate))*Math.SQRT1_2;
   left[start+j]+=v;right[start+j]+=v;
  }
 };
 if(!settleOnly)for(const e of events)add(e.at,e.frequency,.25,.026,.006);
 add(settleOnly?0:1.7,after>before?880:520,.23,.085,.012);
 const dry=[left.slice(),right.slice()];
 for(const [delay,gain]of [[.027,.045],[.063,.025]])for(let ch=0;ch<2;ch++){
  const offset=Math.round(delay*(1+ch*.09)*sampleRate),dest=ch?right:left,source=dry[1-ch];
  for(let i=offset;i<n;i++)dest[i]+=source[i-offset]*gain;
 }
 let peak=0,squares=0;
 for(const c of [left,right])for(const v of c){peak=Math.max(peak,Math.abs(v));squares+=v*v;}
 // Normalize against a full count, so a single confirmation never becomes louder.
 const gain=Math.min(10**(-14/20)/peak,10**(-28/20)/Math.sqrt(squares/(2*n)));
 for(const c of [left,right])for(let i=0;i<n;i++)c[i]*=gain*Math.min(1,i/(sampleRate*.004),(n-1-i)/(sampleRate*.1));
 return [left,right];
}
