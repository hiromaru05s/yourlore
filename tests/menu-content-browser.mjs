import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-exp-browser/node_modules/playwright/index.mjs');
const base=process.env.LORE_TEST_URL||'http://127.0.0.1:5498',out=process.env.LORE_TEST_OUT||'/tmp/lore-menu-content-browser';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});page.setDefaultTimeout(90000);
const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
const user={id:'menu-qa',display:'シーカー',email:'qa@invalid.test',avatar:'SEEKER_BLUE',wins:0,losses:0,credits:3000,exp:0};
await apiFixture(page,async r=>{const p=new URL(r.url).pathname;
 if(p==='/api/geo')return{country:'JP'};if(p==='/api/auth/me')return{user};if(p==='/api/rank/me')return{rating:null};
 if(p==='/api/rewards/tutorial')return{offered:true,keys:[],credits:user.credits};
 if(p==='/api/rewards/progression')return{daily:{day:'2026-10-15',revision:0,quest:{kind:'damage',target:150,reward:350},progress:0,claimed:false,rerollsLeft:3},online:0,ranked:0,bot:{},credits:user.credits,resetsAt:Date.now()+86400000};
 if(p==='/api/invite/me')return{code:'QAINVITE',limit:3,invites:[{display:'Friend A',status:'pending'},{display:'Friend B',status:'paid'}]};
 if(p==='/api/social/profile')return{profile:{...user,self:true,created_at:Date.now(),sleeves:['default'],furnitures:['default'],byMode:{},recent:[]}};
 if(p==='/api/collection')return{credits:user.credits,starterCards:{STARTER_TRASH:8,STARTER_MANA:1,STARTER_CHEST:2}};
 if(p==='/api/rewards/coupon'){user.credits+=100;return{ok:true,amount:100,credits:user.credits};}
 return{ok:true,keys:[],receipts:[]};
});
const absent=text=>assert(!/クレジット|크레딧|\bcredits?\b|LORE PREMIUM|9\.5%|0\.5%|公開時|coming soon/i.test(text),text);
const utility=async selector=>{if(!await page.locator(selector).isVisible())await page.locator('.lounge-menu').click();await page.locator(selector).click();};
try {
 await page.goto(base);await page.locator('.lounge-home').waitFor();await page.locator('.screen-loader').waitFor({state:'detached'});
 for(const [lang,shards] of [['ja','シャード'],['en','Shards'],['ko','샤드']]){
  await page.setViewportSize({width:1440,height:900});await utility('[data-utility-settings]');await page.locator('#langSel').selectOption(lang);
  await page.waitForFunction(value=>document.querySelector('#langSel')?.value===value,lang);
  assert((await page.locator('#pbody').innerText()).includes(shards));absent(await page.locator('#pbody').innerText());assert.equal(await page.locator('.bill-plan').count(),0);
  await page.screenshot({path:`${out}/settings-${lang}.png`});
  if(lang==='ja'){await page.locator('#coupon').fill('QA');await page.locator('#couponGo').click();await page.waitForFunction(()=>document.querySelector('#credits')?.textContent==='3100');}
  await utility('[data-invite]');await page.locator('.invite-box').waitFor();
  const text=await page.locator('.invite-box').innerText();assert(text.includes('1,000')&&text.includes(shards)&&text.includes('Ranked'));absent(text);
  assert.equal(await page.locator('.inv-note').count(),0);assert.equal(await page.locator('#invLink').inputValue(),base+'/?ref=QAINVITE');
  for(const [width,height] of [[1440,900],[390,844],[320,568],[844,390]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(300);
   const geometry=await page.locator('.invite-box').evaluate(el=>({width:innerWidth,scroll:el.scrollWidth,client:el.clientWidth,left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right,overflow:document.documentElement.scrollWidth>innerWidth+1}));
   assert(!geometry.overflow&&geometry.scroll<=geometry.client+1&&geometry.left>=-1&&geometry.right<=width+1,JSON.stringify(geometry));
   await page.screenshot({path:`${out}/invite-${lang}-${width}.png`});checks.push({lang,...geometry});
  }
  await page.locator('#invClose').click();await page.setViewportSize({width:1440,height:900});await page.locator('[data-shop]').click();await page.locator('.gacha-page').waitFor();
  absent(await page.locator('.gacha-page').innerText());assert.equal(await page.locator('.gacha-editions button:disabled').count(),0);
  await page.locator('[data-info="rates"]').click();const rates=await page.locator('.gacha-dialog').innerText();absent(rates);assert(rates.includes('100%')&&rates.includes('50')&&rates.includes(shards));
  await page.screenshot({path:`${out}/rates-${lang}.png`});await page.keyboard.press('Escape');
 }
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/report.json',JSON.stringify({checks,errors},null,2));console.log('PASS JA/EN/KO invite/settings/rates, 12 invite geometries, coupon balance update, no obsolete promotions');
} catch(e){await page.screenshot({path:out+'/failure.png'});throw e;}finally{await browser.close();}
