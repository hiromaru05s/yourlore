import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const base=process.env.LORE_TEST_URL||'https://yourlore.xyz';
const sha=b=>createHash('sha256').update(b).digest('hex');
const get=async path=>{const r=await fetch(base+path);assert(r.ok,`${path}: ${r.status}`);return Buffer.from(await r.arrayBuffer());};
const localHtml=await fs.readFile('client/dist/index.html','utf8'),remoteHtml=(await get('/')).toString();
const entryScripts=[...localHtml.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>m[1]);
for(const path of entryScripts)assert(remoteHtml.includes(path),`live index does not reference ${path}`);
const files=await fs.readdir('client/dist/assets'),manifestName=files.find(x=>x.startsWith('menu-manifest-')&&x.endsWith('.json'));
const localManifest=await fs.readFile('client/dist/assets/'+manifestName),remoteManifest=await get('/assets/'+manifestName);assert.equal(sha(remoteManifest),sha(localManifest));
const manifest=JSON.parse(remoteManifest),assets=[];
for(const id of ['RIFT_MATTER','RIFT_METALIGHT'])for(const dir of ['cards','cards-sm','cards-xs']){
 const path=`/art/${dir}/${id}.webp`,local=await fs.readFile('client/public'+path),remote=await get(path+'?v=20261026-rift-ores-v1');
 assert.equal(sha(remote),sha(local),path);assert.equal(manifest.entries.find(e=>e.url===path)?.hash,sha(local));assets.push({path,bytes:remote.length,sha256:sha(remote),matches:true});
}
const bundles=[];
for(const name of files.filter(n=>n.endsWith('.js'))){const local=await fs.readFile('client/dist/assets/'+name);if(!local.includes('RIFT_METALIGHT'))continue;const remote=await get('/assets/'+name);assert.equal(sha(remote),sha(local),name);bundles.push({path:'/assets/'+name,sha256:sha(remote),matches:true});}
assert(bundles.length>0);
const report={at:new Date().toISOString(),base,entryScripts,manifest:'/assets/'+manifestName,assets,bundles,scope:'published HTML entry, compiled catalog/engine bundles, content manifest and six artwork files; no authenticated online duel'};
await fs.writeFile('docs/releases/2026-10-26-rift-ores/production-verification.json',JSON.stringify(report,null,2)+'\n');console.log(`PASS live entry, ${bundles.length} bundles, manifest and ${assets.length} ore assets`);
