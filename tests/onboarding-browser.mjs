// Real rendered controls + real Worker handlers against an isolated SQLite fixture.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createServer} from 'vite';
import {onboardingFixture} from './fixtures/onboardingEnv.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const f=await onboardingFixture();const out=process.env.ONBOARDING_QA_DIR||'docs/qa/2026-10-30-onboarding';await fs.mkdir(out,{recursive:true});
const server=await createServer({root:'client',configFile:'client/vite.config.ts',logLevel:'error',server:{host:'127.0.0.1',port:0,strictPort:false,hmr:false}});await server.listen();
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const [index,width] of (process.env.ONBOARDING_WIDTHS||'1280,1024').split(',').map(Number).entries()){
  const uid='browser-'+width;f.addUser(uid);f.db.prepare('UPDATE users SET username_set=1 WHERE id=?').run(uid);
  if(index>0||process.env.ONBOARDING_SKIP_BASICS==='1')await f.call('/onboarding/basics',{actions:f.actions},uid);
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[],apiErrors=[];let singleStarted=false;
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{localStorage.setItem('lore_lang','ja');localStorage.setItem('lore_help_callout_seen',new Date().toISOString().slice(0,10));});
  await page.route('**/api/**',async route=>{
   const req=route.request(),u=new URL(req.url()),path=u.pathname.replace(/^\/api/,'')+u.search;
   if(path==='/rewards/bot/start'){singleStarted=true;assert.equal(req.postDataJSON().difficulty,'easy');await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'QA stops before creating a real duel'})});return;}
   try{const response=await f.call(path,req.method()==='GET'?undefined:req.postDataJSON(),uid);const body=await response.text();if(response.status>=400)apiErrors.push({path,status:response.status,body});await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body});}
   catch(error){apiErrors.push({path,error:String(error)});await route.fulfill({status:500,contentType:'application/json',body:'{"error":"fixture failure"}'});}
  });
  await page.addLocatorHandler(page.locator('.graphics-notice [data-continue]'),async()=>page.locator('.graphics-notice [data-continue]').click());
  try{
   await page.goto(process.env.ONBOARDING_ORIGIN||server.resolvedUrls.local[0],{waitUntil:'domcontentloaded'});
   if(index===0&&process.env.ONBOARDING_SKIP_BASICS!=='1'){
    await page.locator('[data-nav="tutorial"]').click({timeout:90000});await page.locator('#continuePart').click();await page.locator('.game-loading').waitFor({state:'hidden',timeout:90000});
    await page.locator('.tutorial-tour-next').waitFor({state:'visible',timeout:90000});
    assert.equal(await page.locator('.tutorial-tour-bubble p').innerText(),'やあゼノだよ。\nLOREのデュエルでは、上にいる相手の体力を０にすると勝ちだよ。');
    await page.screenshot({path:out+'/greeting-'+width+'.png'});
    for(let moves=0;moves<100; moves++){
     const layer=page.locator('.tutorial-part-tour');if(!await layer.count())break;
     if(await page.locator('[data-pull="10"]').count())break;
     const {step,action}=await layer.evaluate(e=>({step:e.dataset.step,action:e.dataset.action})),target=page.locator('.tutorial-tour-target');
     console.log('basic',width,step,action);
     if(action==='next')await page.locator('.tutorial-tour-next:not([disabled])').click();
     else if(action==='inspect')await target.click({button:'right'});
     else if(action==='click')await target.click();
     else{
      const source=page.locator('.tutorial-action-guide:not([hidden]) .tutorial-action-ring');
      await page.waitForFunction(i=>document.querySelector('.tutorial-part-tour')?.dataset.step!==i||document.querySelector('.tutorial-action-guide:not([hidden]) .tutorial-action-ring')?.getBoundingClientRect().width>0,step);
      if(await layer.getAttribute('data-step')!==step)continue;
      const a=await source.boundingBox(),drop=page.locator('.tutorial-action-guide:not([hidden]) .tutorial-drop-ring:not([hidden])');
      if(await drop.count()){
       const b=await drop.boundingBox();await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:16});await page.mouse.up();
       const choice=page.locator('.cast-review');if(await choice.count()){await choice.locator('[data-choice]').click();await choice.locator('.btn-gold').click();}
      }else if(await target.evaluate(e=>!!e.closest('#fixedMarket,#supplyMarket')))await target.dblclick();else await target.click();
     }
     await page.waitForFunction(i=>!document.querySelector('.tutorial-part-tour')||document.querySelector('.tutorial-part-tour').dataset.step!==i,step,{timeout:25000});
    }
   }
   await page.locator('[data-pull="10"]').waitFor({timeout:90000});
   await page.locator('.tutorial-tour-next').click();await page.screenshot({path:out+'/gacha-'+width+'.png'});
   await page.locator('[data-pull="10"]').click();await page.locator('.gacha-cinematic').waitFor({timeout:30000});
   // Tutorial cannot skip the selected cinematic; normal playback reveals the receipt.
   const skip=page.locator('.gacha-cinematic [data-skip]');assert.equal(await skip.getAttribute('aria-disabled'),'true');await skip.hover();
   assert.equal(await skip.locator('[role=tooltip]').innerText(),'チュートリアル中はスキップできません');await page.screenshot({path:out+'/skip-locked-'+width+'.png'});
   await skip.evaluate(e=>e.click());await page.locator('.gacha-cinematic [data-close]').evaluate(e=>e.click());await page.keyboard.press('Escape');assert.equal(await page.locator('.gacha-cinematic').count(),1);
   await page.locator('[data-tutorial-result-next]').waitFor({timeout:90000});assert.equal(await page.locator('[data-tutorial-result-next]').evaluate(e=>getComputedStyle(e).outlineStyle),'solid');await page.screenshot({path:out+'/result-next-'+width+'.png'});await page.locator(process.env.ONBOARDING_RESULT_CLOSE==='1'?'.reward-results-dialog header [data-close]':'[data-tutorial-result-next]').click();
   await page.locator('[data-category="starter"]').click();await page.waitForFunction(()=>document.querySelector('.tutorial-part-tour')?.dataset.step==='1');
   const free=page.locator('.starter-shop-item:first-child [data-buy-starter]');await free.waitFor();assert.match(await free.innerText(),/0 シャード/);
   await page.screenshot({path:out+'/free-starter-'+width+'.png'});await free.click();assert.match(await page.locator('.starter-purchase-dialog').innerText(),/0 シャード/);await page.locator('[data-purchase-yes]').click();
   await page.locator('.tutorial-tour-next').click();
   await page.locator('#deckCur').waitFor();await page.locator('.tutorial-tour-next').click();await page.locator('.tutorial-tour-next').click();
   await page.locator('#deckCur [data-card="STARTER_TRASH"] .deck-hand-action').first().click();
   await page.waitForFunction(()=>document.querySelector('.tutorial-part-tour')?.dataset.step==='3');
   assert.equal(await page.locator('#deckCur [data-card="STARTER_TRASH"]').count(),5);
   // Reload in the middle of the exercise: keep the removed card and resume at Add.
   await page.reload({waitUntil:'domcontentloaded'});await page.locator('#deckCur').waitFor({timeout:90000});
   await page.waitForFunction(()=>document.querySelector('.tutorial-part-tour')?.dataset.step==='3');
   assert.equal(await page.locator('#deckCur [data-card="STARTER_TRASH"]').count(),5);
   await page.locator('.screen-loader').waitFor({state:'hidden',timeout:90000});await page.locator('#deckPool .deck-card-action:not(:disabled)').first().waitFor({state:'visible'});await page.waitForTimeout(500);await page.screenshot({path:out+'/deck-add-'+width+'.png'});
   await page.locator('#deckPool .deck-pool-tile:not([data-deck-card="STARTER_TRASH"]) .deck-card-action:not(:disabled)').first().click();
   await page.waitForFunction(()=>document.querySelector('.tutorial-part-tour')?.dataset.step==='4');
   await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('.tutorial-part-tour')?.dataset.step==='5');
   assert.match(await page.locator('.tutorial-tour-bubble p').innerText(),/きみだけのスターターデッキが完成/);
   await page.screenshot({path:out+'/deck-complete-'+width+'.png'});await page.locator('.tutorial-tour-next').click();
   await page.waitForFunction(()=>document.querySelector('.tutorial-tour-bubble p')?.textContent==='シーカー修練書に細かいルールなどがあるよ。');
   await page.locator('.seeker-plate img').evaluate(i=>i.decode());await page.waitForTimeout(800);await page.screenshot({path:out+'/book-'+width+'.png'});await page.locator('.tutorial-tour-next').click();
   assert.equal(await page.locator('.tutorial-tour-bubble p').innerText(),'どんどん対戦しながらデュエルについての理解を深めよう！');
   await page.screenshot({path:out+'/single-invitation-'+width+'.png'});await page.locator('.tutorial-tour-next').click();
   await page.waitForTimeout(500);assert(singleStarted);assert.equal((await f.call('/onboarding',undefined,uid).then(r=>r.json())).stage,'complete');assert.deepEqual(errors,[]);assert.deepEqual(apiErrors,[]);
   await fs.writeFile(out+'/report-'+width+'.json',JSON.stringify({width,origin:process.env.ONBOARDING_ORIGIN||server.resolvedUrls.local[0],sourceRoot:process.cwd(),errors,apiErrors,singleStarted,status:await f.call('/onboarding',undefined,uid).then(r=>r.json())},null,2));
  }catch(e){await page.screenshot({path:out+'/failure-'+width+'.png'});await fs.writeFile(out+'/failure-'+width+'.json',JSON.stringify({error:String(e),errors,apiErrors,body:await page.locator('body').innerText()},null,2));throw e;}
  await context.close();
 }
 console.log('PASS visible-control onboarding including basic completion, reward, paid gacha, free leftmost purchase, reload during deck edit, saved deck, optional book and Single recommendation');
}finally{await browser.close();await server.close();await f.close();}
