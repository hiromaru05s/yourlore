/** Approved crystal fracture and mana burst; cached by sample rate. */
const cache=new Map<string,Float32Array>();
export function crystalBaseSamples(rate:number):Float32Array{
 const key=String(rate),existing=cache.get(key);if(existing)return existing;
 const duration=2.35,a=new Float32Array(Math.ceil(rate*duration));
 const pole=(hz:number)=>1-Math.exp(-2*Math.PI*hz/rate);
 const config={glass:.94,mana:1.38,body:.9,tail:.42,room:.13};
 let seed=0x517ac9;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
 // Irregular short modes give a brittle, thick material instead of a pitched bell.
 const shards=Array.from({length:17},(_,i)=>({
  start:i===0?0:.009+random()**1.7*.31,
  freq:650+random()*2400,decay:.018+random()*.047,
  gain:i===0?.34:.045+random()*.11,phase:random()*6.28,
 }));
 const rooms=[.047,.079,.113,.157].map((delay,i)=>({a:new Float32Array(Math.round(rate*delay)),i:0,y:0,k:.54-i*.035}));
 const lowPole=pole(210),midPole=pole(920),highPole=pole(5500),outPole=pole(6500),hp=pole(85),roomPole=pole(1900);
 let low=0,mid=0,high=0,bodyPhase=0,manaPhase=0,y=0,dc=0,peak=0;
 for(let i=0;i<a.length;i++){
  const t=i/rate,w=random()*2-1;
  low+=(w-low)*lowPole;mid+=(w-mid)*midPole;high+=(w-high)*highPole;
  bodyPhase+=2*Math.PI*(105+105*Math.exp(-t/.025))/rate;
  manaPhase+=2*Math.PI*(245+610*Math.exp(-t/.115))/rate;
  const body=(.40*Math.sin(bodyPhase)*Math.exp(-t/.115)+.16*Math.sin(bodyPhase*1.73)*Math.exp(-t/.065))*config.body;
  let glass=(high-mid)*2.2*Math.exp(-t/.025)+(mid-low)*1.7*Math.exp(-t/.061);
  for(const s of shards){const z=t-s.start;if(z<0||z>s.decay*7)continue;
   const env=Math.min(1,z/.0008)*Math.exp(-z/s.decay),angle=2*Math.PI*s.freq*z;
   glass+=s.gain*env*(Math.sin(angle+s.phase)+.47*Math.sin(angle*1.427)+.23*Math.sin(angle*2.193)+(high-mid)*1.8);
  }
  // Pressure opens just after the crack, with an airy midrange and detuned shimmer.
  const z=Math.max(0,t-.016),open=(1-Math.exp(-z/.026))*Math.exp(-z/config.tail);
  const mana=open*((high-mid)*1.00+(mid-low)*1.25+.13*Math.sin(manaPhase)+.065*Math.sin(manaPhase*1.021+.4))*config.mana;
  const dry=Math.tanh((body+glass*config.glass+mana)*.85)*Math.min(1,t/.0012);let wet=0;
  for(const r of rooms){r.y+=(r.a[r.i]-r.y)*roomPole;r.a[r.i]=dry+r.y*r.k;r.i=(r.i+1)%r.a.length;wet+=r.y;}
  y+=(dry+wet*config.room-y)*outPole;dc+=(y-dc)*hp;
  const end=Math.min(1,(duration-t)/.30);a[i]=(y-dc)*end*end*(3-2*end);peak=Math.max(peak,Math.abs(a[i]));
 }
 for(let i=0;i<a.length;i++)a[i]*=.88/Math.max(.001,peak);
 a[0]=a[a.length-1]=0;cache.set(key,a);return a;
}
