import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import sharp from 'sharp';
const source=await fs.readFile('client/src/ui/seekerMotion.ts','utf8');
const module=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {SeekerMotion,SEEKER_ACTIONS,SEEKER_TIMINGS,seekerDuration,damageAction}=await import(`data:text/javascript;base64,${Buffer.from(module).toString('base64')}`);
assert.equal(damageAction(0),null);assert.equal(damageAction(9),'hurt');assert.equal(damageAction(10),'heavy');assert.equal(damageAction(11),'heavy');
for(const action of SEEKER_ACTIONS){
 const m=new SeekerMotion();m.request(action,0);let now=0;
 for(let frame=0;frame<8;frame++){assert.deepEqual(m.sample(now+1),{action,frame});now+=SEEKER_TIMINGS[action][frame];}
 assert.deepEqual(m.sample(now+1),{action:action==='defeat'?'defeat':'idle',frame:action==='defeat'?7:0});
}
// The interrupted pose stays visible, then visits a neutral endpoint before the new action.
const interrupt=new SeekerMotion();interrupt.request('mana',0);assert.equal(interrupt.sample(390).frame,3);
interrupt.request('heavy',390);assert.deepEqual(interrupt.sample(390),{action:'mana',frame:3});assert.deepEqual(interrupt.sample(510),{action:'mana',frame:0});assert.deepEqual(interrupt.sample(550),{action:'heavy',frame:0});
interrupt.request('defeat',600);interrupt.request('heal',601);assert.equal(interrupt.sample(3000).action,'defeat');interrupt.settle(4000);assert.deepEqual(interrupt.sample(4000),{action:'defeat',frame:7});
interrupt.reset(5000);assert.deepEqual(interrupt.sample(5000),{action:'idle',frame:0});
// Manual return to idle also traverses a neutral endpoint instead of snapping.
const cancel=new SeekerMotion();cancel.request('mana',0);cancel.request('idle',390);
assert.deepEqual(cancel.sample(390),{action:'mana',frame:3});
assert.deepEqual(cancel.sample(510),{action:'mana',frame:0});
assert.deepEqual(cancel.sample(550),{action:'idle',frame:0});
// Two-sided clocks remain independent; repeated calls cannot create an endless backlog.
const a=new SeekerMotion(),b=new SeekerMotion();a.request('hurt',0);b.request('heal',0);
for(let i=0;i<100;i++)a.request('hurt',50);
assert.equal(a.sample(100).action,'hurt');assert.equal(b.sample(100).action,'heal');a.sample(seekerDuration('hurt')+1);assert.equal(a.sample(2*seekerDuration('hurt')+2).action,'idle');
const report={checks:['8 authored frame slots for each action','damage 9/10/11 boundary','neutral bridge before interrupt','terminal defeat rejects healing','reset and skipped terminal pose','independent sides','bounded duplicate event queue'],atlases:{}};
for(const color of ['blue','red']){
 const path=`client/public/art/seekers/hooded-v1/${color}.webp`,meta=await sharp(path).metadata();assert.equal(meta.width,1024);assert.equal(meta.height,896);
 const first=await sharp(path).extract({left:0,top:0,width:128,height:128}).raw().toBuffer();
 let unique=0;
 for(let row=0;row<7;row++){
  const frameBuffers=[];
  for(let frame=0;frame<8;frame++){
   const pixels=await sharp(path).extract({left:frame*128,top:row*128,width:128,height:128}).removeAlpha().raw().toBuffer();frameBuffers.push(pixels);
   if(frame===0||(frame===7&&row!==5))assert(first.equals(pixels),`${color} ${row}:${frame} shares neutral pixels`);
   let minX=128,minY=128,maxX=0,maxY=0;
   for(let y=0;y<128;y++)for(let x=0;x<128;x++){const i=(y*128+x)*3;if(Math.min(...pixels.subarray(i,i+3))<195){minX=Math.min(x,minX);minY=Math.min(y,minY);maxX=Math.max(x,maxX);maxY=Math.max(y,maxY);}}
   assert(minX>=8&&maxX<120&&minY>=8&&maxY<120,`Frame fits safe area: ${color} ${row}:${frame}`);assert(Math.abs(maxY-110)<=1,`Stable foot baseline: ${color} ${row}:${frame} at ${maxY}`);
   // All four corners remain white; no transparent/dark-background flashes.
   for(const i of [0,127*3,127*128*3,(128*128-1)*3])assert.deepEqual([...pixels.subarray(i,i+3)],[255,255,255]);
  }
  const distinct=new Set(frameBuffers.map(b=>b.toString('base64'))).size;assert(distinct>=4,`${color} ${SEEKER_ACTIONS[row]} has authored pose changes`);unique+=distinct;
 }
 report.atlases[color]={width:1024,height:896,frames:56,uniqueWithinRows:unique,neutralEndpoints:'pixel identical',footBaseline:'110 +/- 1',safeMargin:8};
}
await fs.writeFile('docs/characters/2026-10-12-hooded/qa/asset-motion-tests.json',JSON.stringify(report,null,2)+'\n');console.log('PASS hooded-seekers: motion arbitration and 112 registered frames');
