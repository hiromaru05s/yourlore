import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
const origin='https://test.yourlore.xyz',dir=await fs.mkdtemp(path.join(os.tmpdir(),'lore-collection-live-'));
const uid='qa-starters-'+crypto.randomUUID(),token=crypto.randomUUID()+crypto.randomUUID(),now=Date.now();
const sql=async(contents)=>{const file=path.join(dir,'operation.sql');await fs.writeFile(file,contents,{mode:0o600});execFileSync('npm',['exec','--','wrangler','d1','execute','lore-db-staging','--remote','--env','staging','-c','server/wrangler.toml','--file',file,'--json'],{stdio:'pipe',timeout:120000});};
const call=async(p,body)=>{const r=await fetch(origin+'/api'+p,{method:body?'POST':'GET',headers:{Cookie:'lore_session='+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));return data;};
try{
 await build({entryPoints:['client/src/shared/collection.ts'],bundle:true,format:'esm',platform:'node',outfile:dir+'/collection.mjs'});const {COLLECTIBLE_STARTERS,starterCollection}=await import(dir+'/collection.mjs');
 await sql(`INSERT INTO users(id,email,password,display,created_at,verified,credits) VALUES('${uid}','${uid}@example.invalid','qa-fixture','Collection QA',${now},1,5000); INSERT INTO sessions(token,user_id,created_at,expires_at) VALUES('${token}','${uid}',${now},${now+600000});`);
 const initial=await call('/collection');assert.deepEqual(initial.starterCards,starterCollection());assert.equal(initial.credits,5000);
 const requestId=crypto.randomUUID(),id=COLLECTIBLE_STARTERS[1];const bought=await call('/collection/buy',{id,requestId});assert.equal(bought.credits,4800);assert.equal(bought.starterCards[id],1);
 const replays=await Promise.all([call('/collection/buy',{id,requestId}),call('/collection/buy',{id,requestId})]);assert(replays.every(r=>r.credits===4800&&r.starterCards[id]===1));
 const one=await call('/collection/draw',{count:1,requestId:crypto.randomUUID()});assert.equal(one.receipt.cost,100);assert.equal(one.receipt.rewards.length,1);
 const ten=await call('/collection/draw',{count:10,requestId:crypto.randomUUID()});assert.equal(ten.receipt.rewards.length,10);assert.equal(ten.credits,one.credits-1000+ten.receipt.refund);
 const all=starterCollection(Object.fromEntries(COLLECTIBLE_STARTERS.map(id=>[id,8])));await sql(`UPDATE users SET starter_cards='${JSON.stringify(all)}' WHERE id='${uid}';`);
 const duplicates=await call('/collection/draw',{count:10,requestId:crypto.randomUUID()});assert.equal(duplicates.receipt.refund,500);assert.equal(duplicates.credits,ten.credits-500);assert(duplicates.receipt.rewards.every(r=>r.owned===8&&r.refund===50));
 const history=await call('/collection/history');assert.equal(history.receipts.length,4);const me=await call('/auth/me');assert.deepEqual(me.user.starterCards,all);
 const report={origin,checkedAt:new Date().toISOString(),checks:['authenticated initial ownership','200-Shard purchase','concurrent request replay without extra spend','100-Shard draw','1000-Shard ten draw','eight-copy duplicate refunds 500 across ten','persisted history and auth inventory'],initialCredits:5000,finalCredits:duplicates.credits,fixture:'isolated temporary account; removed after verification'};
 await fs.writeFile('docs/releases/2026-10-15-starter-collection/staging-api.json',JSON.stringify(report,null,2));console.log('PASS authenticated staging collection: '+report.checks.length+' checks');
}finally{
 await sql(`DELETE FROM collection_transactions WHERE user_id='${uid}'; DELETE FROM sessions WHERE user_id='${uid}'; DELETE FROM user_days WHERE user_id='${uid}'; DELETE FROM users WHERE id='${uid}';`);
 await fs.rm(dir,{recursive:true,force:true});
}
