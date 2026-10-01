import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-opening-tools/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5227';
const out=process.env.LORE_TEST_OUTPUT||'docs/vfx-prototypes/2026-09-27-mana-refined';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
const variants=['refraction','flow','stardust','resonance','aurora'];
const resource=async()=>page.locator('[data-gain-phase]').evaluateAll(nodes=>nodes.map(e=>({phase:e.dataset.gainPhase,max:Number(e.querySelector('.pt-mana-max').textContent.slice(1)),current:Number(e.querySelector('.mana-readout b').textContent),from:Number(e.dataset.gainFromMax),to:Number(e.dataset.maximum),ready:Number(e.dataset.crystalsReady),spent:Number(e.dataset.crystalsSpent)})));
try{
 await page.goto(origin+'/mana-lab.html');await page.locator('canvas').first().waitFor();
 assert.equal(await page.locator('canvas').count(),6);
 await page.locator('#time').fill('740');assert.equal(await page.locator('#play').textContent(),'再生');
 await page.screenshot({path:out+'/gallery.png',fullPage:true});
 await page.locator('#surface').click();await page.screenshot({path:out+'/gallery-dark.png',fullPage:true});
 // Pure renderer: clear at boundaries, deterministic seeks, five visibly distinct frames.
 const renderChecks=await page.evaluate(async()=>{
  const {drawRichManaGain,MANA_VARIANTS}=await import('/src/dev/manaGainVariants.ts');
  const c=document.createElement('canvas');c.width=400;c.height=300;const ctx=c.getContext('2d'),rect={left:70,top:150,width:250,height:42};
  const checks=[];
  for(const v of MANA_VARIANTS){
   const draw=age=>{ctx.clearRect(0,0,400,300);drawRichManaGain(ctx,rect,age,v.id);return c.toDataURL();};
   const blank=draw(0);const frames=[.2,.4,.52,.74,1.1].map(draw);
   checks.push({id:v.id,boundary:draw(1.5)===blank,deterministic:draw(.74)===frames[3],visible:frames.every(f=>f!==blank),signature:frames[3]});
  }
  return checks;
 });
 for(const r of renderChecks){assert(r.boundary&&r.deterministic&&r.visible,r.id);}assert.equal(new Set(renderChecks.map(r=>r.signature)).size,5);
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:out+'/gallery-mobile.png',fullPage:true});
 await page.setViewportSize({width:1280,height:720});
 await page.clock.install();
 await page.goto(origin+'/duel-lab.html?polish&mana=refraction');await page.waitForSelector('[data-scene-ready="true"]');await page.waitForTimeout(900);
 await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
 for(const variant of variants){
  await page.getByLabel('マナ演出パターン').selectOption(variant);
  await page.getByRole('button',{name:'同時再生',exact:true}).click();await page.clock.runFor(280);
  const before=await resource();assert.equal(before.length,2);for(const r of before){assert.equal(r.phase,'gather');assert.equal(r.max,r.from);assert.equal(r.ready+r.spent,r.from);}
  await page.screenshot({path:out+'/'+variant+'-gather.png'});
  await page.clock.runFor(440);const after=await resource();assert.equal(after.length,2);for(const r of after){assert.equal(r.phase,'bloom');assert.equal(r.max,r.to);assert.equal(r.ready+r.spent,r.to);assert.equal(r.current,r.ready);}
  await page.screenshot({path:out+'/'+variant+'-impact.png'});await page.clock.runFor(900);assert.equal(await page.locator('[data-gain-phase],.mana-gain-label').count(),0);
  results.push({variant,before,after});
 }
 for(const [width,height] of [[390,844],[844,390],[1920,1080]]){
  await page.setViewportSize({width,height});await page.clock.runFor(150);
  for(const v of variants){await page.getByLabel('マナ演出パターン').selectOption(v);await page.getByRole('button',{name:'同時再生',exact:true}).click();await page.clock.runFor(760);assert.equal((await resource()).length,2);if(v==='flow')await page.screenshot({path:out+'/board-'+width+'.png'});await page.clock.runFor(950);}
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow '+width);
 }
 await page.getByRole('button',{name:'自分で再生',exact:true}).click();await page.clock.runFor(180);await page.getByRole('button',{name:'停止',exact:true}).click();assert.equal(await page.locator('[data-gain-phase],.mana-gain-label').count(),0);
 await page.clock.runFor(40);assert.equal(await page.locator('.biblion-fx:not([hidden])').count(),0);
 await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'同時再生',exact:true}).click();await page.clock.runFor(160);assert.equal(await page.locator('[data-gain-phase],.mana-gain-label').count(),0);
 await page.emulateMedia({reducedMotion:'no-preference'});await page.getByRole('button',{name:'自分で再生',exact:true}).click();await page.clock.runFor(250);await page.getByLabel('マナ演出パターン').selectOption('original');await page.clock.runFor(30);assert.equal(await page.locator('[data-gain-phase]').count(),0);
 assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/browser-report.json',JSON.stringify({origin,variants,viewports:[1280,390,844,1920],results,renderChecks:renderChecks.map(({signature,...r})=>r),errors,checks:['five deterministic distinct renderers','single 520ms impact','player/opponent simultaneous gains','real jewel and readout synchronization','row transitions','four viewports','stop','selection interruption','reduced motion','gallery seek and backgrounds']},null,2)+'\n');
 console.log('PASS: five effects, both sides, synchronized jewels/readouts, four viewports, seek/stop/reduced motion');
}finally{await browser.close();}
