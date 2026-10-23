/** Compare the release's entry point and built modules with deployed bytes. */
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const origin=process.env.LORE_TEST_ORIGIN||'https://yourlore.xyz',out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-gacha-production-parity.json';
const files=['index.html',...(await fs.readdir('client/dist/assets')).filter(f=>/\.(js|css|json)$/.test(f)).map(f=>'assets/'+f)];
const queue=[...files],assets=[],hash=b=>createHash('sha256').update(b).digest('hex');
await Promise.all(Array.from({length:4},async()=>{while(queue.length){const file=queue.shift(),local=await fs.readFile('client/dist/'+file),r=await fetch(origin+'/'+file,{cache:'no-cache'});assert(r.ok,file+' HTTP '+r.status);const bytes=Buffer.from(await r.arrayBuffer());assert.equal(hash(bytes),hash(local),file);assets.push({file,bytes:bytes.length,sha256:hash(bytes)});}}));
await fs.writeFile(out,JSON.stringify({origin,checkedAt:new Date().toISOString(),assets,boundary:'Exact built HTML/JS/CSS/JSON byte parity. No authenticated purchase claim.'},null,2));console.log('PASS deployed byte parity:',assets.length);
