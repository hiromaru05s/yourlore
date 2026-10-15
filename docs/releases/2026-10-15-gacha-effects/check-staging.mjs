import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const origin=process.env.LORE_STAGING_ORIGIN||'https://test.yourlore.xyz';
const root=path.resolve('client/dist'),sha=b=>createHash('sha256').update(b).digest('hex');
const files=(await fs.readdir(root+'/assets')).filter(f=>/\.(js|css|json)$/.test(f)).map(f=>'assets/'+f);
const cosmetics=(await fs.readdir(root+'/cosmetics')).filter(f=>f.startsWith('effect-')).map(f=>'cosmetics/'+f);
for(const folder of ['cosmetics/gacha-trio-v1']){try{for(const f of await fs.readdir(root+'/'+folder))cosmetics.push(folder+'/'+f);}catch{}}
const report={origin,at:new Date().toISOString(),assets:[],http:[]};
const pending=['index.html',...files,...cosmetics];
await Promise.all(Array.from({length:4},async()=>{while(pending.length){const file=pending.shift();const local=await fs.readFile(root+'/'+file);const response=await fetch(origin+'/'+(file==='index.html'?'':file),{redirect:'follow'});const body=Buffer.from(await response.arrayBuffer());report.assets.push({file,status:response.status,bytes:body.length,local:sha(local),remote:sha(body),match:response.ok&&sha(local)===sha(body)});}}));
for(const url of ['/api/collection','/api/collection/history','/api/auth/me']){const r=await fetch(origin+url,{redirect:'follow'});report.http.push({url,status:r.status,body:await r.json()});}
await fs.writeFile(new URL('./staging-assets.json',import.meta.url),JSON.stringify(report,null,2));
if(report.assets.some(a=>!a.match)||report.http[0].status!==401||report.http[1].status!==401)throw Error('Staging source parity or anonymous collection guard failed');
console.log(`PASS staging: ${report.assets.length} matching assets; unauthenticated collection APIs denied`);
