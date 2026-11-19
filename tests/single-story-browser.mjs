import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createServer} from 'vite';
import {onboardingFixture} from './fixtures/onboardingEnv.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const f=await onboardingFixture(),out=process.env.SINGLE_STORY_QA_DIR||'/tmp/lore-single-story-qa';await fs.mkdir(out,{recursive:true});
const server=await createServer({root:'client',configFile:'client/vite.config.ts',logLevel:'error',server:{host:'127.0.0.1',port:0,hmr:false}});await server.listen();
const browser=await chromium.launch({channel:'chrome',headless:true});
const uid='single-story-browser';f.addUser(uid);f.db.prepare('UPDATE users SET username_set=1 WHERE id=?').run(uid);
const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage(),errors=[],apiErrors=[];let rejectRead=false,storyRequest=false;
page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{localStorage.setItem('lore_lang','ja');localStorage.setItem('lore_help_callout_seen',new Date().toISOString().slice(0,10));});
await page.route('**/api/**',async route=>{
 const req=route.request(),u=new URL(req.url()),path=u.pathname.replace(/^\/api/,'')+u.search;
 if(path==='/rewards/single/read'&&rejectRead){rejectRead=false;await route.fulfill({status:503,contentType:'application/json',body:'{"error":"QA save failure"}'});return;}
 if(path==='/rewards/story/start'){storyRequest=true;await route.fulfill({status:503,contentType:'application/json',body:'{"error":"QA stops before creating a real room"}'});return;}
 try{const response=await f.call(path,req.method()==='GET'?undefined:req.postDataJSON(),uid);const body=await response.text();if(response.status>=400)apiErrors.push({path,status:response.status,body});await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body});}
 catch(error){apiErrors.push({path,error:String(error)});await route.fulfill({status:500,contentType:'application/json',body:'{"error":"fixture failure"}'});}
});
await page.addLocatorHandler(page.locator('.graphics-notice [data-continue]'),async()=>page.locator('.graphics-notice [data-continue]').click());
const reopen=async()=>{await page.locator('[data-nav="single"]').click();await page.locator('#ss-title').waitFor({timeout:90000});};
const skip=async scene=>{await page.locator(`[data-scene="${scene}"]`).click();await page.locator('.single-vn [data-skip]').click();await page.locator('.single-vn').waitFor({state:'detached'});};
const receipt=key=>f.db.prepare('INSERT OR IGNORE INTO rewards VALUES(?,?,0,?)').run(uid,key,Date.now());
try{
 await page.goto(server.resolvedUrls.local[0],{waitUntil:'domcontentloaded'});
 await page.locator('[data-nav="single"]').waitFor({timeout:90000});await page.locator('.screen-loader').waitFor({state:'hidden',timeout:90000});await reopen();
 assert.equal(await page.locator('[data-nav="tutorial"]').count(),0);
 assert.equal(await page.locator('.lounge-rail [data-nav]').count(),6);
 assert.equal(await page.locator('[data-chapter]:disabled').count(),4);
 await page.waitForTimeout(400);
 assert((await page.locator('.ss-gallery-track').boundingBox()).width>900,'chapter gallery uses available desktop width');
 await page.screenshot({path:out+'/chapter-1.png'});
 await page.locator('[data-scene="1:before"]').click();await page.locator('.single-vn [data-next]').click();
 assert.equal(await page.locator('.svn-name').innerText(),'ゼノ');
 await page.screenshot({path:out+'/dialogue-zeno.png'});
 await page.locator('.single-vn [data-pause]').click();await page.locator('[data-scene="1:before"]').click();
 assert.equal(await page.locator('.svn-count').innerText(),'2 / 5','pause resumes the same line');
 rejectRead=true;await page.locator('.single-vn [data-skip]').click();await page.locator('.svn-error:not(:empty)').waitFor();
 assert.equal(await page.locator('[data-chapter="2"]').isDisabled(),true);
 await page.locator('.single-vn [data-skip]').click();await page.locator('.single-vn').waitFor({state:'detached'});
 assert.equal(await page.locator('[data-chapter="2"]').isDisabled(),true,'SKIP does not complete tutorial');
 // Play the real guided board through visible controls. The real Worker validates the transcript.
 await page.locator('[data-action="tutorial"]').click();await page.locator('.game-loading').waitFor({state:'hidden',timeout:90000});
 await page.locator('.tutorial-tour-next').waitFor({timeout:90000});
 for(let moves=0;moves<100;moves++){
  const layer=page.locator('.tutorial-part-tour');if(!await layer.count())break;
  const {step,action}=await layer.evaluate(e=>({step:e.dataset.step,action:e.dataset.action})),target=page.locator('.tutorial-tour-target');
  if(action==='next')await page.locator('.tutorial-tour-next:not([disabled])').press('Enter');
  else if(action==='inspect')await target.click({button:'right'});
  else if(action==='click')await target.click();
  else{
   const source=page.locator('.tutorial-action-guide:not([hidden]) .tutorial-action-ring');
   await page.waitForFunction(i=>document.querySelector('.tutorial-part-tour')?.dataset.step!==i||document.querySelector('.tutorial-action-guide:not([hidden]) .tutorial-action-ring')?.getBoundingClientRect().width>0,step);
   if(await layer.getAttribute('data-step')!==step)continue;
   const a=await source.boundingBox(),drop=page.locator('.tutorial-action-guide:not([hidden]) .tutorial-drop-ring:not([hidden])');
   if(await drop.count()){const b=await drop.boundingBox();await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:16});await page.mouse.up();const choice=page.locator('.cast-review');if(await choice.count()){await choice.locator('[data-choice]').click();await choice.locator('.btn-gold').click();}}
   else if(await target.evaluate(e=>!!e.closest('#fixedMarket,#supplyMarket')))await target.dblclick();else await target.click();
  }
  await page.waitForFunction(i=>!document.querySelector('.tutorial-part-tour')||document.querySelector('.tutorial-part-tour').dataset.step!==i,step,{timeout:25000});
 }
 await page.locator('#ss-title').waitFor({timeout:90000});
 assert.equal((await f.call('/rewards/single',undefined,uid).then(r=>r.json())).tutorial,true);
 await skip('1:after');await page.locator('[data-action="next-chapter"]').click();await skip('2:before');
 await page.locator('[data-action="lumi"]').click();await page.locator('.sp-standing').waitFor();await page.screenshot({path:out+'/lumi-battle.png'});
 assert.equal(await page.locator('[data-training]').count(),1);await reopen();
 // Seed settled victories/matches only for later visual states; no claim of playing live PvP.
 receipt('bot:first:easy');await reopen();await skip('2:after');await page.locator('[data-action="next-chapter"]').click();await skip('3:before');
 assert.equal(await page.locator('[data-action="normal"]').count(),1);assert.equal(await page.locator('[data-chapter="4"]').isDisabled(),true);
 for(let i=0;i<2;i++)f.db.prepare('INSERT INTO duel_reward_receipts(user_id,match_id,day,mode,amount,created_at) VALUES(?,?,?,?,0,?)').run(uid,'normal-'+i,'2026-11-18','online',Date.now());
 await reopen();await skip('3:after');await page.locator('[data-action="next-chapter"]').click();
 await page.locator('[data-scene="4:before"]').click();await page.screenshot({path:out+'/dialogue-vera.png'});
 for(const [width,height] of [[390,844],[1024,600],[1280,720]]){
  await page.setViewportSize({width,height});await page.screenshot({path:`${out}/dialogue-ja-${width}.png`});
  const box=await page.locator('.svn-dialogue').boundingBox();assert(box.x>=0&&box.y>=0&&box.x+box.width<=width+1&&box.y+box.height<=height+1);
 }
 await page.setViewportSize({width:1440,height:900});await page.locator('.single-vn [data-skip]').click();await page.locator('.single-vn').waitFor({state:'detached'});
 receipt('bot:first:normal');receipt('bot:first:hard');await reopen();await skip('4:after');await page.locator('[data-action="next-chapter"]').click();await skip('5:before');await skip('5:after');
 assert.equal(await page.locator('.ss-master-grid button').count(),7);assert.equal(await page.locator('.ss-master-grid button:enabled').count(),1);
 assert.equal(await page.locator('body').innerText().then(t=>t.includes('ルカ')),false);
 await page.waitForTimeout(400);await page.screenshot({path:out+'/seven-doors.png'});
 await page.locator('[data-aries]').click();await page.locator('.single-vn [data-skip]').click();await page.locator('.single-vn').waitFor({state:'detached'});
 receipt('story:aries:clear');await reopen();await page.locator('[data-personal]').click();await page.screenshot({path:out+'/aries-personal.png'});await page.keyboard.press('Escape');
 await page.locator('[data-tab="training"]').click();assert.equal(await page.locator('.ss-training section').first().getAttribute('class'),'ss-book-card');
 await page.locator('[data-book]').click();await page.locator('.seeker-book').waitFor();await page.screenshot({path:out+'/training-book.png'});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/training-390.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.setViewportSize({width:1440,height:900});await reopen();
 for(const lang of ['en','ko','ja']){
  await page.evaluate(async lang=>{const {setLang}=await import('/src/i18n.ts');setLang(lang);},lang);
  await page.locator('[data-aries]').waitFor();await page.locator('[data-action="aries-reread"]').click();
  const text=await page.locator('.svn-text').innerText();assert(text.length>10);
  if(lang==='en')assert.match(text,/record/);if(lang==='ko')assert.match(text,/기록/);
  await page.screenshot({path:out+'/aries-dialogue-'+lang+'.png'});await page.keyboard.press('Escape');
 }
 await page.locator('[data-aries]').click();await page.waitForTimeout(300);assert(storyRequest);
 assert.deepEqual(errors,[]);assert.deepEqual(apiErrors,[]);
 await fs.writeFile(out+'/report.json',JSON.stringify({sourceRoot:process.cwd(),origin:server.resolvedUrls.local[0],errors,apiErrors,basicTutorial:'played via visible controls; Worker validated transcript',laterBattles:'settled receipt fixtures',storyRequest},null,2));
 console.log('PASS chapter UI, VN pause/SKIP/retry, actual basic tutorial return, three NPC entry, normal goals, seven doors, Aries story, training book and six-item nav');
}catch(error){await page.screenshot({path:out+'/failure.png'});await fs.writeFile(out+'/failure.json',JSON.stringify({error:String(error),errors,apiErrors,body:await page.locator('body').innerText()},null,2));throw error;}
finally{await browser.close();await server.close();await f.close();}
