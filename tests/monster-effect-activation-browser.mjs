// Generate fixtures with LORE_EFFECT_REPORT=<dir> node tests/monster-effect-activation.mjs.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const origin=process.env.LORE_EFFECT_ORIGIN??'http://127.0.0.1:5183';
const out=process.env.LORE_EFFECT_REPORT??'/tmp/lore-effect-fix';
const fixtures=JSON.parse(await fs.readFile(out+'/fixtures.json'));
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage();page.setDefaultTimeout(90000);
const checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
const labels=['half:0:none','half:1:own','upkeep:0:NHEX:false','upkeep:1:MANA_GIANT:false','upkeep:0:NHEX:true','summon:0:GUNNER','end:0:GUNNER','sources:0:HEXER3','sources:1:GM5_2','sources:0:PRIEST','reaction:0:GM6_8','reaction:1:CHOSEN_MAGE','reaction:0:WORLD_TREE','declined-world-tree','post-attack-source-died'];
try {
 await page.goto(origin+'/cosmetic-studio.html?board=1&runtime=1&set=default');await page.waitForFunction(()=>window.atelier&&document.querySelector('[data-scene-ready=true]'));
 for(const width of [1280,390]){
  await page.setViewportSize({width,height:width===390?844:900});
  for(const label of labels){
   const sample=fixtures.find(c=>c.label===label);assert(sample,label);
   const result=await page.evaluate(async sample=>{
    const c=atelier.controller;c.show(sample.before);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const seen=new WeakSet(),names=[];let running=true,max=0;
    const tick=()=>{const nodes=[...document.querySelectorAll('[data-layer-policy=foreground] [data-monster-kind=trigger]')];max=Math.max(max,nodes.length);for(const n of nodes)if(!seen.has(n)){seen.add(n);names.push(n.querySelector('.card-name')?.textContent);}if(running)requestAnimationFrame(tick);};requestAnimationFrame(tick);
    c.applyResult(sample.result);await c.queue;running=false;
    const cards=[...sample.before.players.flatMap(p=>[...p.field,...p.hand]),...sample.result.state.players.flatMap(p=>[...p.field,...p.discard,...p.removed??[]])];
    const expectedNames=sample.result.events.filter(e=>e.type==='monsterActivate').map(e=>cards.find(c=>c.uid===e.uid)?.nameJa).filter(Boolean);
    return {names,expectedNames,max,remaining:document.querySelectorAll('[data-layer-policy=foreground] [data-monster-kind=trigger]').length};
   },sample);
   assert.deepEqual(result.names.sort(),result.expectedNames.sort(),label);assert.equal(result.remaining,0,label);
   if(label==='sources:0:HEXER3'||label==='sources:1:GM5_2')assert.equal(result.max,2,'simultaneous source cards');
   checks.push({label,width,...result});console.log('PASS',width,label,result.names.length);
   await fs.writeFile(out+'/browser-progress.json',JSON.stringify({origin,checks,errors},null,2));
  }
  for(const sample of fixtures.filter(c=>c.label.startsWith('ongoing:'))){
   const result=await page.evaluate(async sample=>{await atelier.controller.view.render(sample.before);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const source=document.querySelector(`.zone-mon [data-uid="${sample.sourceUid}"]`);return {active:!!source?.dataset.monsterAura};},sample);
   assert.equal(result.active,sample.ongoing,sample.label);checks.push({label:sample.label,width,...result});
  }
  await page.screenshot({path:out+'/ongoing-'+width+'.png'});
 }
 assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/browser-report.json',JSON.stringify({origin,checks,errors,boundary:'Actual runtime controller and board; generated real reducer states/events. Not an authenticated online match. Existing VFX artwork retained.'},null,2));
} finally {await browser.close();}
