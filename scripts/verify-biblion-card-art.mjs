import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const origin=process.argv[2];if(!origin)throw Error('Provide the staging origin');
const folder='docs/card-art-releases/2026-09-10-biblion',m=JSON.parse(await fs.readFile(folder+'/manifest.json','utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const entries=m.assets.flatMap(a=>a.outputs.map(o=>({path:o.file.replace('client/public/',''),hash:o.sha256,art:true})));
for(const name of ['../index.html',...(await fs.readdir('client/dist/assets')).filter(n=>/\.(js|css)$/.test(n))]){const file='client/dist/assets/'+name;entries.push({path:name==='../index.html'?'index.html':'assets/'+name,hash:hash(await fs.readFile(file)),art:false});}
const queue=[...entries],results=[];
await Promise.all(Array.from({length:8},async()=>{for(let e=queue.pop();e;e=queue.pop()){
 try{const r=await fetch(new URL(e.path+(e.art?'?v=20260910-biblion':''),origin),{signal:AbortSignal.timeout(30000)}),b=Buffer.from(await r.arrayBuffer());results.push({path:e.path,status:r.status,bytes:b.length,sha256:hash(b),match:r.ok&&hash(b)===e.hash});}
 catch(err){results.push({path:e.path,match:false,error:String(err)});}
}}));
results.sort((a,b)=>a.path.localeCompare(b.path));const passed=results.every(r=>r.match);
await fs.writeFile(folder+'/staging-verification.json',JSON.stringify({origin,checkedAt:new Date().toISOString(),artFiles:888,total:results.length,passed,results},null,2));
console.log(`${results.filter(r=>r.match).length}/${results.length} public files match (${entries.filter(e=>e.art).length} card images).`);if(!passed)process.exitCode=1;
