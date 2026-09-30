import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5197';
const out=process.env.LORE_TEST_OUTPUT||'docs/ui-rework/2026-09-27-duel-opening';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:out+'/recordings',size:{width:1280,height:720}}});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const seek=async(ms)=>{await page.evaluate(ms=>window.loreOpeningPreview.seek(ms),ms);await page.waitForFunction(ms=>Number(document.querySelector('.duel-opening')?.dataset.openingMs)===ms,ms);await page.waitForTimeout(100);};
try{
  await page.goto(origin+'/duel-lab.html?opening');await page.waitForSelector('[data-opening-ms="1100"]');
  const sizes=[];
  for(const [width,height] of [[1280,720],[1920,1080],[390,844],[844,390]]){
    await page.setViewportSize({width,height});await seek(1100);
    const bounds=await page.locator('.opening-player').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};}));
    for(const r of bounds){assert(r.left>=0&&r.right<=width+1);assert(r.top>=0&&r.bottom<=height+1);}
    sizes.push({width,height,bounds});await page.screenshot({style:'.opening-lab-controls{visibility:hidden!important}',path:`${out}/faceoff-${width}.png`});
    await seek(8500);await page.screenshot({style:'.opening-lab-controls{visibility:hidden!important}',path:`${out}/coin-${width}.png`});
    assert.equal(await page.locator('.opening-fallback-coin').evaluate(e=>getComputedStyle(e).display),'none','shared board coin is active');
  }
  await page.setViewportSize({width:1280,height:720});
  await page.evaluate(()=>window.loreOpeningPreview.first(true));
  await page.getByRole('button',{name:'再生',exact:true}).click();
  await page.waitForSelector('[data-opening-phase="deal"]');
  await page.screenshot({style:'.opening-lab-controls{visibility:hidden!important}',path:out+'/deal.png'});
  await page.waitForFunction(()=>!document.querySelector('.duel-opening'),undefined,{timeout:15000});
  assert.equal(await page.locator('.native-draw-layer').count(),0);
  assert.equal(await page.locator('#hand .card').count(),3);assert.equal(await page.locator('#oppHand .card--back').count(),3);
  assert.equal(await page.locator('.duel-intro-active').count(),0);
  await page.evaluate(()=>window.loreOpeningPreview.first(false));await seek(8700);
  assert.match(await page.locator('.opening-result strong').textContent(),/相手/);
  await page.screenshot({style:'.opening-lab-controls{visibility:hidden!important}',path:out+'/opponent-first.png'});
  await page.getByRole('button',{name:'再生',exact:true}).click();assert.equal(await page.locator('.opening-skip').count(),0);await page.keyboard.press('Escape');await page.keyboard.press('Space');await page.locator('.duel-opening').click({position:{x:8,y:8}});assert.equal(await page.locator('.duel-opening').count(),1);
  await page.waitForFunction(()=>!document.querySelector('.duel-opening'));
  await seek(6500);await page.evaluate(()=>window.loreOpeningPreview.cancel());await page.waitForFunction(()=>!document.querySelector('.duel-opening'));
  await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'再生',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.duel-opening'));
  await page.emulateMedia({reducedMotion:'no-preference'});
  // Actual controller: opening cannot be manually skipped; timer starts on natural completion.
  await page.goto(origin+'/duel-lab.html?live');await page.waitForSelector('.duel-opening');
  assert.equal(await page.locator('.game').evaluate(e=>e.inert),true);
  assert.equal(await page.locator('.opening-skip').count(),0);await page.keyboard.press('Escape');assert.equal(await page.locator('.duel-opening').count(),1);await page.waitForFunction(()=>!document.querySelector('.duel-opening'));
  assert.equal(await page.locator('.game').evaluate(e=>e.inert),false);
  assert(await page.locator('.mp-clock[data-remaining]').count()>0);
  assert.equal(await page.locator('.opening-hands').count(),0);
  // Exercise the client half of the two-phase protocol, including a skewed local clock.
  await page.route('**/opening-controller-fixture',r=>r.fulfill({contentType:'text/html',body:'<html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="app"></div></html>'}));
  await page.goto(origin+'/opening-controller-fixture');
  await page.evaluate(async()=>{
    for(const css of ['tokens','base','card','game-overlays','game','screens','reading-board','duel-opening'])await import('/src/styles/'+css+'.css');
    const {BaseController}=await import('/src/game/controller.ts');const E=await import('/src/shared/engine.ts');
    (await import('/src/i18n.ts')).setLang('ja');
    class Controller extends BaseController {prepared=0;submit(){} openingPrepared(){this.prepared++;} feed(state){this.applyResult({state,events:[]},false);} dispose(){this.destroy();}}
    const c=new Controller(document.getElementById('app'),0,{onHome(){},onRematch(){}});
    const stop=(await import('/src/ui/layout.ts')).startBoardLayout();
    const state=E.createGame({mode:'online',seed:12,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;
    state.turnTotalMs=90000;state.turnLeftMs=90000;state.opening={startsAt:null,playableAt:null,serverNow:Date.now()+500000};
    window.openingQA={c,state,stop};c.feed(state);
  });
  await page.waitForFunction(()=>window.openingQA.c.prepared>0);
  assert.equal(await page.locator('.game').evaluate(e=>e.inert),true);
  assert.equal(await page.locator('.mp-clock[data-remaining]').count(),0);
  await page.evaluate(()=>{const q=window.openingQA,s=structuredClone(q.state),now=Date.now()+500000;s.opening={startsAt:now+350,playableAt:now+10800,serverNow:now};q.c.feed(s);q.playableLocal=Date.now()+10800;});
  await page.waitForSelector('.duel-opening');assert.equal(await page.locator('.opening-skip').count(),0);await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  assert.equal(await page.locator('.game').evaluate(e=>e.inert),true,'online opening keeps the shared start gate');
  await page.waitForFunction(()=>!document.querySelector('.duel-opening'));
  const clock=await page.locator('.mp-clock[data-remaining]').first().getAttribute('data-remaining');
  assert(Number(clock)>=89&&Number(clock)<=90,'opening preserves full first turn');
  assert.equal(await page.locator('.game').evaluate(e=>e.inert),false);
  await page.evaluate(()=>{openingQA.c.dispose();openingQA.stop();});
  // WebGL unavailable: fallback and input cleanup remain usable.
  const fallback=await context.newPage();await fallback.addInitScript(()=>{window.WebGL2RenderingContext=undefined;});
  fallback.on('pageerror',e=>errors.push(e.message));await fallback.goto(origin+'/duel-lab.html?opening');await fallback.waitForSelector('.duel-opening');
  await fallback.evaluate(()=>window.loreOpeningPreview.seek(7850));await fallback.waitForFunction(()=>document.querySelector('.duel-opening')?.dataset.openingMs==='7850');
  assert.equal(await fallback.locator('.opening-fallback-coin').evaluate(e=>getComputedStyle(e).display),'block');
  await fallback.evaluate(()=>window.loreOpeningPreview.cancel());await fallback.waitForFunction(()=>!document.querySelector('.duel-opening'));await fallback.close();
  assert.deepEqual(errors,[]);
  await fs.writeFile(out+'/browser-report.json',JSON.stringify({sizes,errors,checks:['desktop/mobile portrait bounds','shared-camera coin','both first-player results','3-card delivery','no skip button or keyboard/click bypass; abort cleanup','reduced motion','real controller unlock and timer','online preparation and natural completion gate','500-second client/server clock offset','WebGL fallback']},null,2));
  console.log('PASS: opening browser, four viewports, replay, both sides, unskippable opening/abort, reduced motion, local/online clocks, clock skew, WebGL fallback');
}finally{await context.close();await browser.close();}
