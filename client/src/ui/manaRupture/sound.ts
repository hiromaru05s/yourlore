import {getSfxVolume} from '../sound';
/** Local synthesized stress/leak/release, owned by the same presentation clock. */
export function ruptureSound(){
 let context:AudioContext|undefined;try{context=new AudioContext();void context.resume().catch(()=>{});}catch{}
 const ctx=context;if(!ctx)return {tick:(_t:number,_paused:boolean)=>{},close:()=>{}};
 const master=ctx.createGain();master.connect(ctx.destination);master.gain.value=0;
 const hum=ctx.createOscillator(),humGain=ctx.createGain();hum.type='sine';hum.frequency.value=72;humGain.gain.value=0;hum.connect(humGain).connect(master);hum.start();
 const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.8),ctx.sampleRate),samples=buffer.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=(Math.sin(i*173.7)*3873.1%1)*.5;
 let last=-1,closed=false;
 function noise(duration:number,frequency:number,volume:number){const n=ctx!.createBufferSource(),filter=ctx!.createBiquadFilter(),gain=ctx!.createGain(),now=ctx!.currentTime;n.buffer=buffer;filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=.8;gain.gain.setValueAtTime(volume,now);gain.gain.exponentialRampToValueAtTime(.001,now+duration);n.connect(filter).connect(gain).connect(master);n.start(now);n.stop(now+duration);}
 return {tick:(t:number,paused:boolean)=>{if(closed)return;const now=ctx.currentTime;master.gain.setTargetAtTime(paused?0:getSfxVolume()*.5,now,.02);hum.frequency.setTargetAtTime(64+Math.min(1,t/2100)**2*156,now,.025);humGain.gain.setTargetAtTime(t<2250?Math.min(.12,t/1440*.12):0,now,.03);if(!paused&&t>=last){for(const point of [40,130,260,410])if(last<point&&t>=point)noise(.09,900+point*2,.32);if(last<2090&&t>=2090){noise(.65,1350,1.4);const pop=ctx.createOscillator(),gain=ctx.createGain();pop.frequency.setValueAtTime(130,now);pop.frequency.exponentialRampToValueAtTime(32,now+.32);gain.gain.setValueAtTime(.7,now);gain.gain.exponentialRampToValueAtTime(.001,now+.4);pop.connect(gain).connect(master);pop.start(now);pop.stop(now+.42);}}last=t;},close:()=>{if(closed)return;closed=true;master.gain.value=0;hum.stop();void ctx.close().catch(()=>{});}};
}
