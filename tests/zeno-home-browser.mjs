import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-zeno-home-qa';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal']});
const context=await browser.newContext({viewport:{width:1420,height:838},deviceScaleFactor:1});
const page=await context.newPage(),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error'&&/THREE|shader|WebGL/i.test(m.text()))errors.push(m.text());});
await page.addInitScript(()=>localStorage.setItem('lore_lang','ja'));
await page.addLocatorHandler(page.locator('.graphics-notice [data-continue]'),()=>page.locator('.graphics-notice [data-continue]').click());
const homeZeno = page.locator('.home-spirit-touch, .home-spirit-host, [aria-label*="ゼノ"]');
try{
 await page.goto(process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5537/?devLogin=1');
 const seeker=page.locator('.home-standing-seeker.is-painted canvas');
 await seeker.waitFor({timeout:60000});
 await page.locator('.living-home[data-atmosphere="ready"]').waitFor();
 await page.locator('.screen-loader').waitFor({state:'detached'});
 for(const [width,height] of [[1280,800],[390,844]]){
  await page.setViewportSize({width,height});
  await seeker.waitFor({timeout:60000});
  assert.equal(await homeZeno.count(),0);
  await page.screenshot({path:out+'/home-'+width+'.png',animations:'allow'});
 }
 checks.push('HOME shows the Seeker alone on desktop and portrait layouts');
 await page.locator('[data-nav=tutorial]').click();
 const zeno=page.locator('.tutorial-parts-spirit');
 await zeno.locator('canvas, svg').waitFor();
 assert(await zeno.isVisible());
 await page.locator('[data-nav=home]').click();
 await seeker.waitFor({timeout:60000});
 assert.equal(await homeZeno.count(),0);
 assert.equal(await zeno.count(),0);
 checks.push('Tutorial mounts Zeno and leaving the tutorial removes him');
 assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/results.json',JSON.stringify({origin:process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5537/?devLogin=1',mode:'local guest',checks,errors},null,2));
 console.log('PASS Zeno HOME',checks);
}finally{await context.close();await browser.close();}
