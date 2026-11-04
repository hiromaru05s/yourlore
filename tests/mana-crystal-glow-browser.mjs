import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5295',out=process.env.LORE_GLOW_OUTPUT||'docs/releases/2026-11-04-mana-glow/qa';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],checks=[];
page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
const state=()=>page.evaluate(()=>['Me','Opp'].map(side=>{const e=document.querySelector(`#portrait${side} .pt-mana`);return ({ready:Number(e.dataset.crystalsReady),spent:Number(e.dataset.crystalsSpent),glow:Number(e.dataset.glowingCrystals),forming:Number(e.dataset.formingCrystals)});}));
const set=async(current,maximum)=>{await page.evaluate(([c,m])=>window.manaGlowAdoption.setCounts(c,m),[current,maximum]);await page.waitForTimeout(300);};
try{
 await page.clock.install();await page.goto(origin+'/mana-glow-adoption.html');await page.waitForFunction(()=>window.manaGlowAdoption?.state.ready);await page.clock.pauseAt(await page.evaluate(()=>Date.now()+10000));
 const advance=async n=>{await page.clock.runFor(n);};
 for(const [current,maximum]of [[2,6],[0,6],[6,6],[2,30],[30,30],[0,3]]){
  await set(current,maximum);await advance(160);for(const s of await state()){assert.equal(s.ready,current);assert.equal(s.spent,maximum-current);assert.equal(s.glow,current);}checks.push(`${current}/${maximum} both sides`);
 }
 await set(2,6);await advance(200);await page.screenshot({path:out+'/desktop-2-of-6.png'});
 for(const side of [0,1]){
  await page.evaluate(side=>{void window.manaGlowAdoption.gain(side);},side);await advance(450);
  const during=(await state())[side];assert.equal(during.forming,2);assert.equal(during.glow,2);await page.screenshot({path:out+`/forming-${side}.png`});
  await advance(1400);const after=(await state())[side];assert.equal(after.forming,0);assert.equal(after.ready,5);assert.equal(after.glow,5);checks.push(`side ${side} no future-slot halo during formation, settled 5/8`);
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>{void window.manaGlowAdoption.gain(0);});await advance(400);assert.equal((await state())[0].forming,0);assert.equal((await state())[0].glow,8);checks.push('reduced motion settling');
 await set(2,6);await page.setViewportSize({width:390,height:844});await advance(300);await page.screenshot({path:out+'/mobile-2-of-6.png'});await page.setViewportSize({width:844,height:390});await advance(300);await page.screenshot({path:out+'/landscape-2-of-6.png'});
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/browser-report.json',JSON.stringify({origin,checks,errors},null,2));console.log('PASS',checks);
}finally{await browser.close();}
