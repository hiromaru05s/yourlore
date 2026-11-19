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
 const track=page.locator('.ss-gallery-track');
 await page.waitForFunction(()=>Array.from(document.querySelectorAll('.ss-gallery img')).every(i=>i.complete&&i.naturalWidth>0));
 await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(800);
 assert.equal(await page.locator('[data-chapter]:disabled').count(),4);
 assert(await page.locator('[data-gallery-prev]').isDisabled());
 await page.screenshot({path:out+'/gallery-desktop.png'});
 await page.locator('[data-gallery-next]').click();await page.waitForTimeout(600);assert(await track.evaluate(e=>e.scrollLeft)>200);
 await page.locator('[data-gallery-prev]').click();await page.waitForTimeout(600);
 const box=await track.boundingBox();await page.mouse.move(box.x+220,box.y+180);await page.mouse.down();await page.mouse.move(box.x+30,box.y+180,{steps:15});await page.mouse.up();await page.waitForTimeout(400);
 assert(await track.evaluate(e=>e.scrollLeft)>100,'mouse drag scrolls');assert.equal(await page.locator('[aria-current="page"][data-chapter]').getAttribute('data-chapter'),'1','drag does not select');
 await track.focus();await page.keyboard.press('ArrowRight');await page.waitForTimeout(600);assert(await track.evaluate(e=>e.scrollLeft)>250);
 await track.evaluate(e=>e.scrollLeft=e.scrollWidth);await page.waitForTimeout(400);assert(await page.locator('[data-gallery-next]').isDisabled());
 await page.screenshot({path:out+'/gallery-later.png'});
 for(const [width,height] of [[320,740],[390,844],[844,390],[1280,720]]){
  await page.setViewportSize({width,height});await track.evaluate(e=>e.scrollLeft=0);await page.waitForTimeout(300);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const card=await page.locator('[data-chapter="1"]').boundingBox();assert(card.height>card.width);
  await page.screenshot({path:out+`/gallery-${width}.png`});
 }
 await page.setViewportSize({width:390,height:844});await track.evaluate(e=>e.scrollLeft=0);await page.waitForTimeout(300);
 const touch=await context.newCDPSession(page),touchBox=await track.boundingBox();
 await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:touchBox.x+260,y:touchBox.y+120}]});
 for(let x=240;x>=50;x-=20)await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:touchBox.x+x,y:touchBox.y+120}]});
 await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(600);
 assert(await track.evaluate(e=>e.scrollLeft)>100,'native touch swipe scrolls');await touch.detach();
 await track.evaluate(e=>e.scrollLeft=0);await page.waitForTimeout(400);await page.locator('[data-chapter="1"]').click();
 await page.locator('[data-scene="1:before"]').click();await page.locator('.single-vn').waitFor();await page.keyboard.press('Escape');
 for(const lang of liveOrigin?[]:['en','ko','ja']){
  await page.evaluate(async lang=>{const {setLang}=await import('/src/i18n.ts');setLang(lang);},lang);await page.locator('#ss-title').waitFor();
  await page.screenshot({path:out+`/gallery-${lang}.png`});
 }
 assert.deepEqual(errors,[]);assert.deepEqual(apiErrors,[]);
 await fs.writeFile(out+'/gallery-report.json',JSON.stringify({sourceRoot:process.cwd(),origin:server.resolvedUrls.local[0],api:'isolated fixture; actual application assets',liveAssets:!!liveOrigin,errors,apiErrors,checks:['images loaded','locked chapters','arrow boundaries','mouse drag without click','native touch swipe','card selection and story entry','keyboard','portrait cards','320/390/844/1280 widths',liveOrigin?'ja (live)':'ja/en/ko']},null,2));
 console.log('PASS chapter gallery browser checks');
}finally{await browser.close();await server.close();await f.close();}
