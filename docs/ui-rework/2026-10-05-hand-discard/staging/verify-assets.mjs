import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const base=path.resolve('client/dist'),origin='https://test.yourlore.xyz';
const paths=['index.html',...(await fs.readdir(path.join(base,'assets'))).filter(f=>/\.(js|css)$/.test(f)).map(f=>'assets/'+f)];
const hash=b=>createHash('sha256').update(b).digest('hex');
const remaining=[...paths],checks=[];
await Promise.all(Array.from({length:5},async()=>{while(remaining.length){
 const file=remaining.shift(),local=await fs.readFile(path.join(base,file)),r=await fetch(origin+'/'+file,{cache:'no-store'});
 assert.equal(r.status,200,file);const remote=Buffer.from(await r.arrayBuffer());
 assert.equal(hash(remote),hash(local),file);checks.push({path:file,sha256:hash(remote),bytes:remote.length});
}}));
await fs.writeFile(new URL('./asset-parity.json',import.meta.url),JSON.stringify({origin,checkedAt:new Date().toISOString(),checks:checks.sort((a,b)=>a.path.localeCompare(b.path))},null,2));
console.log('PASS deployed index + all JS/CSS bundles:',checks.length);
