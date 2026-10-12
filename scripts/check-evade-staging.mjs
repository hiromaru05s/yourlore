/** Verify the exact guarded snapshot, including the selected evasion renderer. */
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import assert from 'node:assert/strict';
const run=promisify(execFile),origin='https://test.yourlore.xyz',dist=process.env.LORE_DIST||'client/dist',out=process.env.LORE_TEST_OUT||'/tmp/lore-evade-staging';
await fs.mkdir(out,{recursive:true});
const files=['index.html','cosmetic-studio.html',...(await fs.readdir(dist+'/assets')).filter(f=>/\.(js|css)$/.test(f)).map(f=>'assets/'+f)];
const hash=b=>createHash('sha256').update(b).digest('hex'),pending=[...files],assets=[];
assert((await Promise.all(files.filter(f=>f.endsWith('.js')).map(f=>fs.readFile(dist+'/'+f,'utf8')))).some(s=>s.includes('evade-refraction')),'Selected evasion runtime is missing from the release');
await Promise.all(Array.from({length:5},async()=>{while(pending.length){const file=pending.shift(),local=await fs.readFile(dist+'/'+file),{stdout}=await run('curl',['--location','--fail','--silent','--show-error','--retry','2',origin+'/'+file],{encoding:'buffer',maxBuffer:20e6});assert.equal(hash(stdout),hash(local),file);assets.push({file,sha256:hash(local),bytes:local.length});}}));
await fs.writeFile(out+'/staging-assets.json',JSON.stringify({origin,source:(await run('git',['rev-parse','HEAD'])).stdout.trim(),at:new Date().toISOString(),assets,boundary:'Exact deployed HTML/JS/CSS parity. Runtime board fixtures and authenticated online matches are separate claims.'},null,2));
console.log('PASS deployed evasion assets:',assets.length);
