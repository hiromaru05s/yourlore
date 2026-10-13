/** Compare staging with the exact build produced by deploy-guard. */
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import assert from 'node:assert/strict';
const run=promisify(execFile),origin='https://test.yourlore.xyz';
const dist=process.env.TUTORIAL_RELEASE_DIST,out='docs/releases/2026-10-13-tutorial/staging';
assert(dist,'Set TUTORIAL_RELEASE_DIST to the preserved deploy-guard build');
await fs.mkdir(out,{recursive:true});
const source=JSON.parse(await fs.readFile(dist+'/source.json','utf8'));
const files=['index.html',...(await fs.readdir(dist+'/assets')).filter(f=>/\.(js|css)$/.test(f)).map(f=>'assets/'+f)];
const hash=b=>createHash('sha256').update(b).digest('hex'),pending=[...files],assets=[];
await Promise.all(Array.from({length:5},async()=>{while(pending.length){const file=pending.shift(),local=await fs.readFile(dist+'/'+file),{stdout}=await run('curl',['--location','--fail','--silent','--show-error','--retry','2',origin+'/'+file],{encoding:'buffer',maxBuffer:20e6});assert.equal(hash(stdout),hash(local),file);assets.push({file,sha256:hash(local),bytes:local.length});}}));
assets.sort((a,b)=>a.file.localeCompare(b.file));
await fs.writeFile(out+'/assets.json',JSON.stringify({origin,source,checkedAt:new Date().toISOString(),assets,boundary:'Exact deployed HTML/JS/CSS parity; authenticated lesson and reward checks are recorded separately.'},null,2)+'\n');
console.log('PASS deployed assets:',assets.length,'source:',source.sha);
