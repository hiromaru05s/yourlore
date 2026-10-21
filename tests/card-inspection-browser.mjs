import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5581',out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-right-click';
await fs.mkdir(out,{recursive:true});
// Only fixture card data is supplied locally; all UI/controller code loads from origin.
const data=await build({stdin:{contents:"export {DB,STARTERS} from './client/src/shared/cards';",resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node'});
const {DB,STARTERS}=await import('data:text/javascript;base64,'+Buffer.from(data.outputFiles[0].text).toString('base64'));
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(90000);
const checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>localStorage.setItem('lore_lang','ja'));
const closeZoom=async()=>{await page.locator('#zoomOverlay .inspect-close').click();assert.equal(await page.locator('#zoomOverlay').count(),0);};
const inspect=async(selector)=>{console.log('inspect',selector);await page.locator(selector).first().click({button:'right'});await page.locator('#zoomOverlay').waitFor();assert.equal(await page.locator('#zoomOverlay').count(),1);checks.push(selector);await closeZoom();};
try{
 await page.goto(origin+'/cosmetic-studio.html?board=1&runtime=1&set=default&tempo=1');
 await page.waitForFunction(()=>window.combatTempo&&document.querySelector('[data-scene-ready=true]'));
 await page.evaluate(({DB,STARTERS})=>{
  document.querySelector('.tempo-controls').hidden=true;
  const g=combatTempo.fixture('counter').prev;g.opening=undefined;
  const inst=(def,uid)=>({...def,uid});
  for(const [i,p] of g.players.entries()){
   p.hand=[inst(STARTERS.STARTER_MANA,'hand-'+i),inst(DB.M4,'hand-mon-'+i)];
   p.discard=[inst(DB.M1,'grave-'+i),inst(DB.M4,'grave-last-'+i)];
   p.revealedCards=[{id:'M1',uid:'grave-'+i}];
   p.removed=[inst(DB.TSO2,'rift-'+i),inst(DB.M1,'rift-last-'+i)];
   p.quests=[{card:inst(Object.values(DB).find(c=>c.quest),'quest-'+i),progress:1}];
   p.enchants=[{card:inst(DB.NHEAL,'enchant-'+i),turns:1}];
  }
  window.inspectState=g;combatTempo.controller.show(g);window.beforeInspect=JSON.stringify(combatTempo.controller.state);
 },{DB,STARTERS});
 await page.waitForFunction(()=>!document.querySelector('.duel-preparing'));
 await page.waitForTimeout(1500);
 for(const id of ['pile-myDisc','pile-myDeck','rift-me','pile-oppDisc','pile-oppDeck','rift-opp']){
  console.log('pile',id);await page.locator('#'+id).click({button:'right'});
  await page.locator('#overlayRoot .modal').waitFor();assert.equal(await page.locator('#zoomOverlay').count(),0,id+' opens a list, not the top card');
  const cards=page.locator('#overlayRoot .picker-grid .card'),count=await cards.count();assert(count>0,id+' has cards');
  await inspect('#overlayRoot .picker-grid .card');assert.equal(await cards.count(),count);
  if(id==='pile-myDeck'){
   await page.locator('[data-v=deck]').click();await inspect('#overlayRoot .picker-grid .card');
  }
  if(id==='pile-oppDeck')assert.equal(await page.locator('.dv-tab').count(),0,'opponent hidden remainder stays hidden');
  if(id==='pile-myDisc'){
   await cards.first().click();await page.locator('#zoomOverlay').waitFor();await closeZoom();assert.equal(await cards.count(),count,'left click also retains browse list');
   await page.screenshot({path:out+'/graveyard-list.png'});
  }
  await page.locator('#overlayRoot .modal-row button').last().click();checks.push(id);
 }
 for(const selector of ['#hand .card','#meRow .zone-mon .card','#oppRow .zone-mon .card','#fixedMarket .card','#supplyMarket .card','#meRow [data-uid=quest-0]','#meRow [data-uid=enchant-0]'])await inspect(selector);
 await page.evaluate(()=>combatTempo.controller.view.setHandOpen(true));await inspect('#hand .card');
 await page.locator('#rift-me').click({button:'right'});
 await page.locator('#overlayRoot .picker-grid .card[data-card-id=TSO2]').click({button:'right'});
 const parent=await page.locator('.inspect-heading h1').innerText();
 await page.locator('.ztc-grid .card').first().click({button:'right'});
 await page.locator('.inspect-back').waitFor();await page.locator('.inspect-back').click();assert.equal(await page.locator('.inspect-heading h1').innerText(),parent);await closeZoom();await page.locator('#overlayRoot .modal-row button').last().click();checks.push('related right click and back');
 assert(await page.evaluate(()=>JSON.stringify(combatTempo.controller.state)===beforeInspect),'inspection never changes game state');
 await page.evaluate(()=>{for(const p of inspectState.players){p.revealedCards=[];p.deck=[];p.hand=[];p.field=[];p.discard=[];p.removed=[];p.enchants=[];p.quests=[];}combatTempo.controller.show(inspectState);});
 for(const id of ['pile-myDisc','pile-myDeck','rift-me','pile-oppDisc','pile-oppDeck','rift-opp']){
  console.log('pile',id);await page.locator('#'+id).click({button:'right'});await page.locator('#overlayRoot .modal').waitFor();assert.equal(await page.locator('#overlayRoot .picker-grid .card').count(),0);
  await page.locator('#overlayRoot .modal-row button').last().click();
 }
 checks.push('all six empty piles');
 await apiFixture(page,r=>{const p=new URL(r.url).pathname;return p==='/api/auth/me'?{user:{id:'inspection-fixture',display:'シーカー',credits:1000,decks:null}}:p==='/api/social/profile'?{profile:{sleeves:['default'],furnitures:['default']}}:p==='/api/collection'?{credits:1000,starterCards:Object.fromEntries(Object.keys(STARTERS).map(id=>[id,8]))}:{ok:true};});
 console.log('menu startup');await page.goto(origin);await page.screenshot({path:out+'/menu-startup.png'});await page.locator('[data-nav=cards]').click();await page.waitForFunction(()=>document.querySelector('#grid > .card')&&!document.querySelector('.screen-loader')&&document.querySelector('#grid').getAttribute('aria-busy')!=='true');
 await inspect('#grid > .card');await page.locator('[data-nav=deck]').click();await inspect('#deckCur .card');await inspect('#deckPool .card');await page.locator('#appearanceTab').click();await inspect('#deckAppearanceSection .card');
 await page.locator('[data-nav=shop]').click();await page.locator('[data-category=starter]').click();await inspect('.starter-shop-face');
 assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/report.json',JSON.stringify({origin,checks,errors,boundary:'Real origin UI and renderer, fixture game state and API/account data. No authenticated multiplayer match.'},null,2));
 console.log('PASS',checks.length,'browser inspection checks',origin);
}catch(e){await page.screenshot({path:out+'/failure.png'});console.log({errors});throw e;}finally{await browser.close();}
