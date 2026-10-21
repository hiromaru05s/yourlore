// Production assets + actual menu navigation; API responses are isolated browser fixtures.
// This verifies shipped rendering, not authenticated multiplayer or server account behavior.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const base=process.env.LORE_TEST_URL||'http://127.0.0.1:5598',out=process.env.LORE_TEST_OUT||'/tmp/lore-card-hierarchy-deployed';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(90000);
const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
const user={id:'card-qa-fixture',display:'シーカー',email:'fixture@invalid.test',avatar:'SEEKER_BLUE',wins:0,losses:0,credits:0,exp:100};
await apiFixture(page,async r=>{const p=new URL(r.url).pathname;
 if(p==='/api/geo')return{country:'JP'};if(p==='/api/auth/me')return{user};
 if(p==='/api/rank/me')return{rating:{season:'2026-10',mmr:1000,tier:'iron',rank:1,wins:0,losses:0,draws:0}};
 if(p==='/api/rewards/tutorial')return{offered:true,keys:[],credits:0};
 if(p==='/api/collection')return{credits:0,starterCards:{STARTER_TRASH:8,STARTER_MANA:1,STARTER_CHEST:2}};
 if(p==='/api/rewards/progression')return{daily:{day:'2026-10-21',revision:0,quest:{kind:'damage',target:150,reward:350},progress:0,claimed:false,rerollsLeft:3},online:0,ranked:0,bot:{},credits:0,resetsAt:Date.now()+86400000};
 if(p==='/api/gifts')return{items:[],pendingCount:0,pendingAmount:0};
 if(p==='/api/social/friends')return{friends:[],incoming:[],outgoing:[],challenges:[]};
 return{ok:true,keys:[],receipts:[]};
});
await page.addInitScript(()=>localStorage.setItem('lore_lang','ja'));
try {
 await page.goto(base,{waitUntil:'domcontentloaded'});await page.locator('.lounge-home').waitFor();await page.locator('.screen-loader').waitFor({state:'detached'});
 await page.locator('[data-nav=cards]').click();await page.locator('.cards-search').waitFor();await page.locator('.screen-loader').waitFor({state:'detached'});
 for(const lang of ['ja','ko','en']) {
  await page.locator('.cards-lang select').selectOption(lang);
  for(const [id,search] of [['WORLD_TREE','世界樹'],['CASINO','カジノ'],['ASSASSIN1','初級アサシン'],['M1','スパーク・インプ']]) {
   await page.locator('.cards-search').fill(search);
   for(const [width,height] of [[1280,900],[390,844]]) {
    await page.setViewportSize({width,height});
    await page.locator(`#grid [data-card-id="${id}"]`).click();
    await page.locator('#zoomOverlay .zoom-details').waitFor();
    const result=await page.locator('#zoomOverlay').evaluate(root=>({
     title:root.querySelector('h1').textContent,
     groups:[...root.querySelectorAll('.card-rule-heading')].map(h=>h.textContent),
     headings:[...root.querySelectorAll('.card-effect-section h3')].map(h=>h.textContent),
     effects:root.querySelectorAll('[data-rule-group=effects]').length,
     overflow:root.querySelector('.zoom-details').scrollWidth>root.querySelector('.zoom-details').clientWidth+1,
     dice:root.querySelectorAll('[data-rule-group=effects] .card-effect-section .dr').length,
    }));
    assert.equal(result.effects,id==='M1'?0:1);assert(!result.overflow);
    if(id==='CASINO')assert.equal(result.dice,4);
    if(id==='WORLD_TREE')assert(result.groups.includes({ja:'効果',ko:'효과',en:'Effects'}[lang]));
    if(lang==='ja'&&id==='WORLD_TREE')await page.screenshot({path:`${out}/world-tree-${width}.png`});
    checks.push({lang,id,width,...result});await page.keyboard.press('Escape');
   }
  }
 }
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/browser.json',JSON.stringify({base,scope:'deployed assets and real card menu; API fixture, no live account or match',checks,errors},null,2));console.log(`PASS ${checks.length} deployed card-menu inspections, 0 browser errors`);
} finally {await browser.close();}
