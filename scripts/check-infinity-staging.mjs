/** Verify the adopted page-turn runtime against the exact guarded build. */
import fs from 'node:fs/promises';import {createHash} from 'node:crypto';import {execFile} from 'node:child_process';import {promisify} from 'node:util';import assert from 'node:assert/strict';
const run=promisify(execFile),origin='https://test.yourlore.xyz',dist=process.env.INFINITY_DIST||'/tmp/infinity-guarded-dist',out='docs/releases/2026-10-14-infinity-page-five';
const files=['index.html','cosmetic-studio.html',...(await fs.readdir(dist+'/assets')).filter(f=>/\.(js|css)$/.test(f)).map(f=>'assets/'+f)];
const hash=b=>createHash('sha256').update(b).digest('hex'),pending=[...files],assets=[];
const modules=await Promise.all(files.filter(f=>f.endsWith('.js')).map(f=>fs.readFile(dist+'/'+f,'utf8')));
assert(modules.some(s=>s.includes('infinityCull="05"')||s.includes('infinityCull="05"'.replaceAll('"',"'"))),'Selected 05 must be in the actual runtime bundle');
assert(modules.some(s=>s.includes('infinityRelease')),'Turn-end event must be connected');
for(const id of ['BLACK_INFINITY','STARTER_TRASH'])for(const size of ['cards','cards-sm','cards-xs'])pending.push(`art/${size}/${id}.webp`);
await Promise.all(Array.from({length:4},async()=>{while(pending.length){const file=pending.shift(),local=await fs.readFile(file.startsWith('art/')?'client/public/'+file:dist+'/'+file),{stdout}=await run('curl',['--location','--fail','--silent','--show-error','--retry','2',origin+'/'+file],{encoding:'buffer',maxBuffer:20e6});assert.equal(hash(stdout),hash(local),file);assets.push({file,sha256:hash(local),bytes:local.length});}}));
await fs.writeFile(out+'/staging-assets.json',JSON.stringify({origin,checkedAt:new Date().toISOString(),assets,boundary:'Exact deployed HTML/JS/CSS plus source and Cull art. Browser controller fixtures are separate from authenticated PvP.'},null,2));console.log('PASS deployed Infinity assets:',assets.length);
