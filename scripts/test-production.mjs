import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const suite=JSON.parse(fs.readFileSync(new URL('../tests/production-suite.json',import.meta.url)));
let failures=0;const results=[];
for(const file of suite.current){const started=Date.now();const r=spawnSync(process.execPath,[file],{encoding:'utf8',maxBuffer:10*1024*1024,timeout:120000});const passed=r.status===0;results.push({file,passed,ms:Date.now()-started});console.log(`${passed?'PASS':'FAIL'} ${file}`);if(!passed){failures++;console.error(r.stdout,r.stderr,r.error?.message??'');}}
if(process.env.LORE_SUITE_REPORT)fs.writeFileSync(process.env.LORE_SUITE_REPORT,JSON.stringify(results,null,2));
console.log(`${results.length-failures}/${results.length} passed; historical/browser scopes are explicit in production-suite.json`);process.exitCode=failures?1:0;
