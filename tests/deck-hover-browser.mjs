// Run against the built application (vite preview) to include the real CSS cascade.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {apiFixture} from './helpers/api-fixture.mjs';
const playwright=await import(process.env.LORE_PLAYWRIGHT || 'playwright');
const engine=process.env.LORE_TEST_BROWSER || 'chromium';
const origin=process.env.LORE_TEST_ORIGIN || 'http://127.0.0.1:5193';
const out=process.env.LORE_TEST_OUTPUT || '/tmp/lore-deck-hover';
await fs.mkdir(out,{recursive:true});
const browser=await playwright[engine].launch({...(engine==='chromium'?{channel:'chrome'}:{}),headless:true});
const checks=[],errors=[];
async function openDeck(options){
 const page=await browser.newPage(options);page.setDefaultTimeout(120000);
 page.on('pageerror',e=>errors.push(e.stack || e.message));
 const user={id:'deck-hover-fixture',display:'シーカー',credits:0,starterCards:{GRAPE:8},decks:{sel:0,list:Array.from({length:5},()=>({cards:Array(8).fill('GRAPE'),watch:[]}))}};
 await apiFixture(page,request=>{
  const path=new URL(request.url).pathname;
  if(path==='/api/auth/me')return {user};
  if(path==='/api/geo')return {country:'JP'};
  if(path==='/api/gifts')return {items:[],unreadCount:0};
  if(path==='/api/social/friends')return {friends:[],incoming:[],outgoing:[],challenges:[]};
  return {ok:true};
 });
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.locator('[data-nav=deck]').click();
 await page.locator('#deckCur .deck-hand-action').first().waitFor();
 await page.locator('.screen-loader').waitFor({state:'detached'});
 return page;
}
const geometry=el=>{
 const rect=node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}};
 return {row:rect(el),button:rect(el.querySelector('.deck-hand-action')),card:rect(el.querySelector('.card'))};
};
const stableRect=(before,after,label)=>{for(const key of ['x','y','width','height'])assert(Math.abs(before[key]-after[key])<.1,`${label} ${key}: ${before[key]} -> ${after[key]}`)};
try{
 for(const viewport of JSON.parse(process.env.LORE_TEST_VIEWPORTS || '[{"width":1440,"height":900},{"width":1024,"height":768},{"width":844,"height":390},{"width":390,"height":844}]')){
  const page=await openDeck({viewport});
  const rows=page.locator('#deckCur .deck-entry:not(.is-fixed):not(.deck-slot)');
  for(let index=0;index<await rows.count();index++){
   const row=rows.nth(index);await row.scrollIntoViewIfNeeded();
   for(const edge of ['bottom','left','right','card-bottom']){
    await page.mouse.move(1,1);await page.waitForTimeout(180);
    const before=await row.evaluate(geometry),r=edge==='card-bottom'?before.row:before.button;
    const point={x:edge==='left'?r.x+3:edge==='right'?r.x+r.width-3:r.x+r.width/2,y:edge==='bottom'||edge==='card-bottom'?r.y+r.height-2:r.y+r.height/2};
    await page.mouse.move(point.x,point.y);
    const samples=await row.evaluate(async el=>{
     const result=[];
     for(let i=0;i<24;i++){
      await new Promise(requestAnimationFrame);
      const r=el.getBoundingClientRect(),b=el.querySelector('.deck-hand-action').getBoundingClientRect();
      result.push({hover:el.matches(':hover'),rowY:r.y,buttonY:b.y});
     }
     return result;
    });
    const changes=samples.slice(1).filter((sample,i)=>sample.hover!==samples[i].hover).length;
    const after=await row.evaluate(geometry);
    checks.push({viewport,index,edge,point,changes,before,after,samples});
    assert.equal(changes,0,`Hover oscillates at ${viewport.width}, card ${index}, ${edge}`);
    assert(samples.every(s=>s.hover),`Pointer must remain on card ${index}, ${edge}`);
    stableRect(before.row,after.row,'Card hit area');stableRect(before.button,after.button,'Remove hit area');
   }
  }
  const row=rows.first();await row.scrollIntoViewIfNeeded();await page.mouse.move(1,1);await page.waitForTimeout(180);
  const before=await row.evaluate(geometry);
  await row.locator('.card').focus();await page.waitForTimeout(180);
  const focused=await row.evaluate(geometry);stableRect(before.row,focused.row,'Focused card hit area');stableRect(before.button,focused.button,'Focused remove');
  if(viewport.width>760)assert(focused.card.y<before.card.y-7,'Card still visibly lifts on focus');
  await page.screenshot({path:`${out}/deck-${viewport.width}.png`});
  await row.locator('.deck-hand-action').focus();await page.keyboard.press('Enter');
  assert.equal(await rows.count(),7,'Keyboard removes exactly one card');
  await page.locator('#deckUndo').click();assert.equal(await rows.count(),8);
  await page.locator('#deckPool .deck-card-action:not(:disabled)').first().click();
  const swap=rows.first().locator('.deck-hand-action');await swap.scrollIntoViewIfNeeded();await page.mouse.move(1,1);await page.waitForTimeout(180);
  const swapBefore=await rows.first().evaluate(geometry);await swap.hover();await page.waitForTimeout(180);
  stableRect(swapBefore.row,(await rows.first().evaluate(geometry)).row,'Replacement hit area');
  stableRect(swapBefore.button,(await rows.first().evaluate(geometry)).button,'Replacement button');
  await swap.click();assert.equal(await rows.count(),8,'Replacement preserves deck size');
  await page.close();
 }
 const touch=await openDeck({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
 await touch.locator('#deckCur .deck-hand-action').first().tap();
 assert.equal(await touch.locator('#deckCur .deck-hand-action').count(),7,'Touch removes exactly one card');
 await touch.close();assert.deepEqual(errors,[]);
 console.log('PASS: stable card and action boundaries, keyboard removal, replacement, touch and reduced motion',checks.length);
}finally{
 await fs.writeFile(`${out}/report.json`,JSON.stringify({origin,engine,checks,errors},null,2)+'\n');
 await browser.close();
}
