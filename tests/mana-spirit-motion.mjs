import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundle=await build({entryPoints:['client/src/ui/manaSpiritMotion.ts'],bundle:true,format:'esm',write:false,platform:'node'});
const {createSpiritMotion,SPIRIT_IDLE_GAP,SPIRIT_MOTION_DURATION}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
for(const roll of [0,.49,.51,.999]){
 const motion=createSpiritMotion(true,()=>roll),events=[];let before='idle',lastEnd=0;
 for(let frame=1;frame<60*180;frame++){
  const pose=motion.tick(1/60),time=frame/60;
  assert(Object.values(pose).filter(v=>typeof v==='number').every(Number.isFinite));
  if(pose.mood!==before){
   if(pose.mood!=='idle'){assert(time-lastEnd>=SPIRIT_IDLE_GAP.min-.03);assert(time-lastEnd<=SPIRIT_IDLE_GAP.max+.04);events.push(pose.mood);}
   else lastEnd=time;
   before=pose.mood;
  }
 }
 assert(events.includes('flutter')&&events.includes('sleepy'),'Random repeat limit must eventually play both motions');
 assert(!events.some((v,i)=>i>=2&&events[i-1]===v&&events[i-2]===v));
}
const fixed=createSpiritMotion(false);assert.equal(fixed.tick(200).mood,'idle','Tutorial guide has no random sleep');
fixed.celebrate();let peak=fixed.tick(1.8);assert(peak.smile>.95&&peak.y>.1,'Flutter rises and smiles');
assert.equal(fixed.tick(SPIRIT_MOTION_DURATION.flutter).mood,'idle');
const sleepy=createSpiritMotion(true,()=>.9);sleepy.tick(14);const nod=sleepy.tick(3.4);assert.equal(nod.mood,'sleepy');assert(nod.eye<.3&&nod.pitch>.2&&nod.yawn>.9,'Sleep combines lids, head nod and yawn');
sleepy.celebrate();assert.equal(sleepy.tick(.1).mood,'flutter','Touch wakes sleeping spirit');
console.log('PASS random intervals, both motions, repeat limit, expressions, tutorial idle and wake-up');
