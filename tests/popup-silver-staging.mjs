import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'https://test.yourlore.xyz';
const out=process.env.LORE_TEST_OUTPUT||'docs/releases/2026-10-13-popup-silver/staging';
await fs.mkdir(out,{recursive:true});
const index=await fetch(origin).then(r=>{assert(r.ok);return r.text();});
const cssPaths=[...index.matchAll(/href="([^" ]+\.css)"/g)].map(m=>m[1]);assert(cssPaths.length);
const styles=[];
for(const path of cssPaths){const r=await fetch(new URL(path,origin));assert(r.ok);const css=await r.text();styles.push({path,sha256:createHash('sha256').update(css).digest('hex'),silver:css.includes('--popup-silver:1')&&css.includes('popupSilverEnter')});}
assert(styles.some(s=>s.silver),'Selected stylesheet must be in the deployed entry bundle');
const browser=await chromium.launch({headless:true,channel:'chrome'});
const page=await browser.newPage({viewport:{width:1280,height:800},reducedMotion:'reduce'});page.setDefaultTimeout(120000);
const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
await apiFixture(page,({url})=>{
 const path=new URL(url).pathname;
 if(path==='/api/auth/me')return {user:{id:'popup-fixture-only',display:'シーカー',avatar:'SEEKER_BLUE',credits:1200,wins:0,losses:0}};
 if(path==='/api/geo')return {country:'JP'};
 if(path==='/api/rank/me')return {rating:{season:'2026-10',mmr:1000,tier:'bronze',wins:0,losses:0}};
 return {ok:true,friends:[],incoming:[],outgoing:[],challenges:[],rows:[]};
});
await page.addInitScript(()=>{localStorage.setItem('lore_lang','ja');localStorage.setItem('lore_help_callout_seen',new Date().toISOString().slice(0,10));});
const inspect=async name=>{
 const metrics=await page.locator('.overlay > .modal').evaluate(el=>{const r=el.getBoundingClientRect();return {silver:getComputedStyle(el).getPropertyValue('--popup-silver').trim(),left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:innerWidth,height:innerHeight,overflow:el.scrollWidth>el.clientWidth+2};});
 assert.equal(metrics.silver,'1',name);assert(!metrics.overflow,name);assert(metrics.left>=-1&&metrics.right<=metrics.width+1&&metrics.top>=-1&&metrics.bottom<=metrics.height+1,name);
 await page.screenshot({path:`${out}/${name}.png`,timeout:120000});checks.push({name,...metrics});console.log('PASS',name);
};
try{
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForSelector('.lounge-home');await page.waitForSelector('.screen-loader',{state:'detached'});
 if(await page.locator('.graphics-notice').count())await page.locator('.graphics-notice [data-continue]').click();
 await page.locator('.lounge-menu').click();await page.locator('[data-inquiry]').click();await inspect('home-inquiry');
 await page.locator('#inqTitle').fill('表示確認');await page.locator('#inqCancel').click();
 await page.locator('.lounge-menu').click();await page.locator('#bot').click();await page.locator('#ranked').click();
 await inspect('npc-selection');await page.locator('[data-diff=easy]').click();await page.locator('#diffStart').click();
 await page.waitForSelector('.game');await page.waitForSelector('.duel-loader',{state:'detached'});await page.waitForSelector('.duel-opening',{state:'detached'});
 for(const [width,height]of [[1280,800],[390,844]]){
  await page.setViewportSize({width,height});await page.locator('#helpBtn').click();await inspect(`duel-help-${width}`);await page.locator('.help-modal .btn').click();
  await page.locator('#giveupBtn').click();await inspect(`duel-confirm-${width}`);assert(await page.locator('.duel-overlay').count());await page.keyboard.press('Escape');assert.equal(await page.locator('.overlay > .modal').count(),0);
 }
 assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/report.json',JSON.stringify({origin,styles,checks,errors,liveFrontend:true,apiAccountFixture:true,localBot:true,authenticatedOnlineMatch:false},null,2));
 console.log('PASS deployed silver CSS, HOME and local BOT dialogs (account/API fixture).');
}finally{await browser.close();}
