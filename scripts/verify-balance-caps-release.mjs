// Read-only verification of the shipped entry, card rules and BOT worker.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const base=process.env.LORE_TEST_URL||'https://yourlore.xyz',out=process.env.LORE_TEST_OUT||'docs/balance/2026-10-26-caps';
const sha=b=>createHash('sha256').update(b).digest('hex');
const get=async path=>{const r=await fetch(base+path);assert(r.ok,`${path}: ${r.status}`);return Buffer.from(await r.arrayBuffer());};
const html=await fs.readFile('client/dist/index.html','utf8'),live=(await get('/')).toString();
const entryScripts=[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>m[1]);for(const path of entryScripts)assert(live.includes(path),`live entry missing ${path}`);
const names=await fs.readdir('client/dist/assets'),bundles=[];
for(const name of names.filter(n=>n.endsWith('.js'))){
 const local=await fs.readFile('client/dist/assets/'+name);
 if(!name.startsWith('bot.worker-')&&!entryScripts.includes('/assets/'+name)&&!['spellDiscountCharges','このゲーム中に3回まで','次の相手のターン終了時に、このモンスターを必ず破壊'].some(s=>local.includes(s)))continue;
 const remote=await get('/assets/'+name);assert.equal(sha(remote),sha(local),name);bundles.push({path:'/assets/'+name,bytes:remote.length,sha256:sha(remote),matches:true});
}
assert(bundles.some(x=>x.path.includes('bot.worker-')));assert(bundles.length>=3);
await fs.mkdir(out,{recursive:true});await fs.writeFile(out+'/production-assets.json',JSON.stringify({at:new Date().toISOString(),base,sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),entryScripts,bundles,scope:'Public entry and compiled client/card-rule/BOT-worker byte parity with local build. Server source is verified separately by guarded release annotation and authoritative room tests. No authenticated online duel.'},null,2)+'\n');console.log(`PASS production entry and ${bundles.length} compiled bundles`);
