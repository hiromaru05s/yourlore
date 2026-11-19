import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-resolution-qa/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5198',out=process.env.LORE_TEST_OUT||'/tmp/lore-attack-ready';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),report={checks:[],errors:[]};
try{
 for(const reduced of [false,true]){
  const ctx=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:2,reducedMotion:reduced?'reduce':'no-preference'});
  console.log('start',reduced);const page=await ctx.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.setDefaultTimeout(90000);
  await page.goto(origin+'/play-ready-adoption.html');await page.waitForFunction(()=>window.playReadyQA?.ready);
  await page.waitForFunction(()=>document.querySelector('#meRow .is-attacker .attack-ready-surface'));
  // Reuse Vite's exact module URL (including its HMR stamp), not a second state registry.
  await page.evaluate(async()=>{const entry=performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/src/ui/monster/runtime.ts');window.readyRuntime=await import(entry.name);});
  console.log('loaded');const layers=await page.evaluate(()=>[...document.querySelectorAll('#meRow .is-attacker')].map(n=>({uid:n.dataset.uid,variant:n.dataset.monsterVariant,rootFilter:getComputedStyle(n).filter,light:Number(getComputedStyle(n.querySelector('.attack-ready-surface')).zIndex),seals:[...n.querySelectorAll(':scope > .card-cost,:scope > .ad-atk,:scope > .ad-def')].map(e=>Number(getComputedStyle(e).zIndex)),shadow:n.style.getPropertyValue('--rest-shadow')})));
  assert(layers.length);for(const row of layers){assert.equal(row.variant,'azure-03');assert.equal(row.rootFilter,'none');assert(row.seals.every(z=>z>row.light));assert(!row.shadow.includes('255,122,77'));}
  await page.waitForTimeout(reduced?150:2700);await page.screenshot({path:`${out}/ready-${reduced?'reduced':'normal'}.png`});report.checks.push({name:'ready/layers',reduced,layers});
  console.log('layers checked');
  // Target selection suspends the ready arrow; cancelling brings back the same surface.
  await page.evaluate(()=>document.querySelector('#meRow .is-attacker').classList.add('is-aiming'));
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('#meRow .is-attacker .attack-ready-surface')).display==='none');
  await page.evaluate(()=>document.querySelector('#meRow .is-attacker').classList.remove('is-aiming'));
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('#meRow .is-attacker .attack-ready-surface')).display!=='none');
  // Attack clones must not carry a frozen ready arrow or paint on top of their own seals.
  if(!reduced){
   await page.evaluate(async()=>{const runtime=window.readyRuntime;const source=document.querySelector('#meRow .is-attacker'),target=document.querySelector('#oppRow .card');window.readyAbort=new AbortController();window.readyAttack=runtime.playMonster(source,'attack',{target,signal:readyAbort.signal,exhaust:false});});
   await page.waitForTimeout(80);assert.equal(await page.locator('.duet-card .attack-ready-surface').count(),0);
   await page.evaluate(async()=>{readyAbort.abort();await readyAttack;});
   await page.waitForFunction(()=>getComputedStyle(document.querySelector('#meRow .is-attacker .attack-ready-surface')).display!=='none');
  }
  console.log('attack checked');
  // Board eligibility and rerenders own the lifetime, including gold dual-ready handoff.
  for(const [mult,used,exhausted,expected] of [[2,0,false,'dual-04'],[2,1,false,'azure-03'],[2,2,true,null],[1,0,false,'azure-03']]){
   await page.evaluate(({mult,used,exhausted})=>{const m=playReadyQA.state().players[0].field[0];m.mult=mult;m.attacksUsed=used;m.exhausted=exhausted;playReadyQA.blocked(false);},{mult,used,exhausted});
   await page.waitForTimeout(180);
   const state=await page.evaluate(()=>{const n=document.querySelector('#meRow .zone-mon .card');return {variant:n.dataset.monsterVariant,blue:n.querySelectorAll('.attack-ready-surface').length,gold:n.querySelectorAll('.dual-ready-surface').length};});
   if(expected==='dual-04'){assert.equal(state.variant,expected);assert.equal(state.blue,0);assert.equal(state.gold,1);}
   else if(expected){assert.equal(state.variant,expected);assert.equal(state.blue,1);assert.equal(state.gold,0);}
   else assert.equal(state.blue,0);
   report.checks.push({name:'eligibility',reduced,mult,used,exhausted,state});
  }
  for(let i=0;i<4;i++)await page.evaluate(()=>playReadyQA.blocked(false));
  await page.waitForTimeout(150);assert.equal(await page.locator('#meRow .attack-ready-surface').count(),await page.locator('#meRow .is-attacker').count());
  console.log('eligibility checked');
  // Opponent orientation uses the real native runtime, with the card's physical frame unflipped.
  await page.evaluate(async()=>{document.querySelectorAll('#oppRow .zone-mon .card').forEach(n=>{delete n.dataset.monsterBlocked;n.classList.remove('is-exhausted');n.classList.add('is-attacker');});window.readyRuntime.syncMonsterStates(document.querySelector('#app'));});
  await page.waitForFunction(()=>document.querySelector('#oppRow .attack-ready-surface'));await page.screenshot({path:`${out}/both-sides-${reduced}.png`});
  await page.setViewportSize({width:844,height:390});await page.waitForTimeout(400);await page.screenshot({path:`${out}/mobile-landscape-${reduced}.png`});
  console.log('before dispose');await page.evaluate(()=>playReadyQA.destroy());console.log('after dispose');await page.waitForTimeout(100);const leftover=await page.locator('.attack-ready-surface').count();if(leftover)console.log('cleanup debug',await page.evaluate(()=>[...document.querySelectorAll('.attack-ready-surface')].map(n=>({parent:n.parentElement.className,uid:n.parentElement.dataset.uid,display:n.style.display,count:n.parentElement.querySelectorAll('.attack-ready-surface').length}))));assert.equal(leftover,0);
  report.checks.push({name:'aim/abort/dual/resize/rerender/dispose',reduced,passed:true});
  console.log('before close');const video=page.video();await ctx.close();if(video)await video.saveAs(out+'/runtime.webm');
 }
 assert.deepEqual(report.errors,[]);await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,errors:report.errors,out}));
}finally{await browser.close();}
