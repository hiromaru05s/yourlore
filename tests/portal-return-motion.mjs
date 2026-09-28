import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
const compile=async file=>ts.transpileModule(await fs.readFile(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const url=code=>'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
const base=url(await compile('client/src/ui/cardReturnMotion.ts'));
const {portalPose,portalTiming}=await import(url((await compile('client/src/ui/portalReturnMotion.ts')).replace("'./cardReturnMotion'",JSON.stringify(base))));
// Board-space separation in card widths, including the larger public source face.
const distance=10,exit=1.10,enter=distance-1.18;
const smooth=(a,b,t)=>{const q=Math.max(0,Math.min(1,(t-a)/(b-a)));return q*q*(3-2*q)};
function point(t,u,v,packet,style){
 const p=portalPose(t,u,v,packet,style),publicScale=packet===0?1-smooth(.44,.60,p.q):0;
 return {...p,x:p.s*distance+p.offset+p.localX*(1+publicScale*.30/.94),z:p.z*(1+publicScale*.33375/1.46875)};
}
function visible(p,style){const bend=style===1?p.z*.24:style===3?Math.sin(p.z*2)*.12:0;return p.x<=exit+bend||p.x>=enter+bend;}
let checked=0;
for(let style=0;style<5;style++)for(let packet=0;packet<3;packet++)for(let ix=0;ix<=32;ix++)for(let iy=0;iy<=14;iy++){
 const u=ix/32,v=iy/14,at=portalTiming(style).returnAt;
 const first=point(0,u,v,packet,style),last=point(1,u,v,packet,style);
 assert.equal(first.s,0);assert.equal(last.s,1);assert.equal(first.offset,0);assert(Math.abs(last.offset)<1e-12);
 assert.equal(first.fluid,0);assert.equal(last.fluid,0);assert(Math.abs(last.y)<1e-12);
 assert.equal(first.localX,last.localX);assert(Math.abs(first.z/(packet===0?1+.33375/1.46875:1)-last.z)<1e-12,'card UV returns to resting sleeve proportions');
 for(const t of [at-.025,at-.00001,at,at+.00001])assert(!visible(point(t,u,v,packet,style),style),'both sides of hidden jump must stay behind their cut');
 let previous=first;
 for(let frame=1;frame<=240;frame++){
  const p=point(frame/240,u,v,packet,style);
  for(const value of Object.values(p))if(typeof value==='number')assert(Number.isFinite(value));
  if(p.s!==previous.s){assert(!visible(previous,style)&&!visible(p,style),'spatial jump is never drawn');}
  else assert(Math.abs(p.x-previous.x)<.25,'visible local motion must stay continuous');
  previous=p;checked++;
 }
}
console.log(`PASS ${checked} samples: hidden transfer, local continuity, finite vertices, exact endpoints, all five styles`);
