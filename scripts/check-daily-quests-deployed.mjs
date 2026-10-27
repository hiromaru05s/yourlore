/** Production smoke on one disposable account, including actual replacement persistence. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
const origin='https://yourlore.xyz',out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-daily-production';
await fs.mkdir(out,{recursive:true});
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'lore-daily-smoke-'));
const uid='qa-daily-'+randomUUID(),token=randomUUID()+randomUUID(),now=Date.now();
const sql=async contents=>{
 const file=path.join(temp,'operation.sql');await fs.writeFile(file,contents,{mode:0o600});
 try{return JSON.parse(execFileSync('npm',['exec','--','wrangler','d1','execute','lore-db','--remote','-c','server/wrangler.toml','--file',file,'--json'],{stdio:'pipe',timeout:120000}));}
 catch{throw Error('D1 smoke operation failed; SQL and credentials withheld');}
};
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
let browser,context,created=false;const errors=[];
try{
 created=true;
 await sql(`INSERT INTO users(id,email,password,display,created_at,verified,credits) VALUES('${uid}','${uid}@example.invalid','disabled','Daily QA',${now},1,0);
 INSERT INTO rewards(user_id,key,amount,created_at) VALUES('${uid}','tutorial:v3:intro:skip',0,${now});
 INSERT INTO sessions(token,user_id,created_at,expires_at) VALUES('${token}','${uid}',${now},${now+1800000});`);
 browser=await chromium.launch({channel:'chrome',headless:true});context=await browser.newContext({viewport:{width:1440,height:900}});
 await context.addCookies([{name:'lore_session',value:token,url:origin,httpOnly:true,secure:true,sameSite:'Lax'}]);
 await context.addInitScript(()=>localStorage.setItem('lore_lang','ja'));
 const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(60000);
 const read=async()=>{const r=await context.request.get(origin+'/api/rewards/progression');assert.equal(r.status(),200);return r.json();};
 const initial=await read();assert.equal(initial.dailies.length,3);assert.equal(new Set(initial.dailies.map(q=>q.quest.kind)).size,3);assert(initial.dailies.every(q=>q.rerollsLeft===3));
 assert.deepEqual((await read()).dailies,initial.dailies);
 await p.goto(origin,{waitUntil:'domcontentloaded'});await p.locator('.dq-task').first().waitFor();await p.waitForFunction(()=>!document.querySelector('.lounge-entry-overlay,.screen-loader'));
 assert.equal(await p.locator('.dq-task').count(),3);assert.equal(await p.locator('#modeReward progress').getAttribute('max'),'300');
 await p.screenshot({path:out+'/home-desktop.png'});
 await p.locator('[data-quest="1"]').click();await p.locator('[data-no]').click();assert.deepEqual((await read()).dailies,initial.dailies);
 for(const slot of [1,2,0]){
  const before=await read();await p.locator(`[data-quest="${slot}"]`).click();await p.locator('[data-yes]').click();
  await p.locator('.daily-replace-overlay').waitFor({state:'detached'});
  const after=await read();assert.equal(after.dailies[slot].revision,before.dailies[slot].revision+1);
  assert.notEqual(after.dailies[slot].quest.kind,before.dailies[slot].quest.kind);
  for(let i=0;i<3;i++)if(i!==slot)assert.deepEqual(after.dailies[i].quest,before.dailies[i].quest);
 }
 const final=await read();assert(final.dailies.every(q=>q.rerollsLeft===0));assert.equal(final.credits,0);
 await p.waitForFunction(()=>document.querySelectorAll('.dq-task:disabled').length===3);
 const fourth=await context.request.post(origin+'/api/rewards/daily/reroll',{data:{day:final.daily.day,revision:final.daily.revision,slot:0},headers:{Origin:origin}});assert.equal(fourth.status(),409);
 await p.locator('#online').click();assert.equal(await p.locator('#modeReward progress').getAttribute('max'),'100');
 await p.setViewportSize({width:390,height:844});await p.screenshot({path:out+'/home-mobile.png'});
 await p.reload({waitUntil:'domcontentloaded'});await p.locator('.dq-task:disabled').first().waitFor();assert.equal(await p.locator('.dq-task:disabled').count(),3);
 assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/report.json',JSON.stringify({origin,source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),checks:['three distinct persisted quests','NO preserves all assignments','YES replaces the selected slot only','three changes shared across slots','fourth change rejected','replacement state survives reload','ranked/casual cap bars','desktop/mobile screenshots'],scope:'Real production API and browser using a disposable preverified QA account; live match settlement and OAuth are not exercised.',errors},null,2));
 console.log('PASS production daily quests: real assignment, NO/YES, shared budget, reload and mode bars');
}finally{
 await context?.close().catch(()=>{});await browser?.close().catch(()=>{});
 if(created){await sql(`DELETE FROM daily_challenge_extras WHERE user_id='${uid}'; DELETE FROM daily_challenges WHERE user_id='${uid}'; DELETE FROM rewards WHERE user_id='${uid}'; DELETE FROM sessions WHERE user_id='${uid}'; DELETE FROM user_days WHERE user_id='${uid}'; DELETE FROM ratings WHERE user_id='${uid}'; DELETE FROM presence WHERE user_id='${uid}'; DELETE FROM users WHERE id='${uid}';`);await fs.writeFile(out+'/cleanup.json',JSON.stringify({removed:true}));console.log('PASS disposable QA account removed');}
 await fs.rm(temp,{recursive:true,force:true});
}
