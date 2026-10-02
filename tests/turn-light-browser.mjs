import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-opening-tools/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5260';
const out='docs/vfx-prototypes/2026-09-29-turn-light/qa';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1080}}),errors=[],failed=[],results=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/THREE|WebGL|shader|GL_INVALID/.test(m.text()))errors.push(m.text());});page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))failed.push({url:r.url(),status:r.status()});});
const variants=['porcelain','inscription','prism'];
try{
 await page.goto(origin+'/turn-light-lab.html');await page.waitForSelector('#lab[data-ready=true]');await page.waitForTimeout(800);
 assert.equal(await page.locator('.studies article').count(),3);
 await page.locator('.studies').screenshot({path:out+'/three-studies.png'});
 await page.locator('#play').click();await page.waitForTimeout(50);
 const first=await page.locator('.studies canvas').first().screenshot();await page.waitForTimeout(300);assert(first.equals(await page.locator('.studies canvas').first().screenshot()),'pause stable');
 await page.locator('#speed').selectOption('0.25');await page.locator('#play').click();await page.waitForTimeout(350);assert(!first.equals(await page.locator('.studies canvas').first().screenshot()),'surface moves');
 await page.locator('.cap').first().click();assert.equal(await page.locator('.cap:disabled').count(),3);await page.locator('.studies').screenshot({path:out+'/enemy.png'});
 await page.locator('#blocked').click();assert.equal(await page.locator('.cap:disabled').count(),3);await page.locator('.studies').screenshot({path:out+'/blocked.png'});
 await page.locator('#self').click();await page.locator('#time').fill('4');await page.locator('#time').dispatchEvent('input');await page.locator('.studies').screenshot({path:out+'/four-seconds.png'});
 await page.locator('#time').fill('0');await page.locator('#time').dispatchEvent('input');await page.locator('.studies').screenshot({path:out+'/zero-seconds.png'});
 await page.locator('#time').fill('64');await page.locator('#time').dispatchEvent('input');await page.locator('#surface').click();await page.locator('.studies').screenshot({path:out+'/dark.png'});
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);const still=await page.locator('.studies canvas').first().screenshot();await page.waitForTimeout(300);assert(still.equals(await page.locator('.studies canvas').first().screenshot()),'reduced motion is stable');await page.emulateMedia({reducedMotion:'no-preference'});
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'gallery fits mobile');await page.screenshot({path:out+'/gallery-mobile.png',fullPage:true});
 await page.setViewportSize({width:1440,height:1080});await page.locator('#surface').click();await page.locator('#speed').selectOption('1');await page.screenshot({path:out+'/gallery.png',fullPage:true});
 await page.setViewportSize({width:1280,height:720});await page.goto(origin+'/duel-lab.html?polish&turnlight=porcelain');await page.waitForSelector('[data-widgets-ready=true]');await page.waitForSelector('.duel-loader',{state:'detached',timeout:60000});await page.waitForTimeout(600);
 for(const variant of variants){
  await page.getByLabel('光のパターン').selectOption(variant);await page.getByRole('button',{name:'自分のターン',exact:true}).click();await page.waitForTimeout(250);
  assert.equal(await page.locator('#app').getAttribute('data-turnlight'),variant);assert(await page.locator('#endBtn').isEnabled());
  await page.screenshot({path:out+`/board-${variant}.png`});
  await page.locator('#endBtn').focus();await page.keyboard.press('Enter');assert(await page.locator('#endBtn').isDisabled());assert.equal(await page.locator('#app').getAttribute('data-reading-turn'),'opponent');
  await page.getByRole('button',{name:'自分のターン',exact:true}).click();await page.getByRole('button',{name:'操作不可',exact:true}).click();assert(await page.locator('#endBtn').isDisabled());
  await page.getByRole('button',{name:'自分のターン',exact:true}).click();await page.getByRole('button',{name:'4秒',exact:true}).click();assert(await page.locator('.mp-clock.show').getAttribute('class').then(c=>c.includes('warn')));
  await page.screenshot({path:out+`/board-${variant}-warning.png`});results.push({variant,keyboard:true,disabled:true,warning:true});
 }
 for(const [width,height] of [[390,844],[844,390],[1920,1080]]){
  await page.setViewportSize({width,height});await page.getByRole('button',{name:'自分のターン',exact:true}).click();await page.waitForTimeout(250);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'board fits '+width);
  const box=await page.locator('#endBtn').boundingBox();assert(box.width>=44&&box.height>=44,'44px hit area');assert(box.x>=0&&box.x+box.width<=width,'button visible');
  for(const variant of variants){await page.getByLabel('光のパターン').selectOption(variant);await page.waitForTimeout(80);await page.screenshot({path:out+`/board-${variant}-${width}.png`});}
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'自分のターン',exact:true}).click();await page.locator('#endBtn').click();assert(await page.locator('#endBtn').isDisabled());
 await page.setViewportSize({width:1280,height:720});await page.goto(origin+'/duel-lab.html?polish');await page.waitForSelector('[data-widgets-ready=true]');await page.waitForSelector('.duel-loader',{state:'detached',timeout:60000});assert.equal(await page.locator('#app').getAttribute('data-turnlight'),'porcelain','approved light enabled without preview flags');
 await page.waitForTimeout(800);await page.screenshot({path:out+'/adopted-desktop.png'});
 assert(await page.locator('#endBtn').isEnabled());await page.locator('#endBtn').focus();await page.keyboard.press('Enter');assert(await page.locator('#endBtn').isDisabled());
 await page.getByRole('button',{name:'自分のターン',exact:true}).click();await page.setViewportSize({width:390,height:844});await page.waitForTimeout(800);
 const adoptedBox=await page.locator('#endBtn').boundingBox();assert(adoptedBox.width>=44&&adoptedBox.height>=44);await page.screenshot({path:out+'/adopted-mobile.png'});
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 await fs.writeFile(out+'/browser-report.json',JSON.stringify({origin,results,errors,failed,checks:['three materials compile','pause','slow playback','opponent and blocked states','0 and 4 seconds','light and dark surfaces','reduced motion stable','keyboard activation','four real board viewports','44px mobile hit target','normal duel defaults to approved porcelain without preview flags', 'adopted desktop/mobile input']},null,2));console.log('PASS turn light: three variants, real board, interaction, reduced motion, four sizes');
}finally{await browser.close();}
