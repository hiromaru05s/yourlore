import {build} from 'esbuild';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lore-mimic-motion-'));
try {
 await build({entryPoints:['client/src/ui/mimic/motion.ts'],bundle:true,platform:'node',format:'esm',outfile:dir+'/motion.mjs'});
 const m=await import(dir+'/motion.mjs');
 const fixtures=JSON.parse(await fs.readFile('tests/fixtures/mimic-approved-motion.json','utf8'));
 for(const {id,t,reduced,pose}of fixtures){
  const actual=id==='MIMIC'?m.normalPose(t,reduced):id==='MIMIC2'?m.masterPose(t,reduced):id==='MIMIC_LORD'||id==='AWAKENED_MIMIC'?m.familyPose(t,id,reduced):m.royalPose(t,id,reduced);
  for(const [key,value]of Object.entries(pose))assert(Math.abs(actual[key]-value)<1e-10,`${id} ${t} reduced=${reduced} ${key}: ${actual[key]} != ${value}`);
 }
 const sources=await Promise.all((await fs.readdir('client/src/ui/mimic')).map(f=>fs.readFile('client/src/ui/mimic/'+f,'utf8')));
 for(const source of sources){assert(!/from ['"].*\/dev\//.test(source));assert(!/amber-throat|amber-fangs|02-ridged-bone|03-moist-flesh|01-layered-palate|03-deep-throat|URLSearchParams/.test(source));}
 console.log(`PASS: ${fixtures.length} frozen approved poses and selected-only runtime imports/assets`);
}finally{await fs.rm(dir,{recursive:true,force:true});}
