import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {pathToFileURL} from 'node:url';
const root=process.cwd(),{createServer}=await import(pathToFileURL(root+'/node_modules/vite/dist/node/index.js')),{onboardingFixture}=await import(pathToFileURL(root+'/tests/fixtures/onboardingEnv.mjs'));
const {loadCards}=await import(pathToFileURL(root+'/scripts/card-art-lib.mjs')),cards=await loadCards({includeStarters:true});
const {chromium}=await import('/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const f=await onboardingFixture(),uid='card-rules-qa';f.addUser(uid,1000);f.db.prepare('UPDATE users SET username_set=1 WHERE id=?').run(uid);
const out=process.env.QA_OUT||'docs/qa/2026-10-30-card-rules/local';await fs.mkdir(out,{recursive:true});
const server=await createServer({root:root+'/client',configFile:root+'/client/vite.config.ts',logLevel:'error',server:{host:'127.0.0.1',port:0,hmr:false}});await server.listen();const origin=process.env.QA_ORIGIN||server.resolvedUrls.local[0];
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1461,height:790}}),errors=[],reports=[],assets=new Set();page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
await page.route('**/api/**',async route=>{const r=route.request(),u=new URL(r.url()),res=await f.call(u.pathname.replace(/^\/api/,'')+u.search,r.method()==='GET'?undefined:r.postDataJSON(),uid);await route.fulfill({status:res.status,headers:Object.fromEntries(res.headers),body:await res.text()});});
await page.addLocatorHandler(page.locator('.graphics-notice [data-continue]'),async()=>page.locator('.graphics-notice [data-continue]').click());
async function open(id,lang){await page.locator('.cards-search').fill(cards.find(c=>c.id===id)[{ja:'nameJa',ko:'name',en:'nameEn'}[lang]]);await page.locator(`#grid [data-card-id="${id}"]`).first().click();await page.locator('.zoom-overlay').waitFor();}
async function inspectPopup(id,term,lang,width,height,scale=1){
 console.log('inspect',id,term,lang,width,scale);await page.setViewportSize({width,height});await page.waitForTimeout(150);await page.evaluate(scale=>document.documentElement.style.fontSize=scale===1?'':`${scale*100}%`,scale);
 await open(id,lang);const anchor=page.locator(`.card-effect-body .card-rule-term[data-rule-term="${term}"]`).first();
 if(width<600)await anchor.click();else await anchor.hover();const popup=page.locator('.card-rule-tooltip');await popup.waitFor();
 const rect=await popup.boundingBox(),close=await popup.locator('button').boundingBox();assert(rect.x>=0&&rect.y>=0&&rect.x+rect.width<=width+1&&rect.y+rect.height<=height+1,JSON.stringify({id,lang,rect,width,height}));assert(close.y>=0&&close.y+close.height<=height);
 const font=await popup.evaluate(el=>getComputedStyle(el).fontSize);assert(parseFloat(font)>=16);
 if(width===1461||id==='DUNGEON')await page.screenshot({path:`${out}/${lang}-${id}-${width}-${scale}.png`});
 const oldScroll=await page.locator('.zoom-details').evaluate(el=>el.scrollTop);assert.equal(await popup.count(),1,'tooltip remains open while reading');await page.keyboard.press('Escape');assert.equal(await popup.count(),0);assert.equal(await page.locator('.zoom-overlay').count(),1);assert.equal(await anchor.evaluate(el=>el===document.activeElement),true);assert.equal(await page.locator('.zoom-details').evaluate(el=>el.scrollTop),oldScroll);
 reports.push({lang,id,term,width,height,scale,rect,font});await page.locator('.inspect-close').click();await page.evaluate(()=>document.documentElement.style.fontSize='');
}
try{
 for(const lang of ['ja','ko','en']){
  await page.addInitScript(lang=>localStorage.setItem('lore_lang',lang),lang);await page.setViewportSize({width:1461,height:790});await page.goto(origin,{waitUntil:'domcontentloaded'});await page.locator('#ranked').waitFor({timeout:90000});await page.locator('.screen-loader').waitFor({state:'hidden',timeout:90000});await page.locator('[data-nav=cards]').click();await page.locator('.cards-search').waitFor();await page.locator('.screen-loader').waitFor({state:'hidden',timeout:90000});
  for(const [id,term] of [['DUNGEON','passive:guts'],['DUNGEON','passive:evade'],['PURGE_TOUCH','brand'],['FURNACE','shield'],['HIGH_ELF','dew'],['M6','lasting']])await inspectPopup(id,term,lang,1461,790);
  for(const [w,h,s]of [[390,844,1],[320,568,1],[390,844,2]])await inspectPopup('DUNGEON','passive:guts',lang,w,h,s);
  await page.setViewportSize({width:1461,height:790});await open('INCUBATOR',lang);for(const egg of ['TGE1','DRAGON_EGG','BEAST_EGG'])assert.equal(await page.locator(`.zoom-related[data-relation=references] [data-card-id="${egg}"]`).count(),1);
  await page.locator('.card-reference-link[data-reference-kind=series][data-reference-id=eggs]').first().hover();await page.locator('.card-reference-preview').waitFor();assert.equal(await page.locator('.card-reference-preview .reference-member').count(),3);await page.screenshot({path:`${out}/${lang}-egg-links.png`});await page.keyboard.press('Escape');await page.locator('.inspect-close').click();
  await open('REFRESH_HAND',lang);assert((await page.locator('.card-effect-body').innerText()).includes({ja:'体力を3回復',ko:'체력을 3 회복',en:'restore 3 of your HP'}[lang]));await page.screenshot({path:`${out}/${lang}-refresh.png`});await page.locator('.inspect-close').click();
  for(const url of await page.locator('img').evaluateAll(imgs=>imgs.filter(i=>i.naturalWidth).map(i=>i.currentSrc)))assets.add(url);
 }
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/report.json',JSON.stringify({origin,sourceRoot:root,reports,assets:[...assets],errors,scope:'Real app UI and shipped code with isolated API fixture; no real purchases/accounts/PvP.'},null,2)+'\n');console.log(`PASS ${reports.length} three-language tooltip cases; desktop, 320/390px, 200% text, tap/focus/Escape; Egg links; Refresh 3`);
}catch(e){await page.screenshot({path:out+'/failure.png'});throw e;}finally{await browser.close();await server.close();await f.close();}
