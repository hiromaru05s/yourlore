import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {chromium} from '/tmp/lore-opening-tools/node_modules/playwright/index.mjs';import {apiFixture} from './helpers/api-fixture.mjs';
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5298',out='docs/ui-rework/2026-09-29-ranked-flow';
const b=await chromium.launch({channel:'chrome',headless:true}),page=await b.newPage({viewport:{width:1440,height:1000}}),errors=[],checks=[];page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE',e.message);});
const user={id:'rank-test',display:'シーカー',avatar:'SEEKER_BLUE',wins:12,losses:5,credits:20};let rating={season:'2026-09',mmr:1144,tier:'silver',rank:42,wins:12,losses:5,peak_mmr:1144},fail=false;
await apiFixture(page,req=>{const path=new URL(req.url).pathname;return path==='/api/auth/me'?{user}:path==='/api/geo'?{country:'JP'}:path==='/api/rank/me'?{rating:fail?null:rating}:path==='/api/rank/leaderboard'?{season:'2026-09',entries:[{...rating,display:'シーカー'}]}:path==='/api/social/friends'?{friends:[],incoming:[],outgoing:[],challenges:[]}:{ok:true};});
try{
 page.setDefaultTimeout(120000); console.log('loading', origin); await page.goto(origin+'/?polish',{waitUntil:'domcontentloaded'});await page.waitForSelector('.home-rank');await page.waitForSelector('.screen-loader',{state:'detached'});await page.waitForTimeout(1200);
 for(const [w,h] of [[1440,1000],[1280,720],[390,844],[320,568],[844,390]]){
  await page.setViewportSize({width:w,height:h});await page.waitForTimeout(200);const box=await page.locator('.home-rank').boundingBox();assert(box.x>=0&&box.x+box.width<=w+1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.match(await page.locator('.home-rank').innerText(),/1144/);assert.match(await page.locator('.home-rank').innerText(),/6 MMR/);await page.screenshot({path:`${out}/home-${w}.png`});checks.push({w,h,box});
 }
 await page.setViewportSize({width:1280,height:900});await page.locator('#myTier').click();await page.waitForSelector('.lb');await page.locator('.lounge-rank-rules summary').click();assert.equal(await page.locator('.rank-tier-guide .rank-emblem').count(),8);await page.screenshot({path:out+'/rank-guide.png'});
 rating={...rating,mmr:1162,tier:'gold',rank:38};await page.locator('[data-nav=home]').click();await page.waitForSelector('.rank-emblem-gold');assert.match(await page.locator('.home-rank').innerText(),/1162/);assert.match(await page.locator('.home-rank').innerText(),/88 MMR/);checks.push('fresh HOME rating');
 fail=true;await page.reload();await page.waitForFunction(()=>document.querySelector('#myTier')?.textContent.includes('再読み込み'));fail=false;await page.locator('#myTier').click();await page.waitForSelector('.home-rank');checks.push('load failure retry');
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/home-report.json',JSON.stringify({passed:true,checks,errors},null,2));console.log('PASS HOME',checks);
}finally{await b.close();}
