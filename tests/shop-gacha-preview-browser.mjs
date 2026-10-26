import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-collapse-tools/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5491',out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-gacha-refine';await fs.mkdir(out,{recursive:true});
await build({stdin:{contents:"export * from './client/src/shared/collection';export * from './client/src/shared/dailyStarterShop';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:out+'/collection.mjs'});
const {starterCollection,COLLECTIBLE_STARTERS,dailyStarterShop}=await import(out+'/collection.mjs');
const user={id:'collection-qa',email:'qa@example.invalid',display:'シーカー',wins:0,losses:0,credits:10000,starterCards:starterCollection(),sleeve:'default',furniture:'default'};
const daily=dailyStarterShop(Date.now());
const geometry=[];
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-quic']});
const page=await browser.newPage({viewport:{width:1440,height:900}});page.setDefaultTimeout(120000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>localStorage.setItem('lore_lang','ja'));
await apiFixture(page,req=>{
 const p=new URL(req.url).pathname;
 if(p==='/api/auth/me')return {user};if(p==='/api/geo')return {country:'JP'};
 if(p==='/api/gifts')return {items:[],unreadCount:0,pendingCount:0,pendingAmount:0};
 if(p==='/api/rewards/progression')return {credits:user.credits,resetsAt:Date.now()+86400000,daily:{quest:{kind:'starterWin',card:'STARTER_CHEST',reward:500,target:3},progress:1,claimed:false},bot:{},online:0,ranked:0};
 if(p==='/api/rank/me')return {rating:{season:'2026-10',mmr:1000,wins:0,losses:0,peak_mmr:1000,rank:1,tier:'bronze'}};if(p==='/api/rewards/tutorial')return {keys:['tuto:1','tuto:10'],credits:user.credits,offered:true};
 if(p==='/api/social/profile')return {profile:{...user,created_at:Date.now(),self:true,sleeves:['default'],furnitures:['default']}};
 if(p==='/api/collection')return {credits:user.credits,starterCards:user.starterCards,dailyShop:daily};
 return {ok:true,keys:[],friends:[],incoming:[],outgoing:[],challenges:[]};
});
try{
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!document.querySelector('.lounge-entry-overlay'));await page.locator('[data-nav="shop"]').click();await page.waitForSelector('[data-pull="1"]:enabled');
 assert.equal(await page.locator('.gacha-table-heading').innerText(),'ビブリオンのコレクション');
 assert.equal(await page.locator('.gacha-table-balance').count(),0);
 await page.waitForFunction(()=>[...document.querySelectorAll('[data-info="cosmetic"] [data-sample-id]')].every(e=>e.dataset.ready==='true'&&e.querySelector('canvas')));
 const stamps=()=>page.locator('[data-info="cosmetic"] canvas').evaluateAll(cs=>cs.map(c=>c.toDataURL()));
 const before=await stamps();await page.waitForTimeout(1200);const after=await stamps();assert.equal(before.length,3);assert(before.every((v,i)=>v!==after[i]),'all three sleeve materials animate');
 const effect=page.locator('[data-info="effect"] .shop-reward-sample');await effect.screenshot({path:out+'/effect-frame-1.png'});await page.waitForTimeout(1600);await effect.screenshot({path:out+'/effect-frame-2.png'});
 assert.notDeepEqual(await fs.readFile(out+'/effect-frame-1.png'),await fs.readFile(out+'/effect-frame-2.png'));
 assert.equal(await effect.locator('[data-card-id="STARTER_MANA"]').count(),1);
 for(const category of ['starter','cosmetic','effect']){
  await page.locator(`[data-info="${category}"]`).click();await page.waitForSelector('.shop-lineup-dialog [data-ready="true"]');
  assert.deepEqual(await page.locator('[data-lineup-category]').evaluateAll(es=>es.map(e=>e.dataset.lineupCategory)),[category]);
  if(category==='starter'){assert.equal(await page.locator('.shop-reward-grid article').count(),COLLECTIBLE_STARTERS.length);assert(await page.locator('.shop-lineup-dialog .card-frame').count()>0);}
  if(category==='cosmetic'){await page.waitForFunction(()=>[...document.querySelectorAll('.shop-lineup-dialog .gacha-trio-surface')].every(c=>{const d=c.getContext('2d').getImageData(c.width/2,c.height/2,1,1).data;return d[0]+d[1]+d[2]>15;}));}
  if(category==='effect'){await page.waitForFunction(()=>document.querySelectorAll('.shop-lineup-dialog [data-card-id="STARTER_MANA"]').length===3);assert.equal(await page.locator('.shop-lineup-dialog .card-frame').count(),3);}
  await page.waitForTimeout(2400);await page.screenshot({path:`${out}/lineup-${category}.png`});
  await page.locator('.gacha-dialog').evaluate(e=>e.scrollTop=500);assert(await page.locator('.gacha-dialog header [data-close]').isVisible());
  await page.locator('.gacha-dialog header [data-close]').click();assert.equal(await page.locator('.gacha-dialog').count(),0);
  assert.equal(await page.locator(`[data-info="${category}"]`).evaluate(e=>e===document.activeElement),true);
 }
 for(const [w,h] of [[1440,900],[1024,600],[390,844],[320,640],[844,390]]){
  await page.setViewportSize({width:w,height:h});await page.waitForTimeout(800);await page.screenshot({path:`${out}/gacha-${w}.png`});
  const g=await page.evaluate(()=>{const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom};};const frame=document.querySelector('.shop-gacha-active>.tut');return {width:innerWidth,height:innerHeight,panel:rect('.shop-gacha-active>.tut'),draw:rect('[data-pull="1"]'),tile:rect('[data-info="starter"]'),content:rect('.lounge-content'),image:getComputedStyle(frame).backgroundImage,clip:getComputedStyle(frame).clipPath};});geometry.push(g);
  assert(g.draw.y>=g.content.y&&g.draw.bottom<=g.content.bottom+1&&g.draw.height>=44,`draw fits ${w}`);
  if(w>700&&h>550){assert(Math.abs(g.tile.y-g.draw.y)<1,`top alignment ${w}`);assert(Math.abs(g.tile.bottom-g.draw.bottom)<1,`bottom alignment ${w}`);}
  assert(g.image.includes('biblion-draw-table-v1.webp')&&g.clip.includes('polygon'),'background and chamfer share panel');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const f=g.panel;await page.locator('[data-category="starter"]').click();const f2=await page.locator('.shop-gacha-active>.tut').boundingBox();assert.equal(f.height,f2.height);assert.equal(f.width,f2.width);await page.locator('[data-category="gacha"]').click();
 }
 await page.setViewportSize({width:390,height:844});await page.locator('[data-info="effect"]').click();await page.waitForTimeout(800);await page.screenshot({path:out+'/effects-mobile.png'});await page.locator('.gacha-dialog header [data-close]').click();
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(500);const still=await stamps();await page.waitForTimeout(1000);assert.deepEqual(await stamps(),still,'reduced motion sleeves stay still');
 await page.locator('[data-category="accessories"]').click();assert.equal(await page.locator('.gacha-dialog').count(),0);
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/report.json',JSON.stringify({origin,geometry,allThreeSleevesAnimate:true,effectAnimatesOnAttune:true,categoryFiltering:true,closeAndFocus:true,reducedMotion:true,errors},null,2));console.log('PASS gacha category previews, live materials, reduced motion, alignment and chamfered panel in five viewports');
}catch(error){await page.screenshot({path:out+'/failure.png'}).catch(()=>{});console.error(errors);throw error;}finally{await browser.close();}
