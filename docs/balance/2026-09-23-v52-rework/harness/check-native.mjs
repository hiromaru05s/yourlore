import fs from 'node:fs';import assert from 'node:assert/strict';
import {simulate} from './run.mjs';import {installClone} from './clone.mjs';
const jobs=[];for(const group of ['baseline','combos','packages','coverage']){const lines=fs.readFileSync(`plans/${group}-0.jsonl`,'utf8').trim().split('\n');for(let i=0;i<4;i++)jobs.push(JSON.parse(lines[Math.floor(i*lines.length/4)]));}
const expected=jobs.map(j=>simulate(j));installClone();const actual=jobs.map(j=>simulate(j));assert.deepEqual(actual,expected);
fs.writeFileSync('native-clone-validation.json',JSON.stringify({passed:true,games:jobs.length,exactOutcomes:true,scope:'Current v52 native structuredClone versus optimized clone; diagnostic runs excluded from main total.'},null,2)+'\n');console.log('PASS native clone, 16 exact results');
