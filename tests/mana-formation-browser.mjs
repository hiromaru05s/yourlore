import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-opening-tools/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5227';
const out='docs/vfx-prototypes/2026-09-29-mana-formation';await fs.mkdir(out,{recursive:true});
const variants=['condense','facets','helix','liquid','lattice'];
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[],results=[],failedRequests=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/THREE|WebGL|shader|GL_INVALID/.test(m.text()))errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)failedRequests.push({url:r.url(),status:r.status()});});
const advance=async n=>{await page.clock.fastForward(n);await page.clock.runFor(32);};
const seek=async n=>{await page.locator('#time').fill(String(n));await page.locator('#time').dispatchEvent('input');};
const resource=()=>page.locator('.pt-mana').evaluateAll(es=>es.map(e=>({phase:e.dataset.gainPhase,max:Number(e.querySelector('.pt-mana-max').textContent.slice(1)),current:Number(e.querySelector('.mana-readout b').textContent),from:Number(e.dataset.gainFromMax),to:Number(e.dataset.maximum),ready:Number(e.dataset.crystalsReady),spent:Number(e.dataset.crystalsSpent),forming:Number(e.dataset.formingCrystals),progress:Number(e.dataset.formationProgress)})));
try{
 if(!process.env.LORE_BOARD_ONLY){await page.goto(origin+'/mana-lab.html');await page.waitForSelector('#stage[data-ready=true]');
 assert.equal(await page.locator('button[data-variant]').count(),6);
 for(const id of variants){await page.locator(`button[data-variant=${id}]`).click();for(const t of [280,720,1100,1900]){await seek(t);await page.locator('#stage').screenshot({path:`${out}/${id}-${t}.png`});}
  await seek(720);const first=await page.locator('#physical').screenshot();await seek(1100);await seek(720);const repeat=await page.locator('#physical').screenshot();assert(first.equals(repeat),`${id} seek deterministic`);
  await seek(2200);await page.locator('#physical').screenshot({path:`${out}/${id}-settled.png`});
 }
 await page.locator('button[data-variant=original]').click();await page.locator('#zoom').click();await seek(2200);await page.locator('#physical').screenshot({path:out+'/native-settled.png'});
 await page.locator('button[data-variant=condense]').click();await seek(720);await page.screenshot({path:out+'/gallery.png',fullPage:true});await page.locator('#surface').click();await page.screenshot({path:out+'/gallery-dark.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:out+'/gallery-mobile.png',fullPage:true});
 await page.emulateMedia({reducedMotion:'reduce'});await seek(720);assert.equal(await page.locator('#stage').getAttribute('data-age'),'2200');await page.emulateMedia({reducedMotion:'no-preference'});
 console.log('Gallery verified');}await page.setViewportSize({width:1280,height:720});await page.clock.install();
 await page.goto(origin+'/duel-lab.html?polish&mana=condense');await page.waitForSelector('[data-scene-ready=true]');await page.waitForTimeout(900);await page.clock.pauseAt(await page.evaluate(()=>Date.now()+30000));
 for(const variant of variants){console.log('Board variant',variant);await page.getByLabel('マナ演出パターン').selectOption(variant);await page.getByRole('button',{name:'同時再生',exact:true}).click();await advance(280);
  const before=await resource();for(const r of before){assert.equal(r.phase,'gather');assert.equal(r.max,r.from);assert.equal(r.forming,r.to-r.from);assert.equal(r.ready+r.spent,r.from);}
  await page.screenshot({path:out+`/board-${variant}-280.png`});await advance(440);const during=await resource();for(const r of during){assert(r.progress>0&&r.progress<1);assert.equal(r.max,r.from);}
  await page.screenshot({path:out+`/board-${variant}-720.png`});await advance(730);const after=await resource();for(const r of after){assert.equal(r.phase,'bloom');assert.equal(r.progress,1);assert.equal(r.max,r.to);assert.equal(r.ready+r.spent,r.to);assert.equal(r.current,r.ready);}
  await advance(850);for(const r of await resource()){assert.equal(r.forming,0);assert.equal(r.max,r.to);assert.equal(r.phase,undefined);}results.push({variant,before,during,after});
 }
 for(const [width,height] of [[390,844],[844,390],[1920,1080]]){await page.setViewportSize({width,height});await advance(100);for(const variant of variants){console.log('Board variant',variant);await page.getByLabel('マナ演出パターン').selectOption(variant);await page.getByRole('button',{name:'同時再生',exact:true}).click();await advance(760);assert((await resource()).every(r=>r.forming===2));if(variant==='condense')await page.screenshot({path:out+`/board-${width}.png`});await advance(1660);}assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'board overflow '+width);}
 await page.getByRole('button',{name:'自分で再生',exact:true}).click();await advance(300);await page.getByRole('button',{name:'停止',exact:true}).click();await advance(50);assert.equal(await page.locator('[data-gain-phase],.mana-gain-label').count(),0);assert((await resource()).every(r=>r.forming===0));
 await page.getByRole('button',{name:'同時再生',exact:true}).click();await advance(400);await page.getByLabel('マナ演出パターン').selectOption('original');await advance(50);assert((await resource()).every(r=>r.forming===0));
 await page.getByRole('button',{name:'同時再生',exact:true}).click();await advance(160);await advance(720);assert((await resource()).every(r=>r.forming===0&&r.phase==='bloom'),JSON.stringify(await resource()));await advance(900);
 await page.getByLabel('マナ演出パターン').selectOption('condense');await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'同時再生',exact:true}).click();await advance(200);assert.equal(await page.locator('[data-gain-phase],.mana-gain-label').count(),0);assert((await resource()).every(r=>r.forming===0));
 assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/browser-report.json',JSON.stringify({origin,variants,viewports:[[1280,720],[390,844],[844,390],[1920,1080]],results,errors,failedRequests,checks:['deterministic geometry and particle seek','actual GLB final geometry comparison screenshots','both sides, per-slot formation','count/readout at 1280 ms','8-to-10, 10-to-12 and 20-to-22 layout transitions','four board viewports','cancellation disposes formation','switching to original restores instances','original timing unchanged','reduced motion']},null,2));console.log('PASS mana formation: five variants, four sizes, both sides, deterministic seeking and cleanup');
}finally{await browser.close();}
