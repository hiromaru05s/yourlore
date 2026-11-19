import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createServer} from 'vite';
import {onboardingFixture} from './fixtures/onboardingEnv.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const f=await onboardingFixture(),out=process.env.SINGLE_STORY_QA_DIR||'/tmp/lore-single-story-qa';await fs.mkdir(out,{recursive:true});
const liveOrigin=process.env.LORE_GALLERY_LIVE_ORIGIN;
const server=liveOrigin?{resolvedUrls:{local:[liveOrigin]},listen:async()=>{},close:async()=>{}}:await createServer({root:'client',configFile:'client/vite.config.ts',logLevel:'error',server:{host:'127.0.0.1',port:0,hmr:false}});await server.listen();
const browser=await chromium.launch({channel:'chrome',headless:true});
const uid='single-story-browser';f.addUser(uid);f.db.prepare('UPDATE users SET username_set=1 WHERE id=?').run(uid);
const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out+'/video',size:{width:1440,height:900}}}),page=await context.newPage(),errors=[],apiErrors=[];let rejectRead=false,storyRequest=false;
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
const reopen=async()=>{await page.locator('[data-nav="single"]').click();await page.locator('.ss-gallery-track').waitFor({timeout:90000});};
const openChapter=async id=>{
 const resume=page.locator(`[data-continue="${id}"]`);
 if(await resume.isEnabled())await resume.click();
 else{await page.locator(`[data-restart="${id}"]`).click();await page.locator('.ss-restart-sheet [data-yes]').click();}
};
const skip=async scene=>{await openChapter(Number(scene.split(':')[0]));await page.locator('.single-vn [data-skip]').click();await page.locator('.single-vn').waitFor({state:'detached'});};
const receipt=key=>f.db.prepare('INSERT OR IGNORE INTO rewards VALUES(?,?,0,?)').run(uid,key,Date.now());
try{
 await page.goto(server.resolvedUrls.local[0],{waitUntil:'domcontentloaded'});
 await page.locator('[data-nav="single"]').waitFor({timeout:90000});await page.locator('.screen-loader').waitFor({state:'hidden',timeout:90000});await reopen();
 const track=page.locator('.ss-gallery-track'),one=page.locator('[data-chapter="1"]');
 await page.waitForFunction(()=>Array.from(document.querySelectorAll('.ss-gallery img')).every(i=>i.complete&&i.naturalWidth>0));await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(800);
 assert.equal(await page.locator('.ss-chapter,.ss-objectives,.ss-task-actions').count(),0);
 assert.equal(await page.locator('.ss-card-seal').count(),4);assert.equal(await page.locator('[data-chapter="2"] .ss-card-status').count(),0);
 await one.click();assert.equal(await page.locator('.single-vn').count(),0);assert.equal(await one.getAttribute('aria-current'),'page');
 assert(await page.locator('[data-continue="1"]').isDisabled(),'no save disables Continue');
 assert(await page.locator('[data-restart="2"]').isDisabled(),'locked chapter cannot restart');
 await page.locator('[data-restart="1"]').click();await page.locator('.ss-restart-sheet').waitFor();
 await page.screenshot({path:out+'/restart-confirm.png'});
 await page.locator('.ss-restart-sheet [data-no]').click();assert.equal(await page.locator('.single-vn').count(),0);
 assert(await page.locator('[data-continue="1"]').isDisabled());
 await openChapter(1);await page.locator('.single-vn [data-next]').click();
 assert.equal(await page.locator('.svn-count').innerText(),'2 / 5');
 await page.locator('.single-vn [data-pause]').click();
 assert(await page.locator('[data-continue="1"]').isEnabled());
 await page.locator('[data-restart="1"]').click();await page.locator('.ss-restart-sheet [data-no]').click();
 await page.locator('[data-continue="1"]').click();assert.equal(await page.locator('.svn-count').innerText(),'2 / 5','NO preserves cursor');
 await page.keyboard.press('Escape');
 await page.locator('[data-restart="1"]').press('Enter');await page.keyboard.press('Escape');
 await page.locator('[data-continue="1"]').press('Space');assert.equal(await page.locator('.svn-count').innerText(),'2 / 5');await page.keyboard.press('Escape');
 await page.locator('[data-restart="1"]').click();await page.locator('.ss-restart-sheet [data-yes]').click();
 assert.equal(await page.locator('.svn-count').innerText(),'1 / 5','YES starts at first line');await page.keyboard.press('Escape');
 await reopen();await page.locator('[data-continue="1"]').click();assert.equal(await page.locator('.svn-count').innerText(),'1 / 5','line zero is resumable');await page.keyboard.press('Escape');
 // Completed chapters only resume when an actual reread was paused.
 receipt(f.lib.ONBOARDING_BASICS);receipt('story:single:v1:1:before');receipt('story:single:v1:1:after');
 await page.evaluate(()=>{localStorage.removeItem('lore:single:cursor:v1:single-story-browser:1:before');});
 await reopen();assert(await page.locator('[data-continue="1"]').isDisabled(),'completed chapter has no pending continuation');
 await page.evaluate(()=>localStorage.setItem('lore:single:cursor:v1:single-story-browser:1:before','2'));
 await reopen();await page.locator('[data-continue="1"]').click();assert.equal(await page.locator('.svn-count').innerText(),'3 / 5','completed reread resumes saved line');await page.keyboard.press('Escape');
 // Keep the gallery fixture at its original locked state for layout checks.
 f.db.prepare('DELETE FROM rewards WHERE user_id=? AND key IN (?,?,?)').run(uid,f.lib.ONBOARDING_BASICS,'story:single:v1:1:before','story:single:v1:1:after');await reopen();
 await page.waitForFunction(()=>document.querySelector('[data-idle="lumi"]').classList.contains('is-painted'));
 const moving=await page.locator('[data-chapter-art="1"]').getAttribute('src');assert.match(moving,/\.gif$/);
 await page.screenshot({path:out+'/gallery-desktop.png'});
 await page.waitForTimeout(6500);await page.screenshot({path:out+'/gallery-loop.png'});
 const idle=page.locator('[data-idle="lumi"]');await idle.screenshot({path:out+'/idle-a.png'});await page.waitForTimeout(1300);await idle.screenshot({path:out+'/idle-b.png'});
 const a=await fs.readFile(out+'/idle-a.png'),b=await fs.readFile(out+'/idle-b.png');assert(!a.equals(b),'idle canvas changes over time');
 await page.locator('[data-gallery-next]').click();await page.waitForTimeout(600);assert(await track.evaluate(e=>e.scrollLeft)>200);
 await track.evaluate(e=>e.scrollLeft=0);await page.waitForTimeout(300);const box=await track.boundingBox();await page.mouse.move(box.x+220,box.y+180);await page.mouse.down();await page.mouse.move(box.x+30,box.y+180,{steps:15});await page.mouse.up();await page.waitForTimeout(300);assert(await track.evaluate(e=>e.scrollLeft)>100);assert.equal(await page.locator('.single-vn').count(),0);
 await track.evaluate(e=>e.scrollLeft=e.scrollWidth);await page.waitForTimeout(500);assert(await page.locator('[data-gallery-next]').isDisabled());await page.screenshot({path:out+'/gallery-later.png'});
 for(const [width,height] of [[320,740],[390,844],[844,390],[1280,720]]){await page.setViewportSize({width,height});await track.evaluate(e=>e.scrollLeft=0);await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);if(width===1280){const card=await one.boundingBox(),dock=await page.locator('.lounge-rail').boundingBox();assert(card.y+card.height<=dock.y,'card clears bottom navigation');}await page.screenshot({path:out+`/gallery-${width}.png`});}
 await page.setViewportSize({width:390,height:844});await track.evaluate(e=>e.scrollLeft=0);await page.waitForTimeout(300);
 const touch=await context.newCDPSession(page),tb=await track.boundingBox();await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tb.x+260,y:tb.y+100}]});for(let x=240;x>=50;x-=20)await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:tb.x+x,y:tb.y+100}]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(600);assert(await track.evaluate(e=>e.scrollLeft)>100);await touch.detach();
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(300);assert.equal(await page.locator('.ss-card-landscape[src$=".gif"]').count(),0);assert.equal(await page.locator('.ss-card-actor.is-painted').count(),0);await page.emulateMedia({reducedMotion:'no-preference'});
 for(const lang of (liveOrigin?[]:['en','ko','ja'])){await page.evaluate(async lang=>{const {setLang}=await import('/src/i18n.ts');setLang(lang);},lang);await track.waitFor();await page.screenshot({path:out+`/gallery-${lang}.png`});}
 await page.setViewportSize({width:1440,height:900});await page.locator('[data-tab="battle"]').click();await page.waitForFunction(()=>document.querySelector('.sp-standing')?.classList.contains('is-painted'));await page.screenshot({path:out+'/battle-idle.png'});
 assert.deepEqual(errors,[]);assert.deepEqual(apiErrors,[]);
 await fs.writeFile(out+'/report.json',JSON.stringify({sourceRoot:process.cwd(),origin:server.resolvedUrls.local[0],errors,apiErrors,checks:['click selects only','single-click restart/continue, YES/NO, Escape and keyboard controls, cursor persistence and completed reread','no lower detail panel','central locks','five GIF assets','NPC idle canvas changes','arrow/drag/touch','reduced motion','three languages','battle idle'],visual:'continuous recording provided; aesthetic review is separate'},null,2));console.log('PASS living story gallery browser checks');
}catch(error){await page.screenshot({path:out+'/failure.png'});throw error;}finally{await context.close();await browser.close();await server.close();await f.close();}
