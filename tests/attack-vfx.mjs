import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
const dir=await mkdtemp(tmpdir()+'/lore-attack-');
try{
 await build({stdin:{contents:"export * from './client/src/ui/attackVisual';export * from './client/src/ui/attackMotion';export {biblionLayer} from './client/src/ui/biblionFx';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/attack.mjs'});
 const {attackPlan,attackPose,drawAttackVisual,ATTACK_CONTACT_MS,ATTACK_DURATION_MS,runAttackTimeline,biblionLayer}=await import(dir+'/attack.mjs');
 let stack=0,commands=0;const ctx=new Proxy({}, {get:(_,key)=>key==='save'?()=>stack++:key==='restore'?()=>stack--:(...args)=>{for(const v of args)if(typeof v==='number')assert(Number.isFinite(v));commands++;},set:(_,k,v)=>{if(k==='globalAlpha')assert(v>=0&&v<=1);return true;}});
 for(const w of [28,60,160])for(const dx of [-310,0,260])for(const dy of [-500,190]){
  const from={left:350,top:500,width:w,height:w*1.4},to={left:350+dx,top:500+dy,width:w*1.2,height:w*1.5},p=attackPlan(from,to);
  assert(p.travel>=0);const start=attackPose(p,0),end=attackPose(p,ATTACK_DURATION_MS),hit=attackPose(p,ATTACK_CONTACT_MS);
  assert.deepEqual([start.x,start.y,start.scale,Math.abs(start.turn)],[p.origin.x,p.origin.y,1,0]);
  assert.deepEqual([end.x,end.y,end.scale,Math.abs(end.turn)],[p.origin.x,p.origin.y,1,0]);
  assert(Math.abs((hit.x-p.origin.x)*p.nx+(hit.y-p.origin.y)*p.ny-p.travel)<1e-6,'card meets target edge instead of center');
  assert.deepEqual(attackPose(p,ATTACK_CONTACT_MS),attackPose(p,ATTACK_CONTACT_MS+45),'contact has a real hold');
  for(let ms=0;ms<=ATTACK_DURATION_MS;ms+=8){const pose=attackPose(p,ms);assert([pose.x,pose.y,pose.scale,pose.turn].every(Number.isFinite));drawAttackVisual(ctx,from,to,ms/1000);}
 }
 assert.equal(stack,0);assert(commands>1000);assert.equal(biblionLayer('attack'),'rear');
 const same=attackPlan({left:0,top:0,width:30,height:40},{left:0,top:0,width:30,height:40});assert(Object.values(same.contact).every(Number.isFinite));
 const frames=new Map();let id=0;globalThis.requestAnimationFrame=f=>{frames.set(++id,f);return id;};globalThis.cancelAnimationFrame=id=>frames.delete(id);
 const step=t=>{const callbacks=[...frames.values()];frames.clear();callbacks.forEach(f=>f(t));};
 const events=[];const base=signal=>({start:1000,signal,isAlive:()=>true,paint:t=>events.push(['paint',t]),onLaunch:()=>events.push(['launch']),onImpact:()=>events.push(['hit'])});
 let abort=new AbortController(),done=runAttackTimeline(base(abort.signal));
 step(1000);step(1190);step(1500);step(1600);step(1950);await done;
 assert.equal(events.filter(e=>e[0]==='launch').length,1);assert.equal(events.filter(e=>e[0]==='hit').length,1,'dropped frames must not duplicate or miss contact');assert.equal(frames.size,0);
 events.length=0;abort=new AbortController();done=runAttackTimeline(base(abort.signal));step(1100);abort.abort();await done;assert.equal(frames.size,0);assert(!events.some(e=>e[0]==='hit'));
 abort=new AbortController();done=runAttackTimeline({...base(abort.signal),onImpact:()=>abort.abort()});step(1400);await done;assert.equal(frames.size,0,'abort inside contact must not schedule another frame');
 done=runAttackTimeline({...base(new AbortController().signal),isAlive:()=>false});step(1500);await done;assert.equal(frames.size,0);
 done=runAttackTimeline({...base(new AbortController().signal),onImpact:()=>{throw Error('fixture callback');}});step(1400);await assert.rejects(done,/fixture callback/);assert.equal(frames.size,0);
 console.log('PASS: edge contact and exact return on both directions/sizes, hit stop, bounded finite Toon shapes, rear layer, one impact after frame drops, cancel/removal/error cleanup');
}finally{await rm(dir,{recursive:true,force:true});}
