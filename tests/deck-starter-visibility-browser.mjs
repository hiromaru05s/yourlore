// Run against `vite preview` after a full build: dev CSS does not reproduce
// multi-entry shared-chunk ordering. LORE_PLAYWRIGHT may point to a local install.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.LORE_PLAYWRIGHT || 'playwright');
const origin=process.env.LORE_TEST_ORIGIN || 'http://127.0.0.1:5189';
const out=process.env.LORE_TEST_OUTPUT || '/tmp/lore-deck-starter-visibility';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-quic']});
const page=await browser.newPage({viewport:{width:1280,height:720}});
page.setDefaultTimeout(180000);
const errors=[],checks=[];page.on('pageerror',error=>errors.push(error.message));
const user={id:'deck-layout-fixture',display:'シーカー',credits:0,decks:null};
await apiFixture(page,request=>{
 const path=new URL(request.url).pathname;
 if(path==='/api/auth/me')return {user};
 if(path==='/api/geo')return {country:'JP'};
 if(path==='/api/deck'){user.decks=request.body.decks;return {ok:true,...user,deck:user.decks.list[user.decks.sel].cards.join(',')};}
 return {ok:true};
});
const measure=()=>page.evaluate(()=>{
 const pool=document.querySelector('#deckPool'),r=pool.getBoundingClientRect();
 const tiles=[...pool.querySelectorAll('.deck-pool-tile')].map(el=>el.getBoundingClientRect());
 const visible=tiles.filter(t=>t.top>=r.top-1&&t.bottom<=r.bottom+1);
 return {height:r.height,total:tiles.length,visibleRows:new Set(visible.map(t=>Math.round(t.top))).size,bottom:r.bottom,navTop:document.querySelector('.lounge-rail').getBoundingClientRect().top};
});
try{
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.locator('[data-nav=deck]').click();
 for(let attempt=0;attempt<3;attempt++){
  await page.waitForFunction(()=>!document.querySelector('.screen-loader')||document.querySelector('.screen-loader .asset-retry'));
  if(!await page.locator('.screen-loader').count())break;
  console.log('Retrying timed-out artwork loading',attempt+1);
  await page.locator('.screen-loader .asset-retry').click();
 }
 await page.locator('.screen-loader').waitFor({state:'detached'});
 for(const [width,height] of [[1280,720],[1024,600],[390,844],[375,667]]){
  await page.setViewportSize({width,height});
  await page.locator('#save').click();
  await page.waitForFunction(()=>document.querySelector('#deckMsg').textContent.includes('保存完了'));
  const layout=await measure();checks.push({viewport:{width,height},...layout});
  assert(layout.total>20,'Starter candidates must be populated');
  assert(layout.visibleRows>=2,`${width}x${height}: ${JSON.stringify(layout)}`);
  assert(layout.bottom<=layout.navTop+1,'The pool must stay above navigation');
  console.log('layout',width,height,layout);
  assert.equal(await page.locator('.deck-pool-detail,.deck-hand-detail').count(),0);
  const handNames=()=>page.locator('#deckCur .card-name').allTextContents();
  const before=await handNames();
  await page.locator('#deckPool .card').first().click();
  await page.locator('#zoomOverlay').waitFor({state:'visible'});
  assert.deepEqual(await handNames(),before,'Candidate face only enlarges');
  await page.screenshot({path:`${out}/zoom-${width}.png`});
  await page.locator('.inspect-close').click();
  await page.locator('#deckCur .deck-entry:not(.is-fixed) .card').first().click();
  await page.locator('#zoomOverlay').waitFor({state:'visible'});
  assert.deepEqual(await handNames(),before,'Hand face only enlarges');
  await page.locator('.inspect-close').click();
  await page.locator('#deckCur .deck-hand-action').first().click();
  assert.equal((await handNames()).length,8);
  await page.locator('#deckPool .deck-card-action:not(:disabled)').first().click();
  assert.equal((await handNames()).length,9);assert.equal(await page.locator('#zoomOverlay').count(),0);
  await page.locator('#deckPool .deck-card-action:not(:disabled)').first().click();
  assert(await page.locator('#deckCur').evaluate(el=>el.classList.contains('is-replacing')));
  await page.locator('#deckCur .deck-hand-action').first().click();
  assert.equal((await handNames()).length,9);
  assert.equal(await page.locator('#zoomOverlay').count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:`${out}/deck-${width}.png`});
 }
 await page.locator('#watchTab').click();
 assert.equal(await page.locator('#deckEditSection').isVisible(),false);
 await page.locator('#editTab').click();assert((await measure()).visibleRows>=2);
 const candidateName=await page.locator('#deckPool .card-name').first().textContent();
 await page.locator('#poolSearch').fill(candidateName);
 assert((await page.locator('#deckPool .card').count())>0);
 await page.locator('#poolSearch').fill('');
 await page.locator('#deckPool').evaluate(el=>{el.scrollTop=el.scrollHeight;});
 assert(await page.locator('#deckPool').evaluate(el=>el.scrollTop>0),'Remaining starters must be reachable');
 assert.deepEqual(errors,[]);
 await fs.writeFile(`${out}/report.json`,JSON.stringify({origin,checks,errors},null,2)+'\n');
 console.log('PASS: built starter pool, two full rows at four sizes with save status, tab return, search, scrolling',checks);
}catch(error){
 console.error('Browser failure',errors,await page.locator('.screen-loader').allTextContents());
 await page.screenshot({path:`${out}/failure.png`,timeout:10000}).catch(()=>{});
 throw error;
}finally{await browser.close();}
