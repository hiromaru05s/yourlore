/** Explicit live verification: create one isolated QA account/session, exercise actual APIs,
 * then remove only that account's rows. Never uses an existing player's session or balance. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {onboardingFixture} from '../tests/fixtures/onboardingEnv.mjs';
if(!process.argv.includes('--production'))throw Error('Pass --production to run the isolated live-account check');
const origin='https://yourlore.xyz',dir=await fs.mkdtemp('/tmp/lore-onboarding-live-');await fs.chmod(dir,0o700);
const uid='qa-onboarding-'+crypto.randomUUID(),token=crypto.randomUUID()+crypto.randomUUID(),now=Date.now();
const quote=s=>"'"+String(s).replaceAll("'","''")+"'";
async function sql(text){
 const file=dir+'/query.sql';await fs.writeFile(file,text,{mode:0o600});
 try{return JSON.parse(execFileSync('npm',['exec','--','wrangler','d1','execute','lore-db','--remote','-c','server/wrangler.toml','--file',file,'--json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));}
 catch{throw Error('Live QA database operation failed; cleanup account '+uid);}
}
const f=await onboardingFixture();let created=false,cleanupVerified=false;
const report={origin,source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),qaAccount:uid,startedAt:new Date().toISOString()};
const call=async(path,body,status=200)=>{const r=await fetch(origin+'/api'+path,{method:body===undefined?'GET':'POST',headers:{Cookie:'lore_session='+token,Origin:origin,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});const data=await r.json();assert.equal(r.status,status,path+' '+JSON.stringify(data));return data;};
try{
 created=true;
 await sql(`INSERT INTO users(id,email,password,display,username_set,created_at,credits,verified,stats_public) VALUES(${quote(uid)},${quote(uid+'@example.invalid')},'oauth:qa-disabled','Onboarding QA',1,${now},0,1,0); INSERT INTO sessions(token,user_id,created_at,expires_at) VALUES(${quote(token)},${quote(uid)},${now},${now+1800000});`);
 assert.equal((await call('/auth/me')).user.id,uid);
 await call('/onboarding/basics',{actions:[]},400);
 const grants=await Promise.all([0,1,2].map(()=>call('/onboarding/basics',{actions:f.actions})));
 assert.equal(grants.filter(g=>g.granted).length,1);assert.equal((await call('/onboarding')).credits,3000);report.basicReward=3000;
 const drawBody={requestId:f.lib.ONBOARDING_DRAW,count:10,tutorial:true};
 const drawn=await call('/collection/draw',drawBody);assert.equal(drawn.receipt.cost,1000);assert.equal(drawn.receipt.rewards.length,10);assert.equal(drawn.credits,2000+drawn.receipt.refund);report.draw={count:10,cost:drawn.receipt.cost,refund:drawn.receipt.refund};
 const collection=await call('/collection'),id=collection.dailyShop.cards[0];
 const buyBody={requestId:f.lib.ONBOARDING_BUY,id,count:1,tutorial:true,shopDay:collection.dailyShop.day};
 const bought=await call('/collection/buy',buyBody);assert.equal(bought.receipt.cost,0);assert.equal(bought.credits,collection.credits);assert.equal(bought.starterCards[id],Math.min(8,collection.starterCards[id]+1));report.freeStarter={id,cost:0};
 const user=(await call('/auth/me')).user,store=user.decks;
 store.list[store.sel].cards=[...Array(5).fill('STARTER_TRASH'),'STARTER_CHEST','STARTER_CHEST',id];
 const saved=await call('/deck',{decks:store,tutorial:true});assert.deepEqual(saved.deck,store.list[store.sel].cards);assert.equal((await call('/onboarding')).stage,'book');report.deck=saved.deck;
 assert.equal((await call('/onboarding/finish',{})).stage,'complete');
 await call('/onboarding/basics',{actions:f.actions});assert.deepEqual((await call('/collection/draw',drawBody)).receipt,drawn.receipt);assert.deepEqual((await call('/collection/buy',buyBody)).receipt,bought.receipt);
 const last=await call('/onboarding');assert.equal(last.stage,'complete');assert.equal(last.credits,bought.credits);report.finalStatus=last;report.retriesDidNotSpendOrGrant=true;
 report.passed=true;
}finally{
 if(created){
  await sql(['collection_transactions','rewards','user_days','sessions','tutorial_accounts'].map(table=>`DELETE FROM ${table} WHERE user_id=${quote(uid)};`).join('\n')+`\nDELETE FROM users WHERE id=${quote(uid)};`);
  const rows=await sql(`SELECT (SELECT COUNT(*) FROM users WHERE id=${quote(uid)}) AS users,(SELECT COUNT(*) FROM sessions WHERE user_id=${quote(uid)}) AS sessions,(SELECT COUNT(*) FROM rewards WHERE user_id=${quote(uid)}) AS rewards,(SELECT COUNT(*) FROM collection_transactions WHERE user_id=${quote(uid)}) AS transactions;`);
  const counts=rows.flatMap(r=>r.results??[])[0];assert(counts&&Object.values(counts).every(n=>n===0),'QA cleanup verified');cleanupVerified=true;report.cleanup=counts;
 }
 await f.close();await fs.rm(dir,{recursive:true,force:true});report.cleanupVerified=cleanupVerified;report.finishedAt=new Date().toISOString();
 await fs.writeFile('docs/releases/2026-10-30-onboarding/live-api.json',JSON.stringify(report,null,2)+'\n');
}
console.log('PASS actual production API: 3000 once, paid ten draws, free first starter, saved starter deck, completion and safe retries; dedicated QA account deleted');
