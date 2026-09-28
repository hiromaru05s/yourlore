import assert from 'node:assert/strict';import fs from 'node:fs/promises';import ts from 'typescript';
const source=await fs.readFile('client/src/ui/cardReturnMotion.ts','utf8');const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {materialPose}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
let checked=0;
for(let mode=0;mode<5;mode++)for(const packets of [1,3])for(let packet=0;packet<packets;packet++)for(let strip=0;strip<5;strip++)for(const u of [0,.25,.5,.75,1])for(const v of [strip/5,(strip+1)/5]){
 const first=materialPose(0,u,v,packet,packets,mode,strip,5),last=materialPose(1,u,v,packet,packets,mode,strip,5);
 assert.equal(first.s,0);assert.equal(last.s,1);assert.equal(first.fluid,0);assert.equal(last.fluid,0);assert(Math.abs(last.y)<1e-12);
 assert(Math.abs(first.z-last.z)<1e-12,'UV vertices must return to their identical card-space endpoint');
 let previous=first;
 for(let frame=1;frame<=360;frame++){
  const p=materialPose(frame/360,u,v,packet,packets,mode,strip,5);
  for(const value of Object.values(p))if(typeof value==='number')assert(Number.isFinite(value));
  assert(p.s>=previous.s-1e-12,'material must never teleport backwards');
  assert(p.s-previous.s<.035,'continuous bounded travel, no source/target swap');previous=p;checked++;
 }
}
console.log(`PASS ${checked} material trajectory samples: finite, monotonic, exact UV endpoints, stationary endpoint height`);
