// Check the built app: multi-entry CSS chunk order differs from the dev server.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.LORE_PLAYWRIGHT || 'playwright');
const origin=process.env.LORE_TEST_ORIGIN || 'http://127.0.0.1:5193';
const out=process.env.LORE_TEST_OUTPUT || '/tmp/lore-cards-layout';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-quic']});
const page=await browser.newPage({viewport:{width:1280,height:720}});
page.setDefaultTimeout(120000);
await page.addInitScript(()=>localStorage.setItem('lore_lang','ja'));
const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
await apiFixture(page,r=>new URL(r.url).pathname==='/api/auth/me'?{user:{id:'cards-layout-fixture',display:'シーカー',credits:0,decks:null}}:{ok:true});
async function ready(){await page.waitForFunction(()=>document.querySelector('#grid > .card')&&!document.querySelector('.screen-loader')&&document.querySelector('#grid').getAttribute('aria-busy')!=='true');}
async function measure(label){
 const result=await page.evaluate(()=>{
  const grid=document.querySelector('#grid'),g=grid.getBoundingClientRect();
  const faces=[...grid.querySelectorAll(':scope > .card')].map(e=>e.getBoundingClientRect());
  const bounds=[...grid.querySelectorAll(':scope > .card, .card-cost, .ad-atk, .ad-def')].map(e=>e.getBoundingClientRect()).filter(r=>r.width>0);
  const controls=[...document.querySelectorAll('#typeRow .chip')].map(e=>e.getBoundingClientRect());
  return {width:innerWidth,height:innerHeight,count:faces.length,gridWidth:grid.clientWidth,scrollWidth:grid.scrollWidth,cardWidth:faces[0]?.width,
   clipped:bounds.filter(r=>r.left<g.left-1||r.right>g.left+grid.clientWidth+1).length,
   overlap:faces.some((r,i)=>i>0&&Math.abs(r.top-faces[i-1].top)<1&&r.left<faces[i-1].right),
   controlsClipped:controls.some(r=>r.left<0||r.right>innerWidth),
   controlScroll:document.querySelector('#typeRow').scrollWidth-document.querySelector('#typeRow').clientWidth,
   pageScroll:document.documentElement.scrollWidth-innerWidth,
   gridBelowControls:g.top>=Math.max(...controls.map(r=>r.bottom))-1,
   aboveNav:g.bottom<=document.querySelector('.lounge-rail').getBoundingClientRect().top+1};
 });
 checks.push({label,...result});console.log(label,result);
 assert.equal(result.clipped,0,'Card faces and badges must fit horizontally');
 assert.equal(result.overlap,false,'Cards must not overlap');
 assert(result.scrollWidth<=result.gridWidth+1,'No horizontal overflow in card list');
 assert(result.controlScroll<=1&&!result.controlsClipped,'Types must fit without horizontal scrolling');
 assert(result.pageScroll<=1&&result.gridBelowControls&&result.aboveNav,'Grid must fit between controls and navigation');
}
try{
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.locator('[data-nav=cards]').click();await ready();
 for(const [width,height] of [[1280,720],[2550,1288],[1920,1080],[1024,600],[844,390],[650,800],[390,844],[375,667],[320,640]]){
  await page.setViewportSize({width,height});await page.mouse.move(0,0);await page.locator('#grid').evaluate(e=>e.scrollTop=0);
  await measure(`${width}x${height}`);await page.screenshot({path:`${out}/cards-${width}.png`});
 }
 await page.locator('#grid > .card').first().focus();await page.keyboard.press('Enter');await page.locator('#zoomOverlay').waitFor();await page.locator('.inspect-close').click();
 await page.locator('#grid').evaluate(e=>e.scrollTop=e.scrollHeight);assert(await page.locator('#grid').evaluate(e=>e.scrollTop>0));
 await measure('bottom');await page.locator('#nextPage').click();await ready();assert.equal(await page.locator('#pageLabel').textContent(),'2 / 4');await measure('page 2');
 await page.locator('#typeRow .chip').last().click();await ready();await measure('starters');
 await page.locator('#search').fill('zzzz-no-card');await page.locator('.cards-empty').waitFor();
 await page.locator('#search').fill('');await ready();
 await page.locator('#typeRow .chip').first().click();await ready();
 await page.locator('.cards-lang select').selectOption('en');await ready();await measure('English');
 await page.locator('.cards-lang select').selectOption('ko');await ready();await measure('Korean');
 assert.deepEqual(errors,[]);await fs.writeFile(`${out}/report.json`,JSON.stringify({origin,api:'fixture',checks,errors},null,2)+'\n');
 console.log('PASS cards layout, scrolling, paging, filter, empty search, keyboard zoom, languages');
} catch(error){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});throw error;}finally{await browser.close();}
