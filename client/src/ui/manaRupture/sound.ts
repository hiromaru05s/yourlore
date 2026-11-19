import {getSfxVolume} from '../sound';
import {BURST} from './timing';
import {ruptureImpactSamples} from './impactSound';
/** Low pressure → a short silence → one weighty impact at the visual burst. */
export function ruptureSound(){
 let context:AudioContext|undefined;try{context=new AudioContext();void context.resume().catch(()=>{});}catch{}
 const ctx=context;if(!ctx)return {tick:(_t:number,_paused:boolean)=>{},close:()=>{}};
 const master=ctx.createGain();master.connect(ctx.destination);master.gain.value=0;
 const hum=ctx.createOscillator(),humGain=ctx.createGain();hum.type='sine';hum.frequency.value=64;humGain.gain.value=0;hum.connect(humGain).connect(master);hum.start();
 const data=ruptureImpactSamples(ctx.sampleRate),impact=ctx.createBuffer(1,data.length,ctx.sampleRate);impact.getChannelData(0).set(data);
 const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.25),ctx.sampleRate),samples=buffer.getChannelData(0);
 let seed=9127;for(let i=0;i<samples.length;i++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;samples[i]=(seed>>>0)/2147483648-1;}
 const voices=new Set<AudioBufferSourceNode>();let last=-1,closed=false;
 function voice(buf:AudioBuffer){const n=ctx!.createBufferSource();n.buffer=buf;voices.add(n);n.onended=()=>{voices.delete(n);n.disconnect();};return n;}
 function stress(frequency:number){const n=voice(buffer),filter=ctx!.createBiquadFilter(),gain=ctx!.createGain(),now=ctx!.currentTime;
  filter.type='lowpass';filter.frequency.value=frequency;filter.Q.value=.5;
  gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.3,now+.008);gain.gain.exponentialRampToValueAtTime(.001,now+.14);
  n.connect(filter).connect(gain).connect(master);n.onended=()=>{voices.delete(n);n.disconnect();filter.disconnect();gain.disconnect();};n.start(now);n.stop(now+.15);
 }
 function silenceVoices(){for(const n of voices){try{n.stop();}catch{}n.disconnect();}voices.clear();}
 return {tick:(t:number,paused:boolean)=>{
  if(closed)return;const now=ctx.currentTime;
  master.gain.setTargetAtTime(paused?0:getSfxVolume()*.65,now,.008);
  hum.frequency.setTargetAtTime(58+Math.min(1,t/BURST)**2*46,now,.025);
  humGain.gain.setTargetAtTime(!paused&&t<BURST-80?Math.min(.14,t/1000*.14):0,now,.012);
  if(paused||t<last)silenceVoices();
  if(!paused&&t>=last){
   for(const point of [190,390,620])if(last<point&&t>=point&&t<BURST-80)stress(230+point*.22);
   if(last<BURST&&t>=BURST){const n=voice(impact);n.connect(master);n.start();}
  }
  last=t;
 },close:()=>{if(closed)return;closed=true;master.gain.value=0;silenceVoices();hum.stop();void ctx.close().catch(()=>{});}};
}
