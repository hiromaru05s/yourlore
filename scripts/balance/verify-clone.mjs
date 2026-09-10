import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {simulate} from './run.mjs';
import {cloneState} from './clone.mjs';
const root=process.argv[2],plan=JSON.parse(fs.readFileSync(root+'/plan.json')),native=globalThis.structuredClone;
const jobs=[...plan.filter(j=>j.stage==='observe').slice(0,20),...plan.filter(j=>j.stage==='market').filter((j,i)=>i%1024===0)];
const a={n:NaN,u:undefined};a.self=a;a.shared=[a,a];assert.deepEqual(cloneState(a),native(a));
let times=[];const reference=[];
for(const mode of ['native','plain']){
 globalThis.structuredClone=mode==='native'?native:cloneState;
 const start=performance.now();let steps=0;
 for(const [i,job]of jobs.entries()){
  const hash=crypto.createHash('sha256');const result=simulate(job,(prev,action,out)=>{hash.update(JSON.stringify({prev,action,out}));steps++;});
  const record={result,trace:hash.digest('hex')};if(mode==='native')reference.push(record);else assert.deepEqual(record,reference[i]);
 }
 times.push({mode,games:jobs.length,steps,seconds:(performance.now()-start)/1000});
}
globalThis.structuredClone=native;
fs.writeFileSync(root+'/clone-verification.json',JSON.stringify({passed:true,times},null,2));console.log(JSON.stringify(times));
