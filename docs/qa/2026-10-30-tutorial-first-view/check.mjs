import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const root=process.cwd();
const {createServer}=await import(pathToFileURL(root+'/node_modules/vite/dist/node/index.js'));
const {onboardingFixture}=await import(pathToFileURL(root+'/tests/fixtures/onboardingEnv.mjs'));
const {chromium}=await import('/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const f=await onboardingFixture(),out=process.env.QA_OUT||root+'/docs/qa/2026-10-30-tutorial-first-view';await fs.mkdir(out,{recursive:true});
const server=await createServer({root:root+'/client',configFile:root+'/client/vite.config.ts',logLevel:'error',server:{host:'127.0.0.1',port:0,hmr:false}});await server.listen();
const origin=process.env.QA_ORIGIN||server.resolvedUrls.local[0],browser=await chromium.launch({channel:'chrome',headless:true}),reports=[];
try{
 for(const [lang,width,height] of [['ko',1461,790],['ja',1461,790],['en',1280,720],['ko',1024,600],['ja',1024,600],['en',1024,600]]){
  const uid=`welcome-${lang}-${width}`;f.addUser(uid);f.db.prepare('UPDATE users SET username_set=1 WHERE id=?').run(uid);f.db.prepare('DELETE FROM rewards WHERE user_id=?').run(uid);
  const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(lang=>localStorage.setItem('lore_lang',lang),lang);
  await page.route('**/api/**',async route=>{const r=route.request(),u=new URL(r.url());const response=await f.call(u.pathname.replace(/^\/api/,'')+u.search,r.method()==='GET'?undefined:r.postDataJSON(),uid);await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});});
  await page.addLocatorHandler(page.locator('.graphics-notice [data-continue]'),async()=>page.locator('.graphics-notice [data-continue]').click());
  await page.goto(origin,{waitUntil:'domcontentloaded'});await page.locator('.welcome-copy [data-yes]').waitFor({timeout:90000});await page.locator('.screen-loader').waitFor({state:'hidden',timeout:90000});await page.waitForTimeout(800);
  const measure=()=>page.evaluate(()=>{const box=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom}};return{conversation:box('.welcome-conversation'),content:box('.lounge-content'),fonts:[...new Set([...document.querySelectorAll('.welcome-copy h1,.welcome-copy p,.welcome-copy .zeno-speaker,.welcome-copy button')].map(e=>getComputedStyle(e).fontSize))]};});
  const welcome=await measure();assert(welcome.fonts.length<=2,JSON.stringify(welcome));assert(Math.abs(welcome.conversation.y+welcome.conversation.height/2-(welcome.content.y+welcome.content.height/2))<24,JSON.stringify(welcome));
  await page.screenshot({path:`${out}/${lang}-${width}-welcome.png`});
  await page.locator('[data-no]').click();await page.locator('[data-back]').waitFor();const skip=await measure();assert(skip.fonts.length<=2);await page.locator('[data-back]').click();await page.locator('[data-yes]').click();
  await page.locator('#continuePart').waitFor({timeout:90000});await page.locator('.screen-loader').waitFor({state:'hidden',timeout:90000});await page.waitForTimeout(500);
  const tutorial=await page.evaluate(()=>{const b=document.querySelector('#continuePart'),r=b.getBoundingClientRect(),nav=document.querySelector('.lounge-rail').getBoundingClientRect();return{top:r.top,bottom:r.bottom,navTop:nav.top,scroll:document.querySelector('.lounge-content').scrollTop,hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('#continuePart')===b};});
  assert(tutorial.scroll===0&&tutorial.hit&&tutorial.bottom<tutorial.navTop&&tutorial.top>0,JSON.stringify(tutorial));
  await page.screenshot({path:`${out}/${lang}-${width}-tutorial.png`});await page.locator('#continuePart').click();await page.locator('.tutorial-tour-next').waitFor({timeout:90000});
  assert.deepEqual(errors,[]);reports.push({lang,width,height,origin,sourceRoot:root,welcome,skip,tutorial,errors,startedDuel:true});console.log('PASS',lang,width,height);await context.close();
 }
 await fs.writeFile(out+'/report.json',JSON.stringify(reports,null,2)+'\n');
}finally{await browser.close();await server.close();await f.close();}
