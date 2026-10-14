import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
const root=process.cwd(),out=path.join(root,'docs/releases/2026-10-14-massacre');
const git=(...a)=>execFileSync('git',a,{encoding:'utf8'}).trim();
const status=()=>JSON.parse(execFileSync('npm',['exec','--','wrangler','deployments','status','-c','server/wrangler.toml','--env','staging','--json'],{encoding:'utf8'}));
const before=status(),source=before.annotations?.['workers/message']?.match(/\b[a-f0-9]{40}\b/)?.[0];assert(source,'guarded source annotation');
git('merge-base','--is-ancestor','0af21456',source);git('diff','--exit-code',source,'HEAD','--','client','server','package.json','package-lock.json');
const sha=b=>createHash('sha256').update(b).digest('hex'),dist=path.join(root,'client/dist');
const list=(await fs.readdir(path.join(dist,'assets'))).filter(f=>/\.(js|css)$/.test(f)).map(f=>'assets/'+f);
list.push(...(await fs.readdir(dist)).filter(f=>f.endsWith('.html')),...['cards','cards-sm','cards-xs'].map(d=>`art/${d}/MASSACRE.webp`));
const result=[],queue=[...list];
await Promise.all(Array.from({length:4},async()=>{for(let file=queue.pop();file;file=queue.pop()){
 const expected=await fs.readFile(path.join(dist,file));let response,bytes;
 for(let attempt=0;attempt<3;attempt++){try{response=await fetch(`https://test.yourlore.xyz/${file}?massacre-verify=${source.slice(0,12)}`,{signal:AbortSignal.timeout(30000)});bytes=Buffer.from(await response.arrayBuffer());if(response.ok&&sha(bytes)===sha(expected))break;}catch(error){if(attempt===2)throw error;}await new Promise(r=>setTimeout(r,300));}
 assert(response?.ok,file+' status');assert.equal(sha(bytes),sha(expected),file+' deployed hash');result.push({file,status:response.status,bytes:bytes.length,sha256:sha(bytes)});
}}));
assert.equal(status().id,before.id,'deployment must remain stable during verification');
await fs.writeFile(path.join(out,'staging-assets.json'),JSON.stringify({origin:'https://test.yourlore.xyz',source,checkedAt:new Date().toISOString(),count:result.length,assets:result.sort((a,b)=>a.file.localeCompare(b.file))},null,2));
await fs.writeFile(path.join(out,'deployment.json'),JSON.stringify({source,sourceContainsMassacre:true,environment:'staging',deploymentId:before.id,versions:before.versions,annotations:before.annotations,assetCount:result.length,verifiedAt:new Date().toISOString()},null,2));
console.log(`PASS staging source ${source}: ${result.length}/${result.length} HTML/JS/CSS/MASSACRE art hashes match; stable deployment ${before.id}`);
