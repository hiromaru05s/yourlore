/** Isolated QA recipients only; never distributes to real accounts. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const origin='https://test.yourlore.xyz',dir=await fs.mkdtemp('/tmp/lore-gifts-live-'),run=crypto.randomUUID(),now=Date.now();
const users=[0,1].map(i=>({id:`qa-gift-${run}-${i}`,token:crypto.randomUUID()+crypto.randomUUID()}));
const giftIds=[0,1,2].map(i=>`qa-gift-${run}-${i}`),checks=[];
const sql=async text=>{const file=dir+'/operation.sql';await fs.writeFile(file,text,{mode:0o600});execFileSync('npm',['exec','--','wrangler','d1','execute','lore-db-staging','--remote','--env','staging','-c','server/wrangler.toml','--file',file,'--json'],{stdio:'pipe',timeout:60000});};
const call=async(i,path,body)=>{const r=await fetch(origin+'/api'+path,{method:body?'POST':'GET',headers:{cookie:'lore_session='+users[i].token,'content-type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});const result=await r.json();assert.equal(r.status,200,JSON.stringify(result));return result;};
try{
 await sql(users.map(u=>`INSERT INTO users(id,email,password,display,created_at,credits,verified) VALUES('${u.id}','${u.id}@example.invalid','disabled','Gift QA',${now},100,1);INSERT INTO sessions(token,user_id,created_at,expires_at) VALUES('${u.token}','${u.id}',${now},${now+600000});`).join('\n')+giftIds.map((id,i)=>`INSERT INTO gift_messages(id,title,body,amount,created_at,expires_at,created_by,audience) VALUES('${id}','QA gift ${i}','Isolated QA recipient only',${[500,300,900][i]},${now},${i===2?now-1000:now+600000},'qa','${users[0].id}');INSERT INTO gift_deliveries(gift_id,user_id) VALUES('${id}','${users[0].id}');`).join('\n'));
 assert.equal((await fetch(origin+'/api/gifts')).status,401);assert.equal((await call(1,'/gifts')).pendingCount,0);assert.equal((await call(0,'/gifts')).pendingCount,2);assert.equal((await call(0,'/auth/me')).user.credits,100);checks.push('authenticated recipient isolation and issuance without immediate credit');
 const replies=await Promise.all([call(0,'/gifts/claim',{id:giftIds[0]}),call(0,'/gifts/claim',{id:giftIds[0]})]);assert.equal(replies.reduce((n,r)=>n+r.amount,0),500);assert.equal((await call(0,'/auth/me')).user.credits,600);checks.push('two concurrent claims grant 500 once');
 assert.equal((await call(0,'/gifts/claim',{all:true})).amount,300);assert.equal((await call(0,'/gifts/claim',{all:true})).amount,0);assert.equal((await call(0,'/gifts/claim',{id:giftIds[2]})).amount,0);assert.equal((await call(1,'/gifts/claim',{id:giftIds[1]})).amount,0);assert.equal((await call(0,'/auth/me')).user.credits,900);assert.equal((await call(1,'/auth/me')).user.credits,100);checks.push('bulk receive, replay, expiry and foreign ownership');
 const state=await call(0,'/gifts');assert.equal(state.pendingCount,0);assert.equal(state.items.filter(g=>g.claimedAt).length,2);checks.push('persisted read/claim history and empty inbox');
 await fs.writeFile(process.env.LORE_TEST_OUTPUT||'/tmp/lore-gifts-staging-report.json',JSON.stringify({origin,checks,at:new Date().toISOString(),fixture:'two temporary QA accounts and three private messages; cleaned in finally'},null,2));console.log('PASS authenticated staging gift inbox:',checks.length,'groups');
}finally{
 const ids=users.map(u=>`'${u.id}'`).join(',');await sql(`DELETE FROM gift_messages WHERE id IN (${giftIds.map(id=>`'${id}'`).join(',')});DELETE FROM rewards WHERE user_id IN (${ids});DELETE FROM sessions WHERE user_id IN (${ids});DELETE FROM user_days WHERE user_id IN (${ids});DELETE FROM users WHERE id IN (${ids});`);await fs.rm(dir,{recursive:true,force:true});
}
