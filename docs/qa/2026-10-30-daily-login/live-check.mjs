// Explicitly invoked production smoke test. Creates one isolated, short-lived
// account/session, exercises actual APIs, then verifies deletion of its rows.
import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';import {randomBytes,randomUUID} from 'node:crypto';
if(!process.argv.includes('--production'))throw Error('Explicit --production argument required');
const root=process.cwd(),out=process.env.QA_OUT||'docs/qa/2026-10-30-daily-login/live';await fs.mkdir(out,{recursive:true});
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'lore-daily-live-'));await fs.chmod(temp,0o700);
const id='qa-daily-'+randomUUID(),token=randomBytes(24).toString('hex');let sequence=0,emptySlot=false,proof;
const quote=s=>"'"+s.replaceAll("'","''")+"'";
async function sql(text){const file=path.join(temp,`${++sequence}.sql`);await fs.writeFile(file,text,{mode:0o600});let raw;
 try{raw=execFileSync('npm',['exec','--','wrangler','d1','execute','lore-db','--remote','-c','server/wrangler.toml','--file',file,'--yes','--json'],{cwd:root,encoding:'utf8',maxBuffer:4*1024*1024,stdio:['ignore','pipe','pipe']});}catch{throw Error('Production QA database operation failed; statement '+sequence);}
 const result=JSON.parse(raw);assert(result.every(r=>r.success));return result.map(r=>r.results);
}
async function call(route,body){const r=await fetch('https://yourlore.xyz/api'+route,{method:body===undefined?'GET':'POST',headers:{Origin:'https://yourlore.xyz',Cookie:'lore_session='+token,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:r.status,data:await r.json()};}
try{
 assert.equal((await sql(`SELECT COUNT(*) n FROM users WHERE id=${quote(id)};`))[0][0].n,0);emptySlot=true;
 const now=Date.now();
 await sql(`INSERT INTO users(id,email,password,display,created_at,credits) VALUES(${quote(id)},${quote(id+'@invalid.test')},'disabled-qa','Daily login QA',${now},0);\nINSERT INTO sessions(token,user_id,created_at,expires_at) VALUES(${quote(token)},${quote(id)},${now},${now+600000});`);
 const me=await call('/auth/me');assert.equal(me.status,200);assert.equal(me.data.user.id,id);assert.equal(me.data.user.credits,0);
 const inbox=await call('/gifts');assert.equal(inbox.status,200);assert.equal(inbox.data.pendingCount,1);assert.equal(inbox.data.pendingAmount,10000);const gift=inbox.data.items[0];assert.equal(gift.kind,'daily-login');assert.equal(gift.amount,10000);
 const repeated=await Promise.all([call('/auth/me'),call('/gifts'),call('/gifts')]);assert(repeated.every(r=>r.status===200));assert.equal(repeated[1].data.pendingCount,1);
 const attempts=await Promise.all([call('/gifts/claim',{id:gift.id}),call('/gifts/claim',{all:true})]);assert(attempts.every(r=>r.status===200));assert.equal(attempts.reduce((n,r)=>n+r.data.amount,0),10000);
 const after=await call('/auth/me');assert.equal(after.data.user.credits,10000);assert.equal((await call('/gifts')).data.pendingCount,0);
 const codes=['LORE30000','LORE10','WELCOME100'],coupons=[];
 for(const code of codes){const response=await call('/rewards/coupon',{code});assert.equal(response.status,410);coupons.push({code,status:response.status});}
 assert.equal((await call('/auth/me')).data.user.credits,10000);
 const records=(await sql(`SELECT (SELECT COUNT(*) FROM gift_deliveries WHERE user_id=${quote(id)}) deliveries,(SELECT COUNT(*) FROM rewards WHERE user_id=${quote(id)} AND key LIKE 'gift:daily-login-%') receipts,(SELECT credits FROM users WHERE id=${quote(id)}) credits;\nSELECT COUNT(*) active FROM coupons WHERE (expires_at IS NULL OR expires_at>=${Date.now()}) AND (max_uses IS NULL OR uses<max_uses);`));
 assert.deepEqual(records[0][0],{deliveries:1,receipts:1,credits:10000});assert.equal(records[1][0].active,0);
 proof={origin:'https://yourlore.xyz',at:new Date().toISOString(),day:gift.day,giftId:gift.id,amount:gift.amount,expiresAt:gift.expiresAt,resetsAt:inbox.data.resetsAt,concurrentClaimAmounts:attempts.map(r=>r.data.amount),credits:after.data.user.credits,coupons,records:records[0][0],activeCoupons:0,scope:'Actual production Worker, D1 and HTTP session; one temporary QA account, no real player account.'};
}finally{
 // Clean only a previously verified empty QA slot, even after a partial INSERT.
 if(emptySlot){
 await sql(`DELETE FROM rewards WHERE user_id=${quote(id)};\nDELETE FROM gift_deliveries WHERE user_id=${quote(id)};\nDELETE FROM user_days WHERE user_id=${quote(id)};\nDELETE FROM sessions WHERE user_id=${quote(id)};\nDELETE FROM coupon_claims WHERE user_id=${quote(id)};\nDELETE FROM users WHERE id=${quote(id)};`);
 const leftover=(await sql(`SELECT (SELECT COUNT(*) FROM users WHERE id=${quote(id)}) users,(SELECT COUNT(*) FROM sessions WHERE user_id=${quote(id)}) sessions,(SELECT COUNT(*) FROM rewards WHERE user_id=${quote(id)}) rewards,(SELECT COUNT(*) FROM gift_deliveries WHERE user_id=${quote(id)}) deliveries,(SELECT COUNT(*) FROM user_days WHERE user_id=${quote(id)}) days,(SELECT COUNT(*) FROM coupon_claims WHERE user_id=${quote(id)}) coupons;`))[0][0];
 assert(Object.values(leftover).every(n=>n===0),'QA cleanup must leave no account-owned rows');
 if(proof){proof.cleanup=leftover;await fs.writeFile(out+'/report.json',JSON.stringify(proof,null,2)+'\n');console.log('PASS live login gift, concurrent single/bulk claim once, 3 coupons rejected, zero active coupons, QA account cleanup');}
 }
 await fs.rm(temp,{recursive:true,force:true});
}
