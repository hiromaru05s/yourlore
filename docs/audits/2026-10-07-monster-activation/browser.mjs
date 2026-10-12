// Start Vite on port 5183, run audit.mjs, then run this file.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const out=new URL('.',import.meta.url).pathname;
const fixtures=JSON.parse(await fs.readFile(out+'browser-fixtures.json'));
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900}});
const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(90000);
try {
 await page.goto('http://127.0.0.1:5183/cosmetic-studio.html?board=1&runtime=1&set=default');
 await page.waitForFunction(()=>window.atelier&&document.querySelector('[data-scene-ready=true]'));
 for(const label of ['half-elf:none','half-elf:own','turn:hexCurse','turn:giantGolem','turn:gambler','summon:GUNNER','end:GUNNER']){
  const sample=fixtures.find(c=>c.label===label);assert(sample,label);
  const check=await page.evaluate(async sample=>{
   const c=atelier.controller;c.show(sample.before);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
   let running=true,frames=0,max=0;const names=new Set();
   const sampleFrame=()=>{frames++;const nodes=[...document.querySelectorAll('[data-layer-policy=foreground] [data-monster-kind=trigger]')];max=Math.max(max,nodes.length);for(const n of nodes)names.add(n.getAttribute('data-card')??n.querySelector('.card-name')?.textContent??n.textContent.slice(0,80));if(running)requestAnimationFrame(sampleFrame);};requestAnimationFrame(sampleFrame);
   c.applyResult(sample.result);await c.queue;running=false;
   return {frames,maxTriggerActors:max,names:[...names],expectedEvents:sample.result.events.filter(e=>e.type==='monsterActivate').length,remaining:document.querySelectorAll('[data-layer-policy=foreground] [data-monster-kind=trigger]').length};
  },sample);
  assert.equal(check.maxTriggerActors,check.expectedEvents?1:0,label);assert.equal(check.remaining,0,label);
  checks.push({label,...check});console.log(label,check.maxTriggerActors);
  await fs.writeFile(out+'browser-report.json',JSON.stringify({origin:'http://127.0.0.1:5183',sha:'a5d44229c66d5d952021be9d75ad596fe5c35a06',checks,errors,boundary:'Local unchanged runtime controller and board. Real reducer states/events injected through cosmetic studio. Not an authenticated match or staging verification.'},null,2)+'\n');
 }
 for(const sample of fixtures.filter(c=>c.label.startsWith('aura:'))){
  const result=await page.evaluate(async sample=>{await atelier.controller.view.render(sample.before);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const m=sample.before.players[0].field[0],source=document.querySelector(`.zone-mon [data-uid="${m.uid}"]`);return {aura:source?.dataset.monsterAura,clones:[...document.querySelectorAll('.duet-card')].filter(n=>n.dataset.monsterAura===m.aura).map(n=>({kind:n.dataset.monsterKind,filter:n.style.filter}))};},sample);
  assert.equal(result.aura,sample.before.players[0].field[0].aura);assert(result.clones.some(c=>c.filter.includes('drop-shadow')),sample.label);checks.push({label:sample.label,...result});
 }
 await fs.writeFile(out+'browser-report.json',JSON.stringify({origin:'http://127.0.0.1:5183',sha:'a5d44229c66d5d952021be9d75ad596fe5c35a06',checks,errors,boundary:'Local unchanged runtime controller and board. Real reducer states/events injected through cosmetic studio. Not an authenticated match or staging verification.'},null,2)+'\n');
 assert.deepEqual(errors,[]);
} finally {await browser.close();}
