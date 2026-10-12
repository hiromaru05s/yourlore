import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5268';
const out=process.env.LORE_TEST_OUTPUT||'docs/vfx-prototypes/2026-10-08-market-reroll/qa';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:out+'/video',size:{width:1280,height:720}}});
const page=await context.newPage();page.setDefaultTimeout(20000);
const errors=[],checks=[],geometry=[];page.on('pageerror',e=>errors.push(e.message));
const ready=async p=>{await p.goto(origin+'/market-reroll.html');await p.waitForFunction(()=>window.marketRerollPreview&&(document.querySelector('#app').dataset.sceneReady==='true'||document.querySelector('#app').dataset.tableState==='fallback'),null,{timeout:120000});await p.evaluate(()=>window.marketRerollPreview.queue);await p.waitForSelector('.fx-turnbanner',{state:'detached'});};
const settled=async()=>{await page.evaluate(()=>window.marketRerollPreview.queue);assert.equal(await page.locator('.market-refresh-layer').count(),0);assert.equal(await page.locator('#supplyMarket').evaluate(e=>e.inert),false);assert(await page.locator('#supplyMarket>.card').evaluateAll(cards=>cards.every(e=>getComputedStyle(e).visibility==='visible')));};
const reset=async(options={})=>{await settled();await page.evaluate(async options=>{const c=window.marketRerollPreview;c.reset(options.side||0);await c.queue;c.stopTimer();Object.assign(c.state.players[c.state.cur],options);c.view.render(c.state);},options);};
const refresh=async(interrupt='')=>{
 await page.evaluate(interrupt=>{
  window.nextRefresh=new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{observer.disconnect();reject(new Error('No refresh mounted'));},10000);
   const observer=new MutationObserver(async()=>{
    const layer=document.querySelector('.market-refresh-layer');if(!layer)return;
    observer.disconnect();clearTimeout(timer);
    const images=[...layer.querySelectorAll('.card-art-img')];
    const result={inert:document.querySelector('#supplyMarket').inert,rotates:[...layer.querySelectorAll('.market-refresh-body')].some(e=>e.style.transform.includes('rotate'))};
    if(interrupt==='again')window.marketRerollPreview.onRefresh();
    if(interrupt==='resize')window.dispatchEvent(new Event('resize'));
    if(interrupt==='visibility')document.dispatchEvent(new Event('visibilitychange'));
    if(interrupt==='destroy')window.marketRerollPreview.destroy();
    await Promise.all(images.map(img=>img.decode()));
    result.artReady=images.length>0&&images.every(e=>e.complete&&e.naturalWidth>0);
    resolve(result);
   });observer.observe(document.querySelector('#app'),{childList:true,subtree:true});
  });
 },interrupt);
 await page.locator('#refreshBtn').click();return page.evaluate(()=>window.nextRefresh);
};
try{
 await ready(page);
 await page.evaluate(()=>window.marketRerollPreview.stopTimer());
 const before=await page.evaluate(()=>{const c=window.marketRerollPreview;return {fixed:c.state.market.map(c=>c.uid),mana:c.state.players[0].mana};});
 await page.screenshot({path:out+'/board-before.png'});
 const first=await refresh();assert(first.inert);assert(first.artReady);
 await page.screenshot({path:out+'/board-lift.png'});
 await settled();
 assert.deepEqual(await page.evaluate(()=>window.marketRerollPreview.state.market.map(c=>c.uid)),before.fixed);
 assert.equal(await page.evaluate(()=>window.marketRerollPreview.state.players[0].mana),before.mana-1);
 checks.push('Real reroll button: one mana, fixed offers unchanged, complete reveal and input restoration');
 for(let i=0;i<3;i++){await refresh();await settled();await page.waitForTimeout(250);}
 checks.push('Three normal-speed consecutive refreshes on the real board');
 await reset({mana:0,refreshTokens:1});await refresh();await settled();
 assert.equal(await page.evaluate(()=>window.marketRerollPreview.state.players[0].refreshTokens),0);
 assert.equal(await page.evaluate(()=>window.marketRerollPreview.state.players[0].mana),0);
 checks.push('Free token refresh animates without spending mana');
 await page.evaluate(()=>window.marketRerollPreview.onRefresh());await settled();
 await reset({refreshBlockTurn:true});await page.evaluate(()=>window.marketRerollPreview.onRefresh());await settled();
 checks.push('Insufficient mana and blocked refresh leave no animation');
 await reset();await page.evaluate(()=>{const c=window.marketRerollPreview;c.state.players[0].supply[1]=null;c.view.render(c.state);});await refresh();await settled();
 await reset({supplyShrink:1});await refresh();await settled();assert.equal(await page.locator('#supplyMarket>.card').count(),2);
 checks.push('Purchased empty slot and shortened two-card supply animate correctly');
 await reset();await refresh('again');await settled();
 assert.equal(await page.evaluate(()=>window.marketRerollPreview.state.players[0].mana),18);
 checks.push('Repeated input fast-forwards and spends exactly once per accepted refresh');
 await reset({side:1});await page.evaluate(async()=>{const c=window.marketRerollPreview;const {reduce}=await import('/src/shared/engine.ts');c.applyResult(reduce(c.state,{type:'refresh'}));});await page.waitForSelector('.market-refresh-layer');await settled();
 checks.push('Opponent public refresh uses the shared controller path');
 const exclusions=await page.evaluate(async()=>{
  const {supplyWasRefreshed}=await import('/src/ui/marketRefresh.ts');const {reduce}=await import('/src/shared/engine.ts');const c=window.marketRerollPreview;const g=structuredClone(c.state);g.cur=0;g.players[0].mana=30;
  const purchase=reduce(g,{type:'buySupply',i:0}).state;const nextTurn=structuredClone(g);nextTurn.turn++;nextTurn.cur=1;
  return [supplyWasRefreshed(g,g),supplyWasRefreshed(g,purchase),supplyWasRefreshed(g,nextTurn)];
 });assert.deepEqual(exclusions,[false,false,false]);checks.push('Purchase, unchanged state and turn change are excluded');
 await reset();
 const stale=await page.evaluate(async()=>{const c=window.marketRerollPreview;const {reduce}=await import('/src/shared/engine.ts');c.state=reduce(c.state,{type:'refresh'}).state;const before=JSON.stringify(c.state.players[0]);c.onBuySupply(0);return before===JSON.stringify(c.state.players[0]);});
 assert(stale);checks.push('Old visible offer cannot buy a newly rolled card while artwork or playback is pending');
 for(const [width,height] of [[1920,1080],[1280,720],[390,844]]){
  await page.setViewportSize({width,height});await reset();await page.waitForTimeout(150);
  await page.locator('[data-action=slow]').click();await page.waitForSelector('.market-refresh-layer');await page.waitForTimeout(950);
  const g=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,tiles:[...document.querySelectorAll('.market-refresh-tile')].map(e=>{const r=e.getBoundingClientRect();return {x:r.x,right:r.right,y:r.y,bottom:r.bottom};}),uids:[...document.querySelectorAll('.market-refresh-layer [data-uid]')].length}));
  assert.equal(g.scroll,width);assert(g.tiles.every(r=>r.x>=0&&r.right<=width&&r.y>=0&&r.bottom<=height));assert.equal(g.uids,0);geometry.push(g);
  await page.screenshot({path:`${out}/turning-${width}.png`});await page.waitForSelector('.market-refresh-layer',{state:'detached'});
 }
 checks.push('1920, 1280 and 390px: projected cards stay inside viewport, no duplicate interaction UIDs');
 await page.locator('[data-action=theme]').click();await refresh();await page.screenshot({path:out+'/white-mobile.png'});await settled();
 await page.setViewportSize({width:1280,height:720});await page.waitForTimeout(250);await reset();await refresh('resize');await settled();checks.push('Resize mid-flight restores all offers');
 await page.emulateMedia({reducedMotion:'reduce'});await reset();assert.equal((await refresh()).rotates,false);await settled();checks.push('Reduced motion: short crossfade without rotation');
 await page.emulateMedia({reducedMotion:'no-preference'});await reset();await refresh('visibility');await settled();checks.push('Visibility change releases the effect');
 await reset();await refresh('destroy');assert.equal(await page.locator('.market-refresh-layer').count(),0);checks.push('Teardown mid-flight removes layers');
 const fallback=await browser.newPage({viewport:{width:390,height:844}});fallback.on('pageerror',e=>errors.push(e.message));await fallback.addInitScript(()=>{window.WebGL2RenderingContext=undefined;});await ready(fallback);await fallback.locator('#refreshBtn').click();await fallback.waitForSelector('.market-refresh-layer');await fallback.evaluate(()=>window.marketRerollPreview.queue);assert.equal(await fallback.locator('.market-refresh-layer').count(),0);await fallback.close();checks.push('No-WebGL board retains the same DOM refresh and cleanup');
 assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/report.json',JSON.stringify({origin,checks,geometry,errors},null,2)+'\n');console.log(JSON.stringify({checks,errors},null,2));
}catch(error){await page.screenshot({path:out+'/failure.png'});throw error;}
finally{await context.close();await browser.close();}
