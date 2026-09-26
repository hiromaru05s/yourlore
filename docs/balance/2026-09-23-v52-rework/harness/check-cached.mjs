import fs from 'node:fs';import assert from 'node:assert/strict';import {simulate as old} from './run.mjs';import {simulate as cached} from './run-cached.mjs';import {installClone} from './clone.mjs';installClone();
const jobs=[];for(const group of ['baseline','coverage','combos','packages','tactical']){const lines=fs.readFileSync(`plans/${group}-0.jsonl`,'utf8').trim().split('\n');for(let i=0;i<40;i++)jobs.push(JSON.parse(lines[Math.floor(i*lines.length/40)]));}
const runs=[];let expected;
for(const [label,fn]of [['original',old],['cached',cached]]){const cpu=process.cpuUsage(),t=Date.now(),results=jobs.map(j=>fn(j));if(expected)assert.deepEqual(results,expected);expected=results;runs.push({label,cpu:process.cpuUsage(cpu),wallMs:Date.now()-t});}
fs.writeFileSync('cached-reducer-validation.json',JSON.stringify({passed:true,games:jobs.length,exactOutcomesMatch:true,groups:['baseline','coverage','combos','packages','tactical'],runs},null,2)+'\n');console.log(runs);
