import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-ranked-decks-qa';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.stack));
let mode='normal';const reads=[];
await page.addInitScript(()=>localStorage.setItem('lore_lang','ja'));
const user={id:'fixture',display:'SEEKER',credits:300,wins:1,losses:1};
await apiFixture(page,req=>{
 const url=new URL(req.url),p=url.pathname;
 if(p==='/api/auth/me')return {user};if(p==='/api/geo')return {country:'JP'};
 if(p==='/api/rank/me')return {rating:null};
 if(p==='/api/rank/leaderboard')return {season:'2026-10',total:100,entries:Array.from({length:100},(_,i)=>({userId:'user-'+i,rank:i+1,display:i===0?'長いシーカーネーム <テスト>':'SEEKER '+(i+1),tier:'iron',mmr:1100-i,wins:2,losses:1}))};
 if(p==='/api/rank/decks'){
  reads.push(url.searchParams.get('userId'));
  if(mode==='empty')return {decks:[]};
  return {decks:[0,1,2].map((n)=>({lastUsedAt:1792990800000-n*1000,cards:['STARTER_MANA',...Array(6-n).fill('STARTER_TRASH'),...Array(2+n).fill('STARTER_CHEST')]}))};
 }
 if(p==='/api/rewards/progression')return {credits:300,resetsAt:Date.now()+86400000,daily:{quest:{kind:'heal',reward:300,target:40},progress:0,claimed:false},bot:{},online:0,ranked:0};
 return {ok:true,items:[],keys:[],friends:[],incoming:[],outgoing:[],challenges:[],gifts:[]};
});
try {
 await page.goto(process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5541');
 await page.locator('[data-nav=leaderboard]').click({timeout:90000});
 await page.waitForSelector('.lb-deck-trigger');assert.equal(await page.locator('.lb-deck-trigger').count(),100);
 await page.locator('.lb-deck-trigger').first().click();
 await page.waitForSelector('.ranked-deck-grid .card');
 assert.equal(await page.locator('.ranked-deck-tabs button').count(),3);
 assert.equal(await page.locator('.ranked-deck-card').count(),3);
 assert.match(await page.locator('.ranked-deck-card').allTextContents().then(t=>t.join(' ')),/×6/);
 await page.locator('.ranked-deck-tabs button').nth(2).click();assert.match(await page.locator('.ranked-deck-card').allTextContents().then(t=>t.join(' ')),/×4/);
 await page.locator('.ranked-deck-grid .card').first().click();await page.waitForSelector('#zoomOverlay');await page.keyboard.press('Escape');
 await page.screenshot({path:out+'/desktop.png',fullPage:false});
 for(const width of [390,320,844]) {
  await page.setViewportSize({width,height:width===844?390:850});
  await page.locator('.ranked-decks').scrollIntoViewIfNeeded();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow at '+width);
  const sizes=await page.locator('.ranked-deck-tabs button').evaluateAll(bs=>bs.map(b=>b.getBoundingClientRect().height));assert(sizes.every(h=>h>=44));
  await page.screenshot({path:out+'/'+width+'.png'});
 }
 await page.setViewportSize({width:390,height:850});
 await page.locator('.ranked-decks header button').click();assert.equal(await page.locator('.ranked-decks').count(),0);
 assert.equal(await page.locator('.lb-deck-trigger').first().getAttribute('aria-expanded'),'false');
 mode='empty';await page.locator('.lb-deck-trigger').nth(99).click();await page.locator('.ranked-decks').getByText('まだ使用デッキの記録がありません。',{exact:false}).waitFor();
 assert.equal(reads.at(-1),'user-99');
 await page.locator('[data-nav=cards]').click();assert.equal(await page.locator('.ranked-decks').count(),0);
 assert.deepEqual(errors,[]);
 console.log('PASS browser: 100 entries, three deck tabs, multiset counts, card zoom, 1440/390/320/844, touch targets, no overflow, close/focus, empty #100, navigation cleanup');
} catch(error) {await page.screenshot({path:out+'/failure.png'});console.error('page',await page.locator('body').innerText(),errors);throw error;} finally {await browser.close();}
