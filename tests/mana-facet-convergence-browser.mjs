import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-opening-tools/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5227',out='docs/vfx-prototypes/2026-09-29-mana-facet-convergence';
await fs.mkdir(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/WebGL|THREE|shader|GL_INVALID/.test(m.text()))errors.push(m.text());});
const seek=async t=>{await page.locator('#time').fill(String(Math.round(t)));await page.locator('#time').dispatchEvent('input');};
const advance=async t=>{await page.clock.fastForward(t);await page.clock.runFor(32);};
const resource=()=>page.locator('.pt-mana').evaluateAll(es=>es.map(e=>({phase:e.dataset.gainPhase,from:Number(e.dataset.gainFromMax),maximum:Number(e.dataset.maximum),display:Number(e.querySelector('.pt-mana-max').textContent.slice(1)),forming:Number(e.dataset.formingCrystals),progress:Number(e.dataset.formationProgress),ready:Number(e.dataset.crystalsReady),spent:Number(e.dataset.crystalsSpent)})));
try{
 await page.goto(origin+'/mana-lab.html?formation=facet-flow');await page.waitForSelector('#stage[data-ready=true]',{timeout:90000});
 const specs=await page.evaluate(async()=>{const m=await import('/src/dev/manaFacetVariants.ts');return m.FACET_VARIANTS.map(v=>({...v,...m.facetTiming(v.id)}));});
 assert.equal(specs.length,5);assert.equal(new Set(specs.map(v=>v.duration)).size,5);
 const mathematical=await page.evaluate(async()=>{const m=await import('/src/dev/manaFacetVariants.ts');return m.FACET_VARIANTS.map(v=>{let previous=Infinity,monotonic=true,bounded=true;const timing=m.facetTiming(v.id);for(let t=0;t<=timing.duration;t+=5){const p=m.facetConvergencePose(v.id,t);if(p.scale>previous+1e-8)monotonic=false;if(p.scale<1||p.scale>v.peak)bounded=false;previous=p.scale;}const end=m.facetConvergencePose(v.id,timing.impact,29,30);return {id:v.id,monotonic,bounded,end};});});
 for(const x of mathematical){assert(x.monotonic&&x.bounded);assert.equal(x.end.scale,1);assert.equal(x.end.lift,0);assert.equal(x.end.spread,0);assert.equal(x.end.contraction,1);}
 for(const s of specs){await page.locator(`button[data-variant=${s.id}]`).click();assert.equal(Number(await page.locator('#time').getAttribute('max')),s.duration);
  await seek(s.gather+s.hold*.5);assert.equal(Number(await page.locator('#stage').getAttribute('data-effect-scale')),s.peak);await page.locator('#stage').screenshot({path:`${out}/${s.id}-expanded.png`});
  await seek(s.gather+s.hold+s.contract*.7);const scale=Number(await page.locator('#stage').getAttribute('data-effect-scale'));assert(scale>1&&scale<s.peak);await page.locator('#stage').screenshot({path:`${out}/${s.id}-contracting.png`});const first=await page.locator('#physical').screenshot();await seek(s.duration);await seek(s.gather+s.hold+s.contract*.7);assert(first.equals(await page.locator('#physical').screenshot()),s.id+' deterministic');
  await seek(s.duration);assert.equal(Number(await page.locator('#stage').getAttribute('data-effect-scale')),1);await page.locator('#physical').screenshot({path:`${out}/${s.id}-final.png`});checks.push({id:s.id,peak:s.peak,duration:s.duration,impact:s.impact});
 }
 await page.locator('button[data-variant=facets]').click();await seek(2200);await page.locator('#physical').screenshot({path:out+'/reference-final.png'});
 await page.locator('button[data-variant=facet-grand]').click();await seek(1150);await page.screenshot({path:out+'/gallery.png',fullPage:true});await page.locator('#surface').click();await page.screenshot({path:out+'/gallery-dark.png',fullPage:true});await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:out+'/gallery-mobile.png',fullPage:true});
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelector('#stage').dataset.effectScale==='1');assert.equal(Number(await page.locator('#stage').getAttribute('data-effect-scale')),1);await page.emulateMedia({reducedMotion:'no-preference'});
 console.log('Gallery and deformation checks passed');await page.setViewportSize({width:1280,height:720});await page.clock.install();await page.goto(origin+'/duel-lab.html?polish&mana=facet-flow');await page.waitForSelector('[data-scene-ready=true]',{timeout:90000});await page.waitForTimeout(700);await page.clock.pauseAt(await page.evaluate(()=>Date.now()+30000));
 for(const viewport of [{width:1280,height:720},{width:390,height:844},{width:844,height:390},{width:1920,height:1080}]){
  await page.setViewportSize(viewport);await advance(80);
  for(const s of specs){await page.getByLabel('マナ演出パターン').selectOption(s.id);await page.getByRole('button',{name:'同時再生',exact:true}).click();await advance(160); // Resolve the fixture's reset before measuring event age.
   await advance(s.gather*.55);for(const r of await resource()){assert.equal(r.forming,2);assert.equal(r.display,r.from);assert(r.progress<1);}
   if(s.id==='facet-grand'||viewport.width===1280)await page.screenshot({path:`${out}/board-${viewport.width}-${s.id}.png`});
   await advance(s.duration);for(const r of await resource()){assert.equal(r.forming,0);assert.equal(r.display,r.maximum);assert.equal(r.ready+r.spent,r.maximum);}
  }
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));console.log('Board',viewport.width,'passed');
 }
 await page.getByRole('button',{name:'自分で再生',exact:true}).click();await advance(500);await page.getByRole('button',{name:'停止',exact:true}).click();await advance(50);assert((await resource()).every(r=>r.forming===0));
 await page.getByRole('button',{name:'同時再生',exact:true}).click();await advance(400);await page.getByLabel('マナ演出パターン').selectOption('facets');await advance(50);assert((await resource()).every(r=>r.forming===0));
 await page.getByRole('button',{name:'同時再生',exact:true}).click();await advance(160);await advance(1400);assert((await resource()).every(r=>r.phase==='bloom'));await advance(900);
 await page.getByLabel('マナ演出パターン').selectOption('facet-grand');await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'同時再生',exact:true}).click();await advance(200);assert((await resource()).every(r=>r.forming===0));assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/browser-report.json',JSON.stringify({checks,mathematical,errors,viewports:[1280,390,844,1920],passed:['size ranges','monotonic convergence without undershoot','final slot transform at every count including 30','deterministic seeks','both sides','row transitions','stop','reference switch','reduced motion']},null,2));console.log('PASS: five enlarged facet variants');
}finally{await browser.close();}
