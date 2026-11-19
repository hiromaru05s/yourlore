/** Approved revision-4 option 1: crystal fracture, mana burst and rising resonance. */
import {crystalBaseSamples} from './crystalImpactBase';
const cache=new Map<string,Float32Array>();
const smooth=(a:number,b:number,t:number)=>{const x=Math.min(1,Math.max(0,(t-a)/(b-a)));return x*x*(3-2*x);};
export function ruptureImpactSamples(rate:number):Float32Array{
 const base=crystalBaseSamples(rate);
 const key=String(rate),existing=cache.get(key);if(existing)return existing;
 const setting={start:.055,rise:.30,decay:.22,from:640,to:1100,gain:.080,harmonic:.25,ratio:1.51};
 const a=new Float32Array(base.length);let phase=0,phase2=0,peak=0;
 for(let i=0;i<a.length;i++){
  const t=i/rate,z=t-setting.start;
  const rise=smooth(0,setting.rise,z),freq=setting.from+(setting.to-setting.from)*rise;
  phase+=Math.PI*2*freq/rate;phase2+=Math.PI*2*(freq*setting.ratio+1.7*Math.sin(t*8))/rate;
  const attack=smooth(0,.055,z);
  const envelope=attack*Math.exp(-Math.max(0,z-setting.rise*.6)/setting.decay)*(1-smooth(1.25,1.65,t));
  const shimmer=(Math.sin(phase)+setting.harmonic*Math.sin(phase2))*(.9+.1*Math.sin(t*27));
  a[i]=base[i]+shimmer*envelope*setting.gain;peak=Math.max(peak,Math.abs(a[i]));
 }
 // Preserve the chosen transient and loudness unless the new layer needs headroom.
 const gain=Math.min(1,.88/Math.max(.001,peak));for(let i=0;i<a.length;i++)a[i]*=gain;
 a[0]=a[a.length-1]=0;cache.set(key,a);return a;
}
