import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.LORE_PLAYWRIGHT || 'playwright');
const origin=process.env.LORE_TEST_ORIGIN || 'http://127.0.0.1:5192';
const out=process.env.LORE_TEST_OUTPUT || '/tmp/lore-deck-drag-browser';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:800}});
page.setDefaultTimeout(90000);
const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
const user={id:'deck-drag-fixture',display:'シーカー',credits:0,decks:null};
await apiFixture(page,request=>{
 const path=new URL(request.url).pathname;
 if(path==='/api/auth/me')return {user};
 if(path==='/api/geo')return {country:'JP'};
 if(path==='/api/gifts')return {items:[],unreadCount:0};
 if(path==='/api/social/friends')return {friends:[],incoming:[],outgoing:[],challenges:[]};
 if(path==='/api/deck'){user.decks=request.body.decks;return {ok:true,...user,deck:user.decks.list[user.decks.sel].cards.join(',')};}
 return {ok:true};
});
const count=()=>page.locator('#deckCur .deck-entry:not(.deck-slot)').count();
const begin=async(source,target)=>{
 const a=await source.boundingBox(),b=await target.boundingBox();assert(a&&b);
 await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();
 await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:8});
};
try{
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.locator('[data-nav=deck]').click();
 for(let i=0;i<3;i++){
  await page.waitForFunction(()=>!document.querySelector('.screen-loader')||document.querySelector('.screen-loader .asset-retry'));
  if(!await page.locator('.screen-loader').count())break;
  await page.locator('.screen-loader .asset-retry').click();
 }
 await page.locator('.screen-loader').waitFor({state:'detached'});
 for(const width of [1280,390]){
  await page.setViewportSize({width,height:844});
  const free=()=>page.locator('#deckCur .deck-entry:not(.is-fixed):not(.deck-slot) .card').first();
  const pool=page.locator('#deckPool');
  assert.equal(await count(),9);
  await begin(free(),pool);
  assert.equal(await page.locator('#deckCandidates.deck-remove-over').count(),1);
  await page.screenshot({path:`${out}/drag-${width}.png`});
  await page.mouse.up();assert.equal(await count(),8);
  assert.equal(await page.locator('#zoomOverlay').count(),0);
  assert(await page.locator('#save').isDisabled());
  await page.locator('#deckUndo').click();assert.equal(await count(),9);
  await begin(free(),page.locator('#deckFilters'));await page.mouse.up();assert.equal(await count(),9);
  await begin(free(),pool);await page.keyboard.press('Escape');await page.mouse.up();assert.equal(await count(),9);
  await begin(page.locator('#deckCur .is-fixed .card'),pool);await page.mouse.up();assert.equal(await count(),9);
  await begin(free(),pool);await page.mouse.up();assert.equal(await count(),8);
  const candidate=page.locator('#deckPool .deck-pool-tile').filter({has:page.locator('.deck-card-action:not(:disabled)')}).first().locator('.card');
  await begin(candidate,free());await page.mouse.up();assert.equal(await count(),9);
  await begin(candidate,free());await page.mouse.up();assert.equal(await count(),9);
  assert.equal(await page.locator('#zoomOverlay').count(),0);
  await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#deckMsg').textContent.includes('保存完了'));
  assert.equal(user.decks.list[user.decks.sel].cards.length,8);
  await page.screenshot({path:`${out}/after-${width}.png`});
  checks.push({width,remove:true,undo:true,outside:true,escape:true,fixed:true,add:true,replace:true,fixtureSave:true});
 }
 assert.deepEqual(errors,[]);
 await fs.writeFile(`${out}/report.json`,JSON.stringify({origin,checks,errors},null,2));
 console.log('PASS',JSON.stringify(checks));
}finally{await browser.close();}
