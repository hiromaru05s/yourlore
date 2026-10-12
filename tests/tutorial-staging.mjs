/** Real authenticated staging verification. Credentials are ephemeral and never written to reports. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const auth=JSON.parse(await fs.readFile(process.env.LORE_TUTORIAL_AUTH,'utf8'));
assert(auth.id.startsWith('qa-tutorial-'));
const transcripts=JSON.parse(await fs.readFile(process.env.TUTORIAL_TRANSCRIPTS,'utf8'));
const origin='https://test.yourlore.xyz',out=process.env.TUTORIAL_QA_OUT;
assert(out);await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:1280,height:900}}),p=await context.newPage();p.setDefaultTimeout(90000);
const errors=[];p.on('pageerror',e=>errors.push(e.message));
try{
 await context.addInitScript(()=>localStorage.setItem('lore_lang','ja'));
 await p.goto(origin);await p.locator('#email').fill(auth.email);await p.locator('#password').fill(auth.password);await p.locator('#submit').click();
 await p.waitForSelector('.academy-welcome');await p.screenshot({path:out+'/authenticated-welcome.png'});
 await p.locator('[data-no]').click();assert((await p.locator('.welcome-copy').innerText()).includes('3,000'));assert((await p.locator('.welcome-copy').innerText()).includes('受け取れません'));
 await p.locator('[data-yes]').click();await p.waitForSelector('.academy-lessons');await p.waitForSelector('#startInter:not([disabled])');
 await p.locator('#startInter').click();await p.waitForSelector('[data-scene-ready="true"]');await p.waitForSelector('#hand .card');await p.waitForTimeout(600);
 await p.locator('#hand .card').first().click();await p.waitForTimeout(300);const c=await p.locator('#hand .card').first().boundingBox();assert(c);await p.mouse.move(c.x+c.width/2,c.y+c.height/2);await p.mouse.down();await p.mouse.move(640,520,{steps:15});await p.mouse.up();
 await p.waitForSelector('[data-next]');assert((await p.locator('.coach-payment').innerText()).includes('250'));await p.screenshot({path:out+'/authenticated-drag-clear.png'});
 const request=async(path,body)=>{const r=await context.request.fetch(origin+'/api'+path,{method:body?'POST':'GET',data:body});return {status:r.status(),body:await r.json()};};
 let status=await request('/rewards/tutorial');assert.equal(status.body.credits,250);assert(status.body.offered);
 assert.equal((await request('/rewards/tutorial/complete',{lesson:'duel',actions:[]})).status,400);
 const ids=Object.keys(transcripts).filter(id=>id!=='mana');
 const first=ids.shift();const concurrent=await Promise.all([0,1].map(()=>request('/rewards/tutorial/complete',{lesson:first,actions:transcripts[first]})));assert.equal(concurrent.reduce((n,r)=>n+r.body.amount,0),250);assert.equal(concurrent.filter(r=>r.body.granted).length,1);
 for(const lesson of ids){const r=await request('/rewards/tutorial/complete',{lesson,actions:transcripts[lesson]});assert.equal(r.status,200);assert.equal(r.body.amount,250);}
 status=await request('/rewards/tutorial');assert.equal(status.body.credits,3000);assert.equal(status.body.keys.filter(k=>!k.includes(':intro:')).length,12);
 const again=await request('/rewards/tutorial/complete',{lesson:'mana',actions:transcripts.mana});assert.equal(again.body.amount,0);assert.equal(again.body.credits,3000);
 await p.reload();await p.waitForSelector('[data-nav="tutorial"]');await p.locator('[data-nav="tutorial"]').click();await p.waitForFunction(()=>document.querySelector('.academy-earned')?.textContent.includes('12 / 12'));assert.equal(await p.locator('.academy-welcome').count(),0);await p.screenshot({path:out+'/authenticated-complete.png'});
 await p.setViewportSize({width:390,height:844});await p.locator('#ruleNotebook').click();await p.screenshot({path:out+'/authenticated-notebook-mobile.png'});await p.keyboard.press('Escape');
 assert.deepEqual(errors,[]);
 const report={origin,checkedAt:new Date().toISOString(),credits:3000,completed:12,concurrentGrants:concurrent.map(r=>r.body.amount),checks:['real password login with disposable preverified account','first-entry invitation and No confirmation','genuine drag-to-play and 250-Shard D1 payment','remaining 11 shared-reducer transcripts accepted by deployed server','concurrent grant once','incomplete claim rejected','reload restores all 12 claims and no repeat invitation','mobile rule notebook'],errors};
 await fs.writeFile(out+'/authenticated.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await context.close();await browser.close();}
