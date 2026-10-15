import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.LORE_PLAYWRIGHT||'/tmp/lore-exp-browser/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5498';
const out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-exp-browser-evidence';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});page.setDefaultTimeout(90000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const user={id:'experience-qa',display:'シーカー',avatar:'SEEKER_BLUE',wins:99,losses:99,credits:200,exp:235,botClears:['easy','normal','hard','hell']};
await apiFixture(page,async r=>{const path=new URL(r.url).pathname;if(path==='/api/geo')return {country:'JP'};if(path==='/api/auth/me')return {user};if(path==='/api/rank/me')return {rating:{season:'2026-10',tier:'iron',mmr:1000,rank:1}};if(path.includes('tutorial'))return {offered:true,completed:[]};if(path==='/api/social/profile')return {profile:{...user,self:true,created_at:Date.now(),byMode:{ranked:{w:0,l:0}},recent:[]}};return {ok:true,keys:[],credits:200};});
try {
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.locator('.lounge-user').waitFor();await page.locator('.screen-loader').waitFor({state:'detached'});
 assert.match(await page.locator('.lounge-user').innerText(),/3.*35\/100 EXP/);
 for(const [width,height] of [[1440,900],[390,844],[320,568],[844,390]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(250);
  assert(await page.locator('.lounge-experience').isVisible());const box=await page.locator('.lounge-user').boundingBox();assert(box.x>=0&&box.x+box.width<=width+1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:`${out}/home-${width}.png`});
 }
 await page.setViewportSize({width:390,height:844});await page.locator('#bot').click();await page.locator('#ranked').click();await page.locator('.bot-diff-ov').waitFor();
 assert.equal(await page.getByText('初回EXP獲得済み',{exact:true}).count(),4);await page.screenshot({path:`${out}/bot-cleared.png`});await page.locator('#diffCancel').click();
 await page.locator('[data-profile]').click();await page.locator('.pf-experience').waitFor();await page.locator('.pf-experience summary').click();assert.match(await page.locator('.pf-experience').innerText(),/Lv50 MAX/);await page.screenshot({path:`${out}/profile-rules.png`});
 user.exp=4900;user.botClears=[];await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('.lounge-user')?.textContent.includes('50 MAX'));await page.locator('.screen-loader').waitFor({state:'detached'});assert(!(await page.locator('.lounge-user').innerText()).includes('/100'));
 await page.locator('#bot').click();await page.locator('#ranked').click();for(const amount of [20,35,60,120])assert.equal(await page.getByText(`初回クリア +${amount} EXP`,{exact:true}).count(),1);
 await page.screenshot({path:`${out}/bot-first-rewards.png`});assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/report.json',JSON.stringify({origin,checks:['saved EXP independent of W/L','four viewport bounds','BOT first-clear amounts/claimed state','profile rules','Lv50 MAX'],errors},null,2));console.log('PASS EXP menu/browser checks',out);
}finally{await browser.close();}
