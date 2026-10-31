/** Production smoke on one disposable account, including real claim persistence and concurrent requests. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
const origin='https://yourlore.xyz',out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-daily-claim-production';
await fs.mkdir(out,{recursive:true});
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'lore-daily-smoke-'));
const uid='qa-daily-'+randomUUID(),token=randomUUID()+randomUUID(),now=Date.now();
const sql=async contents=>{
 const file=path.join(temp,'operation.sql');await fs.writeFile(file,contents,{mode:0o600});
 try{execFileSync('npm',['exec','--','wrangler','d1','execute','lore-db','--remote','-c','server/wrangler.toml','--file',file,'--json'],{stdio:'pipe',timeout:120000});}
 catch{throw Error('D1 smoke operation failed; SQL and credentials withheld');}
};
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
let browser,context,created=false;const errors=[];
try{
 created=true;
 await sql(`INSERT INTO users(id,email,password,display,created_at,verified,credits,username_set) VALUES('${uid}','${uid}@example.invalid','disabled','Daily QA',${now},1,2480,1);
 INSERT INTO rewards(user_id,key,amount,created_at) VALUES('${uid}','tutorial:v3:intro:skip',0,${now});
 INSERT INTO sessions(token,user_id,created_at,expires_at) VALUES('${token}','${uid}',${now},${now+1800000});`);
 browser=await chromium.launch({channel:'chrome',headless:true});context=await browser.newContext({viewport:{width:1440,height:900}});
 await context.addCookies([{name:'lore_session',value:token,url:origin,httpOnly:true,secure:true,sameSite:'Lax'}]);
 await context.addInitScript(()=>localStorage.setItem('lore_lang','ja'));
 const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(60000);
 const read=async()=>{const r=await context.request.get(origin+'/api/rewards/progression');assert.equal(r.status(),200);return r.json();};
 const initial=await read();assert.equal(initial.dailies.length,3);const day=initial.daily.day;
 await sql(`UPDATE daily_challenges SET quest='{"kind":"damage","reward":350,"target":150}',progress=90,revision=0 WHERE user_id='${uid}' AND day='${day}';
 UPDATE daily_challenge_extras SET quest='{"kind":"heal","reward":300,"target":40}',progress=40,revision=0 WHERE user_id='${uid}' AND day='${day}' AND slot=1;
 UPDATE daily_challenge_extras SET quest='{"kind":"draw","reward":400,"target":10}',progress=10,claimed=1,revision=0 WHERE user_id='${uid}' AND day='${day}' AND slot=2;
 INSERT INTO rewards(user_id,key,amount,created_at) VALUES('${uid}','daily:${day}:2',400,${now});`);
 const claim=(slot,extra={})=>context.request.post(origin+'/api/rewards/daily/claim',{data:{day,revision:0,slot,...extra},headers:{Origin:origin}});
 assert.equal((await claim(0)).status(),409,'incomplete quest rejected');
 assert.equal((await read()).credits,2480);
 await p.goto(origin,{waitUntil:'domcontentloaded'});await p.locator('.dq-claim').waitFor();await p.waitForFunction(()=>!document.querySelector('.lounge-entry-overlay,.screen-loader'));
 assert.equal(await p.locator('.dq-entry.is-active').count(),1);assert.equal(await p.locator('.dq-entry.is-ready').count(),1);assert.equal(await p.locator('.dq-entry.is-complete').count(),1);
 await p.screenshot({path:out+'/mixed-desktop.png'});
 await p.setViewportSize({width:390,height:844});await p.locator('.dq-claim').scrollIntoViewIfNeeded();await p.screenshot({path:out+'/mixed-mobile.png'});
 await p.locator('.dq-claim').click();await p.waitForFunction(()=>document.querySelector('.dq-notice')?.textContent.includes('+300'));
 assert.equal((await read()).credits,2780);assert((await read()).dailies[1].claimed);
 assert((await p.locator('.lounge-balance').innerText()).includes('2,780'));await p.screenshot({path:out+'/received-mobile.png'});
 const retry=await claim(1,{amount:999999});assert.equal(retry.status(),200);assert.equal((await retry.json()).amount,0);
 const legacy=await claim(2);assert.equal((await legacy.json()).amount,0);assert.equal((await read()).credits,2780);
 await sql(`UPDATE daily_challenges SET progress=150 WHERE user_id='${uid}' AND day='${day}';`);
 const concurrent=await Promise.all([claim(0),claim(0),claim(0)]);const receipts=await Promise.all(concurrent.map(r=>r.json()));
 assert(concurrent.every(r=>r.status()===200));assert.deepEqual(receipts.map(r=>r.amount).sort((a,b)=>a-b),[0,0,350]);
 const final=await read();assert.equal(final.credits,3130);assert(final.dailies.every(q=>q.claimed));
 await p.reload({waitUntil:'domcontentloaded'});await p.locator('.dq-task').first().waitFor();assert.equal(await p.locator('.dq-entry.is-complete').count(),3);assert.equal(await p.locator('.dq-claim').count(),0);
 const stale=await claim(0,{day:'2000-01-01'});assert.equal(stale.status(),409);assert.equal((await read()).credits,3130);
 assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/report.json',JSON.stringify({origin,source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),balances:[2480,2780,3130],concurrentAmounts:receipts.map(r=>r.amount),checks:['incomplete claim rejected','three distinct visual states','explicit button awards stored 300 shards','header balance updates','duplicate and legacy claims pay zero','three concurrent claims award exactly 350 total','received state survives reload','stale day rejected','desktop/mobile screenshots'],scope:'Real production API and browser using one disposable preverified account with seeded quest progress. Live match completion, OAuth and physical devices are not exercised.',errors},null,2));
 console.log('PASS production daily claim: real API, button, balance, concurrency, legacy receipt and reload');
}finally{
 await context?.close().catch(()=>{});await browser?.close().catch(()=>{});
 if(created){await sql(`DELETE FROM gift_deliveries WHERE user_id='${uid}'; DELETE FROM player_experience WHERE user_id='${uid}'; DELETE FROM daily_challenge_extras WHERE user_id='${uid}'; DELETE FROM daily_challenges WHERE user_id='${uid}'; DELETE FROM rewards WHERE user_id='${uid}'; DELETE FROM sessions WHERE user_id='${uid}'; DELETE FROM user_days WHERE user_id='${uid}'; DELETE FROM ratings WHERE user_id='${uid}'; DELETE FROM presence WHERE user_id='${uid}'; DELETE FROM users WHERE id='${uid}';`);await fs.writeFile(out+'/cleanup.json',JSON.stringify({removed:true}));console.log('PASS disposable QA account removed');}
 await fs.rm(temp,{recursive:true,force:true});
}
