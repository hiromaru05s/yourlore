/** A deep pressure boom with damped room resonance, cached once per sample rate. */
let cached:{rate:number;samples:Float32Array}|undefined;
export function ruptureImpactSamples(rate:number):Float32Array {
 if(cached?.rate===rate)return cached.samples;
 // Ends before the 3.55 s presentation closes its audio context (burst at 1.08 s).
 const duration=2.35,samples=new Float32Array(Math.ceil(rate*duration));
 const pole=(hz:number)=>1-Math.exp(-2*Math.PI*hz/rate);
 const lowPole=pole(110),bodyPole=pole(520),outPole=pole(1350),dcPole=pole(24),roomPole=pole(280);
 const rooms=[.073,.101,.139,.173].map((delay,i)=>({buffer:new Float32Array(Math.round(rate*delay)),index:0,damped:0,feedback:[.70,.67,.64,.61][i]}));
 let seed=0x71ac39,low=0,thud=0,output=0,dc=0,phase=0,bodyPhase=0,peak=0;
 for(let i=0;i<samples.length;i++){
  const t=i/rate;seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
  const white=(seed>>>0)/2147483648-1;
  low+=(white-low)*lowPole;thud+=(white-thud)*bodyPole;
  phase+=2*Math.PI*(41+51*Math.exp(-t/.055))/rate;
  bodyPhase+=2*Math.PI*(83+57*Math.exp(-t/.04))/rate;
  const attack=Math.min(1,t/.004);
  // A broad low-frequency onset opens into a sustained, textured pressure wave.
  const boom=(Math.sin(phase)+.16*Math.sin(phase*2))*1.05*Math.exp(-t/.48);
  const chest=Math.sin(bodyPhase)*.30*Math.exp(-t/.23);
  const strike=(thud-low)*1.8*Math.exp(-t/.045);
  const pressure=low*4.1*(1-Math.exp(-t/.012))*Math.exp(-t/.64);
  const dry=Math.tanh((boom+chest+strike+pressure)*1.1)*attack;
  // Diffuse, low-passed reflections: no glass tinkles or distinct repeat hits.
  let room=0;
  for(const r of rooms){const delayed=r.buffer[r.index];r.damped+=(delayed-r.damped)*roomPole;r.buffer[r.index]=dry+r.damped*r.feedback;r.index=(r.index+1)%r.buffer.length;room+=r.damped;}
  const signal=dry*.88+room*.16;
  output+=(signal-output)*outPole;dc+=(output-dc)*dcPole;
  const end=Math.min(1,(duration-t)/.30),fade=end*end*(3-2*end);
  samples[i]=(output-dc)*fade;peak=Math.max(peak,Math.abs(samples[i]));
 }
 const scale=.9/Math.max(.001,peak);for(let i=0;i<samples.length;i++)samples[i]*=scale;
 samples[0]=samples[samples.length-1]=0;
 cached={rate,samples};return samples;
}
