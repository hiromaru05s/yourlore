import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-collapse-tools/node_modules/playwright/index.mjs');
import {apiFixture} from './helpers/api-fixture.mjs';
import fs from 'node:fs/promises';
const out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-home-shop-qa';
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage();
await fs.mkdir(out,{recursive:true});
const user={id:'home-qa',email:'qa@example.invalid',display:'シーカー',credits:30000,wins:0,losses:0};
await page.addInitScript(()=>localStorage.setItem('lore_lang','ja'));
await apiFixture(page,req=>{
 const p=new URL(req.url).pathname;
 if(p==='/api/auth/me')return {user};if(p==='/api/geo')return {country:'JP'};
 if(p==='/api/rank/me')return {rating:{season:'2026-10',mmr:1320,wins:20,losses:10,peak_mmr:1320,rank:8,tier:'gold'}};if(p==='/api/rewards/tutorial')return {keys:[],credits:user.credits,offered:true};
 if(p==='/api/social/profile')return {profile:{...user,created_at:Date.now(),self:true,sleeves:['default'],furnitures:['default']}};
 if(p==='/api/collection')return {credits:user.credits,starterCards:{}};
 if(p==='/api/rewards/progression')return {credits:user.credits,resetsAt:Date.now()+86400000,daily:{quest:{kind:'starterWin',card:'STARTER_CHEST',reward:500,target:3},progress:1,claimed:false},bot:{},online:0,ranked:0};
 return {ok:true,keys:[],friends:[],incoming:[],outgoing:[],challenges:[],gifts:[]};
});
try{
await page.goto(process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5498');await page.waitForSelector('#dailyReward');await page.waitForFunction(()=>!document.querySelector('.lounge-entry-overlay'));await page.waitForTimeout(1500);
const result=[];
for(const [w,h] of [[1440,900],[1280,720],[1024,600],[390,844],[320,640],[844,390]]){
 await page.setViewportSize({width:w,height:h});await page.waitForTimeout(500);
 const geom=await page.evaluate(()=>{const rect=s=>{const el=document.querySelector(s),r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,bottom:r.bottom,right:r.right};};return {sound:rect('.home-sound'),daily:rect('#dailyReward'),main:rect('.lounge-home-main'),play:rect('#ranked'),deck:rect('#deck'),nav:rect('.lounge-rail'),content:rect('.lounge-content'),scroll:{height:document.documentElement.scrollHeight,width:document.documentElement.scrollWidth,inner:document.querySelector('.lounge-content').scrollHeight,client:document.querySelector('.lounge-content').clientHeight,overflow:getComputedStyle(document.querySelector('.lounge-content')).overflow}};});
 assert(geom.daily.y>=geom.sound.bottom,'daily below sound');assert.equal(Math.round(geom.daily.x),Math.round(geom.sound.x));
 assert(geom.deck.bottom<=geom.content.bottom+1,`deck clipped at ${w}x${h}: ${geom.deck.bottom} > ${geom.content.bottom}`);
 assert(geom.play.y>=geom.content.y&&geom.play.bottom<=geom.deck.y,`duel fits ${w}`);
 assert(geom.scroll.height<=h&&geom.scroll.width<=w,`document overflow ${w}`);
 assert(geom.scroll.inner<=geom.scroll.client+1,`HOME overflow ${w}: ${geom.scroll.inner} > ${geom.scroll.client}`);
 await page.locator('.lounge-home-main').hover();await page.mouse.wheel(0,700);assert.equal(await page.locator('.lounge-content').evaluate(el=>el.scrollTop),0);
 result.push({w,h,...geom});await page.screenshot({path:`${out}/home-${w}.png`});
}
await page.setViewportSize({width:1440,height:900});
await page.locator('[data-nav="shop"]').click();await page.waitForSelector('[data-category="sleeve"]');
for(const category of ['sleeve','furniture']){await page.locator(`[data-category="${category}"]`).click();assert.equal(await page.locator('#shopSelection,.shop-credits').count(),0);assert(await page.locator('.shop-item').count()>0);await page.screenshot({path:`${out}/${category}.png`});}
await page.locator('[data-nav="home"]').click();await page.waitForSelector('.lounge-seeker #dailyReward');assert.equal(await page.locator('#dailyReward').count(),1);
await fs.writeFile(out+'/home-geometry.json',JSON.stringify(result,null,2));console.log('PASS HOME: six viewports, rank/deck/duel fit without scrolling, daily below sound, cosmetics have no aside, HOME remount');
}finally{await browser.close();}
