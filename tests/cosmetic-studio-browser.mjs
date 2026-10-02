/** Local visual integration check. Start Vite, then set STUDIO_ORIGIN and
 * PLAYWRIGHT_MODULE if Playwright is not installed in this checkout. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const origin=process.env.STUDIO_ORIGIN??'http://127.0.0.1:5336';
const out=process.env.STUDIO_QA_OUT??'/tmp/lore-atelier-qa';await fs.mkdir(out,{recursive:true});
const sets=['nocturne','porcelain','garnet','verdigris','amber','tidal','silverflow','emberheart'];
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[],rows=[],metrics=[];let page;
function observe(p){p.on('pageerror',e=>errors.push(e.message));p.on('console',e=>{if(e.type()==='error')errors.push(e.text())});p.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});}
const apply=async(p,state)=>{await p.evaluate(s=>window.atelier.apply({...window.atelier.state(),...s}),state);await p.waitForTimeout(450);};
try{
 page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});observe(page);
 await page.goto(origin+'/cosmetic-studio.html?board=1&polish=1');await page.waitForSelector('[data-scene-ready=true]',{timeout:90000});
 await apply(page,{set:'default'});
 const rects=()=>page.locator('.pile--deck,.pile--shelf').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height]}));const baseline=await rects();
 for(const set of sets)for(const side of ['self','opponent']){
  await apply(page,{set,side,count:8,dense:false,motion:false,time:2});
  const state=await page.evaluate(()=>({info:atelier.info(),sleeves:atelier.controller.state.sleeves,piles:[...document.querySelectorAll('.pile--deck,.pile--shelf')].map(p=>({id:p.id,material:p.dataset.atelierMaterial,sleeve:p.dataset.sleeve}))}));
  assert.deepEqual(state.sleeves,side==='self'?[set,'default']:['default',set]);assert.equal(state.piles.length,4);
  for(const pile of state.piles)assert.equal(pile.material,pile.id.startsWith(side==='self'?'pile-my':'pile-opp')?set:'default');
  assert.deepEqual(await rects(),baseline,'equipping cosmetics must preserve board geometry');assert.equal(state.info.textures,6);assert.equal(state.info.surfaces,sets.indexOf(set)>5?5:0);
  await page.screenshot({path:path.join(out,`${set}-${side}.jpg`),type:'jpeg',quality:91});rows.push({set,side,...state});console.log('PASS',set,side);
 }
 for(const count of [0,1,12,40]){await apply(page,{set:'porcelain',side:'both',count,dense:true});assert.equal(await page.locator('.pile--deck').first().getAttribute('data-count'),String(count));await page.screenshot({path:path.join(out,`pile-${count}-dense.jpg`),type:'jpeg',quality:90});}
 for(const set of sets.slice(6)){
  await apply(page,{set,side:'both',count:8,dense:false,motion:true});await page.waitForTimeout(11000);
  const perf=await page.evaluate(()=>JSON.parse(document.getElementById('app').dataset.scenePerf));assert.equal(perf.fullPasses,0,'steady animation must not redraw the board');assert(perf.ticks>40);metrics.push({set,...perf});
  const before=await page.evaluate(()=>atelier.info().phase);await apply(page,{motion:false});const paused=await page.evaluate(()=>atelier.info().phase);assert(paused>=before,'pause must not reset phase');await page.waitForTimeout(450);assert.equal(await page.evaluate(()=>atelier.info().phase),paused);
  for(const side of ['self','opponent'])for(const time of [0,2,4]){await apply(page,{side,motion:false,time});await page.screenshot({path:path.join(out,`${set}-${side}-phase${time}.png`)});}
  await page.emulateMedia({reducedMotion:'reduce'});await apply(page,{side:'both',motion:true});assert.equal(await page.evaluate(()=>atelier.info().motion),false);const phase=await page.evaluate(()=>atelier.info().phase);await page.waitForTimeout(450);assert.equal(await page.evaluate(()=>atelier.info().phase),phase);await page.emulateMedia({reducedMotion:'no-preference'});
 }
 await page.evaluate(async()=>{await Promise.all(['amber','tidal','garnet','nocturne'].map(set=>atelier.apply({...atelier.state(),set})));});await page.waitForTimeout(700);assert.equal(await page.evaluate(()=>atelier.info().theme),'nocturne');assert.equal(await page.evaluate(()=>atelier.info().textures),6);
 await apply(page,{set:'default',side:'both'});assert.equal(await page.evaluate(()=>atelier.info().textures),0);assert.equal(await page.evaluate(()=>atelier.info().surfaces),0);
 await page.goto(origin+'/cosmetic-studio.html');let frame=await(await page.waitForSelector('#board')).contentFrame();await frame.waitForSelector('[data-scene-ready=true]',{timeout:90000});await page.waitForTimeout(1000);
 await page.locator('[data-set=emberheart]').click();await page.locator('[data-side=opponent]').click();await frame.waitForFunction(()=>atelier.info().theme==='emberheart'&&atelier.info().wearer==='opponent');
 await page.locator('#art-open').click();assert.equal(await page.locator('dialog[open]').count(),1);await page.keyboard.press('Escape');assert.equal(await page.locator('dialog[open]').count(),0);
 await page.locator('#inspect').click();frame=await(await page.waitForSelector('#board')).contentFrame();await frame.waitForSelector('[data-ready=true]',{timeout:90000});assert.equal(await page.locator('#count').isDisabled(),true);
 for(const set of sets){await page.locator(`[data-set=${set}]`).click();await frame.waitForFunction(set=>atelier.info().theme===set,set);await page.waitForTimeout(350);await frame.locator('body').screenshot({path:path.join(out,`${set}-furniture.jpg`),type:'jpeg',quality:94});}
 await page.locator('#inspect').click();frame=await(await page.waitForSelector('#board')).contentFrame();await frame.waitForSelector('[data-scene-ready=true]',{timeout:90000});
 for(const [width,height]of [[1920,1080],[1280,720],[390,844],[844,390]]){await page.setViewportSize({width,height});await page.waitForTimeout(700);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`overflow ${width}`);await page.screenshot({path:path.join(out,`studio-${width}x${height}.jpg`),type:'jpeg',quality:90,fullPage:true});}
 assert.deepEqual(errors,[]);console.log('PASS geometry, pause, reduced motion, rapid selection, inspector, responsive, no errors');
 await fs.writeFile(path.join(out,'results.json'),JSON.stringify({rows,metrics,errors},null,2));
}finally{await browser.close();if(errors.length)console.error(errors);}
