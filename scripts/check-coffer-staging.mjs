/** Real staging RNG and persistence on an isolated temporary QA account. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
const origin='https://test.yourlore.xyz',dir=await fs.mkdtemp(path.join(os.tmpdir(),'lore-coffer-live-'));
const out=process.env.LORE_TEST_OUTPUT||'/tmp/coffer-staging';await fs.mkdir(out,{recursive:true});
const uid='qa-coffer-'+crypto.randomUUID(),token=crypto.randomUUID()+crypto.randomUUID(),now=Date.now();
const ids=['sleeve:gacha-mimic-coffer','furniture:gacha-mimic-coffer'];
const sql=async(contents)=>{const file=path.join(dir,'operation.sql');await fs.writeFile(file,contents,{mode:0o600});execFileSync('npm',['exec','--','wrangler','d1','execute','lore-db-staging','--remote','--env','staging','-c','server/wrangler.toml','--file',file,'--json'],{stdio:'pipe',timeout:120000});};
const call=async(p,body,status=200)=>{const r=await fetch(origin+'/api'+p,{method:body?'POST':'GET',headers:{Cookie:'lore_session='+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();assert.equal(r.status,status,JSON.stringify(data));return data;};
let browser;
try{
 await build({stdin:{contents:"export * from './client/src/shared/collection';export {deckStoreForUser} from './client/src/shared/cards';",resolveDir:process.cwd()},bundle:true,format:'esm',platform:'node',outfile:dir+'/collection.mjs'});
 const {COLLECTIBLE_STARTERS,starterCollection,deckStoreForUser}=await import(dir+'/collection.mjs');
 const all=starterCollection(Object.fromEntries(COLLECTIBLE_STARTERS.map(id=>[id,8])));
 await sql(`INSERT INTO users(id,email,password,display,created_at,verified,credits,starter_cards) VALUES('${uid}','${uid}@example.invalid','qa-fixture','Coffer QA',${now},1,150000,'${JSON.stringify(all)}'); INSERT INTO sessions(token,user_id,created_at,expires_at) VALUES('${token}','${uid}',${now},${now+1800000});`);
 const initial=await call('/collection');assert(ids.every(id=>!initial.cosmetics.includes(id)));
 const decks=deckStoreForUser();decks.list[0].sleeve=ids[0];decks.list[0].furniture=ids[1];await call('/deck',{decks},400);
 const first=new Map(),duplicates=new Set();let latest=initial,draws=0;
 while(draws<2000&&(first.size<2||duplicates.size<2)){
  const requestId=crypto.randomUUID(),before=latest.credits;latest=await call('/collection/draw',{count:10,requestId});draws+=10;
  assert.equal(latest.receipt.cost,1000);assert.equal(latest.credits,before-1000+latest.receipt.refund);
  for(const reward of latest.receipt.rewards)if(ids.includes(reward.id)){
   assert.equal(reward.kind,'cosmetic');assert(latest.cosmetics.includes(reward.id));
   if(!first.has(reward.id)){assert.equal(reward.refund,0);first.set(reward.id,latest.receipt);}
   else {assert.equal(reward.refund,100);duplicates.add(reward.id);}
  }
  if(draws%100===0)console.log('Real staging draws:',draws,'selected grants:',first.size,'selected duplicate types:',duplicates.size);
 }
 assert.equal(first.size,2,'Selected rewards must both drop through real RNG');assert.equal(duplicates.size,2);
 for(const receipt of first.values()){const replay=await call('/collection/draw',{count:10,requestId:receipt.requestId});assert.equal(replay.credits,latest.credits);assert.deepEqual(replay.receipt,receipt);}
 await call('/deck',{decks});const me=await call('/auth/me');assert.equal(me.user.decks.list[0].sleeve,ids[0]);assert.equal(me.user.decks.list[0].furniture,ids[1]);
 const profile=await call('/social/profile');assert(profile.profile.sleeves.includes(ids[0]));assert(profile.profile.furnitures.includes(ids[1]));
 const history=await call('/collection/history');assert(history.receipts.length>0);assert(ids.every(id=>latest.cosmetics.includes(id)));
 const report={origin,checkedAt:new Date().toISOString(),draws,selectedRewards:ids,duplicateRefund:100,checks:['unowned equipment rejected','both items granted separately by real RNG','both duplicate refunds','idempotent receipt replay without spending','authenticated inventory/profile persistence','both equipped slots saved'],fixture:'isolated temporary QA account; removed after verification'};
 await fs.writeFile(out+'/api.json',JSON.stringify(report,null,2));console.log('PASS authenticated staging coffer API',JSON.stringify(report));
 if(process.env.LORE_SKIP_BROWSER!=='1'){
 const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
 browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});await context.addCookies([{name:'lore_session',value:token,url:origin,httpOnly:true,secure:true,sameSite:'Lax'}]);const page=await context.newPage();page.setDefaultTimeout(120000);
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.locator('[data-nav="deck"]').click();await page.locator('#appearanceTab').click();for(const id of ids)await page.waitForSelector(`[data-cosmetic-id="${id}"]:enabled`);await page.screenshot({path:out+'/authenticated-equipment.png'});
 await page.locator('[data-nav="shop"]').click();await page.locator('[data-info="items"]').first().click();assert.equal(await page.locator('.gacha-lineup article').filter({hasText:'貪欲な宝箱'}).count(),2);await page.screenshot({path:out+'/authenticated-lineup.png'});await fs.writeFile(out+'/browser.json',JSON.stringify({checks:['authenticated equipped inventory enabled','both gacha lineup entries'],origin},null,2));console.log('PASS authenticated staging equipment and lineup browser');
 }
}finally{
 await browser?.close();
 await sql(`DELETE FROM collection_transactions WHERE user_id='${uid}'; DELETE FROM sessions WHERE user_id='${uid}'; DELETE FROM user_days WHERE user_id='${uid}'; DELETE FROM users WHERE id='${uid}';`);
 await fs.rm(dir,{recursive:true,force:true});
}
