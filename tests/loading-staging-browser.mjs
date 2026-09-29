import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from '/tmp/lore-opening-tools/node_modules/playwright/index.mjs';
const origin=process.env.LORE_TEST_ORIGIN||'https://test.yourlore.xyz';
const out='docs/ui-rework/2026-09-29-loading-silver/staging';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={origin,checks:[],assets:[]};
try {
 for(const [width,height] of [[1280,720],[390,844]]){
  const page=await browser.newPage({viewport:{width,height}});const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  let release;const held=new Promise(r=>release=r);
  await page.route('**/art/lounge/stage-v1/stage.webp',async route=>{await held;await route.continue()});
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.screen-loader .loading-card--hero');
  assert.equal(await page.locator('.loading-runner').count(),0);
  const values=new Set();for(let i=0;i<8;i++){values.add(await page.locator('.loading-card--hero').evaluate(e=>getComputedStyle(e).transform));await page.waitForTimeout(400)}assert(values.size>1);
  const progress=await page.locator('progress').evaluate(e=>e.value);assert(progress<100);
  await page.screenshot({path:`${out}/loading-${width}.png`});
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.loading-ritual').evaluate(e=>e.getAnimations({subtree:true}).filter(a=>a.playState==='running').length),0);
  release();await page.waitForSelector('.screen-loader',{state:'detached',timeout:60000});await page.waitForSelector('.lounge-login');
  await page.screenshot({path:`${out}/ready-${width}.png`});assert.deepEqual(errors,[]);assert(!requests.some(url=>url.includes('/ui/loading/v1/runner.webp')));
  report.checks.push({width,height,motion:true,progressWhileHeld:progress,reduced:true,ready:true,oldRunnerRequests:0,errors});await page.close();
 }
 const html=await (await fetch(origin)).text();
 for(const path of [...new Set([...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+\.(?:js|css))"/g)].map(m=>m[1]))]){
  const remote=Buffer.from(await (await fetch(origin+path)).arrayBuffer());const local=await fs.readFile('client/dist'+path);
  const sha=b=>createHash('sha256').update(b).digest('hex');assert.equal(sha(remote),sha(local));report.assets.push({path,sha256:sha(remote),matches:true});
 }
 assert(report.assets.length>=2);await fs.writeFile(out+'/browser-report.json',JSON.stringify(report,null,2));console.log('PASS staging loader, readiness and artifact hashes',report.checks.map(x=>x.width));
}finally {await browser.close()}
