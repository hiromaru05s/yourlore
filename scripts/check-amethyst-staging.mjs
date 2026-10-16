/** Exercise real staging RNG and persistence using a disposable, isolated QA account. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const origin='https://test.yourlore.xyz',dir=await fs.mkdtemp(path.join(os.tmpdir(),'lore-amethyst-live-'));
const uid='qa-amethyst-'+crypto.randomUUID(),token=crypto.randomUUID()+crypto.randomUUID(),now=Date.now();
const ids=['sleeve:gacha-amethyst-cleft','furniture:gacha-amethyst-cleft'];let created=false;
const sql=async contents=>{const file=path.join(dir,'operation.sql');await fs.writeFile(file,contents,{mode:0o600});execFileSync('npm',['exec','--','wrangler','d1','execute','lore-db-staging','--remote','--env','staging','-c','server/wrangler.toml',...(contents.startsWith('DELETE')?['--command',contents]:['--file',file]),'--json'],{stdio:'pipe',timeout:120000});};
const call=async(p,body)=>{const r=await fetch(origin+'/api'+p,{method:body?'POST':'GET',headers:{Cookie:'lore_session='+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));return data;};
try{
 created=true;await sql(`INSERT INTO users(id,email,password,display,created_at,verified,credits) VALUES('${uid}','${uid}@example.invalid','qa-fixture','Amethyst QA',${now},1,250000); INSERT INTO rewards(user_id,key,amount,created_at) VALUES('${uid}','tutorial:v3:intro:skip',0,${now}); INSERT INTO sessions(token,user_id,created_at,expires_at) VALUES('${token}','${uid}',${now},${now+1200000});`);
 const initial=await call('/collection');assert(ids.every(id=>!initial.cosmetics.includes(id)));
 const observed=new Map();let result,draws=0;
 while(draws<2000&&ids.some(id=>!observed.has(id))){
  const requestId=crypto.randomUUID();result=await call('/collection/draw',{count:10,requestId});draws+=10;
  for(const reward of result.receipt.rewards)if(ids.includes(reward.id)){assert.equal(reward.kind,'cosmetic');observed.set(reward.id,reward);}
  if(draws===10){const replay=await call('/collection/draw',{count:10,requestId});assert.equal(replay.credits,result.credits);assert.deepEqual(replay.receipt,result.receipt);}
  if(draws%100===0)console.log(`Staging RNG: ${draws} draws, ${observed.size}/2 selected rewards observed`);
 }
 assert.equal(observed.size,2,'Selected rewards not observed within bounded random sample');
 const state=await call('/collection');assert(ids.every(id=>state.cosmetics.includes(id)));
 const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
 const browser=await chromium.launch({channel:'chrome',headless:true});const errors=[];
 try{
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});await context.addCookies([{name:'lore_session',value:token,url:origin,httpOnly:true,secure:true,sameSite:'Lax'}]);await context.addInitScript(()=>localStorage.setItem('lore_lang','ja'));const page=await context.newPage();page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin,{waitUntil:'domcontentloaded'});await page.locator('.lounge-home').waitFor();await page.locator('.screen-loader').waitFor({state:'detached',timeout:300000});await page.locator('[data-nav="deck"]').click();await page.locator('#appearanceTab').click();for(const id of ids)await page.locator(`[data-cosmetic-id="${id}"]:enabled`).click();await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#deckMsg')?.textContent?.includes('保存'));
  const me=await call('/auth/me'),slot=me.user.decks.list[me.user.decks.sel];assert.equal(slot.sleeve,ids[0]);assert.equal(slot.furniture,ids[1]);
  const out=process.env.LORE_TEST_OUTPUT||'/tmp/amethyst-staging';await fs.mkdir(out,{recursive:true});await page.screenshot({path:out+'/authenticated-equipment.png'});
  await page.locator('[data-nav="shop"]').click();await page.locator('[data-info="items"]').first().click();assert.equal(await page.locator('.gacha-lineup article').filter({hasText:'紫晶の断層'}).count(),2);await page.screenshot({path:out+'/authenticated-lineup.png'});assert.deepEqual(errors,[]);
  await fs.writeFile(out+'/authenticated-report.json',JSON.stringify({origin,checkedAt:new Date().toISOString(),draws,observed:[...observed.keys()],checks:['real staging RNG grants both independent rewards','request replay without additional spend','persisted inventory','authenticated browser equipment save','both live gacha lineup entries'],errors,fixture:'isolated temporary account; cleaned in finally'},null,2));
 }finally{await browser.close();}
 console.log(`PASS authenticated staging: both rewards observed in ${draws} draws; equipment and lineup verified`);
}finally{
 if(created)await sql(`DELETE FROM daily_challenges WHERE user_id='${uid}'; DELETE FROM duel_reward_receipts WHERE user_id='${uid}'; DELETE FROM rewards WHERE user_id='${uid}'; DELETE FROM collection_transactions WHERE user_id='${uid}'; DELETE FROM sessions WHERE user_id='${uid}'; DELETE FROM user_days WHERE user_id='${uid}'; DELETE FROM ratings WHERE user_id='${uid}'; DELETE FROM presence WHERE user_id='${uid}'; DELETE FROM users WHERE id='${uid}';`);
 await fs.rm(dir,{recursive:true,force:true});
}
