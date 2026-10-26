import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.LORE_PLAYWRIGHT||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5193';
const out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-cards-starter-browser';
await fs.mkdir(out,{recursive:true});
await build({stdin:{contents:`export {DB,DECK_POOL} from './client/src/shared/cards';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:out+'/catalog.mjs'});
const {DB,DECK_POOL}=await import(out+'/catalog.mjs');
const expected=[...DECK_POOL,'STARTER_MANA'].sort();
const excluded=Object.values(DB).filter(c=>c.noShop&&!DECK_POOL.includes(c.id));
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-quic']});
const page=await browser.newPage({viewport:{width:1280,height:720}});
page.setDefaultTimeout(120000);
await page.addInitScript(()=>localStorage.setItem('lore_lang','ja'));
await apiFixture(page,r=>new URL(r.url).pathname==='/api/auth/me'?{user:{id:'starter-category-fixture',display:'シーカー',credits:0,decks:null}}:{ok:true});
const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
async function ready(){await page.waitForFunction(()=>document.querySelector('#grid > .card')&&!document.querySelector('.screen-loader')&&document.querySelector('#grid').getAttribute('aria-busy')!=='true');}
async function ids(){return page.locator('#grid > .card').evaluateAll(nodes=>nodes.map(n=>n.dataset.cardId).sort());}
try{
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.locator('[data-nav=cards]').click();await ready();
 for(const lang of ['ja','en','ko']){
  if(lang!=='ja'){await page.locator('.cards-lang select').selectOption(lang);await ready();}
  await page.locator('#typeRow .chip').last().click();await ready();
  assert.deepEqual(await ids(),expected,`${lang}: visible starters match deck pool plus Attune`);
  checks.push({lang,count:expected.length});
 }
 await page.locator('.cards-lang select').selectOption('ja');await ready();
 await page.locator('#typeRow .chip').last().click();await ready();
 await page.screenshot({path:out+'/starter-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/starter-mobile.png'});
 for(const c of excluded){
  await page.locator('#typeRow .chip').first().click();
  await page.locator('#search').fill(c.nameJa);await ready();
  assert((await ids()).includes(c.id),`${c.id}: generated card stays searchable in All`);
  await page.locator('#typeRow .chip').last().click();
  await page.waitForFunction(id=>document.querySelector('#grid').getAttribute('aria-busy')!=='true'&&![...document.querySelectorAll('#grid > .card')].some(n=>n.dataset.cardId===id),c.id);
 }
 await page.locator('#search').fill('');await ready();assert.deepEqual(await ids(),expected);
 assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/report.json',JSON.stringify({origin,api:'fixture; real deployed/local assets',checks,excluded:excluded.map(c=>c.id),errors},null,2)+'\n');
 console.log(`PASS ${origin}: ${expected.length} starters; ${excluded.length} excluded cards still searchable; ja/en/ko; desktop/mobile`);
}finally{await browser.close();}
