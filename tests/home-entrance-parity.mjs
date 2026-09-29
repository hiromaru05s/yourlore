import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import ts from 'typescript';
async function module(path){const source=await fs.readFile(path,'utf8');const output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;return import('data:text/javascript;base64,'+Buffer.from(output).toString('base64'));}
const {cardPose}=await module('client/src/dev/homeCardEntryMotion.ts');const {silverFanPose}=await module('client/src/ui/homeEntranceMotion.ts');
let cases=0;
for(const [w,h] of [[1280,720],[390,844],[844,390]])for(let ms=0;ms<=3800;ms+=50)for(let i=0;i<7;i++){
 const reference=cardPose(0,i,ms/1000,w,h,{x:0,y:0,width:45}),actual=silverFanPose(i,ms/1000,w,h);
 for(const key of Object.keys(actual))assert(Math.abs(actual[key]-reference[key])<1e-8,`${key} at ${ms}, card ${i}`);cases++;
}
console.log(`PASS ${cases} trajectories match approved 01 exactly`);
