import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-stat-sync';await fs.mkdir(out,{recursive:true});
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5438';
const fixture=(await fs.readFile('tests/monster-adoption-browser.mjs','utf8')).match(/const fixture=`([\s\S]*?)`;/)[1];
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:900},recordVideo:{dir:out+'/video',size:{width:1280,height:900}}});
const page=await context.newPage();page.setDefaultTimeout(120000);const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.route('**/stat-sync-fixture',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body><div id="app"></div><script type="module">'+fixture+'</script></body></html>'}));
 await page.goto(origin+'/stat-sync-fixture');await page.waitForFunction(()=>window.monsterQA&&document.querySelector('[data-scene-ready=true]'));
 await page.waitForTimeout(500);
 const read=()=>page.evaluate(()=>[...document.querySelectorAll('.zone-mon .card[data-uid]')].map(n=>[n.dataset.uid,...['atk','def'].map(k=>Number(n.querySelector('.ad-'+k+' .seal-value').textContent))]));
 async function reset(){await page.evaluate(async()=>{const q=monsterQA;q.A.setFxSkip(false);q.reset();q.g.players.forEach((p,s)=>p.field=[q.mon('stat-'+s,{aura:undefined,atk:5,def:8,exhausted:!!s})]);await q.ctl.view.render(q.g,new Set(),false);});}
 for(const width of [1280,390]){
  await page.setViewportSize({width,height:900});await reset();
  await page.evaluate(()=>{const q=monsterQA;q.g.players.forEach(p=>{p.field[0].atkMod+=3;p.field[0].defMod+=4;});window.done=q.ctl.view.render(q.g);});
  assert((await read()).every(x=>x[1]===5&&x[2]===8),'old values at buff start');
  await page.waitForTimeout(140);assert((await read()).every(x=>x[1]===5&&x[2]===8),'hold through anticipation');
  await page.screenshot({path:out+'/up-before-'+width+'.png'});
  await page.evaluate(()=>window.done);assert((await read()).every(x=>x[1]===8&&x[2]===12));
  await page.evaluate(()=>{const q=monsterQA;q.g.players.forEach(p=>{p.field[0].atkMod-=2;p.field[0].defMod-=3;});window.done=q.ctl.view.render(q.g);});
  assert((await read()).every(x=>x[1]===8&&x[2]===12));await page.waitForTimeout(550);assert((await read()).every(x=>x[1]===8&&x[2]===12),'decrease waits for extraction');
  await page.screenshot({path:out+'/down-before-'+width+'.png'});await page.evaluate(()=>window.done);assert((await read()).every(x=>x[1]===6&&x[2]===9));checks.push('both sides, ATK/HP up/down '+width);
 }
 await reset();
 await page.evaluate(async()=>{const q=monsterQA;q.g.players[0].field=Array.from({length:3},(_,i)=>q.mon('multi-'+i,{aura:undefined}));q.g.players[0].hand=[{...q.DB.TRUMPET,uid:'trumpet'}];await q.ctl.view.render(q.g,new Set(),false);window.multi=q.reduce(q.g,{type:'play',idx:0}).state;await q.ctl.view.render(multi);multi=q.reduce(multi,{type:'pick',uid:'multi-0'}).state;await q.ctl.view.render(multi);});
 assert.equal((await read()).find(x=>x[0]==='multi-0')[1],5,'selected value remains old during multi-pick');
 await page.evaluate(async()=>{await monsterQA.ctl.view.render(multi);multi=monsterQA.reduce(multi,{type:'pick',uid:'multi-1'}).state;await monsterQA.ctl.view.render(multi);});
 assert((await read()).filter(x=>x[0].startsWith('multi')).every(x=>x[1]===5));
 await page.evaluate(()=>{multi=monsterQA.reduce(multi,{type:'pick',uid:null}).state;window.done=monsterQA.ctl.view.render(multi);});
 assert((await read()).filter(x=>x[0].startsWith('multi')).every(x=>x[1]===5));await page.evaluate(()=>window.done);assert.deepEqual((await read()).filter(x=>x[0].startsWith('multi')).map(x=>x[1]),[6,6,5]);checks.push('multi-pick repeated snapshot and partial cancel');
 await reset();await page.evaluate(async()=>{const q=monsterQA;q.g.players[0].field[0].dmg=3;q.M.monsterHealth(document.querySelector('[data-uid="stat-0"]'),5);await q.ctl.view.render(q.g,new Set(['stat-0']));});assert.equal((await read()).find(x=>x[0]==='stat-0')[2],5);
 await page.evaluate(()=>{const q=monsterQA;q.g.players[0].field[0].dmg=0;window.done=q.ctl.view.render(q.g);});assert.equal((await read()).find(x=>x[0]==='stat-0')[2],5);await page.evaluate(()=>window.done);assert.equal((await read()).find(x=>x[0]==='stat-0')[2],8);checks.push('contact damage not replayed, current HP recovery animated');
 for(const mode of ['skip','resize','hidden','reduced']){
  await reset();if(mode==='reduced')await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(mode=>{const q=monsterQA;q.g.players[0].field[0].atkMod=4;window.done=q.ctl.view.render(q.g);if(mode==='skip')q.A.setFxSkip(true);if(mode==='resize')dispatchEvent(new Event('resize'));if(mode==='hidden'){Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));}},mode);
  await page.evaluate(()=>window.done);assert.equal((await read()).find(x=>x[0]==='stat-0')[1],9);assert.equal(await page.locator('.card-material-light').count(),0);
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));monsterQA.A.setFxSkip(false);});await page.emulateMedia({reducedMotion:'no-preference'});checks.push(mode+' settles final values');
 }
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/report.json',JSON.stringify({origin,checks,errors},null,2));console.log('PASS',checks);
}catch(e){await page.screenshot({path:out+'/failure.png'});throw e;}finally{await page.evaluate(()=>monsterQA?.ctl.destroy()).catch(()=>{});await context.close();await browser.close();}
